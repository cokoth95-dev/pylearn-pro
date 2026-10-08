-- Let Admin choose a static image/GIF or a muted looping video for the hero.
ALTER TABLE public.site_settings
  ADD COLUMN hero_media_type text NOT NULL DEFAULT 'image'
    CHECK (hero_media_type IN ('image', 'video'));

GRANT UPDATE (hero_media_type) ON public.site_settings TO authenticated;

-- Uploaded hero files can now include GIF and lightweight web video.
UPDATE storage.buckets
SET file_size_limit = 20971520,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif',
      'video/mp4', 'video/webm'
    ]
WHERE id = 'site-assets';
