
-- Zámek záloh
ALTER TABLE public.documents_backup_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons_backup_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs_backup_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_events_backup_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cp_scenes_backup_v1 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.documents_backup_v1 FROM anon, authenticated;
REVOKE ALL ON public.persons_backup_v1 FROM anon, authenticated;
REVOKE ALL ON public.runs_backup_v1 FROM anon, authenticated;
REVOKE ALL ON public.schedule_events_backup_v1 FROM anon, authenticated;
REVOKE ALL ON public.cp_scenes_backup_v1 FROM anon, authenticated;

GRANT ALL ON public.documents_backup_v1 TO service_role;
GRANT ALL ON public.persons_backup_v1 TO service_role;
GRANT ALL ON public.runs_backup_v1 TO service_role;
GRANT ALL ON public.schedule_events_backup_v1 TO service_role;
GRANT ALL ON public.cp_scenes_backup_v1 TO service_role;

-- Document views: pryč s permissive policy
DROP POLICY IF EXISTS "service writes document views" ON public.document_views;
