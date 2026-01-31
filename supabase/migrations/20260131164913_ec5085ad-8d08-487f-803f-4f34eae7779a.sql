-- Fix hash_person_password trigger function to use extensions schema
CREATE OR REPLACE FUNCTION public.hash_person_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    -- Pokud heslo nezačíná na $2 (bcrypt prefix), zahashuj ho
    IF NEW.password_hash IS NOT NULL AND LEFT(NEW.password_hash, 2) != '$2' THEN
        NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf'));
    END IF;
    RETURN NEW;
END;
$$;