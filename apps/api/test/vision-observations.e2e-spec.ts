import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import './../src/env';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { PrismaService } from './../src/prisma/prisma.service';

jest.setTimeout(30_000);

describe('Vision observations flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdEmails: string[] = [];
  const createdIngredientSlugs: string[] = [];

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

    if (createdIngredientSlugs.length > 0) {
      await prisma.ingredient.deleteMany({
        where: {
          slug: {
            in: createdIngredientSlugs,
          },
        },
      });
    }

    await app.close();
  });

  async function registerTestUser() {
    const email = `vision-observation-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}@cart-generator.local`;
    createdEmails.push(email);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        name: 'Vision Observation User',
        password: 's3cure-passphrase',
      })
      .expect(201);

    return response.body.access_token as string;
  }

  async function createIngredient(slug: string, canonicalName: string) {
    createdIngredientSlugs.push(slug);

    return prisma.ingredient.upsert({
      where: { slug },
      update: {
        canonicalName,
      },
      create: {
        slug,
        canonicalName,
        category: 'test',
      },
    });
  }

  it('creates, lists, discards, and converts observations into inventory', async () => {
    const accessToken = await registerTestUser();
    await createIngredient('olive-oil', 'olive oil');

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/vision/observations')
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        detected_label: 'bottle',
        proposed_name: 'olive oil bottle',
        canonical_slug: 'olive-oil',
        detector_model: 'yolo-test',
        confidence: 0.82,
        bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
        raw_payload: { source: 'e2e' },
      })
      .expect(201);

    expect(createResponse.body).toEqual(
      expect.objectContaining({
        detected_label: 'bottle',
        proposed_name: 'olive oil bottle',
        canonical_slug: 'olive-oil',
        action: 'pending',
      }),
    );
    expect(createResponse.body.inventory_item_id).toBeUndefined();

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/vision/observations')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createResponse.body.id,
          detected_label: 'bottle',
        }),
      ]),
    );

    const addResponse = await request(app.getHttpServer())
      .post(
        `/api/v1/vision/observations/${createResponse.body.id}/add-to-inventory`,
      )
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        estimated_amount: 1,
        unit: 'bottle',
      })
      .expect(201);

    expect(addResponse.body).toEqual(
      expect.objectContaining({
        id: createResponse.body.id,
        action: 'resolved_to_ingredient',
        inventory_item_id: expect.any(String),
      }),
    );

    const inventoryResponse = await request(app.getHttpServer())
      .get('/api/v1/me/kitchen-inventory')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(inventoryResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: addResponse.body.inventory_item_id,
          display_name: 'olive oil bottle',
          source: 'vision',
          review_status: 'active',
        }),
      ]),
    );

    const discardCandidate = await request(app.getHttpServer())
      .post('/api/v1/vision/observations')
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        detected_label: 'container',
        proposed_name: 'mystery container',
        confidence: 0.31,
      })
      .expect(201);

    const discardResponse = await request(app.getHttpServer())
      .post(`/api/v1/vision/observations/${discardCandidate.body.id}/discard`)
      .set('authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(201);

    expect(discardResponse.body).toEqual(
      expect.objectContaining({
        id: discardCandidate.body.id,
        action: 'discarded',
      }),
    );
  });
});
