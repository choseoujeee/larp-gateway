-- Správa organizátorů: přihlášení pomocí loginu (ne e-mailu).
-- Tabulka organizer_accounts: login (uživatelské jméno), vazba na auth.users, jméno, kontaktní e-mail, telefon.
-- Auth účet se zakládá s e-mailem login@organizer.local (vytváří Edge Function / Admin API).

-- 1. Tabulka organizer_accounts (jeden řádek na organizátora – uživatelský účet)
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

-- Pouze super admin vidí všechny; organizátor vidí jen svůj řádek (pro kontext)
CREATE POLICY "Super admin vidí organizer_accounts" ON public.organizer_accounts
  FOR SELECT USING ((auth.jwt() ->> 'email') = 'chousef@gmail.com');
CREATE POLICY "Organizátor vidí svůj účet" ON public.organizer_accounts
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Super admin vkládá organizer_accounts" ON public.organizer_accounts
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'email') = 'chousef@gmail.com');
CREATE POLICY "Super admin upravuje organizer_accounts" ON public.organizer_accounts
  FOR UPDATE USING ((auth.jwt() ->> 'email') = 'chousef@gmail.com');

-- 2. RPC: vrátit auth e-mail pro daný login (pro přihlášení na klientu: client pak zavolá signInWithPassword(email, password))
-- Volatelné i bez přihlášení (anon), aby přihlašovací stránka mohla zjistit e-mail pro zadaný login.
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

-- 3. Trigger updated_at pro organizer_accounts
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
