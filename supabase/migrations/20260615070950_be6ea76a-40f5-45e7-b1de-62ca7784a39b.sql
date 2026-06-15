
-- =========================================================================
-- ETAPA 0: Zálohy + aditivní rozšíření schématu pro v2
-- ŽÁDNÝ OBSAH SE NEMAŽE.
-- =========================================================================

-- 1) Zálohy obsahových tabulek (snapshot)
CREATE TABLE IF NOT EXISTS public.documents_backup_v1 AS TABLE public.documents;
CREATE TABLE IF NOT EXISTS public.persons_backup_v1 AS TABLE public.persons;
CREATE TABLE IF NOT EXISTS public.runs_backup_v1 AS TABLE public.runs;
CREATE TABLE IF NOT EXISTS public.schedule_events_backup_v1 AS TABLE public.schedule_events;
CREATE TABLE IF NOT EXISTS public.cp_scenes_backup_v1 AS TABLE public.cp_scenes;

-- 2) Sjednocená kategorie dokumentů (aditivně, nepřepisuje doc_type)
DO $$ BEGIN
  CREATE TYPE public.doc_category AS ENUM ('organizacni','herni','produkcni');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS doc_category public.doc_category,
  ADD COLUMN IF NOT EXISTS is_personal boolean NOT NULL DEFAULT false;

UPDATE public.documents
SET doc_category = CASE
  WHEN doc_type::text = 'organizacni' THEN 'organizacni'::public.doc_category
  WHEN doc_type::text = 'produkční'   THEN 'produkcni'::public.doc_category
  ELSE 'herni'::public.doc_category
END
WHERE doc_category IS NULL;

UPDATE public.documents
SET is_personal = true
WHERE is_personal = false
  AND doc_type::text IN ('postava','medailonek');

ALTER TABLE public.documents
  ALTER COLUMN doc_category SET NOT NULL;

-- 3) Magic links (hráč + CP)
CREATE TABLE IF NOT EXISTS public.magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.persons(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('player','cp')),
  token_hash text NOT NULL UNIQUE,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_magic_links_run ON public.magic_links(run_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_person ON public.magic_links(person_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.magic_links TO authenticated;
GRANT ALL ON public.magic_links TO service_role;
ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org reads magic links of own larps" ON public.magic_links
  FOR SELECT TO authenticated
  USING (public.is_run_owner(run_id));
CREATE POLICY "org writes magic links of own larps" ON public.magic_links
  FOR ALL TO authenticated
  USING (public.is_run_owner(run_id))
  WITH CHECK (public.is_run_owner(run_id));

-- 4) Per-LARP e-mail konfigurace
CREATE TABLE IF NOT EXISTS public.larp_email_config (
  larp_id uuid PRIMARY KEY REFERENCES public.larps(id) ON DELETE CASCADE,
  reply_to text,
  sender_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.larp_email_config TO authenticated;
GRANT ALL ON public.larp_email_config TO service_role;
ALTER TABLE public.larp_email_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org rw larp email config" ON public.larp_email_config
  FOR ALL TO authenticated
  USING (public.is_larp_owner(larp_id))
  WITH CHECK (public.is_larp_owner(larp_id));

-- 5) E-mail šablony per LARP
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  larp_id uuid NOT NULL REFERENCES public.larps(id) ON DELETE CASCADE,
  kind text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(larp_id, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org rw email templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (public.is_larp_owner(larp_id))
  WITH CHECK (public.is_larp_owner(larp_id));

-- 6) Historie odeslaných (pre-flight)
CREATE TABLE IF NOT EXISTS public.email_log_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  larp_id uuid NOT NULL REFERENCES public.larps(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.runs(id) ON DELETE SET NULL,
  person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  template_kind text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_log_v2_run ON public.email_log_v2(run_id);
CREATE INDEX IF NOT EXISTS idx_email_log_v2_person ON public.email_log_v2(person_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_log_v2 TO authenticated;
GRANT ALL ON public.email_log_v2 TO service_role;
ALTER TABLE public.email_log_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org reads email log" ON public.email_log_v2
  FOR SELECT TO authenticated
  USING (public.is_larp_owner(larp_id));
CREATE POLICY "service writes email log" ON public.email_log_v2
  FOR INSERT TO authenticated
  WITH CHECK (public.is_larp_owner(larp_id));

-- 7) Stopování čtení dokumentů (kdo otevřel)
CREATE TABLE IF NOT EXISTS public.document_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.runs(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  view_count integer NOT NULL DEFAULT 1,
  UNIQUE(document_id, person_id)
);
CREATE INDEX IF NOT EXISTS idx_document_views_person ON public.document_views(person_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_views TO authenticated;
GRANT ALL ON public.document_views TO service_role;
ALTER TABLE public.document_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org reads document views" ON public.document_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.is_larp_owner(d.larp_id))
  );
CREATE POLICY "service writes document views" ON public.document_views
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 8) Triggery updated_at
DROP TRIGGER IF EXISTS larp_email_config_updated_at ON public.larp_email_config;
CREATE TRIGGER larp_email_config_updated_at BEFORE UPDATE ON public.larp_email_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS email_templates_updated_at ON public.email_templates;
CREATE TRIGGER email_templates_updated_at BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9) Assert: žádný obsah dokumentů se neztratil
DO $$
DECLARE v_before bigint; v_after bigint;
BEGIN
  SELECT count(*) INTO v_before FROM public.documents_backup_v1 WHERE content IS NOT NULL;
  SELECT count(*) INTO v_after FROM public.documents WHERE content IS NOT NULL;
  IF v_before <> v_after THEN
    RAISE EXCEPTION 'Document content count mismatch: backup=% live=%', v_before, v_after;
  END IF;
END $$;
