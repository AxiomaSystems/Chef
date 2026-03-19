import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestContextService } from '../common/http/request-context.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContextService: RequestContextService,
  ) {}

  async resolveActorUser(actorUserId?: string): Promise<{ id: string }> {
    const actor = await this.resolveOptionalActorUser(actorUserId);

    if (!actor) {
      throw new UnauthorizedException('Authentication required');
    }

    return actor;
  }

  async resolveOptionalActorUser(
    actorUserId?: string,
  ): Promise<{ id: string } | null> {
    const resolvedActorUserId =
      actorUserId ?? this.requestContextService.getActorUserId();

    if (resolvedActorUserId) {
      const actor = await this.findActorUser(resolvedActorUserId);

      if (!actor) {
        throw new UnauthorizedException('Authentication required');
      }

      return actor;
    }

    return null;
  }

  private findActorUser(actorIdentifier: string) {
    const normalizedIdentifier = actorIdentifier.trim();
    const where = normalizedIdentifier.includes('@')
      ? { email: normalizedIdentifier }
      : { id: normalizedIdentifier };

    return this.prisma.user.findUnique({
      where,
      select: { id: true },
    });
  }
}
