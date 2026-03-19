import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, REQUEST_ID_HEADER } from './app.setup';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);
  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(
    `API running on http://localhost:${port} with docs at http://localhost:${port}/docs and request header ${REQUEST_ID_HEADER}`,
  );
}
bootstrap();
