-- ============================================
-- KOMPLETNÍ MIGRACE - LARP-centric architektura
-- ============================================

-- KROK 1: Přidání larp_id do tabulek
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS larp_id uuid REFERENCES public.larps(id) ON DELETE CASCADE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS larp_id uuid REFERENCES public.larps(id) ON DELETE CASCADE;
ALTER TABLE public.production_links ADD COLUMN IF NOT EXISTS larp_id uuid REFERENCES public.larps(id) ON DELETE CASCADE;
ALTER TABLE public.printables ADD COLUMN IF NOT EXISTS larp_id uuid REFERENCES public.larps(id) ON DELETE CASCADE;

-- KROK 2: Migrace existujících dat (run_id → larp_id)
UPDATE public.persons SET larp_id = (SELECT larp_id FROM public.runs WHERE runs.id = persons.run_id) WHERE larp_id IS NULL AND run_id IS NOT NULL;
UPDATE public.documents SET larp_id = (SELECT larp_id FROM public.runs WHERE runs.id = documents.run_id) WHERE larp_id IS NULL AND run_id IS NOT NULL;
UPDATE public.production_links SET larp_id = (SELECT larp_id FROM public.runs WHERE runs.id = production_links.run_id) WHERE larp_id IS NULL AND run_id IS NOT NULL;
UPDATE public.printables SET larp_id = (SELECT larp_id FROM public.runs WHERE runs.id = printables.run_id) WHERE larp_id IS NULL AND run_id IS NOT NULL;

-- KROK 3: Vytvořit tabulku run_person_assignments
CREATE TABLE IF NOT EXISTS public.run_person_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  player_name text,
  player_email text,
  paid_at timestamptz,
  access_token uuid NOT NULL DEFAULT gen_random_uuid(),
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(run_id, person_id)
);

ALTER TABLE public.run_person_assignments ENABLE ROW LEVEL SECURITY;

-- KROK 4: Migrace dat z persons do run_person_assignments
INSERT INTO public.run_person_assignments (run_id, person_id, paid_at, access_token, password_hash)
SELECT run_id, id, paid_at, access_token, password_hash 
FROM public.persons 
WHERE run_id IS NOT NULL
ON CONFLICT (run_id, person_id) DO NOTHING;

-- KROK 5: RLS politiky pro run_person_assignments
DROP POLICY IF EXISTS "Vlastník vidí přiřazení" ON public.run_person_assignments;
DROP POLICY IF EXISTS "Vlastník vytváří přiřazení" ON public.run_person_assignments;
DROP POLICY IF EXISTS "Vlastník upravuje přiřazení" ON public.run_person_assignments;
DROP POLICY IF EXISTS "Vlastník maže přiřazení" ON public.run_person_assignments;

CREATE POLICY "Vlastník vidí přiřazení" ON public.run_person_assignments FOR SELECT USING (is_run_owner(run_id));
CREATE POLICY "Vlastník vytváří přiřazení" ON public.run_person_assignments FOR INSERT WITH CHECK (is_run_owner(run_id));
CREATE POLICY "Vlastník upravuje přiřazení" ON public.run_person_assignments FOR UPDATE USING (is_run_owner(run_id));
CREATE POLICY "Vlastník maže přiřazení" ON public.run_person_assignments FOR DELETE USING (is_run_owner(run_id));

-- KROK 6: Aktualizovat RLS politiky pro persons
DROP POLICY IF EXISTS "Vlastník vidí osoby" ON public.persons;
DROP POLICY IF EXISTS "Vlastník vytváří osoby" ON public.persons;
DROP POLICY IF EXISTS "Vlastník upravuje osoby" ON public.persons;
DROP POLICY IF EXISTS "Vlastník maže osoby" ON public.persons;

CREATE POLICY "Vlastník vidí osoby" ON public.persons FOR SELECT USING (is_larp_owner(larp_id));
CREATE POLICY "Vlastník vytváří osoby" ON public.persons FOR INSERT WITH CHECK (is_larp_owner(larp_id));
CREATE POLICY "Vlastník upravuje osoby" ON public.persons FOR UPDATE USING (is_larp_owner(larp_id));
CREATE POLICY "Vlastník maže osoby" ON public.persons FOR DELETE USING (is_larp_owner(larp_id));

-- KROK 7: Aktualizovat RLS politiky pro documents
DROP POLICY IF EXISTS "Vlastník vidí dokumenty" ON public.documents;
DROP POLICY IF EXISTS "Vlastník vytváří dokumenty" ON public.documents;
DROP POLICY IF EXISTS "Vlastník upravuje dokumenty" ON public.documents;
DROP POLICY IF EXISTS "Vlastník maže dokumenty" ON public.documents;

CREATE POLICY "Vlastník vidí dokumenty" ON public.documents FOR SELECT USING (is_larp_owner(larp_id));
CREATE POLICY "Vlastník vytváří dokumenty" ON public.documents FOR INSERT WITH CHECK (is_larp_owner(larp_id));
CREATE POLICY "Vlastník upravuje dokumenty" ON public.documents FOR UPDATE USING (is_larp_owner(larp_id));
CREATE POLICY "Vlastník maže dokumenty" ON public.documents FOR DELETE USING (is_larp_owner(larp_id));

-- KROK 8: Aktualizovat RLS politiky pro production_links
DROP POLICY IF EXISTS "Vlastník vidí produkci" ON public.production_links;
DROP POLICY IF EXISTS "Vlastník vytváří produkci" ON public.production_links;
DROP POLICY IF EXISTS "Vlastník upravuje produkci" ON public.production_links;
DROP POLICY IF EXISTS "Vlastník maže produkci" ON public.production_links;

CREATE POLICY "Vlastník vidí produkci" ON public.production_links FOR SELECT USING (is_larp_owner(larp_id));
CREATE POLICY "Vlastník vytváří produkci" ON public.production_links FOR INSERT WITH CHECK (is_larp_owner(larp_id));
CREATE POLICY "Vlastník upravuje produkci" ON public.production_links FOR UPDATE USING (is_larp_owner(larp_id));
CREATE POLICY "Vlastník maže produkci" ON public.production_links FOR DELETE USING (is_larp_owner(larp_id));

-- KROK 9: Aktualizovat RLS politiky pro printables
DROP POLICY IF EXISTS "Vlastník vidí tiskoviny" ON public.printables;
DROP POLICY IF EXISTS "Vlastník vytváří tiskoviny" ON public.printables;
DROP POLICY IF EXISTS "Vlastník upravuje tiskoviny" ON public.printables;
DROP POLICY IF EXISTS "Vlastník maže tiskoviny" ON public.printables;

CREATE POLICY "Vlastník vidí tiskoviny" ON public.printables FOR SELECT USING (is_larp_owner(larp_id));
CREATE POLICY "Vlastník vytváří tiskoviny" ON public.printables FOR INSERT WITH CHECK (is_larp_owner(larp_id));
CREATE POLICY "Vlastník upravuje tiskoviny" ON public.printables FOR UPDATE USING (is_larp_owner(larp_id));
CREATE POLICY "Vlastník maže tiskoviny" ON public.printables FOR DELETE USING (is_larp_owner(larp_id));

-- KROK 10: Aktualizovat hidden_documents politiky
DROP POLICY IF EXISTS "Vlastník vidí skryté dokumenty" ON public.hidden_documents;
DROP POLICY IF EXISTS "Vlastník vytváří skryté dokumenty" ON public.hidden_documents;
DROP POLICY IF EXISTS "Vlastník maže skryté dokumenty" ON public.hidden_documents;

CREATE POLICY "Vlastník vidí skryté dokumenty" ON public.hidden_documents
FOR SELECT USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = hidden_documents.document_id AND is_larp_owner(d.larp_id)));

CREATE POLICY "Vlastník vytváří skryté dokumenty" ON public.hidden_documents
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = hidden_documents.document_id AND is_larp_owner(d.larp_id)));

CREATE POLICY "Vlastník maže skryté dokumenty" ON public.hidden_documents
FOR DELETE USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = hidden_documents.document_id AND is_larp_owner(d.larp_id)));

-- KROK 11: Drop a recreate create_person_with_password
DROP FUNCTION IF EXISTS public.create_person_with_password(uuid, text, text, person_type, text, text, text, text);

CREATE FUNCTION public.create_person_with_password(
  p_larp_id uuid, 
  p_name text, 
  p_slug text, 
  p_type person_type, 
  p_password text, 
  p_group_name text DEFAULT NULL, 
  p_performer text DEFAULT NULL, 
  p_performance_times text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_person_id uuid;
BEGIN
    INSERT INTO public.persons (larp_id, name, slug, type, password_hash, group_name, performer, performance_times)
    VALUES (p_larp_id, p_name, p_slug, p_type, crypt(p_password, gen_salt('bf')), p_group_name, p_performer, p_performance_times)
    RETURNING id INTO v_person_id;
    RETURN v_person_id;
END;
$$;

-- KROK 12: Nová funkce pro vytvoření přiřazení
CREATE OR REPLACE FUNCTION public.create_person_assignment_with_password(
  p_run_id uuid,
  p_person_id uuid,
  p_password text,
  p_player_name text DEFAULT NULL,
  p_player_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_assignment_id uuid;
BEGIN
    INSERT INTO public.run_person_assignments (run_id, person_id, password_hash, player_name, player_email)
    VALUES (p_run_id, p_person_id, crypt(p_password, gen_salt('bf')), p_player_name, p_player_email)
    RETURNING id INTO v_assignment_id;
    RETURN v_assignment_id;
END;
$$;

-- KROK 13: Nová verze verify_person_access
CREATE OR REPLACE FUNCTION public.verify_person_access(p_access_token uuid, p_password text)
RETURNS TABLE(
  person_id uuid, person_name text, person_type person_type, run_id uuid, 
  larp_name text, run_name text, mission_briefing text, group_name text, 
  performer text, performance_times text, run_contact text, run_footer_text text, 
  larp_theme text, run_payment_account text, run_payment_amount text, 
  run_payment_due_date date, person_paid_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.name, p.type, rpa.run_id, l.name, r.name, r.mission_briefing, p.group_name,
           p.performer, p.performance_times, r.contact, r.footer_text, l.theme,
           r.payment_account, r.payment_amount, r.payment_due_date, rpa.paid_at
    FROM public.run_person_assignments rpa
    JOIN public.persons p ON rpa.person_id = p.id
    JOIN public.runs r ON rpa.run_id = r.id
    JOIN public.larps l ON r.larp_id = l.id
    WHERE rpa.access_token = p_access_token AND rpa.password_hash = crypt(p_password, rpa.password_hash);
END;
$$;

-- KROK 14: Nová verze get_person_documents
CREATE OR REPLACE FUNCTION public.get_person_documents(p_person_id uuid)
RETURNS TABLE(id uuid, title text, content text, doc_type document_type, target_type document_target, sort_order integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_larp_id UUID;
    v_group_name TEXT;
    v_person_type person_type;
BEGIN
    SELECT larp_id, group_name, type INTO v_larp_id, v_group_name, v_person_type FROM public.persons WHERE persons.id = p_person_id;
    
    IF v_person_type = 'cp' THEN
        RETURN QUERY
        SELECT d.id, d.title, d.content, d.doc_type, d.target_type, d.sort_order
        FROM public.documents d WHERE d.larp_id = v_larp_id
        AND NOT EXISTS (SELECT 1 FROM public.hidden_documents hd WHERE hd.document_id = d.id AND hd.person_id = p_person_id)
        ORDER BY d.doc_type, d.sort_order, d.title;
    ELSE
        RETURN QUERY
        SELECT d.id, d.title, d.content, d.doc_type, d.target_type, d.sort_order
        FROM public.documents d WHERE d.larp_id = v_larp_id
        AND (d.target_type = 'vsichni' OR (d.target_type = 'skupina' AND d.target_group = v_group_name) OR (d.target_type = 'osoba' AND d.target_person_id = p_person_id))
        AND NOT EXISTS (SELECT 1 FROM public.hidden_documents hd WHERE hd.document_id = d.id AND hd.person_id = p_person_id)
        ORDER BY d.doc_type, d.sort_order, d.title;
    END IF;
END;
$$;

-- KROK 15: Trigger pro updated_at
DROP TRIGGER IF EXISTS update_run_person_assignments_updated_at ON public.run_person_assignments;
CREATE TRIGGER update_run_person_assignments_updated_at
BEFORE UPDATE ON public.run_person_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();