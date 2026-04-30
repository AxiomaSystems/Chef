import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { ProfileMemoryService } from './profile-memory.service';
import { UserContextService } from './user-context.service';

@Module({
  imports: [AuthModule],
  controllers: [MeController],
  providers: [UserContextService, MeService, ProfileMemoryService],
  exports: [UserContextService],
})
export class UserModule {}
