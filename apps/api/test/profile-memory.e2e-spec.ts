import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import './../src/env';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { PrismaService } from './../src/prisma/prisma.service';

jest.setTimeout(30_000);

describe('Profile memory flow (e2e)', () => {
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
    const email = `profile-memory-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}@cart-generator.local`;
    createdEmails.push(email);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        name: 'Profile Memory User',
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

  it('upserts profile memory without duplicating repeated onboarding answers', async () => {
    const accessToken = await registerTestUser();
    const mushroom = await createIngredient(
      `test-mushroom-${Date.now()}`,
      'Test Mushroom',
    );
    const rice = await createIngredient(`test-rice-${Date.now()}`, 'Test Rice');

    const firstPatch = await request(app.getHttpServer())
      .patch('/api/v1/me/profile-memory')
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        preferences: {
          household_size: 'two_people',
          favorite_proteins: ['chicken', 'salmon'],
          shopping_location: {
            zip_code: '60611',
            label: 'Chicago, IL',
          },
        },
        food_rules: [
          {
            kind: 'ingredient_preference',
            label: 'Mushrooms',
            ingredient_id: mushroom.id,
            action: 'avoid',
            strictness: 'soft',
            source: 'onboarding',
            confidence: 'high',
            notes: 'First answer',
          },
        ],
        goals: [
          {
            goal: 'save_money',
            priority: 2,
            timeframe: 'default',
            source: 'onboarding',
          },
        ],
        pantry_staple_ingredient_ids: [rice.id],
      })
      .expect(200);

    expect(firstPatch.body.summary.completion).toEqual(
      expect.objectContaining({
        has_household: true,
        has_taste: true,
        has_rules: true,
        has_pantry: true,
        has_location: true,
      }),
    );

    const secondPatch = await request(app.getHttpServer())
      .patch('/api/v1/me/profile-memory')
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        food_rules: [
          {
            kind: 'ingredient_preference',
            label: '  mushrooms ',
            ingredient_id: mushroom.id,
            action: 'avoid',
            strictness: 'hard',
            source: 'manual',
            confidence: 'high',
            notes: 'Revisited answer',
          },
        ],
        goals: [
          {
            goal: 'save_money',
            priority: 1,
            timeframe: 'default',
            source: 'manual',
          },
        ],
      })
      .expect(200);

    const mushroomRules = secondPatch.body.food_rules.filter(
      (rule: { ingredient_id?: string }) => rule.ingredient_id === mushroom.id,
    );
    const saveMoneyGoals = secondPatch.body.goals.filter(
      (goal: { goal: string }) => goal.goal === 'save_money',
    );

    expect(mushroomRules).toHaveLength(1);
    expect(mushroomRules[0]).toEqual(
      expect.objectContaining({
        action: 'avoid',
        strictness: 'hard',
        source: 'manual',
        notes: 'Revisited answer',
      }),
    );
    expect(saveMoneyGoals).toHaveLength(1);
    expect(saveMoneyGoals[0]).toEqual(
      expect.objectContaining({
        priority: 1,
        source: 'manual',
      }),
    );

    const fetchedMemory = await request(app.getHttpServer())
      .get('/api/v1/me/profile-memory')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(fetchedMemory.body.pantry_staples).toEqual([
      expect.objectContaining({
        ingredient_id: rice.id,
        canonical_name: 'Test Rice',
      }),
    ]);
    expect(fetchedMemory.body.summary.rules.hard_rule_count).toBe(1);
  });

  it('rejects unsafe inferred rules and invalid temporal ranges', async () => {
    const accessToken = await registerTestUser();

    await request(app.getHttpServer())
      .patch('/api/v1/me/profile-memory')
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        food_rules: [
          {
            kind: 'dietary_constraint',
            label: 'Halal',
            action: 'require',
            strictness: 'soft',
            source: 'inferred',
            confidence: 'low',
          },
        ],
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/api/v1/me/profile-memory')
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        goals: [
          {
            goal: 'save_money',
            priority: 1,
            starts_at: '2026-06-01T00:00:00.000Z',
            expires_at: '2026-05-01T00:00:00.000Z',
          },
        ],
      })
      .expect(400);
  });
});
