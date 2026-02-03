-- Checklist před během: úkoly k vyřešení před během (nakoupit, vyzvednout, natankovat…)
-- Obousměrná synchronizace: admin i produkční portál čtou/zapisují stejnou tabulku.

CREATE TABLE IF NOT EXISTS public.run_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_run_checklist_run_id ON public.run_checklist(run_id);

ALTER TABLE public.run_checklist ENABLE ROW LEVEL SECURITY;

-- RLS: vlastník LARPu (přes run) může vše
CREATE POLICY "Vlastník vidí checklist" ON public.run_checklist
    FOR SELECT USING (public.is_run_owner(run_id));

CREATE POLICY "Vlastník vytváří checklist" ON public.run_checklist
    FOR INSERT WITH CHECK (public.is_run_owner(run_id));

CREATE POLICY "Vlastník upravuje checklist" ON public.run_checklist
    FOR UPDATE USING (public.is_run_owner(run_id));

CREATE POLICY "Vlastník maže checklist" ON public.run_checklist
    FOR DELETE USING (public.is_run_owner(run_id));
