import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  RequestIdMiddleware,
  REQUEST_ID_HEADER,
} from './common/http/request-id.middleware';

export const configureApp = (app: INestApplication): void => {
  const requestIdMiddleware = new RequestIdMiddleware();

  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Cart Generator API')
    .setDescription(
      'Backend API for recipes, cart drafts, generated carts, and matching.',
    )
    .setVersion('0.1.0')
    .addTag('system')
    .addTag('recipes')
    .addTag('cart')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-user-id',
        description:
          'Optional dev-only actor override header. Example: user-1',
      },
      'x-user-id',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    jsonDocumentUrl: 'docs/openapi.json',
  });
};

export { REQUEST_ID_HEADER };
