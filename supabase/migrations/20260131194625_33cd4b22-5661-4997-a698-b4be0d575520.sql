-- Změna run_id na nullable - osoby jsou primárně na úrovni LARPu, ne běhu
ALTER TABLE public.persons ALTER COLUMN run_id DROP NOT NULL;