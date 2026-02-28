
-- Tabulka pro evidenci zpracovaných transakcí z Fio transparentního účtu
CREATE TABLE public.payment_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.runs(id) ON DELETE CASCADE NOT NULL,
  assignment_id uuid REFERENCES public.run_person_assignments(id) ON DELETE SET NULL,
  transaction_date date NOT NULL,
  amount numeric NOT NULL,
  sender_name text,
  message text,
  vs text,
  matched boolean NOT NULL DEFAULT false,
  matched_player_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id, transaction_date, amount, sender_name)
);

-- Enable RLS
ALTER TABLE public.payment_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS policies – only run owner can access
CREATE POLICY "Vlastník vidí payment_sync_log"
  ON public.payment_sync_log FOR SELECT
  USING (public.is_run_owner(run_id));

CREATE POLICY "Vlastník vytváří payment_sync_log"
  ON public.payment_sync_log FOR INSERT
  WITH CHECK (public.is_run_owner(run_id));

CREATE POLICY "Vlastník upravuje payment_sync_log"
  ON public.payment_sync_log FOR UPDATE
  USING (public.is_run_owner(run_id));

CREATE POLICY "Vlastník maže payment_sync_log"
  ON public.payment_sync_log FOR DELETE
  USING (public.is_run_owner(run_id));
