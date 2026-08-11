DROP POLICY IF EXISTS "Public can read public settings" ON public.app_settings;
CREATE POLICY "Public can read public settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (key = ANY (ARRAY['site_domain','tiktok_pixel_id','min_order_qty']));
INSERT INTO public.app_settings (key, value) VALUES ('min_order_qty','2') ON CONFLICT (key) DO NOTHING;