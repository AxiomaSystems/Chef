import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequestContextService } from '../common/http/request-context.service';
import { AuthTokenService } from './auth-token.service';
import type { AuthenticatedUser } from './auth.types';

type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class ActorResolverService {
  constructor(
    private readonly authTokenService: AuthTokenService,
    private readonly requestContextService: RequestContextService,
  ) {}

  async resolveRequestActor(
    request: RequestWithUser,
  ): Promise<AuthenticatedUser | null> {
    const authorization = request.header('authorization');

    if (authorization?.startsWith('Bearer ')) {
      const token = authorization.slice('Bearer '.length).trim();

      if (!token) {
        throw new UnauthorizedException('Authentication required');
      }

      const actor = await this.authTokenService.verifyAccessToken(token);
      this.attachActor(request, actor);
      return actor;
    }

    return null;
  }

  private attachActor(request: RequestWithUser, actor: AuthenticatedUser) {
    request.user = actor;
    this.requestContextService.setActorUserId(actor.sub);
  }
}

@Injectable()
export class RequestActorGuard implements CanActivate {
  constructor(private readonly actorResolverService: ActorResolverService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const actor = await this.actorResolverService.resolveRequestActor(request);

    if (!actor) {
      throw new UnauthorizedException('Authentication required');
    }

    return true;
  }
}

@Injectable()
export class OptionalRequestActorGuard implements CanActivate {
  constructor(private readonly actorResolverService: ActorResolverService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    await this.actorResolverService.resolveRequestActor(request);
    return true;
  }
}
