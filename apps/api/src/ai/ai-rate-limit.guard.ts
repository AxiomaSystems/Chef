import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AiRateLimitService } from './ai-rate-limit.service';

type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  constructor(private readonly aiRateLimitService: AiRateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const snapshot = this.aiRateLimitService.getSnapshot(request);

    if (snapshot.used >= snapshot.max_requests) {
      throw new HttpException(
        {
          message: `AI request limit reached. Try again in ${snapshot.reset_in_seconds} seconds.`,
          retry_after_seconds: snapshot.reset_in_seconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.aiRateLimitService.consume(request);
    return true;
  }
}
