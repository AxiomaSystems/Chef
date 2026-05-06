import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import './../src/env';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Tags (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdEmails: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (createdEmails.length > 0) {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: createdEmails,
          },
        },
      });
    }

    await app.close();
  });

  it('lists system tags publicly and supports create/update/delete for user tags', async () => {
    const email = `tags-flow-${Date.now()}@cart-generator.local`;
    const password = 's3cure-passphrase';
    createdEmails.push(email);

    const publicTagsResponse = await request(app.getHttpServer())
      .get('/api/v1/tags')
      .expect(200);

    expect(Array.isArray(publicTagsResponse.body)).toBe(true);
    expect(publicTagsResponse.body.every((tag: { scope: string }) => tag.scope === 'system')).toBe(true);

    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        name: 'Tags Flow User',
        password,
      })
      .expect(201);

    const accessToken = registerResponse.body.access_token as string;

    const createdTagResponse = await request(app.getHttpServer())
      .post('/api/v1/tags')
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        name: 'My Favorites',
      })
      .expect(201);

    expect(createdTagResponse.body).toEqual(
      expect.objectContaining({
        name: 'My Favorites',
        slug: 'my-favorites',
        scope: 'user',
      }),
    );

    const updatedTagResponse = await request(app.getHttpServer())
      .patch(`/api/v1/tags/${createdTagResponse.body.id}`)
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        name: 'My Weeknight Favorites',
      })
      .expect(200);

    expect(updatedTagResponse.body).toEqual(
      expect.objectContaining({
        name: 'My Weeknight Favorites',
        slug: 'my-weeknight-favorites',
      }),
    );

    const visibleTagsResponse = await request(app.getHttpServer())
      .get('/api/v1/tags')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(
      visibleTagsResponse.body.some(
        (tag: { id: string }) => tag.id === createdTagResponse.body.id,
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .delete(`/api/v1/tags/${createdTagResponse.body.id}`)
      .set('authorization', `Bearer ${accessToken}`)
      .expect(204);

    const tagsAfterDelete = await request(app.getHttpServer())
      .get('/api/v1/tags')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(
      tagsAfterDelete.body.some(
        (tag: { id: string }) => tag.id === createdTagResponse.body.id,
      ),
    ).toBe(false);
  });
});
