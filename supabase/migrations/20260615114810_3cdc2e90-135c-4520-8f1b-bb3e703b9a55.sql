
-- Forward sync: derive audience from legacy fields when they change.
-- Skip if audience was explicitly set in the same statement (UPDATE OF audience trigger handles reverse direction).
CREATE OR REPLACE FUNCTION public.derive_document_audience_from_legacy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  tags text[] := ARRAY[]::text[];
  pid uuid;
  gname text;
  ptype person_type;
  is_cp_group bool;
BEGIN
  IF NEW.target_type = 'vsichni' THEN
    tags := array_append(tags, 'players:all');
    IF COALESCE(NEW.visible_to_cp,false) THEN
      tags := array_append(tags, 'cp:all');
    END IF;
  ELSIF NEW.target_type = 'skupina' AND NEW.target_group IS NOT NULL THEN
    IF NEW.target_group = 'CP' THEN
      tags := array_append(tags, 'cp:all');
    ELSE
      SELECT bool_and(type='cp') INTO is_cp_group
        FROM public.persons WHERE larp_id=NEW.larp_id AND group_name=NEW.target_group;
      IF is_cp_group IS TRUE THEN
        tags := array_append(tags, 'cp:all');
      ELSE
        tags := array_append(tags, 'players:group:'||NEW.target_group);
      END IF;
    END IF;
  ELSIF NEW.target_type = 'osoba' AND NEW.target_person_id IS NOT NULL THEN
    SELECT type INTO ptype FROM public.persons WHERE id = NEW.target_person_id;
    IF ptype = 'cp' THEN
      tags := array_append(tags, 'cp:person:'||NEW.target_person_id::text);
    ELSIF ptype IS NOT NULL THEN
      tags := array_append(tags, 'players:person:'||NEW.target_person_id::text);
    END IF;
  END IF;

  IF NEW.extra_target_person_ids IS NOT NULL THEN
    FOREACH pid IN ARRAY NEW.extra_target_person_ids LOOP
      SELECT type INTO ptype FROM public.persons WHERE id = pid;
      IF ptype = 'cp' THEN
        tags := array_append(tags, 'cp:person:'||pid::text);
      ELSIF ptype IS NOT NULL THEN
        tags := array_append(tags, 'players:person:'||pid::text);
      END IF;
    END LOOP;
  END IF;

  IF NEW.extra_target_group_names IS NOT NULL THEN
    FOREACH gname IN ARRAY NEW.extra_target_group_names LOOP
      IF gname = 'CP' THEN
        tags := array_append(tags, 'cp:all');
      ELSE
        SELECT bool_and(type='cp') INTO is_cp_group
          FROM public.persons WHERE larp_id=NEW.larp_id AND group_name=gname;
        IF is_cp_group IS TRUE THEN
          tags := array_append(tags, 'cp:all');
        ELSE
          tags := array_append(tags, 'players:group:'||gname);
        END IF;
      END IF;
    END LOOP;
  END IF;

  SELECT ARRAY(SELECT DISTINCT unnest(tags)) INTO NEW.audience;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_derive_document_audience ON public.documents;
CREATE TRIGGER trg_derive_document_audience
  BEFORE INSERT OR UPDATE OF target_type, target_group, target_person_id, visible_to_cp, extra_target_person_ids, extra_target_group_names
  ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.derive_document_audience_from_legacy();

-- The earlier reverse trigger (audience -> legacy) is no longer needed; legacy IS the source of truth now.
DROP TRIGGER IF EXISTS trg_sync_document_legacy_targets ON public.documents;
