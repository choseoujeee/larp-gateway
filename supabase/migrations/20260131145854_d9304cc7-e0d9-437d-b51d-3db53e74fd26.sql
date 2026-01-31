-- ============================================
-- Krok 2: Aktualizace RPC verify_person_access
-- Nejprve drop a pak znovu vytvoř
-- ============================================

DROP FUNCTION IF EXISTS public.verify_person_access(uuid, text);

CREATE FUNCTION public.verify_person_access(p_access_token uuid, p_password text)
RETURNS TABLE(
    person_id uuid,
    person_name text,
    person_type person_type,
    run_id uuid,
    larp_name text,
    run_name text,
    mission_briefing text,
    group_name text,
    performer text,
    performance_times text,
    run_contact text,
    run_footer_text text,
    larp_theme text,
    run_payment_account text,
    run_payment_amount text,
    run_payment_due_date date,
    person_paid_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- ============================================
-- Krok 3: RPC pro vytvoření osoby s hashovaným heslem
-- ============================================

CREATE OR REPLACE FUNCTION public.create_person_with_password(
    p_run_id uuid,
    p_name text,
    p_slug text,
    p_type person_type,
    p_password text,
    p_group_name text DEFAULT NULL,
    p_performer text DEFAULT NULL,
    p_performance_times text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_person_id uuid;
BEGIN
    INSERT INTO public.persons (
        run_id, name, slug, type, password_hash, 
        group_name, performer, performance_times
    )
    VALUES (
        p_run_id, p_name, p_slug, p_type, crypt(p_password, gen_salt('bf')),
        p_group_name, p_performer, p_performance_times
    )
    RETURNING id INTO v_person_id;
    
    RETURN v_person_id;
END;
$$;

-- ============================================
-- Krok 4: Trigger pro automatické hashování hesel
-- ============================================

CREATE OR REPLACE FUNCTION public.hash_person_password()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Pokud heslo nezačíná na $2 (bcrypt prefix), zahashuj ho
    IF NEW.password_hash IS NOT NULL AND LEFT(NEW.password_hash, 2) != '$2' THEN
        NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf'));
    END IF;
    RETURN NEW;
END;
$$;

-- Vytvořit trigger pro INSERT i UPDATE
DROP TRIGGER IF EXISTS hash_password_on_insert ON public.persons;
CREATE TRIGGER hash_password_on_insert
    BEFORE INSERT ON public.persons
    FOR EACH ROW
    EXECUTE FUNCTION public.hash_person_password();

DROP TRIGGER IF EXISTS hash_password_on_update ON public.persons;
CREATE TRIGGER hash_password_on_update
    BEFORE UPDATE OF password_hash ON public.persons
    FOR EACH ROW
    WHEN (OLD.password_hash IS DISTINCT FROM NEW.password_hash)
    EXECUTE FUNCTION public.hash_person_password();