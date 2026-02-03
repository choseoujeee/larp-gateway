-- Přidání typu dokumentu „produkční“ (nákupní seznam, skladové zásoby atd.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'document_type' AND e.enumlabel = 'produkční'
  ) THEN
    ALTER TYPE public.document_type ADD VALUE 'produkční';
  END IF;
END
$$;
