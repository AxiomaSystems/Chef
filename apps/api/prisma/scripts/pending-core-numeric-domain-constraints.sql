-- Pending production hardening.
--
-- Most numeric and JSON shape constraints were applied and validated on
-- 2026-06-26. BaseRecipe still fails to acquire a DDL lock quickly because a
-- stale Supavisor session is idle in transaction while holding AccessShareLock.
--
-- Before running this script, inspect the blocker:
--
-- SELECT
--   a.pid,
--   a.usename,
--   a.application_name,
--   a.state,
--   a.wait_event_type,
--   a.wait_event,
--   (now() - a.xact_start)::text AS xact_age,
--   left(a.query, 300) AS query,
--   l.mode,
--   l.granted
-- FROM pg_locks l
-- JOIN pg_class c ON c.oid = l.relation
-- JOIN pg_stat_activity a ON a.pid = l.pid
-- WHERE c.relname = 'BaseRecipe'
-- ORDER BY l.granted, a.xact_start NULLS LAST, a.query_start NULLS LAST;
--
-- If the blocker is confirmed stale and safe to close, terminate that backend
-- first from an admin connection:
--
-- SELECT pg_terminate_backend(<pid>);
--
-- After the lock is clear, convert the constraints below into a new Prisma
-- migration with a fresh timestamp, then apply via `prisma migrate deploy`.

SET LOCAL lock_timeout = '5s';

ALTER TABLE "BaseRecipe"
  ADD CONSTRAINT "BaseRecipe_servings_range_chk"
  CHECK ("servings" >= 1 AND "servings" <= 100) NOT VALID,
  ADD CONSTRAINT "BaseRecipe_name_max_length_chk"
  CHECK (length("name") <= 140) NOT VALID,
  ADD CONSTRAINT "BaseRecipe_description_max_length_chk"
  CHECK ("description" IS NULL OR length("description") <= 1200) NOT VALID,
  ADD CONSTRAINT "BaseRecipe_nutritionData_json_object_chk"
  CHECK (
    "nutritionData" IS NULL
    OR jsonb_typeof("nutritionData") IN ('object', 'null')
  ) NOT VALID;

ALTER TABLE "BaseRecipe" VALIDATE CONSTRAINT "BaseRecipe_servings_range_chk";
ALTER TABLE "BaseRecipe" VALIDATE CONSTRAINT "BaseRecipe_name_max_length_chk";
ALTER TABLE "BaseRecipe" VALIDATE CONSTRAINT "BaseRecipe_description_max_length_chk";
ALTER TABLE "BaseRecipe" VALIDATE CONSTRAINT "BaseRecipe_nutritionData_json_object_chk";
