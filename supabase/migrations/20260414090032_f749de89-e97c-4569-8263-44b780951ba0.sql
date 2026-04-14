
-- 1. Add visual_mode to larps
ALTER TABLE public.larps
  ADD COLUMN IF NOT EXISTS visual_mode text NOT NULL DEFAULT 'vizual_fix';

-- 2. Add logo, favicon, and typography columns to larp_design_settings
ALTER TABLE public.larp_design_settings
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS h1_font_size text,
  ADD COLUMN IF NOT EXISTS h1_font_weight text,
  ADD COLUMN IF NOT EXISTS h1_letter_spacing text,
  ADD COLUMN IF NOT EXISTS h1_line_height text,
  ADD COLUMN IF NOT EXISTS h1_margin_bottom text,
  ADD COLUMN IF NOT EXISTS h2_font_size text,
  ADD COLUMN IF NOT EXISTS h2_font_weight text,
  ADD COLUMN IF NOT EXISTS h2_letter_spacing text,
  ADD COLUMN IF NOT EXISTS h2_line_height text,
  ADD COLUMN IF NOT EXISTS h2_margin_bottom text,
  ADD COLUMN IF NOT EXISTS h3_font_size text,
  ADD COLUMN IF NOT EXISTS h3_font_weight text,
  ADD COLUMN IF NOT EXISTS h3_letter_spacing text,
  ADD COLUMN IF NOT EXISTS h3_line_height text,
  ADD COLUMN IF NOT EXISTS h3_margin_bottom text,
  ADD COLUMN IF NOT EXISTS h4_font_size text,
  ADD COLUMN IF NOT EXISTS h4_font_weight text,
  ADD COLUMN IF NOT EXISTS h4_letter_spacing text,
  ADD COLUMN IF NOT EXISTS h4_line_height text,
  ADD COLUMN IF NOT EXISTS h4_margin_bottom text,
  ADD COLUMN IF NOT EXISTS h5_font_size text,
  ADD COLUMN IF NOT EXISTS h5_font_weight text,
  ADD COLUMN IF NOT EXISTS h5_letter_spacing text,
  ADD COLUMN IF NOT EXISTS h5_line_height text,
  ADD COLUMN IF NOT EXISTS h5_margin_bottom text;

-- 3. Create larp-assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('larp-assets', 'larp-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies
CREATE POLICY "Anyone can view larp assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'larp-assets');

CREATE POLICY "Authenticated users can upload larp assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'larp-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update larp assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'larp-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete larp assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'larp-assets' AND auth.role() = 'authenticated');
