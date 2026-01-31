-- Create feedback status type
CREATE TYPE public.feedback_status AS ENUM ('new', 'read', 'resolved');

-- Create portal_feedback table
CREATE TABLE public.portal_feedback (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    larp_id UUID REFERENCES public.larps(id) ON DELETE CASCADE,
    user_id UUID,
    source_page TEXT NOT NULL,
    content TEXT NOT NULL CHECK (char_length(content) <= 2000),
    status feedback_status NOT NULL DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.portal_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback (for portal users without auth)
CREATE POLICY "Anyone can insert feedback"
ON public.portal_feedback
FOR INSERT
WITH CHECK (true);

-- LARP owners can view feedback for their LARPs
CREATE POLICY "Owners can view their feedback"
ON public.portal_feedback
FOR SELECT
USING (is_larp_owner(larp_id) OR larp_id IS NULL AND user_id = auth.uid());

-- LARP owners can update feedback status
CREATE POLICY "Owners can update feedback"
ON public.portal_feedback
FOR UPDATE
USING (is_larp_owner(larp_id));

-- LARP owners can delete feedback
CREATE POLICY "Owners can delete feedback"
ON public.portal_feedback
FOR DELETE
USING (is_larp_owner(larp_id));