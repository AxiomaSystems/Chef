import { randomUUID } from 'node:crypto';
import { Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { RequestContextService } from './request-context.service';
import { REQUEST_ID_HEADER } from './request-context.types';

type RequestWithContext = Request & {
  requestId?: string;
};

export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly requestContextService: RequestContextService) {}

  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    const incomingRequestId = req.header(REQUEST_ID_HEADER);
    const requestId = incomingRequestId?.trim() || randomUUID();
    const startedAt = Date.now();

    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    this.requestContextService.run({ requestId }, () => {
      res.on('finish', () => {
        const durationMs = Date.now() - startedAt;
        const resolvedActorUserId = this.requestContextService.getActorUserId();
        const actorSuffix = resolvedActorUserId
          ? ` actor=${resolvedActorUserId}`
          : '';
        this.logger.log(
          `[${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms${actorSuffix}`,
        );
      });

      next();
    });
  }
}
