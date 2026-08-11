
INSERT INTO public.app_settings (key, value) VALUES
  ('site_domain', ''),
  ('tiktok_pixel_id', ''),
  ('tiktok_access_token', '')
ON CONFLICT (key) DO NOTHING;

GRANT SELECT ON public.app_settings TO anon;

CREATE POLICY "Public can read public settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (key IN ('site_domain', 'tiktok_pixel_id'));
