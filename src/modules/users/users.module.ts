import { Module } from '@nestjs/common';
import { PrismaModule } from '@lib/prisma';
import { USERS_SERVICE } from './users.tokens';
import { UsersController } from './users.controller';
import { UsersRwRepository } from './repositories/users.rw.repository';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRwRepository,
    { provide: USERS_SERVICE, useExisting: UsersService },
  ],
  exports: [USERS_SERVICE],
})
export class UsersModule {}
