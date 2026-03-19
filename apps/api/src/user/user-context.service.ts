import { Injectable, NotFoundException } from '@nestjs/common';
import { RequestContextService } from '../common/http/request-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_DEV_USER_EMAIL } from './user-context.constants';

@Injectable()
export class UserContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContextService: RequestContextService,
  ) {}

  async resolveActorUser(actorUserId?: string): Promise<{ id: string }> {
    const resolvedActorUserId =
      actorUserId ?? this.requestContextService.getActorUserId();

    if (resolvedActorUserId) {
      const actor = await this.prisma.user.findUnique({
        where: { id: resolvedActorUserId },
        select: { id: true },
      });

      if (!actor) {
        throw new NotFoundException(`User ${resolvedActorUserId} not found`);
      }

      return actor;
    }

    const defaultActor = await this.prisma.user.findUnique({
      where: { email: DEFAULT_DEV_USER_EMAIL },
      select: { id: true },
    });

    if (!defaultActor) {
      throw new NotFoundException(
        `Default dev user ${DEFAULT_DEV_USER_EMAIL} not found`,
      );
    }

    return defaultActor;
  }
}
