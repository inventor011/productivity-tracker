DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'username_taken'
  ) THEN
    RAISE EXCEPTION 'username_taken is missing';
  END IF;
END $$;

DO $$
DECLARE
  config text[];
BEGIN
  SELECT p.proconfig INTO config
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'username_taken';
  IF config IS NULL OR NOT (config @> ARRAY['search_path=""']) THEN
    RAISE EXCEPTION 'username_taken search_path is %', config;
  END IF;
END $$;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.username_taken(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute username_taken';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.username_taken(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated cannot execute username_taken';
  END IF;
  IF has_function_privilege('public', 'public.username_taken(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'public can execute username_taken';
  END IF;
  IF has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE')
     OR has_function_privilege('public', 'public.rls_auto_enable()', 'EXECUTE') THEN
    RAISE EXCEPTION 'rls_auto_enable is still executable by anon, authenticated, or public';
  END IF;
END $$;

DO $$
DECLARE
  open_reads int;
BEGIN
  SELECT count(*) INTO open_reads
  FROM pg_policy
  WHERE polrelid = 'public.profiles'::regclass
    AND polcmd = 'r'
    AND pg_get_expr(polqual, polrelid) = 'true';
  IF open_reads <> 0 THEN
    RAISE EXCEPTION 'a public profile read policy is still present';
  END IF;
END $$;

SET ROLE anon;
DO $$
DECLARE
  seen int;
BEGIN
  SELECT count(*) INTO seen FROM public.profiles;
  IF seen <> 0 THEN
    RAISE EXCEPTION 'anon read % profile rows', seen;
  END IF;
END $$;
DO $$
BEGIN
  PERFORM public.username_taken('ada');
  RAISE EXCEPTION 'anon called username_taken';
EXCEPTION
  WHEN insufficient_privilege THEN
    NULL;
END $$;
DO $$
BEGIN
  PERFORM public.rls_auto_enable();
  RAISE EXCEPTION 'anon called rls_auto_enable';
EXCEPTION
  WHEN insufficient_privilege THEN
    NULL;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
DO $$
DECLARE
  seen text;
  taken boolean;
  free_name boolean;
BEGIN
  SELECT string_agg(username || ':' || display_name, ',' ORDER BY username) INTO seen
  FROM public.profiles;
  IF seen IS DISTINCT FROM 'bea:Bea' THEN
    RAISE EXCEPTION 'bea saw %', seen;
  END IF;
  taken := public.username_taken('ada');
  free_name := public.username_taken('nobody');
  IF taken IS NOT TRUE OR free_name IS NOT FALSE THEN
    RAISE EXCEPTION 'username_taken returned ada=% nobody=%', taken, free_name;
  END IF;
  IF pg_typeof(taken)::text <> 'boolean' THEN
    RAISE EXCEPTION 'username_taken returned %', pg_typeof(taken);
  END IF;
END $$;
RESET ROLE;

CREATE SCHEMA IF NOT EXISTS evil;
CREATE TABLE IF NOT EXISTS evil.profiles (
  id uuid,
  display_name text,
  username text
);
INSERT INTO evil.profiles (id, display_name, username)
VALUES ('99999999-9999-9999-9999-999999999999', 'Hidden', 'only_in_evil');

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
SET search_path = evil, public;
DO $$
DECLARE
  seen text;
BEGIN
  SELECT string_agg(username || ':' || display_name, ',' ORDER BY username) INTO seen
  FROM public.profiles;
  IF seen IS DISTINCT FROM 'ada:Ada' THEN
    RAISE EXCEPTION 'ada saw %', seen;
  END IF;
  IF public.username_taken('only_in_evil') THEN
    RAISE EXCEPTION 'username_taken followed search_path';
  END IF;
  IF NOT public.username_taken('ada') THEN
    RAISE EXCEPTION 'username_taken missed ada';
  END IF;
END $$;
RESET ROLE;
SET search_path = public;

DO $$ BEGIN
  CREATE ROLE profile_table_maker NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
GRANT CREATE ON SCHEMA public TO profile_table_maker;
GRANT profile_table_maker TO postgres;
SET ROLE profile_table_maker;
CREATE TABLE public.rls_probe_new (id int);
RESET ROLE;
DO $$
DECLARE
  enabled boolean;
BEGIN
  SELECT c.relrowsecurity INTO enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'rls_probe_new';
  IF enabled IS NOT TRUE THEN
    RAISE EXCEPTION 'ensure_rls did not enable row security on rls_probe_new';
  END IF;
END $$;
