
CREATE OR REPLACE FUNCTION public.get_run_cockpit_stats(p_run_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_larp_id uuid;
  v_persons int;
  v_assigned int;
  v_paid int;
  v_cp int;
  v_cp_with_perf int;
  v_events int;
  v_checklist_total int;
  v_checklist_done int;
BEGIN
  SELECT larp_id INTO v_larp_id FROM runs WHERE id = p_run_id;
  IF v_larp_id IS NULL THEN RETURN NULL; END IF;
  IF NOT is_run_owner(p_run_id) THEN RETURN NULL; END IF;

  SELECT count(*) INTO v_persons FROM persons WHERE larp_id = v_larp_id AND type = 'postava';
  SELECT count(*) INTO v_cp FROM persons WHERE larp_id = v_larp_id AND type = 'cp';
  SELECT count(*) INTO v_cp_with_perf FROM persons WHERE larp_id = v_larp_id AND type = 'cp' AND performer IS NOT NULL AND trim(performer) <> '';

  SELECT count(*) INTO v_assigned FROM run_person_assignments WHERE run_id = p_run_id;
  SELECT count(*) INTO v_paid FROM run_person_assignments WHERE run_id = p_run_id AND paid_at IS NOT NULL;
  SELECT count(*) INTO v_events FROM schedule_events WHERE run_id = p_run_id;
  SELECT count(*) INTO v_checklist_total FROM run_checklist WHERE run_id = p_run_id;
  SELECT count(*) INTO v_checklist_done FROM run_checklist WHERE run_id = p_run_id AND completed = true;

  RETURN json_build_object(
    'persons', v_persons,
    'assigned', v_assigned,
    'paid', v_paid,
    'cp', v_cp,
    'cp_with_performer', v_cp_with_perf,
    'events', v_events,
    'checklist_total', v_checklist_total,
    'checklist_done', v_checklist_done
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_run_cockpit_stats(uuid) TO authenticated;
