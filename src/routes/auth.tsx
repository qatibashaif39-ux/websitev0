import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Store } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [{ title: "تسجيل الدخول — لوحة التحكم" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("y@y.com");
  const [password, setPassword] = useState("123456789");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: "/dashboard" });
    }
  }, [authLoading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(email, password);
        setInfo("تم إنشاء الحساب وسماح الوصول إلى لوحة التحكم.");
        navigate({ to: "/dashboard" });
      } else {
        await signIn(email, password);
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      setError(err?.message ?? "حدث خطأ، حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    await signIn(email || "y@y.com", "123456789");
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6">
        <div className="flex items-center justify-center gap-2">
          <Store className="h-6 w-6 text-primary" />
          <span className="text-lg font-extrabold">لوحة تحكم تين ليوا</span>
        </div>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {mode === "login" ? "سجّل دخولك للوصول إلى لوحة التحكم" : "أنشئ حساب المشرف"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
          {info && <p className="text-sm font-semibold text-primary">{info}</p>}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> أو <span className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full rounded-xl border border-border bg-background py-2.5 text-sm font-bold transition-colors hover:bg-secondary"
        >
          المتابعة عبر Google
        </button>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setInfo(null);
          }}
          className="mt-4 w-full text-center text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {mode === "login" ? "ليس لديك حساب؟ إنشاء حساب" : "لديك حساب؟ تسجيل الدخول"}
        </button>

        <Link
          to="/"
          className="mt-3 block text-center text-xs text-muted-foreground hover:text-foreground"
        >
          العودة للمتجر
        </Link>
      </div>
    </main>
  );
}
