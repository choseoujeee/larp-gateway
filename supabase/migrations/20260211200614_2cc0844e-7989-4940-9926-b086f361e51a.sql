
-- RPC funkce pro načtení kompletních dat CP portálu (security definer obchází RLS)
CREATE OR REPLACE FUNCTION public.get_cp_portal_full_data(p_larp_id uuid, p_run_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'cp_persons', (
      SELECT COALESCE(json_agg(row_to_json(cp) ORDER BY cp.name), '[]'::json)
      FROM (
        SELECT id, name, slug, performer, performance_times
        FROM persons
        WHERE larp_id = p_larp_id AND type = 'cp'
      ) cp
    ),
    'player_persons', (
      SELECT COALESCE(json_agg(row_to_json(pl) ORDER BY pl.name), '[]'::json)
      FROM (
        SELECT id, name, slug, group_name
        FROM persons
        WHERE larp_id = p_larp_id AND type = 'postava'
      ) pl
    ),
    'cp_documents', (
      SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.priority, d.sort_order), '[]'::json)
      FROM (
        SELECT id, title, content, doc_type, target_type, sort_order, priority, visible_to_cp
        FROM documents
        WHERE larp_id = p_larp_id
          AND (
            (target_type = 'skupina' AND target_group = 'CP')
            OR (target_type = 'vsichni' AND visible_to_cp = true)
          )
      ) d
    ),
    'cp_scenes', (
      SELECT COALESCE(json_agg(row_to_json(s) ORDER BY s.day_number, s.start_time), '[]'::json)
      FROM (
        SELECT cs.id, cs.cp_id, cs.day_number, cs.start_time, cs.title, cs.duration_minutes, cs.location, cs.description, cs.props
        FROM cp_scenes cs
        WHERE cs.run_id = p_run_id
      ) s
    ),
    'larp_footer_text', (
      SELECT footer_text FROM larps WHERE id = p_larp_id
    )
  ) INTO result;
  
  RETURN result;
END;
$$;
