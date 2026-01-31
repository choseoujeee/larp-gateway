-- Přidání sloupců pro odložené zobrazení dokumentů
ALTER TABLE public.documents
ADD COLUMN visibility_mode TEXT NOT NULL DEFAULT 'immediate',
ADD COLUMN visible_days_before INTEGER;

-- Komentáře pro dokumentaci
COMMENT ON COLUMN public.documents.visibility_mode IS 'immediate = zobrazit hned, delayed = zobrazit X dní před začátkem běhu';
COMMENT ON COLUMN public.documents.visible_days_before IS 'Počet dní před začátkem běhu, kdy se dokument zobrazí (pouze pro delayed)';