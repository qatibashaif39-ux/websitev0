import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

export function MetaPixel() {
  const [pixelId, setPixelId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "meta_pixel_id")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && data.value.trim().length > 0) {
          setPixelId(data.value.trim());
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!pixelId || typeof window === "undefined") return;

    if (window.fbq) {
      window.fbq("init", pixelId);
      window.fbq("track", "PageView");
      return;
    }

    // Initialize Meta Pixel script
    const fbq = function (...args: any[]) {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, args);
      } else {
        fbq.queue.push(args);
      }
    };

    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);

    window.fbq("init", pixelId);
    window.fbq("track", "PageView");
  }, [pixelId]);

  return null;
}
