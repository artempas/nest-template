import { ConfigModule } from '@lib/config';
import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '@generated/prisma/client';
import { PrismaService } from './prisma.service';
import { TransactionProvider } from './transaction-manager.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    { provide: PrismaClient, useExisting: PrismaService },
    TransactionProvider,
  ],
  exports: [PrismaService, PrismaClient, TransactionProvider],
})
export class PrismaModule {}
