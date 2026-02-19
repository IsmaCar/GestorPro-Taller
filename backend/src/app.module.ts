import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ClientsModule } from './clients/clients.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [AuthModule, PrismaModule, ClientsModule, EmailModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
