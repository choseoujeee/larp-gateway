-- Create storage bucket for document images
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-images', 'document-images', true);

-- Allow anyone to view images (public bucket)
CREATE POLICY "Document images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'document-images');

-- Allow authenticated users (larp owners) to upload images
CREATE POLICY "Authenticated users can upload document images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'document-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their images
CREATE POLICY "Authenticated users can update document images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'document-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their images
CREATE POLICY "Authenticated users can delete document images"
ON storage.objects FOR DELETE
USING (bucket_id = 'document-images' AND auth.role() = 'authenticated');