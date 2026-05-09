import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Search, PenSquare, LogIn, User, LogOut, Flame, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-role";

const CATEGORIES = [
  { slug: "ia", label: "IA" },
  { slug: "tecnologia", label: "Tech" },
  { slug: "games", label: "Games" },
  { slug: "futebol", label: "Futebol" },
  { slug: "negocios", label: "Negócios" },
  { slug: "cripto", label: "Cripto" },
  { slug: "viral", label: "Viral" },
] as const;

export function Header() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/", search: { q: q.trim() } as never });
  };

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-ember blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
              <Flame className="relative h-7 w-7 text-primary" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl tracking-tight">
              NewsFlow<span className="text-gradient-ember">AI</span>
            </span>
          </Link>

          <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-md ml-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar notícias, tópicos, autores…"
                className="w-full h-10 pl-10 pr-4 rounded-full bg-muted border border-transparent focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/write"
                  className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-full bg-gradient-ember text-primary-foreground font-medium text-sm shadow-glow hover:scale-[1.02] transition-transform"
                >
                  <PenSquare className="h-4 w-4" /> Publicar
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-muted hover:bg-secondary transition-colors"
                  title="Dashboard"
                >
                  <User className="h-4 w-4" />
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-muted hover:bg-secondary transition-colors text-primary"
                    title="Admin"
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-gradient-ember text-primary-foreground font-medium text-sm shadow-glow hover:scale-[1.02] transition-transform"
              >
                <LogIn className="h-4 w-4" /> Entrar
              </Link>
            )}
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-none">
          <Link
            to="/"
            className={`shrink-0 px-3 h-8 inline-flex items-center rounded-full text-sm font-medium transition-colors ${
              location.pathname === "/" && !location.search?.includes("category")
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Em alta
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to="/category/$cat"
              params={{ cat: c.slug }}
              className={`shrink-0 px-3 h-8 inline-flex items-center rounded-full text-sm font-medium transition-colors ${
                location.pathname === `/category/${c.slug}`
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
