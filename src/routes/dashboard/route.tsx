import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, Package, ShoppingBag, Store, Tags, LogOut, Loader2, Settings, Database, Megaphone } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "لوحة التحكم — تين ليوا" },
      { name: "description", content: "إدارة الطلبات والمنتجات والإحصائيات في تين ليوا." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardLayout,
});

const NAV = [
  { to: "/dashboard", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/orders", label: "الطلبات", icon: ShoppingBag, exact: false },
  { to: "/dashboard/products", label: "المنتجات", icon: Package, exact: false },
  { to: "/dashboard/categories", label: "الأصناف", icon: Tags, exact: false },
  { to: "/dashboard/ads", label: "إعلانات AI", icon: Megaphone, exact: false },
  { to: "/dashboard/database", label: "قاعدة البيانات D1", icon: Database, exact: false },
  { to: "/dashboard/settings", label: "الإعدادات", icon: Settings, exact: false },
] as const;



function DashboardLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, isAdmin, loading, signOut } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <Store className="h-10 w-10 text-muted-foreground/50" />
        <h1 className="mt-4 text-xl font-bold">لا تملك صلاحية الوصول</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          لوحة التحكم متاحة للمشرف فقط. سجّل الدخول بحساب المشرف.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => signOut()}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold hover:bg-secondary"
          >
            تسجيل الخروج
          </button>
          <Link to="/" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
            العودة للمتجر
          </Link>
        </div>
      </div>
    );
  }

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="shrink-0 md:w-56">
        <div className="flex items-center gap-2 px-2 pb-4">
          <Store className="h-5 w-5 text-primary" />
          <span className="font-extrabold">لوحة التحكم</span>
        </div>
        <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                isActive(item.to, item.exact)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 hidden flex-col gap-2 md:flex md:px-1">
          <button
            onClick={() => signOut().then(() => navigate({ to: "/auth" }))}
            className="flex items-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> تسجيل الخروج
          </button>
          <Link
            to="/"
            className="px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            ← العودة للمتجر
          </Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}