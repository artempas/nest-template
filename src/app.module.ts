import { Module } from '@nestjs/common';
import { PrismaModule } from '@lib/prisma';

@Module({
  imports: [PrismaModule],
})
export class AppModule {}
