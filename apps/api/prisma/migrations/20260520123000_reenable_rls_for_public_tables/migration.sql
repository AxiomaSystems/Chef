-- Supabase exposes the public schema through its generated APIs.
-- Chef routes application traffic through Nest/Prisma, so public tables should
-- have RLS enabled without broad anon/auth policies.
DO $$
DECLARE
  table_record record;
BEGIN
  FOR table_record IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity IS FALSE
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      table_record.schemaname,
      table_record.tablename
    );
  END LOOP;
END $$;
