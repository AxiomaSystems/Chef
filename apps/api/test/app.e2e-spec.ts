import {
  ForbiddenException,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
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
    cuisine_id: 'cuisine-peruvian',
    cuisine: {
      id: 'cuisine-peruvian',
      slug: 'peruvian',
      label: 'Peruvian',
      kind: 'national',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
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
    tag_ids: ['tag-system-updated'],
    tags: [
      {
        id: 'tag-system-updated',
        name: 'Updated',
        slug: 'updated',
        scope: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    recipeService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findManyByIds: jest.fn(),
      findOne: jest.fn(),
      findOrigin: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<RecipeService>;

    cartService = {
      createDraft: jest.fn(),
      updateDraft: jest.fn(),
      removeDraft: jest.fn(),
      listDrafts: jest.fn(),
      findDraft: jest.fn(),
      createCart: jest.fn(),
      updateCart: jest.fn(),
      removeCart: jest.fn(),
      listCarts: jest.fn(),
      findCart: jest.fn(),
      createShoppingCart: jest.fn(),
      listShoppingCarts: jest.fn(),
      listShoppingCartHistory: jest.fn(),
      findShoppingCart: jest.fn(),
    } as unknown as jest.Mocked<CartService>;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        enableShutdownHooks: jest.fn(),
        user: {
          findUnique: jest.fn(async ({ where }: { where: { id?: string; email?: string } }) => ({
            id: where.id ?? 'user-1',
            email: where.email ?? 'user-1@cart-generator.local',
            role: 'user',
          })),
        },
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

  it('serves Swagger OpenAPI JSON with v1 recipe paths', async () => {
    await request(app.getHttpServer())
      .get('/docs/openapi.json')
      .expect(200)
      .expect((response) => {
        expect(response.body.info.title).toBe('Cart Generator API');
        expect(response.body.paths['/api/v1/recipes']).toBeDefined();
      });
  });

  it('PATCH /api/v1/recipes/:id updates a recipe owned by the current user', async () => {
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
      tag_ids: ['tag-system-updated'],
    };

    await request(app.getHttpServer())
      .patch('/api/v1/recipes/recipe-1')
      .set('x-user-id', 'user-1')
      .send(payload)
      .expect(200)
      .expect(recipeResponse);
  });

  it('POST /api/v1/recipe-forks creates an editable user copy from a system recipe', async () => {
    recipeService.save.mockResolvedValue({
      recipe: {
        ...recipeResponse,
        id: 'recipe-copy-1',
        owner_user_id: 'user-1',
        forked_from_recipe_id: 'system-recipe-1',
        is_system_recipe: false,
      },
      created: true,
    });

    await request(app.getHttpServer())
      .post('/api/v1/recipe-forks')
      .set('x-user-id', 'user-1')
      .send({ source_recipe_id: 'system-recipe-1' })
      .expect(201)
      .expect({
        ...recipeResponse,
        id: 'recipe-copy-1',
        owner_user_id: 'user-1',
        forked_from_recipe_id: 'system-recipe-1',
        is_system_recipe: false,
      });
  });

  it('POST /api/v1/recipes returns 401 without auth', async () => {
    recipeService.create.mockRejectedValue(
      new UnauthorizedException('Authentication required'),
    );

    await request(app.getHttpServer())
      .post('/api/v1/recipes')
      .send({
        name: 'Should fail',
        cuisine_id: 'cuisine-peruvian',
        servings: 4,
        ingredients: [
          {
            canonical_ingredient: 'rice',
            amount: 1,
            unit: 'cup',
          },
        ],
        steps: [
          {
            step: 1,
            what_to_do: 'Test',
          },
        ],
      })
      .expect(401);
  });

  it('DELETE /api/v1/recipes/:id returns 204 when the recipe is deleted', async () => {
    recipeService.remove.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete('/api/v1/recipes/recipe-1')
      .set('x-user-id', 'user-1')
      .expect(204);
  });

  it('PATCH /api/v1/recipes/:id returns 403 for a system recipe', async () => {
    recipeService.update.mockRejectedValue(
      new ForbiddenException('System recipes cannot be edited'),
    );

    await request(app.getHttpServer())
      .patch('/api/v1/recipes/system-recipe-1')
      .set('x-user-id', 'user-1')
      .send({
        name: 'Should fail',
      })
      .expect(403);
  });

  it('DELETE /api/v1/recipes/:id returns 404 for a missing recipe', async () => {
    recipeService.remove.mockRejectedValue(
      new NotFoundException('Recipe missing-recipe not found'),
    );

    await request(app.getHttpServer())
      .delete('/api/v1/recipes/missing-recipe')
      .set('x-user-id', 'user-1')
      .expect(404);
  });

  it('POST /api/v1/carts returns 401 without auth', async () => {
    cartService.createCart.mockRejectedValue(
      new UnauthorizedException('Authentication required'),
    );

    await request(app.getHttpServer())
      .post('/api/v1/carts')
      .send({
        selections: [
          {
            recipe_id: 'recipe-1',
            recipe_type: 'base',
            quantity: 1,
          },
        ],
      })
      .expect(401);
  });

  it('POST /api/v1/cart-drafts returns 401 without auth', async () => {
    cartService.createDraft.mockRejectedValue(
      new UnauthorizedException('Authentication required'),
    );

    await request(app.getHttpServer())
      .post('/api/v1/cart-drafts')
      .send({
        selections: [
          {
            recipe_id: 'recipe-1',
            recipe_type: 'base',
            quantity: 1,
          },
        ],
        retailer: 'walmart',
      })
      .expect(401);
  });

  it('GET /api/v1/shopping-carts/history returns shopping cart history summaries for the current user', async () => {
    const history = [
      {
        id: 'shopping-cart-1',
        user_id: 'user-1',
        cart_id: 'cart-1',
        retailer: 'walmart',
        estimated_subtotal: 19.9,
        overview_count: 2,
        matched_item_count: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    cartService.listShoppingCartHistory.mockResolvedValue(history);

    await request(app.getHttpServer())
      .get('/api/v1/shopping-carts/history')
      .set('x-user-id', 'user-1')
      .expect(200)
      .expect(history);
  });
});
