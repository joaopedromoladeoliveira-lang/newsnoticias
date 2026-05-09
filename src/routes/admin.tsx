import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useIsAdmin } from "@/hooks/use-role";
import { LayoutDashboard, FileText, MessageSquare, Megaphone, BarChart3, ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — NewsFlow AI" }] }),
  component: AdminLayout,
});

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/articles", label: "Artigos", icon: FileText },
  { to: "/admin/comments", label: "Moderação", icon: MessageSquare },
  { to: "/admin/ads", label: "Anúncios", icon: Megaphone },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

function AdminLayout() {
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && isAdmin === false) navigate({ to: "/" });
  }, [loading, isAdmin, navigate]);

  if (loading) {
    return (
      <main className="min-h-[60vh] grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h1 className="font-display text-2xl">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground mt-2">Apenas administradores podem acessar esta área.</p>
        <Link to="/" className="mt-4 inline-block text-primary text-sm">← Voltar</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h1 className="font-display text-3xl">Admin</h1>
      </div>

      <nav className="flex gap-1 overflow-x-auto pb-3 mb-6 border-b border-border scrollbar-none">
        {NAV.map((n) => {
          const active = n.exact ? path === n.to : path.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to as any}
              className={`shrink-0 inline-flex items-center gap-2 px-4 h-10 rounded-full text-sm font-medium transition-colors ${
                active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {n.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </main>
  );
}
