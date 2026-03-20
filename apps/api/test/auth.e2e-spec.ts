import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Auth flow (e2e)', () => {
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

  it('supports register, login, refresh, me, and logout', async () => {
    const email = `auth-flow-${Date.now()}@cart-generator.local`;
    const password = 's3cure-passphrase';
    createdEmails.push(email);

    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        name: 'Auth Flow User',
        password,
      })
      .expect(201);

    expect(registerResponse.body.access_token).toEqual(expect.any(String));
    expect(registerResponse.body.refresh_token).toEqual(expect.any(String));
    expect(registerResponse.body.expires_in).toBe('15m');

    const meAfterRegister = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('authorization', `Bearer ${registerResponse.body.access_token}`)
      .expect(200);

    expect(meAfterRegister.body).toEqual(
      expect.objectContaining({
        email,
        name: 'Auth Flow User',
        role: 'user',
      }),
    );
    expect(meAfterRegister.body.auth_providers).toEqual(['password']);
    expect(meAfterRegister.body.onboarding_completed_at).toBeUndefined();

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email,
        password,
      })
      .expect(200);

    expect(loginResponse.body.access_token).toEqual(expect.any(String));
    expect(loginResponse.body.refresh_token).toEqual(expect.any(String));

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({
        refresh_token: loginResponse.body.refresh_token,
      })
      .expect(200);

    expect(refreshResponse.body.access_token).toEqual(expect.any(String));
    expect(refreshResponse.body.refresh_token).toEqual(expect.any(String));
    expect(refreshResponse.body.refresh_token).not.toBe(
      loginResponse.body.refresh_token,
    );

    const meAfterRefresh = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('authorization', `Bearer ${refreshResponse.body.access_token}`)
      .expect(200);

    expect(meAfterRefresh.body.email).toBe(email);

    const ensureSystemTag = async (slug: string, name: string) => {
      const existing = await prisma.tag.findFirst({
        where: { scope: 'system', slug },
      });

      if (existing) {
        return existing;
      }

      return prisma.tag.create({
        data: {
          name,
          slug,
          scope: 'system',
        },
      });
    };

    const [peruvianCuisine, mediterraneanCuisine, weeknightTag, comfortFoodTag] =
      await Promise.all([
        prisma.cuisine.findUnique({ where: { slug: 'peruvian' } }),
        prisma.cuisine.findUnique({ where: { slug: 'mediterranean' } }),
        ensureSystemTag('weeknight', 'Weeknight'),
        ensureSystemTag('comfort-food', 'Comfort Food'),
      ]);

    expect(peruvianCuisine).toBeTruthy();
    expect(mediterraneanCuisine).toBeTruthy();
    expect(weeknightTag).toBeTruthy();
    expect(comfortFoodTag).toBeTruthy();

    const updatedPreferences = await request(app.getHttpServer())
      .put('/api/v1/me/preferences')
      .set('authorization', `Bearer ${refreshResponse.body.access_token}`)
      .send({
        preferred_cuisine_ids: [
          peruvianCuisine!.id,
          mediterraneanCuisine!.id,
        ],
        preferred_tag_ids: [weeknightTag!.id, comfortFoodTag!.id],
      })
      .expect(200);

    expect(updatedPreferences.body).toEqual(
      expect.objectContaining({
        preferred_cuisine_ids: expect.arrayContaining([
          peruvianCuisine!.id,
          mediterraneanCuisine!.id,
        ]),
        preferred_tag_ids: expect.arrayContaining([
          weeknightTag!.id,
          comfortFoodTag!.id,
        ]),
      }),
    );
    expect(updatedPreferences.body.preferred_cuisines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: 'peruvian' }),
        expect.objectContaining({ slug: 'mediterranean' }),
      ]),
    );
    expect(updatedPreferences.body.preferred_tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: 'weeknight', scope: 'system' }),
        expect.objectContaining({ slug: 'comfort-food', scope: 'system' }),
      ]),
    );

    const fetchedPreferences = await request(app.getHttpServer())
      .get('/api/v1/me/preferences')
      .set('authorization', `Bearer ${refreshResponse.body.access_token}`)
      .expect(200);

    expect(fetchedPreferences.body).toEqual(
      expect.objectContaining({
        preferred_cuisine_ids: expect.arrayContaining([
          peruvianCuisine!.id,
          mediterraneanCuisine!.id,
        ]),
        preferred_tag_ids: expect.arrayContaining([
          weeknightTag!.id,
          comfortFoodTag!.id,
        ]),
      }),
    );

    const completeOnboarding = await request(app.getHttpServer())
      .post('/api/v1/me/onboarding/complete')
      .set('authorization', `Bearer ${refreshResponse.body.access_token}`)
      .expect(200);

    expect(completeOnboarding.body.onboarding_completed_at).toEqual(
      expect.any(String),
    );

    const completeOnboardingAgain = await request(app.getHttpServer())
      .post('/api/v1/me/onboarding/complete')
      .set('authorization', `Bearer ${refreshResponse.body.access_token}`)
      .expect(200);

    expect(completeOnboardingAgain.body.onboarding_completed_at).toBe(
      completeOnboarding.body.onboarding_completed_at,
    );

    const meAfterOnboarding = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('authorization', `Bearer ${refreshResponse.body.access_token}`)
      .expect(200);

    expect(meAfterOnboarding.body.onboarding_completed_at).toBe(
      completeOnboarding.body.onboarding_completed_at,
    );

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('authorization', `Bearer ${refreshResponse.body.access_token}`)
      .send({
        refresh_token: refreshResponse.body.refresh_token,
      })
      .expect(200)
      .expect({
        success: true,
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({
        refresh_token: refreshResponse.body.refresh_token,
      })
      .expect(401);
  });

  it('rejects non-system tags in preferences', async () => {
    const email = `auth-prefs-${Date.now()}@cart-generator.local`;
    const password = 's3cure-passphrase';
    createdEmails.push(email);

    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        name: 'Preferences User',
        password,
      })
      .expect(201);

    const [peruvianCuisine, userTag] = await Promise.all([
      prisma.cuisine.findUnique({ where: { slug: 'peruvian' } }),
      prisma.tag.create({
        data: {
          ownerUserId: (
            await prisma.user.findUniqueOrThrow({ where: { email } })
          ).id,
          name: 'Private Interest',
          slug: `private-interest-${Date.now()}`,
          scope: 'user',
        },
      }),
    ]);

    await request(app.getHttpServer())
      .put('/api/v1/me/preferences')
      .set('authorization', `Bearer ${registerResponse.body.access_token}`)
      .send({
        preferred_cuisine_ids: [peruvianCuisine!.id],
        preferred_tag_ids: [userTag.id],
      })
      .expect(403);
  });
});
