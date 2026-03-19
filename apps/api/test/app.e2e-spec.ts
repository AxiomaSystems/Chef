import {
  ForbiddenException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { BaseRecipe } from '@cart/shared';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp, REQUEST_ID_HEADER } from './../src/app.setup';
import { CartService } from './../src/cart/cart.service';
import { PrismaService } from './../src/prisma/prisma.service';
import { RecipeService } from './../src/recipe/recipe.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let recipeService: jest.Mocked<RecipeService>;
  let cartService: jest.Mocked<CartService>;

  const recipeResponse: BaseRecipe = {
    id: 'recipe-1',
    owner_user_id: 'user-1',
    is_system_recipe: false,
    name: 'Arroz con pollo actualizado',
    cuisine: 'Peruvian',
    description: 'Updated recipe',
    servings: 4,
    ingredients: [
      {
        canonical_ingredient: 'rice',
        amount: 2,
        unit: 'cup',
      },
    ],
    steps: [
      {
        step: 1,
        what_to_do: 'Cook the rice',
      },
    ],
    tags: ['updated'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    recipeService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findManyByIds: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<RecipeService>;

    cartService = {
      generate: jest.fn(),
      createDraft: jest.fn(),
      listDrafts: jest.fn(),
      findDraft: jest.fn(),
      listGenerated: jest.fn(),
      listGeneratedHistory: jest.fn(),
      findGenerated: jest.fn(),
    } as unknown as jest.Mocked<CartService>;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        enableShutdownHooks: jest.fn(),
      })
      .overrideProvider(RecipeService)
      .useValue(recipeService)
      .overrideProvider(CartService)
      .useValue(cartService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('adds an x-request-id response header', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((response) => {
        expect(response.headers[REQUEST_ID_HEADER]).toBeDefined();
      });
  });

  it('serves Swagger OpenAPI JSON', async () => {
    await request(app.getHttpServer())
      .get('/docs/openapi.json')
      .expect(200)
      .expect((response) => {
        expect(response.body.info.title).toBe('Cart Generator API');
        expect(response.body.paths['/recipes']).toBeDefined();
      });
  });

  it('PATCH /recipes/:id updates a recipe owned by the current user', async () => {
    recipeService.update.mockResolvedValue(recipeResponse);

    const payload = {
      name: 'Arroz con pollo actualizado',
      servings: 4,
      ingredients: [
        {
          canonical_ingredient: 'rice',
          amount: 2,
          unit: 'cup',
        },
      ],
      steps: [
        {
          step: 1,
          what_to_do: 'Cook the rice',
        },
      ],
      tags: ['updated'],
    };

    await request(app.getHttpServer())
      .patch('/recipes/recipe-1')
      .set('x-user-id', 'user-1')
      .send(payload)
      .expect(200)
      .expect(recipeResponse);

    expect(recipeService.update).toHaveBeenCalledWith(
      'recipe-1',
      expect.objectContaining(payload),
      'user-1',
    );
  });

  it('DELETE /recipes/:id returns 204 when the recipe is deleted', async () => {
    recipeService.remove.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete('/recipes/recipe-1')
      .set('x-user-id', 'user-1')
      .expect(204);

    expect(recipeService.remove).toHaveBeenCalledWith('recipe-1', 'user-1');
  });

  it('PATCH /recipes/:id returns 403 for a system recipe', async () => {
    recipeService.update.mockRejectedValue(
      new ForbiddenException('System recipes cannot be edited'),
    );

    await request(app.getHttpServer())
      .patch('/recipes/system-recipe-1')
      .set('x-user-id', 'user-1')
      .send({
        name: 'Should fail',
      })
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toBe('System recipes cannot be edited');
      });
  });

  it('DELETE /recipes/:id returns 404 for a missing recipe', async () => {
    recipeService.remove.mockRejectedValue(
      new NotFoundException('Recipe missing-recipe not found'),
    );

    await request(app.getHttpServer())
      .delete('/recipes/missing-recipe')
      .set('x-user-id', 'user-1')
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toBe('Recipe missing-recipe not found');
      });
  });

  it('GET /cart/generated/history returns cart history summaries for the current user', async () => {
    const history = [
      {
        id: 'cart-1',
        user_id: 'user-1',
        cart_draft_id: 'draft-1',
        retailer: 'walmart',
        estimated_subtotal: 19.9,
        dish_count: 2,
        overview_count: 2,
        matched_item_count: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    cartService.listGeneratedHistory.mockResolvedValue(history);

    await request(app.getHttpServer())
      .get('/cart/generated/history')
      .set('x-user-id', 'user-1')
      .expect(200)
      .expect(history);

    expect(cartService.listGeneratedHistory).toHaveBeenCalledWith('user-1');
  });

  it('GET /cart/generated/history returns an empty array when the user has no carts', async () => {
    cartService.listGeneratedHistory.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/cart/generated/history')
      .set('x-user-id', 'user-1')
      .expect(200)
      .expect([]);

    expect(cartService.listGeneratedHistory).toHaveBeenCalledWith('user-1');
  });
});
