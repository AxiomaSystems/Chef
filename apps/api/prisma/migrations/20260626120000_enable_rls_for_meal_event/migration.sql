-- Supabase exposes public tables through generated APIs.
-- The app uses Nest/Prisma for access, so keep MealEvent closed to direct
-- anon/authenticated table access unless explicit policies are added later.
ALTER TABLE "MealEvent" ENABLE ROW LEVEL SECURITY;
