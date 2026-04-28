import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiController } from './ai.controller';
import { AiRateLimitGuard } from './ai-rate-limit.guard';
import { AiService } from './ai.service';
import { MockAiProvider } from './providers/mock-ai.provider';
import { OpenAiAiProvider } from './providers/openai-ai.provider';

@Module({
  imports: [AuthModule],
  controllers: [AiController],
  providers: [AiService, AiRateLimitGuard, MockAiProvider, OpenAiAiProvider],
  exports: [AiService],
})
export class AiModule {}

