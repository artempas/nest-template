import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  Type,
  UseGuards,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { HttpReturnableError } from '@lib/errors';

const MANY_GUARDS_KEY = Symbol('UseManyGuards');

/**
 * Декоратор для указания нескольких групп гардов, которые будут применены к эндпоинту.
 * В качестве параметра передаётся двумерный массив.
 * Между группами действует логическое ИЛИ, внутри группы — логическое И.
 *
 * Например, `@UseManyGuards([[GuardA, GuardB], [GuardC]])` означает:
 * (`GuardA` И `GuardB`) ИЛИ `GuardC`.
 */
export const UseManyGuards = (
  guardGroups: Type<CanActivate>[][],
): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SetMetadata(MANY_GUARDS_KEY, guardGroups),
    UseGuards(ManyGuards),
  );

@Injectable()
export class ManyGuards implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const guardTypes = this.reflector.getAllAndOverride<Type<CanActivate>[][]>(
      MANY_GUARDS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!guardTypes) {
      return true;
    }

    let lastDenial: unknown;

    for (const guardGroup of guardTypes) {
      // Внутри группы — логическое И с коротким замыканием: гард не выполняется,
      // если предыдущий в группе уже вернул false. Иначе побочные эффекты
      // последующих гардов (например, NotFoundException) могли бы сработать
      // даже когда группа заведомо не проходит по правам.
      // Отказ по доступу (ForbiddenException или доменная 403, например
      // AccessDeniedError) перехватывается, чтобы неуспех одной OR-группы
      // не прерывал проверку следующих групп.
      let groupPassed = true;
      for (const guardType of guardGroup) {
        const guard = await this.moduleRef.create(guardType);
        try {
          if (!(await guard.canActivate(context))) {
            groupPassed = false;
            break;
          }
        } catch (e) {
          if (isAccessDenial(e)) {
            lastDenial = e;
            groupPassed = false;
            break;
          }
          throw e;
        }
      }

      if (groupPassed) {
        return true;
      }
    }

    // Ни одна группа не прошла: отдаём клиенту последний отказ как есть, чтобы
    // доменная 403 не подменялась безликим `Forbidden resource` от Nest.
    if (lastDenial !== undefined) {
      throw lastDenial;
    }
    return false;
  }
}

function isAccessDenial(e: unknown): boolean {
  return (
    e instanceof ForbiddenException
    || (e instanceof HttpReturnableError && e.statusCode === 403)
  );
}
