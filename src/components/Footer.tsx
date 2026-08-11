import { useQuery } from "@tanstack/react-query";
import { Facebook, Instagram, MessageCircle, Ghost } from "lucide-react";
import { getAppSettings } from "@/lib/settings";

async function fetchSocials() {
    const settings = getAppSettings();
    return {
        social_whatsapp: settings.social_whatsapp,
        social_facebook: settings.social_facebook,
        social_snapchat: settings.social_snapchat,
        social_instagram: settings.social_instagram,
    };
}

function normalizeWhatsapp(v: string) {
    if (!v) return "";
    if (v.startsWith("http")) return v;
    const digits = v.replace(/[^\d]/g, "");
    return digits ? `https://wa.me/${digits}` : "";
}

function normalizeUrl(v: string) {
    if (!v) return "";
    if (v.startsWith("http")) return v;
    return `https://${v}`;
}

export function Footer() {
    const { data } = useQuery({
        queryKey: ["app_settings", "socials"],
        queryFn: fetchSocials,
    });

    const socials = [
        {
            key: "whatsapp",
            label: "واتساب",
            href: normalizeWhatsapp(data?.social_whatsapp ?? ""),
            Icon: MessageCircle,
            color: "text-[#25D366]",
            bg: "bg-[#25D366]/10 hover:bg-[#25D366]/20",
        },
        {
            key: "instagram",
            label: "إنستغرام",
            href: normalizeUrl(data?.social_instagram ?? ""),
            Icon: Instagram,
            color: "text-[#E4405F]",
            bg: "bg-[#E4405F]/10 hover:bg-[#E4405F]/20",
        },
        {
            key: "facebook",
            label: "فيسبوك",
            href: normalizeUrl(data?.social_facebook ?? ""),
            Icon: Facebook,
            color: "text-[#1877F2]",
            bg: "bg-[#1877F2]/10 hover:bg-[#1877F2]/20",
        },
        {
            key: "snapchat",
            label: "سناب شات",
            href: normalizeUrl(data?.social_snapchat ?? ""),
            Icon: Ghost,
            color: "text-[#FFFC00]",
            bg: "bg-yellow-400/10 hover:bg-yellow-400/20",
        },
    ].filter((s) => s.href);

    return (
        <footer className="mt-auto border-t border-border/60 bg-background/80 pb-20 backdrop-blur-lg md:pb-8">
            <div className="mx-auto max-w-6xl px-4 py-6">
                {socials.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {socials.map(({ key, label, href, Icon, color, bg }) => (
                            <a
                                key={key}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={label}
                                title={label}
                                className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${bg} ${color}`}
                            >
                                <Icon className="h-5 w-5" />
                            </a>
                        ))}
                    </div>
                )}

                <div className="mt-4 border-t border-border/40 pt-4 text-center">
                    <p className="text-xs text-muted-foreground">
                        جميع الحقوق محفوظة © {new Date().getFullYear()}{" "}
                        gigatopx.com
                    </p>
                </div>
            </div>
        </footer>
    );
}
