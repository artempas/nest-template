#!/usr/bin/env bash
#
# Поднимает контейнер PostgreSQL с параметрами из DATABASE_URL.
#
# Использование:
#   ./scripts/db-up.sh                # берёт .env, если он есть, иначе example.env
#   ./scripts/db-up.sh path/to/.env   # явный путь к env-файлу
#
# Переменные окружения:
#   ENV_FILE       — путь к env-файлу (альтернатива первому аргументу)
#   CONTAINER_NAME — имя контейнера (по умолчанию <имя_проекта>-postgres)
#   PG_IMAGE       — образ postgres (по умолчанию postgres:17-alpine)
#   PG_VOLUME      — имя docker-тома для данных (по умолчанию <container>-data)

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ENV_FILE="${1:-${ENV_FILE:-}}"
if [[ -z "$ENV_FILE" ]]; then
  if [[ -f "$PROJECT_ROOT/.env" ]]; then
    ENV_FILE="$PROJECT_ROOT/.env"
  else
    ENV_FILE="$PROJECT_ROOT/example.env"
  fi
fi

PG_IMAGE="${PG_IMAGE:-postgres:17-alpine}"

die() {
  echo "Ошибка: $*" >&2
  exit 1
}

[[ -f "$ENV_FILE" ]] || die "env-файл не найден: $ENV_FILE"
command -v docker >/dev/null 2>&1 || die "docker не установлен"
docker info >/dev/null 2>&1 || die "docker-демон недоступен"

# --- Читаем DATABASE_URL из env-файла ------------------------------------------------

# Берём последнее вхождение, игнорируем комментарии, снимаем кавычки и префикс export.
DATABASE_URL="$(
  grep -E '^[[:space:]]*(export[[:space:]]+)?DATABASE_URL[[:space:]]*=' "$ENV_FILE" \
    | tail -n 1 \
    | sed -E 's/^[[:space:]]*(export[[:space:]]+)?DATABASE_URL[[:space:]]*=[[:space:]]*//; s/[[:space:]]*$//; s/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'
)" || true

[[ -n "$DATABASE_URL" ]] || die "в $ENV_FILE нет DATABASE_URL"

# --- Разбираем connection string -----------------------------------------------------

urldecode() {
  local s="${1//+/ }"
  printf '%b' "${s//%/\\x}"
}

scheme="${DATABASE_URL%%://*}"
case "$scheme" in
  postgres | postgresql) ;;
  *) die "DATABASE_URL должен быть postgres:// или postgresql://, получено: $scheme://" ;;
esac

rest="${DATABASE_URL#*://}"
rest="${rest%%\?*}" # отбрасываем query-параметры (?schema=public и т.п.)

if [[ "$rest" == *"@"* ]]; then
  userinfo="${rest%@*}" # последний @ — разделитель, пароль может содержать @
  hostpart="${rest##*@}"
else
  userinfo=""
  hostpart="$rest"
fi

PG_USER="$(urldecode "${userinfo%%:*}")"
if [[ "$userinfo" == *":"* ]]; then
  PG_PASSWORD="$(urldecode "${userinfo#*:}")"
else
  PG_PASSWORD=""
fi

hostport="${hostpart%%/*}"
PG_DB="$(urldecode "${hostpart#*/}")"
PG_HOST="${hostport%%:*}"
if [[ "$hostport" == *":"* ]]; then
  PG_PORT="${hostport##*:}"
else
  PG_PORT="5432"
fi

[[ -n "$PG_USER" ]] || die "в DATABASE_URL не указан пользователь"
[[ -n "$PG_PASSWORD" ]] || die "в DATABASE_URL не указан пароль (postgres-контейнер требует его)"
[[ -n "$PG_DB" ]] || die "в DATABASE_URL не указано имя базы"
[[ "$PG_PORT" =~ ^[0-9]+$ ]] || die "некорректный порт: $PG_PORT"

case "$PG_HOST" in
  localhost | 127.0.0.1 | 0.0.0.0 | ::1) ;;
  *) echo "Предупреждение: host в DATABASE_URL — '$PG_HOST', но контейнер поднимается локально." >&2 ;;
esac

CONTAINER_NAME="${CONTAINER_NAME:-$(basename "$PROJECT_ROOT")-postgres}"
PG_VOLUME="${PG_VOLUME:-${CONTAINER_NAME}-data}"

# --- Проверка занятости порта --------------------------------------------------------

# Возвращает 0, если на порту кто-то слушает. Пробуем несколько способов:
# ss/lsof видят локальные сокеты, tcp-connect ловит всё остальное (в т.ч. проброс из WSL/VM).
port_in_use() {
  local port="$1"

  if command -v ss >/dev/null 2>&1; then
    [[ -n "$(ss -ltnH "sport = :${port}" 2>/dev/null)" ]] && return 0
  elif command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && return 0
  fi

  (exec 3<>"/dev/tcp/127.0.0.1/${port}") >/dev/null 2>&1 && return 0

  return 1
}

# Кто держит порт — по возможности показываем конкретного виновника.
port_holder() {
  local port="$1" holder=""

  holder="$(docker ps --filter "publish=${port}" --format '{{.Names}} ({{.Image}})' 2>/dev/null | paste -sd', ' -)"
  if [[ -n "$holder" ]]; then
    echo "docker-контейнер: $holder"
    return
  fi

  if command -v lsof >/dev/null 2>&1; then
    holder="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -F pc 2>/dev/null \
      | awk '/^p/{pid=substr($0,2)} /^c/{print substr($0,2) " (pid " pid ")"}' | sort -u | paste -sd', ' -)"
  fi
  [[ -n "$holder" ]] && echo "процесс: $holder" || echo "процесс определить не удалось (нужны права root?)"
}

# --- Поднимаем контейнер -------------------------------------------------------------

existing="$(docker ps -aq --filter "name=^${CONTAINER_NAME}$")"

if [[ -n "$existing" ]]; then
  if [[ -n "$(docker ps -q --filter "name=^${CONTAINER_NAME}$")" ]]; then
    echo "Контейнер '$CONTAINER_NAME' уже запущен."
  else
    if port_in_use "$PG_PORT"; then
      die "порт $PG_PORT занят ($(port_holder "$PG_PORT")).
Освободите порт или поменяйте порт в DATABASE_URL ($ENV_FILE)."
    fi
    echo "Запускаю существующий контейнер '$CONTAINER_NAME'..."
    docker start "$CONTAINER_NAME" >/dev/null
  fi
else
  if port_in_use "$PG_PORT"; then
    die "порт $PG_PORT занят ($(port_holder "$PG_PORT")).
Освободите порт, поменяйте порт в DATABASE_URL ($ENV_FILE) или задайте другое имя контейнера через CONTAINER_NAME."
  fi
  echo "Создаю контейнер '$CONTAINER_NAME' ($PG_IMAGE) на порту $PG_PORT..."
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -e POSTGRES_USER="$PG_USER" \
    -e POSTGRES_PASSWORD="$PG_PASSWORD" \
    -e POSTGRES_DB="$PG_DB" \
    -p "${PG_PORT}:5432" \
    -v "${PG_VOLUME}:/var/lib/postgresql/data" \
    "$PG_IMAGE" >/dev/null
fi

# --- Ждём готовности -----------------------------------------------------------------

echo -n "Жду готовности базы"
for _ in $(seq 1 60); do
  if docker exec "$CONTAINER_NAME" pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then
    echo
    echo "PostgreSQL готов: postgres://${PG_USER}@${PG_HOST}:${PG_PORT}/${PG_DB}"
    exit 0
  fi
  echo -n "."
  sleep 1
done

echo
die "база не поднялась за 60 секунд, логи: docker logs $CONTAINER_NAME"
