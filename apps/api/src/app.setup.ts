import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { RequestContextMiddleware } from './common/http/request-context.middleware';
import { RequestContextService } from './common/http/request-context.service';
import { REQUEST_ID_HEADER } from './common/http/request-context.types';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://chef.postigo.sh',
  'https://www.chef.postigo.sh',
];

export const configureApp = (app: INestApplication): void => {
  const requestContextService = app.get(RequestContextService);
  const requestContextMiddleware = new RequestContextMiddleware(
    requestContextService,
  );

  app.use(securityHeaders);
  app.use(requestContextMiddleware.use.bind(requestContextMiddleware));
  app.enableCors({
    origin: buildAllowedOriginMatcher(),
    credentials: false,
    allowedHeaders: ['Authorization', 'Content-Type', REQUEST_ID_HEADER],
    exposedHeaders: [REQUEST_ID_HEADER],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Preppie API')
    .setDescription(
      'Backend API for Preppie auth, profiles, recipes, meal planning, grocery support, shopping carts, and matching.',
    )
    .setVersion('0.1.0')
    .addTag('system')
    .addTag('auth')
    .addTag('me')
    .addTag('cuisines')
    .addTag('tags')
    .addTag('recipes')
    .addTag('recipe-forks')
    .addTag('cart-drafts')
    .addTag('carts')
    .addTag('shopping-carts')
    .addTag('ai')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  if (shouldExposeSwaggerDocs()) {
    SwaggerModule.setup('docs', app, swaggerDocument, {
      jsonDocumentUrl: 'docs/openapi.json',
    });
  }
};

function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
}

function buildAllowedOriginMatcher() {
  const allowedOrigins = new Set(
    (process.env.API_CORS_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS.join(','))
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

  return (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  };
}

function shouldExposeSwaggerDocs(): boolean {
  if (process.env.API_ENABLE_DOCS !== undefined) {
    return process.env.API_ENABLE_DOCS === 'true';
  }

  return process.env.NODE_ENV !== 'production';
}

export { REQUEST_ID_HEADER };
