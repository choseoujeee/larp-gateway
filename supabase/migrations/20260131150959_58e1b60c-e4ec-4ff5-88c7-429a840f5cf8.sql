-- Přidat sloupce pro platby do tabulky runs
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS payment_account text;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS payment_amount text;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS payment_due_date date;

-- Přidat sloupec paid_at do tabulky persons
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS paid_at timestamptz;