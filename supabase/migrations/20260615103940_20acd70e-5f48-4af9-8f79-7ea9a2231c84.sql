
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS extra_target_person_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS extra_target_group_names text[] NOT NULL DEFAULT '{}';
