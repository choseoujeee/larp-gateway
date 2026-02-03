-- Materiály: sjednocení produkčních odkazů a tiskovin do jedné tabulky
-- material_type: doc, audio, video, other (poznámka k tisku jde do note)

CREATE TABLE IF NOT EXISTS public.production_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    larp_id UUID NOT NULL REFERENCES public.larps(id) ON DELETE CASCADE,
    run_id UUID REFERENCES public.runs(id) ON DELETE CASCADE,
    material_type TEXT NOT NULL DEFAULT 'other' CHECK (material_type IN ('doc', 'audio', 'video', 'other')),
    title TEXT NOT NULL,
    url TEXT,
    note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_production_materials_larp_id ON public.production_materials(larp_id);
CREATE INDEX IF NOT EXISTS idx_production_materials_run_id ON public.production_materials(run_id);

ALTER TABLE public.production_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vlastník vidí materiály" ON public.production_materials
    FOR SELECT USING (public.is_larp_owner(larp_id));

CREATE POLICY "Vlastník vytváří materiály" ON public.production_materials
    FOR INSERT WITH CHECK (public.is_larp_owner(larp_id));

CREATE POLICY "Vlastník upravuje materiály" ON public.production_materials
    FOR UPDATE USING (public.is_larp_owner(larp_id));

CREATE POLICY "Vlastník maže materiály" ON public.production_materials
    FOR DELETE USING (public.is_larp_owner(larp_id));

-- Migrace dat: production_links -> production_materials (material_type z link_type nebo 'other', note z description)
INSERT INTO public.production_materials (larp_id, run_id, material_type, title, url, note, sort_order)
SELECT
    pl.larp_id,
    pl.run_id,
    CASE
        WHEN LOWER(COALESCE(pl.link_type, '')) IN ('pdf', 'doc', 'docx', 'dokument') THEN 'doc'
        WHEN LOWER(COALESCE(pl.link_type, '')) IN ('audio', 'mp3', 'wav') THEN 'audio'
        WHEN LOWER(COALESCE(pl.link_type, '')) IN ('video', 'mp4', 'avi') THEN 'video'
        ELSE 'other'
    END,
    pl.title,
    pl.url,
    pl.description,
    COALESCE(pl.sort_order, 0)
FROM public.production_links pl
WHERE pl.larp_id IS NOT NULL;

-- Migrace dat: printables -> production_materials (material_type = doc, note = print_instructions)
INSERT INTO public.production_materials (larp_id, run_id, material_type, title, url, note, sort_order)
SELECT
    pr.larp_id,
    pr.run_id,
    'doc',
    pr.title,
    pr.url,
    pr.print_instructions,
    COALESCE(pr.sort_order, 0)
FROM public.printables pr
WHERE pr.larp_id IS NOT NULL;
