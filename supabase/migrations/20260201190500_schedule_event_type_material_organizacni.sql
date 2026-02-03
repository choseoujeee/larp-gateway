-- Harmonogram: nové typy událostí (materiál, organizační), vazby na materiály/dokumenty, barva CP
-- 1.1 Rozšíření enumu event_type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'event_type' AND e.enumlabel = 'material') THEN
    ALTER TYPE public.event_type ADD VALUE 'material';
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'event_type' AND e.enumlabel = 'organizacni') THEN
    ALTER TYPE public.event_type ADD VALUE 'organizacni';
  END IF;
END
$$;

-- 1.2 Sloupce v schedule_events
ALTER TABLE public.schedule_events
  ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES public.production_materials(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

-- 1.3 Barva CP pro zobrazení v harmonogramu (hex nebo název třídy)
ALTER TABLE public.persons
  ADD COLUMN IF NOT EXISTS schedule_color TEXT;
