import { LoggerModule } from '@lib/logger';
import { Module } from '@nestjs/common';
import { PrismaModule } from '@lib/prisma';

@Module({
  imports: [LoggerModule, PrismaModule],
})
export class AppModule {}
