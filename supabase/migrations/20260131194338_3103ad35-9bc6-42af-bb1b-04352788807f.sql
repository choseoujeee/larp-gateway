-- Změna run_id na nullable - dokumenty mohou být obecné pro celý LARP
ALTER TABLE public.documents ALTER COLUMN run_id DROP NOT NULL;

-- Přidání indexu pro rychlejší filtrování
CREATE INDEX IF NOT EXISTS idx_documents_larp_run ON public.documents(larp_id, run_id);