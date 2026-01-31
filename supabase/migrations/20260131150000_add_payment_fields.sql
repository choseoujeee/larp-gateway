-- Platby: transparentní účet, cena, splatnost u běhu; zaplaceno u osoby
ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS payment_account TEXT,
  ADD COLUMN IF NOT EXISTS payment_amount TEXT,
  ADD COLUMN IF NOT EXISTS payment_due_date DATE;

ALTER TABLE public.persons
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

COMMENT ON COLUMN public.runs.payment_account IS 'Číslo transparentního účtu spolku pro platbu LARPu';
COMMENT ON COLUMN public.runs.payment_amount IS 'Cena LARPu (text, např. 500 Kč)';
COMMENT ON COLUMN public.runs.payment_due_date IS 'Datum splatnosti platby';
COMMENT ON COLUMN public.persons.paid_at IS 'Kdy hráč/CP uhradil platbu (null = neuhrazeno)';

-- Rozšíření verify_person_access o platby
CREATE OR REPLACE FUNCTION public.verify_person_access(
    p_access_token UUID,
    p_password TEXT
)
RETURNS TABLE (
    person_id UUID,
    person_name TEXT,
    person_type person_type,
    run_id UUID,
    larp_name TEXT,
    run_name TEXT,
    mission_briefing TEXT,
    group_name TEXT,
    performer TEXT,
    performance_times TEXT,
    run_contact TEXT,
    run_footer_text TEXT,
    larp_theme TEXT,
    run_payment_account TEXT,
    run_payment_amount TEXT,
    run_payment_due_date DATE,
    person_paid_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.type,
        p.run_id,
        l.name,
        r.name,
        r.mission_briefing,
        p.group_name,
        p.performer,
        p.performance_times,
        r.contact,
        r.footer_text,
        l.theme,
        r.payment_account,
        r.payment_amount,
        r.payment_due_date,
        p.paid_at
    FROM public.persons p
    JOIN public.runs r ON p.run_id = r.id
    JOIN public.larps l ON r.larp_id = l.id
    WHERE p.access_token = p_access_token
    AND p.password_hash = crypt(p_password, p.password_hash);
END;
$$;
