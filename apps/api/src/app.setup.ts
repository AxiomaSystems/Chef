import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RequestContextMiddleware } from './common/http/request-context.middleware';
import { RequestContextService } from './common/http/request-context.service';
import { REQUEST_ID_HEADER } from './common/http/request-context.types';

export const configureApp = (app: INestApplication): void => {
  const requestContextService = app.get(RequestContextService);
  const requestContextMiddleware = new RequestContextMiddleware(
    requestContextService,
  );

  app.use(requestContextMiddleware.use.bind(requestContextMiddleware));
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
      'Backend API for auth, profiles, recipes, cart drafts, carts, shopping carts, matching, and stage-1 vision detection.',
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
    .addTag('vision')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    jsonDocumentUrl: 'docs/openapi.json',
  });
};

export { REQUEST_ID_HEADER };
