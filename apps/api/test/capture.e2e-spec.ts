import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import './../src/env';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { AuthTokenService } from './../src/auth/auth-token.service';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Chef Capture (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authTokenService: AuthTokenService;
  let previousLlmProvider: string | undefined;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    previousLlmProvider = process.env.CHEF_LLM_PROVIDER;
    process.env.CHEF_LLM_PROVIDER = 'mock';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    authTokenService = app.get(AuthTokenService);
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: createdUserIds,
          },
        },
      });
    }

    await app.close();

    if (previousLlmProvider === undefined) {
      delete process.env.CHEF_LLM_PROVIDER;
    } else {
      process.env.CHEF_LLM_PROVIDER = previousLlmProvider;
    }
  });

  it('creates and fetches a reviewable text capture draft', async () => {
    const token = await registerUser();

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/captures')
      .set('authorization', `Bearer ${token}`)
      .send({
        text: 'ingredients: pasta, tomato, cream\nsteps: cook pasta and toss with sauce',
      })
      .expect(201);

    expect(createResponse.body).toEqual(
      expect.objectContaining({
        input_kind: 'text',
        source_kind: 'pasted_text',
        result_kind: 'partial_recipe_import',
        status: 'ready_for_review',
        confidence: expect.any(String),
        needs_review: true,
      }),
    );
    expect(createResponse.body.result_kind).not.toBe('needs_more_info');
    expect(createResponse.body.source_attribution).toEqual(
      expect.objectContaining({
        attribution_label: 'Generated from pasted text',
      }),
    );
    expect(createResponse.body.recipe_preview.name).toEqual(expect.any(String));

    const getResponse = await request(app.getHttpServer())
      .get(`/api/v1/captures/${createResponse.body.id}`)
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    expect(getResponse.body.id).toBe(createResponse.body.id);
  });

  it('saves a capture draft as a visible user recipe', async () => {
    const token = await registerUser();

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/captures')
      .set('authorization', `Bearer ${token}`)
      .send({
        text: 'ingredients: pasta, tomato, cream\nsteps: cook pasta and toss with sauce',
      })
      .expect(201);

    const saveResponse = await request(app.getHttpServer())
      .post(`/api/v1/captures/${createResponse.body.id}/save-recipe`)
      .set('authorization', `Bearer ${token}`)
      .expect(201);

    expect(saveResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        owner_user_id: expect.any(String),
        is_system_recipe: false,
        name: expect.any(String),
      }),
    );
    expect(saveResponse.body.ingredients.length).toBeGreaterThan(0);
    expect(saveResponse.body.steps.length).toBeGreaterThan(0);

    const savedCapture = await request(app.getHttpServer())
      .get(`/api/v1/captures/${createResponse.body.id}`)
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    expect(savedCapture.body).toEqual(
      expect.objectContaining({
        status: 'saved',
        saved_recipe_id: saveResponse.body.id,
      }),
    );

    await request(app.getHttpServer())
      .get(`/api/v1/recipes/${saveResponse.body.id}`)
      .set('authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('creates a reviewable image capture draft', async () => {
    const token = await registerUser();

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/captures')
      .set('authorization', `Bearer ${token}`)
      .send({
        input_kind: 'image',
        image_data_url: 'data:image/jpeg;base64,AAAA',
        text: 'photo of a recipe card',
      })
      .expect(201);

    expect(createResponse.body).toEqual(
      expect.objectContaining({
        input_kind: 'image',
        source_kind: 'image',
        result_kind: 'partial_recipe_import',
        status: 'ready_for_review',
        needs_review: true,
        source_text_snippet: 'photo of a recipe card',
      }),
    );
    expect(
      createResponse.body.recipe_preview.ingredients.length,
    ).toBeGreaterThan(0);
  });

  it('requires authentication for capture endpoints', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/captures')
      .send({ text: 'make soup' })
      .expect(401);
  });

  async function registerUser() {
    const email = `capture-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}@cart-generator.local`;

    const user = await prisma.user.create({
      data: {
        email,
        name: 'Capture User',
      },
    });
    createdUserIds.push(user.id);

    return authTokenService.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
});
