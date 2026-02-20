-- Add payment_mode and payment_instructions to runs table
ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'bank_transfer',
  ADD COLUMN IF NOT EXISTS payment_instructions text;

-- Create RPC to get payment info for a run (SECURITY DEFINER so portal can read without auth)
CREATE OR REPLACE FUNCTION public.get_run_payment_info(p_run_id uuid)
RETURNS TABLE (payment_mode text, payment_instructions text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT r.payment_mode, r.payment_instructions
  FROM runs r
  WHERE r.id = p_run_id;
END;
$$;