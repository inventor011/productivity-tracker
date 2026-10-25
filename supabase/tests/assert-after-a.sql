DO $$
BEGIN
  IF NOT has_function_privilege('authenticated', 'public.username_taken(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.username_taken(text)', 'EXECUTE')
     OR has_function_privilege('public', 'public.username_taken(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'username_taken grants are wrong before the policy lock';
  END IF;
  IF has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE')
     OR has_function_privilege('public', 'public.rls_auto_enable()', 'EXECUTE') THEN
    RAISE EXCEPTION 'rls_auto_enable is still executable before the policy lock';
  END IF;
END $$;

SET ROLE anon;
DO $$
DECLARE
  seen text;
BEGIN
  SELECT string_agg(username, ',' ORDER BY username) INTO seen FROM public.profiles;
  IF seen IS DISTINCT FROM 'ada,bea' THEN
    RAISE EXCEPTION 'old profile read changed before the policy lock: %', seen;
  END IF;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
DO $$
BEGIN
  IF public.username_taken('ada') IS NOT TRUE OR public.username_taken('nobody') IS NOT FALSE THEN
    RAISE EXCEPTION 'username_taken boolean was wrong before the policy lock';
  END IF;
END $$;
RESET ROLE;

DO $$ BEGIN
  CREATE ROLE profile_table_maker NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
GRANT CREATE ON SCHEMA public TO profile_table_maker;
GRANT profile_table_maker TO postgres;
SET ROLE profile_table_maker;
CREATE TABLE public.rls_probe_after_a (id int);
RESET ROLE;
DO $$
DECLARE
  enabled boolean;
BEGIN
  SELECT c.relrowsecurity INTO enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'rls_probe_after_a';
  IF enabled IS NOT TRUE THEN
    RAISE EXCEPTION 'ensure_rls stopped working after the revoke';
  END IF;
END $$;
