import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import './../src/env';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { PrismaService } from './../src/prisma/prisma.service';

jest.setTimeout(30_000);

describe('Launch cart flow (e2e)', () => {
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

  async function registerTestUser() {
    const email = `launch-flow-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}@cart-generator.local`;
    createdEmails.push(email);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        name: 'Launch Flow User',
        password: 's3cure-passphrase',
      })
      .expect(201);

    return response.body.access_token as string;
  }

  async function ensureCuisine() {
    return prisma.cuisine.upsert({
      where: { slug: 'american' },
      update: {
        label: 'American',
        kind: 'national',
      },
      create: {
        slug: 'american',
        label: 'American',
        kind: 'national',
      },
    });
  }

  it('creates a recipe, cart, ingredient review, and shopping cart through the public API', async () => {
    const accessToken = await registerTestUser();
    const cuisine = await ensureCuisine();

    const recipeResponse = await request(app.getHttpServer())
      .post('/api/v1/recipes')
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Launch Flow Chicken Rice',
        cuisine_id: cuisine.id,
        description: 'Stable e2e fixture recipe.',
        servings: 4,
        ingredients: [
          {
            canonical_ingredient: 'rice',
            amount: 2,
            unit: 'cup',
          },
          {
            canonical_ingredient: 'chicken thigh',
            amount: 800,
            unit: 'g',
          },
        ],
        steps: [
          {
            step: 1,
            what_to_do: 'Cook the rice and chicken.',
          },
        ],
      })
      .expect(201);

    expect(recipeResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: 'Launch Flow Chicken Rice',
        owner_user_id: expect.any(String),
        is_system_recipe: false,
      }),
    );

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Launch Flow Dinner Cart',
        retailer: 'walmart',
        selections: [
          {
            recipe_id: recipeResponse.body.id,
            recipe_type: 'base',
            quantity: 1,
          },
        ],
      })
      .expect(201);

    expect(cartResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        retailer: 'walmart',
        selections: [
          expect.objectContaining({
            recipe_id: recipeResponse.body.id,
          }),
        ],
      }),
    );
    expect(cartResponse.body.overview).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonical_ingredient: 'rice',
          total_amount: 2,
          unit: 'cup',
        }),
        expect.objectContaining({
          canonical_ingredient: 'chicken thigh',
          total_amount: 800,
          unit: 'g',
        }),
      ]),
    );

    const initialReview = await request(app.getHttpServer())
      .get(`/api/v1/carts/${cartResponse.body.id}/ingredient-review`)
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(initialReview.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonical_ingredient: 'rice',
          action: 'buy',
        }),
      ]),
    );

    const updatedReview = await request(app.getHttpServer())
      .put(`/api/v1/carts/${cartResponse.body.id}/ingredient-review`)
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        items: [
          {
            canonical_ingredient: 'rice',
            unit: 'cup',
            action: 'already_have',
          },
          {
            canonical_ingredient: 'chicken thigh',
            unit: 'g',
            action: 'adjust',
            adjusted_amount: 400,
            adjusted_unit: 'g',
          },
        ],
      })
      .expect(200);

    expect(updatedReview.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonical_ingredient: 'rice',
          action: 'already_have',
        }),
        expect.objectContaining({
          canonical_ingredient: 'chicken thigh',
          action: 'adjust',
          adjusted_amount: 400,
        }),
      ]),
    );

    const shoppingCartResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.id}/shopping-carts`)
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        retailer: 'walmart',
      })
      .expect(201);

    expect(shoppingCartResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        cart_id: cartResponse.body.id,
        retailer: 'walmart',
        estimated_subtotal: expect.any(Number),
      }),
    );
    expect(shoppingCartResponse.body.overview).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonical_ingredient: 'rice',
          in_kitchen: true,
          review_action: 'already_have',
        }),
        expect.objectContaining({
          canonical_ingredient: 'chicken thigh',
          total_amount: 400,
          review_action: 'adjust',
        }),
      ]),
    );
    expect(shoppingCartResponse.body.matched_items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonical_ingredient: 'chicken thigh',
          needed_amount: 400,
        }),
      ]),
    );
    expect(
      shoppingCartResponse.body.matched_items.some(
        (item: { canonical_ingredient: string }) =>
          item.canonical_ingredient === 'rice',
      ),
    ).toBe(false);
  });
});
