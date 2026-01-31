-- =================================
-- LARP PORTÁL - KOMPLETNÍ DATABÁZE
-- =================================

-- Enum pro typy dokumentů
CREATE TYPE public.document_type AS ENUM ('organizacni', 'herni', 'postava', 'medailonek', 'cp');

-- Enum pro cílení dokumentů
CREATE TYPE public.document_target AS ENUM ('vsichni', 'skupina', 'osoba');

-- Enum pro typ osoby
CREATE TYPE public.person_type AS ENUM ('postava', 'cp');

-- Enum pro typ události v harmonogramu
CREATE TYPE public.event_type AS ENUM ('programovy_blok', 'jidlo', 'presun', 'informace', 'vystoupeni_cp');

-- =================================
-- TABULKA: LARPY
-- =================================
CREATE TABLE public.larps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    theme TEXT DEFAULT 'wwii',
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =================================
-- TABULKA: BĚHY (runs)
-- =================================
CREATE TABLE public.runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    larp_id UUID NOT NULL REFERENCES public.larps(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    date_from DATE,
    date_to DATE,
    location TEXT,
    address TEXT,
    contact TEXT,
    footer_text TEXT,
    mission_briefing TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(larp_id, slug)
);

-- =================================
-- TABULKA: OSOBY (postavy + CP)
-- =================================
CREATE TABLE public.persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
    type person_type NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    group_name TEXT,
    performer TEXT,
    performance_times TEXT,
    password_hash TEXT NOT NULL,
    access_token UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(run_id, slug)
);

-- =================================
-- TABULKA: DOKUMENTY
-- =================================
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    doc_type document_type NOT NULL,
    target_type document_target NOT NULL DEFAULT 'vsichni',
    target_group TEXT,
    target_person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =================================
-- TABULKA: SKRYTÉ DOKUMENTY (pro konkrétní osoby)
-- =================================
CREATE TABLE public.hidden_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(document_id, person_id)
);

-- =================================
-- TABULKA: HARMONOGRAM
-- =================================
CREATE TABLE public.schedule_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL DEFAULT 1,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    event_type event_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    cp_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =================================
-- TABULKA: PRODUKCE (odkazy)
-- =================================
CREATE TABLE public.production_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    link_type TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =================================
-- TABULKA: TISKOVINY (s instrukcemi)
-- =================================
CREATE TABLE public.printables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT,
    print_instructions TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =================================
-- FUNKCE: UPDATE TIMESTAMP
-- =================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggery pro updated_at
CREATE TRIGGER update_larps_updated_at BEFORE UPDATE ON public.larps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_runs_updated_at BEFORE UPDATE ON public.runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_persons_updated_at BEFORE UPDATE ON public.persons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_schedule_events_updated_at BEFORE UPDATE ON public.schedule_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =================================
-- RLS POLITIKY
-- =================================
ALTER TABLE public.larps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printables ENABLE ROW LEVEL SECURITY;

-- LARPS: Vlastník může vše
CREATE POLICY "Vlastník vidí své LARPy" ON public.larps FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Vlastník vytváří LARPy" ON public.larps FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Vlastník upravuje LARPy" ON public.larps FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Vlastník maže LARPy" ON public.larps FOR DELETE USING (auth.uid() = owner_id);

-- Helper funkce: Kontrola vlastníka LARPu
CREATE OR REPLACE FUNCTION public.is_larp_owner(larp_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.larps WHERE id = larp_id AND owner_id = auth.uid()
    )
$$;

-- Helper funkce: Kontrola vlastníka běhu
CREATE OR REPLACE FUNCTION public.is_run_owner(run_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.runs r
        JOIN public.larps l ON r.larp_id = l.id
        WHERE r.id = run_id AND l.owner_id = auth.uid()
    )
$$;

-- RUNS: Přes vlastníka LARPu
CREATE POLICY "Vlastník vidí běhy" ON public.runs FOR SELECT USING (public.is_larp_owner(larp_id));
CREATE POLICY "Vlastník vytváří běhy" ON public.runs FOR INSERT WITH CHECK (public.is_larp_owner(larp_id));
CREATE POLICY "Vlastník upravuje běhy" ON public.runs FOR UPDATE USING (public.is_larp_owner(larp_id));
CREATE POLICY "Vlastník maže běhy" ON public.runs FOR DELETE USING (public.is_larp_owner(larp_id));

-- PERSONS, DOCUMENTS, atd.: Přes vlastníka běhu
CREATE POLICY "Vlastník vidí osoby" ON public.persons FOR SELECT USING (public.is_run_owner(run_id));
CREATE POLICY "Vlastník vytváří osoby" ON public.persons FOR INSERT WITH CHECK (public.is_run_owner(run_id));
CREATE POLICY "Vlastník upravuje osoby" ON public.persons FOR UPDATE USING (public.is_run_owner(run_id));
CREATE POLICY "Vlastník maže osoby" ON public.persons FOR DELETE USING (public.is_run_owner(run_id));

CREATE POLICY "Vlastník vidí dokumenty" ON public.documents FOR SELECT USING (public.is_run_owner(run_id));
CREATE POLICY "Vlastník vytváří dokumenty" ON public.documents FOR INSERT WITH CHECK (public.is_run_owner(run_id));
CREATE POLICY "Vlastník upravuje dokumenty" ON public.documents FOR UPDATE USING (public.is_run_owner(run_id));
CREATE POLICY "Vlastník maže dokumenty" ON public.documents FOR DELETE USING (public.is_run_owner(run_id));

-- HIDDEN DOCUMENTS
CREATE POLICY "Vlastník vidí skryté dokumenty" ON public.hidden_documents FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.is_run_owner(d.run_id)
));
CREATE POLICY "Vlastník vytváří skryté dokumenty" ON public.hidden_documents FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.is_run_owner(d.run_id)
));
CREATE POLICY "Vlastník maže skryté dokumenty" ON public.hidden_documents FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.is_run_owner(d.run_id)
));

-- SCHEDULE EVENTS
CREATE POLICY "Vlastník vidí harmonogram" ON public.schedule_events FOR SELECT USING (public.is_run_owner(run_id));
CREATE POLICY "Vlastník vytváří harmonogram" ON public.schedule_events FOR INSERT WITH CHECK (public.is_run_owner(run_id));
CREATE POLICY "Vlastník upravuje harmonogram" ON public.schedule_events FOR UPDATE USING (public.is_run_owner(run_id));
CREATE POLICY "Vlastník maže harmonogram" ON public.schedule_events FOR DELETE USING (public.is_run_owner(run_id));

-- PRODUCTION LINKS
CREATE POLICY "Vlastník vidí produkci" ON public.production_links FOR SELECT USING (public.is_run_owner(run_id));
CREATE POLICY "Vlastník vytváří produkci" ON public.production_links FOR INSERT WITH CHECK (public.is_run_owner(run_id));
CREATE POLICY "Vlastník upravuje produkci" ON public.production_links FOR UPDATE USING (public.is_run_owner(run_id));
CREATE POLICY "Vlastník maže produkci" ON public.production_links FOR DELETE USING (public.is_run_owner(run_id));

-- PRINTABLES
CREATE POLICY "Vlastník vidí tiskoviny" ON public.printables FOR SELECT USING (public.is_run_owner(run_id));
CREATE POLICY "Vlastník vytváří tiskoviny" ON public.printables FOR INSERT WITH CHECK (public.is_run_owner(run_id));
CREATE POLICY "Vlastník upravuje tiskoviny" ON public.printables FOR UPDATE USING (public.is_run_owner(run_id));
CREATE POLICY "Vlastník maže tiskoviny" ON public.printables FOR DELETE USING (public.is_run_owner(run_id));

-- =================================
-- RPC FUNKCE PRO PŘÍSTUP HRÁČŮ/CP
-- =================================
CREATE OR REPLACE FUNCTION public.verify_person_access(
    p_access_token UUID,
    p_password TEXT
)
RETURNS TABLE (
    person_id UUID,
    person_name TEXT,
    person_type person_type,
    run_id UUID,
    larp_name TEXT,
    run_name TEXT,
    mission_briefing TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.type,
        p.run_id,
        l.name,
        r.name,
        r.mission_briefing
    FROM public.persons p
    JOIN public.runs r ON p.run_id = r.id
    JOIN public.larps l ON r.larp_id = l.id
    WHERE p.access_token = p_access_token
    AND p.password_hash = crypt(p_password, p.password_hash);
END;
$$;

-- Funkce pro získání dokumentů pro osobu
CREATE OR REPLACE FUNCTION public.get_person_documents(p_person_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    doc_type document_type,
    target_type document_target,
    sort_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
    v_group_name TEXT;
    v_person_type person_type;
BEGIN
    -- Získat info o osobě
    SELECT run_id, group_name, type INTO v_run_id, v_group_name, v_person_type
    FROM public.persons WHERE persons.id = p_person_id;
    
    -- CP vidí vše
    IF v_person_type = 'cp' THEN
        RETURN QUERY
        SELECT d.id, d.title, d.content, d.doc_type, d.target_type, d.sort_order
        FROM public.documents d
        WHERE d.run_id = v_run_id
        AND NOT EXISTS (
            SELECT 1 FROM public.hidden_documents hd 
            WHERE hd.document_id = d.id AND hd.person_id = p_person_id
        )
        ORDER BY d.doc_type, d.sort_order, d.title;
    ELSE
        -- Postava vidí jen relevantní dokumenty
        RETURN QUERY
        SELECT d.id, d.title, d.content, d.doc_type, d.target_type, d.sort_order
        FROM public.documents d
        WHERE d.run_id = v_run_id
        AND (
            d.target_type = 'vsichni'
            OR (d.target_type = 'skupina' AND d.target_group = v_group_name)
            OR (d.target_type = 'osoba' AND d.target_person_id = p_person_id)
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.hidden_documents hd 
            WHERE hd.document_id = d.id AND hd.person_id = p_person_id
        )
        ORDER BY d.doc_type, d.sort_order, d.title;
    END IF;
END;
$$;

-- Funkce pro získání harmonogramu
CREATE OR REPLACE FUNCTION public.get_run_schedule(p_run_id UUID)
RETURNS TABLE (
    id UUID,
    day_number INTEGER,
    start_time TIME,
    duration_minutes INTEGER,
    event_type event_type,
    title TEXT,
    description TEXT,
    location TEXT,
    cp_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        se.id,
        se.day_number,
        se.start_time,
        se.duration_minutes,
        se.event_type,
        se.title,
        se.description,
        se.location,
        p.name
    FROM public.schedule_events se
    LEFT JOIN public.persons p ON se.cp_id = p.id
    WHERE se.run_id = p_run_id
    ORDER BY se.day_number, se.start_time;
END;
$$;

-- Extension pro hashování hesel
CREATE EXTENSION IF NOT EXISTS pgcrypto;