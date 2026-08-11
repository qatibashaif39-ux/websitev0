import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, KeyRound, Info, Globe, Activity, ShoppingCart, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/settings")({
  component: DashboardSettings,
});

const KEYS = [
  "ziina_api_key",
  "ziina_test_mode",
  "site_domain",
  "meta_pixel_id",
  "meta_access_token",
  "tiktok_pixel_id",
  "tiktok_access_token",
  "min_order_qty",
  "social_whatsapp",
  "social_facebook",
  "social_snapchat",
  "social_instagram",
] as const;

type SettingsMap = Record<(typeof KEYS)[number], string>;
const SETTINGS_STORAGE_KEY = "d1_app_settings_store";

async function fetchSettings(): Promise<SettingsMap> {
  const map: SettingsMap = {
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
  if (typeof window === "undefined") return map;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...map, ...parsed };
    }
  } catch {
    // fallback
  }
  return map;
}

async function upsertSetting(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    const current = await fetchSettings();
    current[key as keyof SettingsMap] = value;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error("[Settings] Save setting failed:", err);
  }
}


function DashboardSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["app_settings"], queryFn: fetchSettings });

  const [apiKey, setApiKey] = useState("");
  const [testMode, setTestMode] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [domain, setDomain] = useState("");
  const [metaPixelId, setMetaPixelId] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [showMeta, setShowMeta] = useState(false);
  const [pixelId, setPixelId] = useState("");
  const [ttToken, setTtToken] = useState("");
  const [showTt, setShowTt] = useState(false);
  const [minQty, setMinQty] = useState("2");
  const [whatsapp, setWhatsapp] = useState("");
  const [facebook, setFacebook] = useState("");
  const [snapchat, setSnapchat] = useState("");
  const [instagram, setInstagram] = useState("");

  useEffect(() => {
    if (data) {
      setApiKey(data.ziina_api_key);
      setTestMode(data.ziina_test_mode !== "false");
      setDomain(data.site_domain);
      setMetaPixelId(data.meta_pixel_id);
      setMetaToken(data.meta_access_token);
      setPixelId(data.tiktok_pixel_id);
      setTtToken(data.tiktok_access_token);
      setMinQty(data.min_order_qty || "2");
      setWhatsapp(data.social_whatsapp);
      setFacebook(data.social_facebook);
      setSnapchat(data.social_snapchat);
      setInstagram(data.social_instagram);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      await upsertSetting("ziina_api_key", apiKey.trim());
      await upsertSetting("ziina_test_mode", testMode ? "true" : "false");
      await upsertSetting("site_domain", domain.trim().replace(/\/+$/, ""));
      await upsertSetting("meta_pixel_id", metaPixelId.trim());
      await upsertSetting("meta_access_token", metaToken.trim());
      await upsertSetting("tiktok_pixel_id", pixelId.trim());
      await upsertSetting("tiktok_access_token", ttToken.trim());
      const n = Math.max(1, parseInt(minQty, 10) || 1);
      await upsertSetting("min_order_qty", String(n));
      await upsertSetting("social_whatsapp", whatsapp.trim());
      await upsertSetting("social_facebook", facebook.trim());
      await upsertSetting("social_snapchat", snapchat.trim());
      await upsertSetting("social_instagram", instagram.trim());
    },
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات");
      qc.invalidateQueries({ queryKey: ["app_settings"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error("تعذّر حفظ الإعدادات");
    },
  });

  if (isLoading) {
    return <div className="flex min-h-[30vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const field = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted-foreground">إدارة بوابة الدفع، الدومين، وتتبع TikTok.</p>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="font-bold">دومين الموقع</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          الدومين الكامل المستخدم في روابط نجاح/إلغاء الدفع. مثال: <span dir="ltr" className="font-mono">https://teenliwa.com</span>
        </p>
        <input
          dir="ltr"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="https://yourdomain.com"
          className={`${field} mt-3 font-mono`}
          autoComplete="off"
          spellCheck={false}
        />
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="font-bold">بوابة الدفع — Ziina</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          أدخل مفتاح API من <a href="https://docs.ziina.com" target="_blank" rel="noreferrer" className="text-primary underline">docs.ziina.com</a>.
        </p>
        <label className="mt-4 block text-sm font-semibold">مفتاح Ziina API</label>
        <div className="mt-2 flex gap-2">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="ZIINA_API_KEY"
            className={`${field} font-mono`}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" onClick={() => setShowKey((v) => !v)} className="rounded-xl border border-border px-3 text-xs font-bold hover:bg-secondary">
            {showKey ? "إخفاء" : "إظهار"}
          </button>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} className="h-4 w-4 accent-primary" />
          <span className="font-semibold">وضع الاختبار (Test Mode)</span>
        </label>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>عند تفعيله، يتم استخدام مدفوعات تجريبية. أوقفه عند الاستعداد للإنتاج.</div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="font-bold">تتبع Meta Ads Pixel (Facebook & Instagram)</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          معرّف بكسل فيسبوك لتتبع الزيارات والتحويلات (PageView, InitiateCheckout, Purchase).
        </p>

        <label className="mt-4 block text-sm font-semibold">Meta Pixel ID</label>
        <input
          dir="ltr"
          value={metaPixelId}
          onChange={(e) => setMetaPixelId(e.target.value)}
          placeholder="123456789012345"
          className={`${field} mt-2 font-mono`}
          autoComplete="off"
          spellCheck={false}
        />

        <label className="mt-4 block text-sm font-semibold">Meta Conversions API Token (اخشياري)</label>
        <div className="mt-2 flex gap-2">
          <input
            dir="ltr"
            type={showMeta ? "text" : "password"}
            value={metaToken}
            onChange={(e) => setMetaToken(e.target.value)}
            placeholder="EAAGxxxxxxxxxxxxxxxxxx"
            className={`${field} font-mono`}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" onClick={() => setShowMeta((v) => !v)} className="rounded-xl border border-border px-3 text-xs font-bold hover:bg-secondary">
            {showMeta ? "إخفاء" : "إظهار"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="font-bold">تتبع TikTok</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          بكسل TikTok يعمل في المتصفح، وAccess Token لإرسال أحداث Events API من السيرفر (Purchase).
        </p>

        <label className="mt-4 block text-sm font-semibold">TikTok Pixel ID</label>
        <input
          dir="ltr"
          value={pixelId}
          onChange={(e) => setPixelId(e.target.value)}
          placeholder="C4XXXXXXXXXXXXXXXXXX"
          className={`${field} mt-2 font-mono`}
          autoComplete="off"
          spellCheck={false}
        />

        <label className="mt-4 block text-sm font-semibold">TikTok Events API Access Token</label>
        <div className="mt-2 flex gap-2">
          <input
            dir="ltr"
            type={showTt ? "text" : "password"}
            value={ttToken}
            onChange={(e) => setTtToken(e.target.value)}
            placeholder="EAxxxxxxxxxxxxxxxxxx"
            className={`${field} font-mono`}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" onClick={() => setShowTt((v) => !v)} className="rounded-xl border border-border px-3 text-xs font-bold hover:bg-secondary">
            {showTt ? "إخفاء" : "إظهار"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="font-bold">الحد الأدنى للطلب</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          أقل كمية إجمالية مسموح بها لتسجيل الطلب. مثال: عند ضبطه على 2، لن يُقبل طلب بكمية إجمالية أقل من 2.
        </p>
        <label className="mt-4 block text-sm font-semibold">أدنى كمية</label>
        <input
          type="number"
          min={1}
          step={1}
          value={minQty}
          onChange={(e) => setMinQty(e.target.value)}
          className={`${field} mt-2 w-32`}
        />
      </section>


      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          <h2 className="font-bold">روابط التواصل الاجتماعي</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          تظهر كأيقونات في الفوتر. اترك الحقل فارغاً لإخفاء الأيقونة.
        </p>

        <label className="mt-4 block text-sm font-semibold">واتساب (رقم أو رابط)</label>
        <input
          dir="ltr"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="971501234567 أو https://wa.me/971501234567"
          className={`${field} mt-2 font-mono`}
          autoComplete="off"
          spellCheck={false}
        />

        <label className="mt-4 block text-sm font-semibold">إنستغرام</label>
        <input
          dir="ltr"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="https://instagram.com/username"
          className={`${field} mt-2 font-mono`}
          autoComplete="off"
          spellCheck={false}
        />

        <label className="mt-4 block text-sm font-semibold">فيسبوك</label>
        <input
          dir="ltr"
          value={facebook}
          onChange={(e) => setFacebook(e.target.value)}
          placeholder="https://facebook.com/page"
          className={`${field} mt-2 font-mono`}
          autoComplete="off"
          spellCheck={false}
        />

        <label className="mt-4 block text-sm font-semibold">سناب شات</label>
        <input
          dir="ltr"
          value={snapchat}
          onChange={(e) => setSnapchat(e.target.value)}
          placeholder="https://snapchat.com/add/username"
          className={`${field} mt-2 font-mono`}
          autoComplete="off"
          spellCheck={false}
        />
      </section>

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        حفظ الإعدادات
      </button>
    </div>
  );
}
