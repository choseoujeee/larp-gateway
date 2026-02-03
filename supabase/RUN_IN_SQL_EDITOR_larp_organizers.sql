-- =============================================================================
-- Spusť v Supabase SQL Editoru. Vytvoří tabulku larp_organizers a související
-- funkce/RLS (přístup organizátorů k LARPům). Po spuštění můžeš znovu spustit
-- RUN_IN_SQL_EDITOR_add_organizer_hugo.sql.
-- =============================================================================

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

DROP POLICY IF EXISTS "Super admin vidí všechny organizátory" ON public.larp_organizers;
DROP POLICY IF EXISTS "Organizátor vidí své přiřazení" ON public.larp_organizers;
DROP POLICY IF EXISTS "Super admin přidává organizátory" ON public.larp_organizers;
DROP POLICY IF EXISTS "Super admin maže organizátory" ON public.larp_organizers;

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

-- 3. RLS na larps: přístup i pro organizátory
DROP POLICY IF EXISTS "Vlastník vidí své LARPy" ON public.larps;
DROP POLICY IF EXISTS "Vlastník nebo organizátor vidí LARPy" ON public.larps;
DROP POLICY IF EXISTS "Vlastník upravuje LARPy" ON public.larps;
DROP POLICY IF EXISTS "Vlastník nebo organizátor upravuje LARPy" ON public.larps;
DROP POLICY IF EXISTS "Vlastník maže LARPy" ON public.larps;
DROP POLICY IF EXISTS "Vlastník nebo organizátor maže LARPy" ON public.larps;

CREATE POLICY "Vlastník nebo organizátor vidí LARPy" ON public.larps FOR SELECT USING (public.can_access_larp(id));
CREATE POLICY "Vlastník nebo organizátor upravuje LARPy" ON public.larps FOR UPDATE USING (public.can_access_larp(id));
CREATE POLICY "Vlastník nebo organizátor maže LARPy" ON public.larps FOR DELETE USING (public.can_access_larp(id));

-- 4. is_larp_owner a is_run_owner (používají can_access_larp)
CREATE OR REPLACE FUNCTION public.is_larp_owner(larp_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.can_access_larp(larp_id) $$;

CREATE OR REPLACE FUNCTION public.is_run_owner(run_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.can_access_larp((SELECT larp_id FROM public.runs WHERE id = run_id)) $$;

-- 5. RPC: seznam LARPů, u nichž je aktuální uživatel organizátor
CREATE OR REPLACE FUNCTION public.get_my_organizer_larp_ids()
RETURNS TABLE(larp_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT lo.larp_id FROM public.larp_organizers lo WHERE lo.user_id = auth.uid() $$;
