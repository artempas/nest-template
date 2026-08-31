import { LoggerModule } from '@lib/logger';
import { Module } from '@nestjs/common';
import { PrismaModule } from '@lib/prisma';
import { UsersModule } from '@modules/users';

@Module({
  imports: [LoggerModule, PrismaModule, UsersModule],
})
export class AppModule {}
