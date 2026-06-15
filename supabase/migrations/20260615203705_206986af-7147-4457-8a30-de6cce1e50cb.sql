
-- 1. Column
ALTER TABLE public.larp_organizers
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill existing rows with full edit access across all sections
UPDATE public.larp_organizers
SET permissions = jsonb_build_object(
  'documents','edit','characters','edit','groups','edit','cp','edit',
  'players','edit','production','edit','design','edit','schedule','edit',
  'communication','edit','runs','edit'
)
WHERE permissions = '{}'::jsonb OR permissions IS NULL;

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.larp_section_level(p_larp_id uuid, p_section text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_level text;
BEGIN
  IF (auth.jwt() ->> 'email') = 'chousef@gmail.com' THEN
    RETURN 'edit';
  END IF;
  SELECT owner_id INTO v_owner FROM public.larps WHERE id = p_larp_id;
  IF v_owner = auth.uid() THEN
    RETURN 'edit';
  END IF;
  SELECT COALESCE(permissions ->> p_section, 'none')
    INTO v_level
    FROM public.larp_organizers
    WHERE larp_id = p_larp_id AND user_id = auth.uid()
    LIMIT 1;
  RETURN COALESCE(v_level, 'none');
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_larp_section(p_larp_id uuid, p_section text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.larp_section_level(p_larp_id, p_section) IN ('view','edit') $$;

CREATE OR REPLACE FUNCTION public.can_edit_larp_section(p_larp_id uuid, p_section text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.larp_section_level(p_larp_id, p_section) = 'edit' $$;

CREATE OR REPLACE FUNCTION public.can_view_run_section(p_run_id uuid, p_section text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.can_view_larp_section((SELECT larp_id FROM public.runs WHERE id = p_run_id), p_section) $$;

CREATE OR REPLACE FUNCTION public.can_edit_run_section(p_run_id uuid, p_section text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.can_edit_larp_section((SELECT larp_id FROM public.runs WHERE id = p_run_id), p_section) $$;

-- 3. larp_organizers: allow LARP owner (not just super admin) to manage
DROP POLICY IF EXISTS "Owner manages organizers" ON public.larp_organizers;
CREATE POLICY "Owner manages organizers" ON public.larp_organizers
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'chousef@gmail.com'
    OR EXISTS (SELECT 1 FROM public.larps l WHERE l.id = larp_organizers.larp_id AND l.owner_id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'chousef@gmail.com'
    OR EXISTS (SELECT 1 FROM public.larps l WHERE l.id = larp_organizers.larp_id AND l.owner_id = auth.uid())
  );

-- 4. Replace section-controlled policies
-- documents
DROP POLICY IF EXISTS "Vlastník vidí dokumenty" ON public.documents;
DROP POLICY IF EXISTS "Vlastník vytváří dokumenty" ON public.documents;
DROP POLICY IF EXISTS "Vlastník upravuje dokumenty" ON public.documents;
DROP POLICY IF EXISTS "Vlastník maže dokumenty" ON public.documents;
CREATE POLICY "doc_select" ON public.documents FOR SELECT TO authenticated USING (public.can_view_larp_section(larp_id, 'documents'));
CREATE POLICY "doc_insert" ON public.documents FOR INSERT TO authenticated WITH CHECK (public.can_edit_larp_section(larp_id, 'documents'));
CREATE POLICY "doc_update" ON public.documents FOR UPDATE TO authenticated USING (public.can_edit_larp_section(larp_id, 'documents')) WITH CHECK (public.can_edit_larp_section(larp_id, 'documents'));
CREATE POLICY "doc_delete" ON public.documents FOR DELETE TO authenticated USING (public.can_edit_larp_section(larp_id, 'documents'));

-- hidden_documents / hidden_document_groups -> follow document section
DROP POLICY IF EXISTS "Vlastník vidí skryté dokumenty" ON public.hidden_documents;
DROP POLICY IF EXISTS "Vlastník vytváří skryté dokumenty" ON public.hidden_documents;
DROP POLICY IF EXISTS "Vlastník maže skryté dokumenty" ON public.hidden_documents;
CREATE POLICY "hd_select" ON public.hidden_documents FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.can_view_larp_section(d.larp_id, 'documents')));
CREATE POLICY "hd_insert" ON public.hidden_documents FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.can_edit_larp_section(d.larp_id, 'documents')));
CREATE POLICY "hd_delete" ON public.hidden_documents FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.can_edit_larp_section(d.larp_id, 'documents')));

DROP POLICY IF EXISTS "Vlastník vidí skryté dokumenty skupin" ON public.hidden_document_groups;
DROP POLICY IF EXISTS "Vlastník vytváří skryté dokumenty skupin" ON public.hidden_document_groups;
DROP POLICY IF EXISTS "Vlastník maže skryté dokumenty skupin" ON public.hidden_document_groups;
CREATE POLICY "hdg_select" ON public.hidden_document_groups FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.can_view_larp_section(d.larp_id, 'documents')));
CREATE POLICY "hdg_insert" ON public.hidden_document_groups FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.can_edit_larp_section(d.larp_id, 'documents')));
CREATE POLICY "hdg_delete" ON public.hidden_document_groups FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.can_edit_larp_section(d.larp_id, 'documents')));

-- persons: characters vs CP — per-row by type
DROP POLICY IF EXISTS "Vlastník vidí osoby" ON public.persons;
DROP POLICY IF EXISTS "Vlastník vytváří osoby" ON public.persons;
DROP POLICY IF EXISTS "Vlastník upravuje osoby" ON public.persons;
DROP POLICY IF EXISTS "Vlastník maže osoby" ON public.persons;
CREATE POLICY "pers_select" ON public.persons FOR SELECT TO authenticated USING (
  (type = 'postava' AND public.can_view_larp_section(larp_id, 'characters'))
  OR (type = 'cp' AND public.can_view_larp_section(larp_id, 'cp'))
);
CREATE POLICY "pers_insert" ON public.persons FOR INSERT TO authenticated WITH CHECK (
  (type = 'postava' AND public.can_edit_larp_section(larp_id, 'characters'))
  OR (type = 'cp' AND public.can_edit_larp_section(larp_id, 'cp'))
);
CREATE POLICY "pers_update" ON public.persons FOR UPDATE TO authenticated USING (
  (type = 'postava' AND public.can_edit_larp_section(larp_id, 'characters'))
  OR (type = 'cp' AND public.can_edit_larp_section(larp_id, 'cp'))
) WITH CHECK (
  (type = 'postava' AND public.can_edit_larp_section(larp_id, 'characters'))
  OR (type = 'cp' AND public.can_edit_larp_section(larp_id, 'cp'))
);
CREATE POLICY "pers_delete" ON public.persons FOR DELETE TO authenticated USING (
  (type = 'postava' AND public.can_edit_larp_section(larp_id, 'characters'))
  OR (type = 'cp' AND public.can_edit_larp_section(larp_id, 'cp'))
);

-- printables -> characters
DROP POLICY IF EXISTS "Vlastník vidí tiskoviny" ON public.printables;
DROP POLICY IF EXISTS "Vlastník vytváří tiskoviny" ON public.printables;
DROP POLICY IF EXISTS "Vlastník upravuje tiskoviny" ON public.printables;
DROP POLICY IF EXISTS "Vlastník maže tiskoviny" ON public.printables;
CREATE POLICY "pr_select" ON public.printables FOR SELECT TO authenticated USING (public.can_view_larp_section(larp_id, 'characters'));
CREATE POLICY "pr_insert" ON public.printables FOR INSERT TO authenticated WITH CHECK (public.can_edit_larp_section(larp_id, 'characters'));
CREATE POLICY "pr_update" ON public.printables FOR UPDATE TO authenticated USING (public.can_edit_larp_section(larp_id, 'characters')) WITH CHECK (public.can_edit_larp_section(larp_id, 'characters'));
CREATE POLICY "pr_delete" ON public.printables FOR DELETE TO authenticated USING (public.can_edit_larp_section(larp_id, 'characters'));

-- production_materials
DROP POLICY IF EXISTS "Vlastník vidí production materials" ON public.production_materials;
DROP POLICY IF EXISTS "Vlastník vytváří production materials" ON public.production_materials;
DROP POLICY IF EXISTS "Vlastník upravuje production materials" ON public.production_materials;
DROP POLICY IF EXISTS "Vlastník maže production materials" ON public.production_materials;
CREATE POLICY "pm_select" ON public.production_materials FOR SELECT TO authenticated USING (public.can_view_larp_section(larp_id, 'production'));
CREATE POLICY "pm_insert" ON public.production_materials FOR INSERT TO authenticated WITH CHECK (public.can_edit_larp_section(larp_id, 'production'));
CREATE POLICY "pm_update" ON public.production_materials FOR UPDATE TO authenticated USING (public.can_edit_larp_section(larp_id, 'production')) WITH CHECK (public.can_edit_larp_section(larp_id, 'production'));
CREATE POLICY "pm_delete" ON public.production_materials FOR DELETE TO authenticated USING (public.can_edit_larp_section(larp_id, 'production'));

-- production_links
DROP POLICY IF EXISTS "Vlastník vidí production links" ON public.production_links;
DROP POLICY IF EXISTS "Vlastník vytváří production links" ON public.production_links;
DROP POLICY IF EXISTS "Vlastník upravuje production links" ON public.production_links;
DROP POLICY IF EXISTS "Vlastník maže production links" ON public.production_links;
CREATE POLICY "pl_select" ON public.production_links FOR SELECT TO authenticated USING (public.can_view_larp_section(larp_id, 'production'));
CREATE POLICY "pl_insert" ON public.production_links FOR INSERT TO authenticated WITH CHECK (public.can_edit_larp_section(larp_id, 'production'));
CREATE POLICY "pl_update" ON public.production_links FOR UPDATE TO authenticated USING (public.can_edit_larp_section(larp_id, 'production')) WITH CHECK (public.can_edit_larp_section(larp_id, 'production'));
CREATE POLICY "pl_delete" ON public.production_links FOR DELETE TO authenticated USING (public.can_edit_larp_section(larp_id, 'production'));

-- production_portal_access
DROP POLICY IF EXISTS "Vlastník vidí production portal access" ON public.production_portal_access;
DROP POLICY IF EXISTS "Vlastník vytváří production portal access" ON public.production_portal_access;
DROP POLICY IF EXISTS "Vlastník upravuje production portal access" ON public.production_portal_access;
DROP POLICY IF EXISTS "Vlastník maže production portal access" ON public.production_portal_access;
CREATE POLICY "ppa_select" ON public.production_portal_access FOR SELECT TO authenticated USING (public.can_view_larp_section(larp_id, 'production'));
CREATE POLICY "ppa_insert" ON public.production_portal_access FOR INSERT TO authenticated WITH CHECK (public.can_edit_larp_section(larp_id, 'production'));
CREATE POLICY "ppa_update" ON public.production_portal_access FOR UPDATE TO authenticated USING (public.can_edit_larp_section(larp_id, 'production')) WITH CHECK (public.can_edit_larp_section(larp_id, 'production'));
CREATE POLICY "ppa_delete" ON public.production_portal_access FOR DELETE TO authenticated USING (public.can_edit_larp_section(larp_id, 'production'));

-- run_checklist (production checklist on run)
DROP POLICY IF EXISTS "Vlastník vidí run_checklist" ON public.run_checklist;
DROP POLICY IF EXISTS "Vlastník vytváří run_checklist" ON public.run_checklist;
DROP POLICY IF EXISTS "Vlastník upravuje run_checklist" ON public.run_checklist;
DROP POLICY IF EXISTS "Vlastník maže run_checklist" ON public.run_checklist;
CREATE POLICY "rc_select" ON public.run_checklist FOR SELECT TO authenticated USING (public.can_view_run_section(run_id, 'production'));
CREATE POLICY "rc_insert" ON public.run_checklist FOR INSERT TO authenticated WITH CHECK (public.can_edit_run_section(run_id, 'production'));
CREATE POLICY "rc_update" ON public.run_checklist FOR UPDATE TO authenticated USING (public.can_edit_run_section(run_id, 'production')) WITH CHECK (public.can_edit_run_section(run_id, 'production'));
CREATE POLICY "rc_delete" ON public.run_checklist FOR DELETE TO authenticated USING (public.can_edit_run_section(run_id, 'production'));

-- larp_design_settings
DROP POLICY IF EXISTS "Vlastník vidí design settings" ON public.larp_design_settings;
DROP POLICY IF EXISTS "Vlastník vytváří design settings" ON public.larp_design_settings;
DROP POLICY IF EXISTS "Vlastník upravuje design settings" ON public.larp_design_settings;
DROP POLICY IF EXISTS "Vlastník maže design settings" ON public.larp_design_settings;
CREATE POLICY "lds_select" ON public.larp_design_settings FOR SELECT TO authenticated USING (public.can_view_larp_section(larp_id, 'design'));
CREATE POLICY "lds_insert" ON public.larp_design_settings FOR INSERT TO authenticated WITH CHECK (public.can_edit_larp_section(larp_id, 'design'));
CREATE POLICY "lds_update" ON public.larp_design_settings FOR UPDATE TO authenticated USING (public.can_edit_larp_section(larp_id, 'design')) WITH CHECK (public.can_edit_larp_section(larp_id, 'design'));
CREATE POLICY "lds_delete" ON public.larp_design_settings FOR DELETE TO authenticated USING (public.can_edit_larp_section(larp_id, 'design'));

-- schedule_events
DROP POLICY IF EXISTS "Vlastník vidí schedule_events" ON public.schedule_events;
DROP POLICY IF EXISTS "Vlastník vytváří schedule_events" ON public.schedule_events;
DROP POLICY IF EXISTS "Vlastník upravuje schedule_events" ON public.schedule_events;
DROP POLICY IF EXISTS "Vlastník maže schedule_events" ON public.schedule_events;
CREATE POLICY "se_select" ON public.schedule_events FOR SELECT TO authenticated USING (public.can_view_run_section(run_id, 'schedule'));
CREATE POLICY "se_insert" ON public.schedule_events FOR INSERT TO authenticated WITH CHECK (public.can_edit_run_section(run_id, 'schedule'));
CREATE POLICY "se_update" ON public.schedule_events FOR UPDATE TO authenticated USING (public.can_edit_run_section(run_id, 'schedule')) WITH CHECK (public.can_edit_run_section(run_id, 'schedule'));
CREATE POLICY "se_delete" ON public.schedule_events FOR DELETE TO authenticated USING (public.can_edit_run_section(run_id, 'schedule'));

-- schedule_portal_access
DROP POLICY IF EXISTS "Vlastník vidí schedule portal access" ON public.schedule_portal_access;
DROP POLICY IF EXISTS "Vlastník vytváří schedule portal access" ON public.schedule_portal_access;
DROP POLICY IF EXISTS "Vlastník upravuje schedule portal access" ON public.schedule_portal_access;
DROP POLICY IF EXISTS "Vlastník maže schedule portal access" ON public.schedule_portal_access;
CREATE POLICY "spa_select" ON public.schedule_portal_access FOR SELECT TO authenticated USING (public.can_view_run_section(run_id, 'schedule'));
CREATE POLICY "spa_insert" ON public.schedule_portal_access FOR INSERT TO authenticated WITH CHECK (public.can_edit_run_section(run_id, 'schedule'));
CREATE POLICY "spa_update" ON public.schedule_portal_access FOR UPDATE TO authenticated USING (public.can_edit_run_section(run_id, 'schedule')) WITH CHECK (public.can_edit_run_section(run_id, 'schedule'));
CREATE POLICY "spa_delete" ON public.schedule_portal_access FOR DELETE TO authenticated USING (public.can_edit_run_section(run_id, 'schedule'));

-- cp_scenes
DROP POLICY IF EXISTS "Vlastník vidí scény CP" ON public.cp_scenes;
DROP POLICY IF EXISTS "Vlastník vytváří scény CP" ON public.cp_scenes;
DROP POLICY IF EXISTS "Vlastník upravuje scény CP" ON public.cp_scenes;
DROP POLICY IF EXISTS "Vlastník maže scény CP" ON public.cp_scenes;
CREATE POLICY "cps_select" ON public.cp_scenes FOR SELECT TO authenticated USING (public.can_view_run_section(run_id, 'cp'));
CREATE POLICY "cps_insert" ON public.cp_scenes FOR INSERT TO authenticated WITH CHECK (public.can_edit_run_section(run_id, 'cp'));
CREATE POLICY "cps_update" ON public.cp_scenes FOR UPDATE TO authenticated USING (public.can_edit_run_section(run_id, 'cp')) WITH CHECK (public.can_edit_run_section(run_id, 'cp'));
CREATE POLICY "cps_delete" ON public.cp_scenes FOR DELETE TO authenticated USING (public.can_edit_run_section(run_id, 'cp'));

-- cp_performers
DROP POLICY IF EXISTS "Vlastník vidí performery" ON public.cp_performers;
DROP POLICY IF EXISTS "Vlastník vytváří performery" ON public.cp_performers;
DROP POLICY IF EXISTS "Vlastník upravuje performery" ON public.cp_performers;
DROP POLICY IF EXISTS "Vlastník maže performery" ON public.cp_performers;
CREATE POLICY "cpf_select" ON public.cp_performers FOR SELECT TO authenticated USING (public.can_view_run_section(run_id, 'cp'));
CREATE POLICY "cpf_insert" ON public.cp_performers FOR INSERT TO authenticated WITH CHECK (public.can_edit_run_section(run_id, 'cp'));
CREATE POLICY "cpf_update" ON public.cp_performers FOR UPDATE TO authenticated USING (public.can_edit_run_section(run_id, 'cp')) WITH CHECK (public.can_edit_run_section(run_id, 'cp'));
CREATE POLICY "cpf_delete" ON public.cp_performers FOR DELETE TO authenticated USING (public.can_edit_run_section(run_id, 'cp'));

-- run_person_assignments -> players
DROP POLICY IF EXISTS "Vlastník vidí přiřazení" ON public.run_person_assignments;
DROP POLICY IF EXISTS "Vlastník vytváří přiřazení" ON public.run_person_assignments;
DROP POLICY IF EXISTS "Vlastník upravuje přiřazení" ON public.run_person_assignments;
DROP POLICY IF EXISTS "Vlastník maže přiřazení" ON public.run_person_assignments;
CREATE POLICY "rpa_select" ON public.run_person_assignments FOR SELECT TO authenticated USING (public.can_view_run_section(run_id, 'players'));
CREATE POLICY "rpa_insert" ON public.run_person_assignments FOR INSERT TO authenticated WITH CHECK (public.can_edit_run_section(run_id, 'players'));
CREATE POLICY "rpa_update" ON public.run_person_assignments FOR UPDATE TO authenticated USING (public.can_edit_run_section(run_id, 'players')) WITH CHECK (public.can_edit_run_section(run_id, 'players'));
CREATE POLICY "rpa_delete" ON public.run_person_assignments FOR DELETE TO authenticated USING (public.can_edit_run_section(run_id, 'players'));

-- runs (runs section governs deleting/creating; viewing requires any access — use 'runs' but fall back to any section by checking organizer record exists)
DROP POLICY IF EXISTS "Vlastník vidí běhy" ON public.runs;
DROP POLICY IF EXISTS "Vlastník vytváří běhy" ON public.runs;
DROP POLICY IF EXISTS "Vlastník upravuje běhy" ON public.runs;
DROP POLICY IF EXISTS "Vlastník maže běhy" ON public.runs;
-- everyone with ANY access to the larp can see runs (needed by all subsections)
CREATE POLICY "runs_select" ON public.runs FOR SELECT TO authenticated USING (public.can_access_larp(larp_id));
CREATE POLICY "runs_insert" ON public.runs FOR INSERT TO authenticated WITH CHECK (public.can_edit_larp_section(larp_id, 'runs'));
CREATE POLICY "runs_update" ON public.runs FOR UPDATE TO authenticated USING (public.can_edit_larp_section(larp_id, 'runs')) WITH CHECK (public.can_edit_larp_section(larp_id, 'runs'));
CREATE POLICY "runs_delete" ON public.runs FOR DELETE TO authenticated USING (public.can_edit_larp_section(larp_id, 'runs'));

-- email_log_v2 -> communication
DROP POLICY IF EXISTS "service writes email log" ON public.email_log_v2;
DROP POLICY IF EXISTS "org reads email log" ON public.email_log_v2;
CREATE POLICY "elv_select" ON public.email_log_v2 FOR SELECT TO authenticated USING (public.can_view_larp_section(larp_id, 'communication'));
CREATE POLICY "elv_insert" ON public.email_log_v2 FOR INSERT TO authenticated WITH CHECK (public.can_edit_larp_section(larp_id, 'communication'));

-- email_templates -> communication
DROP POLICY IF EXISTS "org rw email templates" ON public.email_templates;
CREATE POLICY "et_all" ON public.email_templates FOR ALL TO authenticated USING (public.can_view_larp_section(larp_id, 'communication')) WITH CHECK (public.can_edit_larp_section(larp_id, 'communication'));

-- larp_email_config -> communication
DROP POLICY IF EXISTS "org rw larp email config" ON public.larp_email_config;
CREATE POLICY "lec_all" ON public.larp_email_config FOR ALL TO authenticated USING (public.can_view_larp_section(larp_id, 'communication')) WITH CHECK (public.can_edit_larp_section(larp_id, 'communication'));

-- magic_links -> communication
DROP POLICY IF EXISTS "org writes magic links of own larps" ON public.magic_links;
DROP POLICY IF EXISTS "org reads magic links of own larps" ON public.magic_links;
CREATE POLICY "ml_select" ON public.magic_links FOR SELECT TO authenticated USING (public.can_view_run_section(run_id, 'communication'));
CREATE POLICY "ml_all" ON public.magic_links FOR ALL TO authenticated USING (public.can_view_run_section(run_id, 'communication')) WITH CHECK (public.can_edit_run_section(run_id, 'communication'));
