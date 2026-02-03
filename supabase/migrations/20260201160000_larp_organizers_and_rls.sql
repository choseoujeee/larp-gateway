-- Správa rolí: larp_organizers + rozšíření RLS o organizátory a super admina (chousef@gmail.com)

-- 1. Tabulka organizátorů přiřazených k LARPům
CREATE TABLE IF NOT EXISTS public.larp_organizers (
  larp_id uuid NOT NULL REFERENCES public.larps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (larp_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_larp_organizers_user_id ON public.larp_organizers(user_id);
ALTER TABLE public.larp_organizers ENABLE ROW LEVEL SECURITY;

-- Pouze super admin může přidávat/mazat; organizátor vidí jen své řádky (pro kontext)
CREATE POLICY "Super admin vidí všechny organizátory" ON public.larp_organizers
  FOR SELECT USING ((auth.jwt() ->> 'email') = 'chousef@gmail.com');
CREATE POLICY "Organizátor vidí své přiřazení" ON public.larp_organizers
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Super admin přidává organizátory" ON public.larp_organizers
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'email') = 'chousef@gmail.com');
CREATE POLICY "Super admin maže organizátory" ON public.larp_organizers
  FOR DELETE USING ((auth.jwt() ->> 'email') = 'chousef@gmail.com');

-- 2. Helper: přístup k LARPu (vlastník / organizátor / super admin)
CREATE OR REPLACE FUNCTION public.can_access_larp(p_larp_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.larps WHERE id = p_larp_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.larp_organizers WHERE larp_id = p_larp_id AND user_id = auth.uid())
  OR (auth.jwt() ->> 'email' = 'chousef@gmail.com')
$$;

-- 3. Rozšířit RLS na tabulce larps: přístup i pro organizátory a super admina
DROP POLICY IF EXISTS "Vlastník vidí své LARPy" ON public.larps;
DROP POLICY IF EXISTS "Vlastník upravuje LARPy" ON public.larps;
DROP POLICY IF EXISTS "Vlastník maže LARPy" ON public.larps;
CREATE POLICY "Vlastník nebo organizátor vidí LARPy" ON public.larps FOR SELECT USING (public.can_access_larp(id));
CREATE POLICY "Vlastník nebo organizátor upravuje LARPy" ON public.larps FOR UPDATE USING (public.can_access_larp(id));
CREATE POLICY "Vlastník nebo organizátor maže LARPy" ON public.larps FOR DELETE USING (public.can_access_larp(id));
-- INSERT zůstává jen pro vlastníka (nové LARPy zakládá super admin jako owner)
-- "Vlastník vytváří LARPy" již existuje: WITH CHECK (auth.uid() = owner_id)

-- 4. Přepsat is_larp_owner a is_run_owner tak, aby používaly can_access_larp
CREATE OR REPLACE FUNCTION public.is_larp_owner(larp_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_access_larp(larp_id)
$$;

CREATE OR REPLACE FUNCTION public.is_run_owner(run_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_access_larp((SELECT larp_id FROM public.runs WHERE id = run_id))
$$;

-- 5. RPC: seznam LARPů, u nichž je aktuální uživatel organizátor (pro frontend)
CREATE OR REPLACE FUNCTION public.get_my_organizer_larp_ids()
RETURNS TABLE(larp_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lo.larp_id FROM public.larp_organizers lo WHERE lo.user_id = auth.uid()
$$;

-- 6. RPC: může aktuální uživatel (organizátor/super admin) vstoupit na portál bez hesla?
-- Pro hráčský portál: person_slug → zjistit larp_id osoby
CREATE OR REPLACE FUNCTION public.can_access_portal_as_organizer(p_person_slug text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_larp_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF auth.jwt() ->> 'email' = 'chousef@gmail.com' THEN RETURN true; END IF;
  SELECT p.larp_id INTO v_larp_id FROM public.persons p WHERE p.slug = p_person_slug LIMIT 1;
  IF v_larp_id IS NULL THEN RETURN false; END IF;
  RETURN public.can_access_larp(v_larp_id);
END;
$$;

-- Pro portál všech CP: larp_slug → zjistit larp_id
CREATE OR REPLACE FUNCTION public.can_access_cp_portal_as_organizer(p_larp_slug text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_larp_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF auth.jwt() ->> 'email' = 'chousef@gmail.com' THEN RETURN true; END IF;
  SELECT id INTO v_larp_id FROM public.larps WHERE slug = p_larp_slug LIMIT 1;
  IF v_larp_id IS NULL THEN RETURN false; END IF;
  RETURN public.can_access_larp(v_larp_id);
END;
$$;

-- 7. RPC: přiřadit existujícího uživatele (podle e-mailu) k LARPu jako organizátora (jen super admin)
CREATE OR REPLACE FUNCTION public.assign_organizer_by_email(p_email text, p_larp_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF (auth.jwt() ->> 'email') IS DISTINCT FROM 'chousef@gmail.com' THEN
    RAISE EXCEPTION 'Pouze super admin může přidávat organizátory';
  END IF;
  SELECT id INTO v_user_id FROM auth.users WHERE email = lower(trim(p_email)) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Uživatel s e-mailem % nebyl nalezen. Vytvořte účet v Supabase Dashboard (Authentication → Users).', p_email;
  END IF;
  INSERT INTO public.larp_organizers (larp_id, user_id, email)
  VALUES (p_larp_id, v_user_id, trim(p_email))
  ON CONFLICT (larp_id, user_id) DO UPDATE SET email = EXCLUDED.email;
END;
$$;

-- 8. RPC: vrátit portálovou session pro danou osobu (organizátor/super admin bez hesla)
CREATE OR REPLACE FUNCTION public.get_portal_session_as_organizer(p_person_slug text)
RETURNS TABLE(person_id uuid, person_name text, person_type person_type, larp_id uuid, larp_name text, larp_slug text, larp_theme text, larp_motto text, group_name text, performer text, performance_times text, run_id uuid, run_name text, run_date_from date, run_date_to date, run_location text, run_address text, mission_briefing text, person_medailonek text, run_footer_text text, run_contact text, run_payment_account text, run_payment_amount text, run_payment_due_date date, person_paid_at timestamp with time zone, player_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_access_portal_as_organizer(p_person_slug) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.type,
    p.larp_id,
    l.name,
    l.slug,
    l.theme,
    l.motto,
    p.group_name,
    p.performer,
    p.performance_times,
    r.id,
    r.name,
    r.date_from,
    r.date_to,
    r.location,
    r.address,
    r.mission_briefing,
    p.medailonek,
    r.footer_text,
    r.contact,
    r.payment_account,
    r.payment_amount,
    r.payment_due_date,
    p.paid_at,
    rpa.player_name
  FROM public.persons p
  JOIN public.larps l ON p.larp_id = l.id
  LEFT JOIN public.runs r ON r.larp_id = l.id AND r.is_active = true
  LEFT JOIN public.run_person_assignments rpa ON rpa.person_id = p.id AND rpa.run_id = r.id
  WHERE p.slug = p_person_slug
  LIMIT 1;
END;
$$;
