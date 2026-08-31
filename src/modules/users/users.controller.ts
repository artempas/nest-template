import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { EndpointBuilder } from '@lib/endpoint-builder';
import { FindManyUsersQueryDto } from './contracts/request/find-many-users.request.contract';
import { FindManyUsersResponseDto } from './contracts/response/find-many-users.response.contract';
import { MeHeaders } from './decorators/me-headers.decorator';
import { MeHeadersDto } from './contracts/request/me-headers.contract';
import { unwrapOrThrow } from '@lib/utils';
import { UserDto } from './contracts/response/user.response.contract';
import { UserParamsDto } from './contracts/request/user-params.contract';
import { USERS_BASE_PATH } from './users.tokens';
import { UsersMapper } from './mappers/users.dto.mapper';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller()
export class UsersController {
  static readonly builders = {
    root: EndpointBuilder.base(USERS_BASE_PATH),
    id: EndpointBuilder.base(USERS_BASE_PATH).param('userId'),
  };

  static readonly paths = {
    findMe: EndpointBuilder.extend(UsersController.builders.root)
      .segment('me')
      .build(),
    findMany: UsersController.builders.root.build(),
    findOne: UsersController.builders.id.build(),
  };

  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Текущий пользователь' })
  @Get(UsersController.paths.findMe.getPath())
  async findMe(@MeHeaders() headers: MeHeadersDto): Promise<UserDto> {
    return unwrapOrThrow(
      await this.usersService.findMe(UsersMapper.toActorDto(headers)),
    );
  }

  @ApiOperation({ summary: 'Пользователь по идентификатору' })
  @Get(UsersController.paths.findOne.getPath())
  async findOne(@Param() params: UserParamsDto): Promise<UserDto> {
    return unwrapOrThrow(await this.usersService.findOneOrFail(params.userId));
  }

  @ApiOperation({ summary: 'Список пользователей' })
  @Get(UsersController.paths.findMany.getPath())
  async findMany(
    @Query() query: FindManyUsersQueryDto,
  ): Promise<FindManyUsersResponseDto> {
    return unwrapOrThrow(
      await this.usersService.findMany(UsersMapper.toFindManyDto(query)),
    );
  }
}
