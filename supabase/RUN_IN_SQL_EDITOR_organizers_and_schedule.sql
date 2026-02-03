-- =============================================================================
-- Spusť v Supabase Dashboard → SQL Editor jako jeden skript.
-- 1) Organizátoři – přihlášení pomocí loginu (organizer_accounts, get_organizer_auth_email)
-- 2) Harmonogram – unikátnost scény/materiálu v běhu (žádná scéna/materiál 2× v harmonogramu)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ORGANIZÁTOŘI – řešení s loginem (ne e-mail)
-- -----------------------------------------------------------------------------
-- Tabulka organizer_accounts: login (uživatelské jméno), vazba na auth.users, jméno, kontaktní e-mail, telefon.
-- Auth účet se zakládá s e-mailem login@organizer.local (vytváří Edge Function / Admin API).

CREATE TABLE IF NOT EXISTS public.organizer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  login text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_email text NOT NULL,
  display_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizer_accounts_login ON public.organizer_accounts(login);
CREATE INDEX IF NOT EXISTS idx_organizer_accounts_user_id ON public.organizer_accounts(user_id);

COMMENT ON TABLE public.organizer_accounts IS 'Organizátoři: login (přihlašovací jméno), auth_email (e-mail v auth.users = login@organizer.local), display_name, contact_email, contact_phone.';

ALTER TABLE public.organizer_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin vidí organizer_accounts" ON public.organizer_accounts;
DROP POLICY IF EXISTS "Organizátor vidí svůj účet" ON public.organizer_accounts;
DROP POLICY IF EXISTS "Super admin vkládá organizer_accounts" ON public.organizer_accounts;
DROP POLICY IF EXISTS "Super admin upravuje organizer_accounts" ON public.organizer_accounts;

CREATE POLICY "Super admin vidí organizer_accounts" ON public.organizer_accounts
  FOR SELECT USING ((auth.jwt() ->> 'email') = 'chousef@gmail.com');
CREATE POLICY "Organizátor vidí svůj účet" ON public.organizer_accounts
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Super admin vkládá organizer_accounts" ON public.organizer_accounts
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'email') = 'chousef@gmail.com');
CREATE POLICY "Super admin upravuje organizer_accounts" ON public.organizer_accounts
  FOR UPDATE USING ((auth.jwt() ->> 'email') = 'chousef@gmail.com');

-- RPC: vrátit auth e-mail pro daný login (pro přihlášení na klientu: client pak zavolá signInWithPassword(email, password))
CREATE OR REPLACE FUNCTION public.get_organizer_auth_email(p_login text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth_email FROM public.organizer_accounts WHERE login = trim(lower(p_login)) LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_organizer_auth_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_organizer_auth_email(text) TO authenticated;

-- Trigger updated_at pro organizer_accounts
CREATE OR REPLACE FUNCTION public.update_organizer_accounts_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS update_organizer_accounts_updated_at ON public.organizer_accounts;
CREATE TRIGGER update_organizer_accounts_updated_at
  BEFORE UPDATE ON public.organizer_accounts FOR EACH ROW EXECUTE FUNCTION public.update_organizer_accounts_updated_at();


-- -----------------------------------------------------------------------------
-- 2. HARMONOGRAM – unikátnost scény a materiálu v běhu
-- -----------------------------------------------------------------------------
-- Žádná scéna (cp_scene_id) ani materiál (material_id) nesmí být v jednom běhu přiřazen v harmonogramu víc než jednou.
-- Nejdřív smaž duplicity (u každé dvojice zůstane záznam s menším id).

DELETE FROM public.schedule_events a
USING public.schedule_events b
WHERE a.cp_scene_id IS NOT NULL
  AND a.run_id = b.run_id
  AND a.cp_scene_id = b.cp_scene_id
  AND a.id > b.id;

DELETE FROM public.schedule_events a
USING public.schedule_events b
WHERE a.material_id IS NOT NULL
  AND a.run_id = b.run_id
  AND a.material_id = b.material_id
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_events_run_cp_scene_unique
  ON public.schedule_events (run_id, cp_scene_id)
  WHERE cp_scene_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_events_run_material_unique
  ON public.schedule_events (run_id, material_id)
  WHERE material_id IS NOT NULL;


-- =============================================================================
-- 3. JAK PŘIDAT ORGANIZÁTORA (bez Edge Function – např. v Lovable)
-- =============================================================================
-- Edge Function se v SQL Editoru nasadit nedá. Nového organizátora přidáš takto:
--
-- Krok 1: Supabase Dashboard → Authentication → Users → "Add user"
--   - Email: LOGIN@organizer.local  (např. hugo@organizer.local)
--   - Password: heslo (min. 6 znaků)
--   - Zaškrtni "Auto Confirm User"
--   - Po uložení zkopíruj "User UID" (UUID).
--
-- Krok 2: V SQL Editoru spusť níže šablonu – nahraď:
--   - USER_UUID_Z_DASHBOARDU  = zkopírované User UID
--   - login                  = přihlašovací jméno (malými, např. hugo)
--   - LARP_UUID              = id LARPu z tabulky larps (např. SELECT id, name FROM larps;)
--   - display_name, contact_email, contact_phone dle potřeby
--
-- Šablona (odkomentuj a doplň hodnoty, pak spusť):

/*
INSERT INTO public.organizer_accounts (login, user_id, auth_email, display_name, contact_email, contact_phone)
VALUES (
  'hugo',                              -- login (malými písmeny)
  'USER_UUID_Z_DASHBOARDU'::uuid,      -- User UID z Authentication → Users
  'hugo@organizer.local',              -- auth_email = login + @organizer.local
  'Hugo Boss',                         -- display_name (volitelné)
  'jan@example.cz',                   -- contact_email (volitelné)
  '+420 123 456 789'                   -- contact_phone (volitelné)
);

INSERT INTO public.larp_organizers (larp_id, user_id, email)
VALUES (
  'LARP_UUID'::uuid,                   -- id LARPu z tabulky larps
  'USER_UUID_Z_DASHBOARDU'::uuid,      -- stejný User UID jako výše
  'jan@example.cz'                     -- kontaktní e-mail
);
*/
