<#
.SYNOPSIS
  Поднимает контейнер PostgreSQL с параметрами из DATABASE_URL.

.DESCRIPTION
  Использование:
    .\scripts\db-up.ps1                # берёт .env, если он есть, иначе example.env
    .\scripts\db-up.ps1 path\to\.env   # явный путь к env-файлу

  Переменные окружения:
    ENV_FILE       — путь к env-файлу (альтернатива первому аргументу)
    CONTAINER_NAME — имя контейнера (по умолчанию <имя_проекта>-postgres)
    PG_IMAGE       — образ postgres (по умолчанию postgres:17-alpine)
    PG_VOLUME      — имя docker-тома для данных (по умолчанию <container>-data)
#>

param(
    [Parameter(Position = 0)]
    [string]$EnvFilePath
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot

function Die {
    param([string]$Message)
    Write-Error "Ошибка: $Message"
    exit 1
}

$EnvFile = $EnvFilePath
if (-not $EnvFile) { $EnvFile = $env:ENV_FILE }
if (-not $EnvFile) {
    if (Test-Path (Join-Path $ProjectRoot '.env')) {
        $EnvFile = Join-Path $ProjectRoot '.env'
    } else {
        $EnvFile = Join-Path $ProjectRoot 'example.env'
    }
}

$PgImage = if ($env:PG_IMAGE) { $env:PG_IMAGE } else { 'postgres:17-alpine' }

if (-not (Test-Path $EnvFile)) { Die "env-файл не найден: $EnvFile" }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Die "docker не установлен" }

# --- Читаем DATABASE_URL из env-файла ------------------------------------------------

# Берём последнее вхождение, игнорируем комментарии, снимаем кавычки и префикс export.
function Read-EnvValue {
    param([string]$Name, [string]$Path)
    $pattern = "^[\s]*(export[\s]+)?$Name[\s]*=(.*)$"
    $value = $null
    Get-Content $Path | ForEach-Object {
        if ($_ -match $pattern) { $value = $Matches[2].Trim() }
    }
    if ($null -eq $value) { return $null }
    $value = $value -replace '^"(.*)"$', '$1'
    $value = $value -replace "^'(.*)'$", '$1'
    return $value
}

$DatabaseUrl = Read-EnvValue -Name 'DATABASE_URL' -Path $EnvFile
if (-not $DatabaseUrl) { Die "в $EnvFile нет DATABASE_URL" }

# --- Разбираем connection string -----------------------------------------------------

function UrlDecode([string]$s) {
    return [System.Uri]::UnescapeDataString($s.Replace('+', ' '))
}

if ($DatabaseUrl -notmatch '^(postgres|postgresql)://(.*)$') {
    $scheme = ($DatabaseUrl -split '://')[0]
    Die "DATABASE_URL должен быть postgres:// или postgresql://, получено: ${scheme}://"
}
$rest = $Matches[2]
$rest = ($rest -split '\?')[0] # отбрасываем query-параметры (?schema=public и т.п.)

if ($rest -match '^(.*)@([^@]*)$') {
    # последний @ — разделитель, пароль может содержать @
    $userInfo = $Matches[1]
    $hostPart = $Matches[2]
} else {
    $userInfo = ''
    $hostPart = $rest
}

$idx = $userInfo.IndexOf(':')
if ($idx -ge 0) {
    $PgUser = UrlDecode $userInfo.Substring(0, $idx)
    $PgPassword = UrlDecode $userInfo.Substring($idx + 1)
} else {
    $PgUser = UrlDecode $userInfo
    $PgPassword = ''
}

$slashIdx = $hostPart.IndexOf('/')
if ($slashIdx -ge 0) {
    $hostPort = $hostPart.Substring(0, $slashIdx)
    $PgDb = UrlDecode $hostPart.Substring($slashIdx + 1)
} else {
    $hostPort = $hostPart
    $PgDb = ''
}

$colonIdx = $hostPort.LastIndexOf(':')
if ($colonIdx -ge 0) {
    $PgHost = $hostPort.Substring(0, $colonIdx)
    $PgPort = $hostPort.Substring($colonIdx + 1)
} else {
    $PgHost = $hostPort
    $PgPort = '5432'
}

if (-not $PgUser) { Die "в DATABASE_URL не указан пользователь" }
if (-not $PgPassword) { Die "в DATABASE_URL не указан пароль (postgres-контейнер требует его)" }
if (-not $PgDb) { Die "в DATABASE_URL не указано имя базы" }
if ($PgPort -notmatch '^[0-9]+$') { Die "некорректный порт: $PgPort" }

if ($PgHost -notin @('localhost', '127.0.0.1', '0.0.0.0', '::1')) {
    Write-Warning "host в DATABASE_URL — '$PgHost', но контейнер поднимается локально."
}

$ContainerName = if ($env:CONTAINER_NAME) { $env:CONTAINER_NAME } else { "$(Split-Path -Leaf $ProjectRoot)-postgres" }
$PgVolume = if ($env:PG_VOLUME) { $env:PG_VOLUME } else { "$ContainerName-data" }

# --- Проверка занятости порта --------------------------------------------------------

# Падает с диагностикой, если порт занят кем-то посторонним.
function Confirm-PortFree {
    param([int]$Port)
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) { return }

    # Если порт держит docker-контейнер, показываем его имя и как остановить.
    $holder = docker ps --filter "publish=$Port" --format '{{.Names}} ({{.Image}})' 2>$null
    if ($holder) {
        Die "порт $Port занят docker-контейнером: $($holder -join ', ').`nОстановите его (docker stop <имя>) или поменяйте порт в DATABASE_URL ($EnvFile)."
    }

    $procs = $conns | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
        $p = Get-Process -Id $_ -ErrorAction SilentlyContinue
        if ($p) { "$($p.ProcessName) (pid $($p.Id))" }
    }
    $holderStr = if ($procs) { $procs -join ', ' } else { 'определить не удалось (нужны права администратора?)' }

    Die "порт $Port занят, процесс: $holderStr.`nОстановите его или поменяйте порт в DATABASE_URL ($EnvFile)."
}

# --- Поднимаем контейнер -------------------------------------------------------------

$existing = docker ps -aq --filter "name=^$ContainerName$"

if ($existing) {
    $running = docker ps -q --filter "name=^$ContainerName$"
    if ($running) {
        Write-Host "Контейнер '$ContainerName' уже запущен."
    } else {
        Confirm-PortFree -Port $PgPort
        Write-Host "Запускаю существующий контейнер '$ContainerName'..."
        docker start $ContainerName | Out-Null
    }
} else {
    Confirm-PortFree -Port $PgPort
    Write-Host "Создаю контейнер '$ContainerName' ($PgImage) на порту $PgPort..."
    docker run -d `
        --name $ContainerName `
        --restart unless-stopped `
        -e "POSTGRES_USER=$PgUser" `
        -e "POSTGRES_PASSWORD=$PgPassword" `
        -e "POSTGRES_DB=$PgDb" `
        -p "${PgPort}:5432" `
        -v "${PgVolume}:/var/lib/postgresql/data" `
        $PgImage | Out-Null
}

# --- Ждём готовности -----------------------------------------------------------------

Write-Host -NoNewline "Жду готовности базы"
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    docker exec $ContainerName pg_isready -U $PgUser -d $PgDb *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 1
}
Write-Host ""

if (-not $ready) { Die "база не поднялась за 60 секунд, логи: docker logs $ContainerName" }

Write-Host "PostgreSQL готов: postgres://${PgUser}@${PgHost}:${PgPort}/${PgDb}"
