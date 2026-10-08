-- Learner-visible account/profile features, configurable landing hero art, and
-- server-maintained learning streaks.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_activity_date date;

CREATE OR REPLACE FUNCTION private.record_learning_day()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF NEW.completed AND (TG_OP = 'INSERT' OR NOT OLD.completed) THEN
    UPDATE public.profiles
    SET streak_count = CASE
          WHEN last_activity_date = v_today THEN streak_count
          WHEN last_activity_date = v_today - 1 THEN streak_count + 1
          ELSE 1
        END,
        last_activity_date = v_today,
        updated_at = now()
    WHERE id = NEW.student_id AND role = 'student';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.record_learning_day() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS record_learning_day_on_completion ON public.user_progress;
CREATE TRIGGER record_learning_day_on_completion
  AFTER INSERT OR UPDATE OF completed ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION private.record_learning_day();

CREATE TABLE IF NOT EXISTS public.site_settings (
  id text PRIMARY KEY CHECK (id = 'main'),
  hero_image_url text,
  hero_image_opacity smallint NOT NULL DEFAULT 28 CHECK (hero_image_opacity BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (id, hero_image_url, hero_image_opacity)
VALUES ('main', NULL, 28)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE (hero_image_url, hero_image_opacity, updated_at) ON public.site_settings TO authenticated;

DROP POLICY IF EXISTS "Public can read landing hero settings" ON public.site_settings;
CREATE POLICY "Public can read landing hero settings"
  ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins can update landing hero settings" ON public.site_settings;
CREATE POLICY "Admins can update landing hero settings"
  ON public.site_settings FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('site-assets', 'site-assets', true, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can read hero assets" ON storage.objects;
CREATE POLICY "Public can read hero assets"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "Admins can upload hero assets" ON storage.objects;
CREATE POLICY "Admins can upload hero assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND (SELECT private.is_admin()));

DROP POLICY IF EXISTS "Admins can update hero assets" ON storage.objects;
CREATE POLICY "Admins can update hero assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'site-assets' AND (SELECT private.is_admin()))
  WITH CHECK (bucket_id = 'site-assets' AND (SELECT private.is_admin()));

DROP POLICY IF EXISTS "Admins can delete hero assets" ON storage.objects;
CREATE POLICY "Admins can delete hero assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-assets' AND (SELECT private.is_admin()));
