-- Přidání sloupců mission_briefing a act_info do persons
ALTER TABLE public.persons 
ADD COLUMN IF NOT EXISTS mission_briefing TEXT,
ADD COLUMN IF NOT EXISTS act_info TEXT;

-- Nová tabulka cp_scenes (scény CP)
CREATE TABLE public.cp_scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cp_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 15,
    day_number INTEGER NOT NULL DEFAULT 1,
    location TEXT,
    props TEXT,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    schedule_event_id UUID REFERENCES public.schedule_events(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Nová tabulka cp_performers (přiřazení performerů k CP v rámci běhu)
CREATE TABLE public.cp_performers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
    cp_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
    performer_name TEXT NOT NULL,
    performer_email TEXT,
    performer_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(run_id, cp_id)
);

-- Přidání cp_scene_id do schedule_events pro obousměrnou vazbu
ALTER TABLE public.schedule_events
ADD COLUMN IF NOT EXISTS cp_scene_id UUID REFERENCES public.cp_scenes(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.cp_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cp_performers ENABLE ROW LEVEL SECURITY;

-- RLS policies pro cp_scenes
CREATE POLICY "Vlastník vidí scény CP" ON public.cp_scenes
FOR SELECT USING (is_run_owner(run_id));

CREATE POLICY "Vlastník vytváří scény CP" ON public.cp_scenes
FOR INSERT WITH CHECK (is_run_owner(run_id));

CREATE POLICY "Vlastník upravuje scény CP" ON public.cp_scenes
FOR UPDATE USING (is_run_owner(run_id));

CREATE POLICY "Vlastník maže scény CP" ON public.cp_scenes
FOR DELETE USING (is_run_owner(run_id));

-- RLS policies pro cp_performers
CREATE POLICY "Vlastník vidí performery" ON public.cp_performers
FOR SELECT USING (is_run_owner(run_id));

CREATE POLICY "Vlastník vytváří performery" ON public.cp_performers
FOR INSERT WITH CHECK (is_run_owner(run_id));

CREATE POLICY "Vlastník upravuje performery" ON public.cp_performers
FOR UPDATE USING (is_run_owner(run_id));

CREATE POLICY "Vlastník maže performery" ON public.cp_performers
FOR DELETE USING (is_run_owner(run_id));

-- Trigger pro updated_at na cp_scenes
CREATE TRIGGER update_cp_scenes_updated_at
    BEFORE UPDATE ON public.cp_scenes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();