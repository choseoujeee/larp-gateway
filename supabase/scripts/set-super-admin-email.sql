-- =============================================================================
-- Nastavení e-mailu super administrátora v databázi
-- =============================================================================
-- Použití: V prvním řádku DO bloku níže NAHRAĎTE 'VAS@EMAIL.cz' svým e-mailem
-- (stejný jako VITE_SUPER_ADMIN_EMAIL v .env). Pak vložte celý skript do
-- Supabase Dashboard → SQL Editor → New query → Run.
-- =============================================================================

DO $$
DECLARE
  -- ↓ NAHRAĎTE svým e-mailem super administrátora ↓
  super_admin text := 'VAS@EMAIL.cz';
BEGIN
  -- ---------------------------------------------------------------------------
  -- 1. organizer_accounts – RLS policy (SELECT, INSERT, UPDATE)
  -- ---------------------------------------------------------------------------
  DROP POLICY IF EXISTS "Super admin vidí organizer_accounts" ON public.organizer_accounts;
  CREATE POLICY "Super admin vidí organizer_accounts" ON public.organizer_accounts
    FOR SELECT USING ((auth.jwt() ->> 'email') = super_admin);

  DROP POLICY IF EXISTS "Super admin vkládá organizer_accounts" ON public.organizer_accounts;
  CREATE POLICY "Super admin vkládá organizer_accounts" ON public.organizer_accounts
    FOR INSERT WITH CHECK ((auth.jwt() ->> 'email') = super_admin);

  DROP POLICY IF EXISTS "Super admin upravuje organizer_accounts" ON public.organizer_accounts;
  CREATE POLICY "Super admin upravuje organizer_accounts" ON public.organizer_accounts
    FOR UPDATE USING ((auth.jwt() ->> 'email') = super_admin);

  -- ---------------------------------------------------------------------------
  -- 2. larp_organizers – RLS policy (SELECT, INSERT, DELETE)
  -- ---------------------------------------------------------------------------
  DROP POLICY IF EXISTS "Super admin vidí všechny organizátory" ON public.larp_organizers;
  CREATE POLICY "Super admin vidí všechny organizátory" ON public.larp_organizers
    FOR SELECT USING ((auth.jwt() ->> 'email') = super_admin);

  DROP POLICY IF EXISTS "Super admin přidává organizátory" ON public.larp_organizers;
  CREATE POLICY "Super admin přidává organizátory" ON public.larp_organizers
    FOR INSERT WITH CHECK ((auth.jwt() ->> 'email') = super_admin);

  DROP POLICY IF EXISTS "Super admin maže organizátory" ON public.larp_organizers;
  CREATE POLICY "Super admin maže organizátory" ON public.larp_organizers
    FOR DELETE USING ((auth.jwt() ->> 'email') = super_admin);

  -- ---------------------------------------------------------------------------
  -- 3. Funkce can_access_larp (přístup k LARPu: vlastník / organizátor / super admin)
  -- ---------------------------------------------------------------------------
  EXECUTE format(
    $f$
    CREATE OR REPLACE FUNCTION public.can_access_larp(p_larp_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $q$
      SELECT EXISTS (SELECT 1 FROM public.larps WHERE id = p_larp_id AND owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.larp_organizers WHERE larp_id = p_larp_id AND user_id = auth.uid())
      OR (auth.jwt() ->> 'email' = %L)
    $q$;
    $f$,
    super_admin
  );

  -- ---------------------------------------------------------------------------
  -- 4. can_access_portal_as_organizer (portál hráče)
  -- ---------------------------------------------------------------------------
  EXECUTE format(
    $f$
    CREATE OR REPLACE FUNCTION public.can_access_portal_as_organizer(p_person_slug text)
    RETURNS boolean
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $q$
    DECLARE
      v_larp_id uuid;
    BEGIN
      IF auth.uid() IS NULL THEN RETURN false; END IF;
      IF auth.jwt() ->> 'email' = %L THEN RETURN true; END IF;
      SELECT p.larp_id INTO v_larp_id FROM public.persons p WHERE p.slug = p_person_slug LIMIT 1;
      IF v_larp_id IS NULL THEN RETURN false; END IF;
      RETURN public.can_access_larp(v_larp_id);
    END;
    $q$;
    $f$,
    super_admin
  );

  -- ---------------------------------------------------------------------------
  -- 5. can_access_cp_portal_as_organizer (portál CP)
  -- ---------------------------------------------------------------------------
  EXECUTE format(
    $f$
    CREATE OR REPLACE FUNCTION public.can_access_cp_portal_as_organizer(p_larp_slug text)
    RETURNS boolean
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $q$
    DECLARE
      v_larp_id uuid;
    BEGIN
      IF auth.uid() IS NULL THEN RETURN false; END IF;
      IF auth.jwt() ->> 'email' = %L THEN RETURN true; END IF;
      SELECT id INTO v_larp_id FROM public.larps WHERE slug = p_larp_slug LIMIT 1;
      IF v_larp_id IS NULL THEN RETURN false; END IF;
      RETURN public.can_access_larp(v_larp_id);
    END;
    $q$;
    $f$,
    super_admin
  );

  -- ---------------------------------------------------------------------------
  -- 6. assign_organizer_by_email (pouze super admin)
  -- ---------------------------------------------------------------------------
  EXECUTE format(
    $f$
    CREATE OR REPLACE FUNCTION public.assign_organizer_by_email(p_email text, p_larp_id uuid)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth
    AS $q$
    DECLARE
      v_user_id uuid;
    BEGIN
      IF (auth.jwt() ->> 'email') IS DISTINCT FROM %L THEN
        RAISE EXCEPTION 'Pouze super admin může přidávat organizátory';
      END IF;
      SELECT id INTO v_user_id FROM auth.users WHERE email = lower(trim(p_email)) LIMIT 1;
      IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Uživatel s e-mailem %% nebyl nalezen. Vytvořte účet v Supabase Dashboard (Authentication → Users).', p_email;
      END IF;
      INSERT INTO public.larp_organizers (larp_id, user_id, email)
      VALUES (p_larp_id, v_user_id, trim(p_email))
      ON CONFLICT (larp_id, user_id) DO UPDATE SET email = EXCLUDED.email;
    END;
    $q$;
    $f$,
    super_admin
  );

  RAISE NOTICE 'Super admin e-mail v DB nastaven na: %', super_admin;
END $$;
