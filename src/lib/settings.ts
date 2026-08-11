const SETTINGS_STORAGE_KEY = "d1_app_settings_store";

export interface AppSettings {
  ziina_api_key: string;
  ziina_test_mode: string;
  site_domain: string;
  meta_pixel_id: string;
  meta_access_token: string;
  tiktok_pixel_id: string;
  tiktok_access_token: string;
  min_order_qty: string;
  social_whatsapp: string;
  social_facebook: string;
  social_snapchat: string;
  social_instagram: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  ziina_api_key: "",
  ziina_test_mode: "true",
  site_domain: "",
  meta_pixel_id: "",
  meta_access_token: "",
  tiktok_pixel_id: "",
  tiktok_access_token: "",
  min_order_qty: "2",
  social_whatsapp: "",
  social_facebook: "",
  social_snapchat: "",
  social_instagram: "",
};

export function getAppSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_SETTINGS;
}

export function getAppSetting(key: keyof AppSettings): string {
  const settings = getAppSettings();
  return settings[key] ?? DEFAULT_SETTINGS[key] ?? "";
}

export function setAppSetting(key: keyof AppSettings, value: string) {
  if (typeof window === "undefined") return;
  const current = getAppSettings();
  current[key] = value;
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(current));
}
