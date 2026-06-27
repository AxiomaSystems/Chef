-- The app routes user traffic through Nest/Prisma, not Supabase generated
-- table APIs. Keep public tables closed to anon/authenticated roles; future
-- direct Supabase reads/writes should add explicit grants and RLS policies.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
