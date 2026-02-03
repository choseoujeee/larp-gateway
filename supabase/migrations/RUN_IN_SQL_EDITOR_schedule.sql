-- =============================================================================
-- HARMONOGAM (schedule) – spusť v Supabase SQL Editoru
-- Rozšíření event_type, sloupce material_id/document_id, schedule_color u CP
-- =============================================================================

-- 1. Nové hodnoty enumu event_type (material, organizacni)
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

-- 2. Sloupce v schedule_events (vazba na materiál a produkční dokument)
ALTER TABLE public.schedule_events
  ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES public.production_materials(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

-- 3. Barva CP v harmonogramu (persons.schedule_color)
ALTER TABLE public.persons
  ADD COLUMN IF NOT EXISTS schedule_color TEXT;
