import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Flame, Mail, Lock } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — NewsFlow AI" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/dashboard`,
      });
      if (result.error) {
        toast.error((result.error as Error).message ?? "Falha no login com Google");
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/dashboard" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 bg-gradient-hero">
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Flame className="h-8 w-8 text-primary" />
            <span className="font-display text-2xl">NewsFlow<span className="text-gradient-ember">AI</span></span>
          </div>
          <h1 className="font-display text-3xl">{mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</h1>
          <p className="text-muted-foreground text-sm mt-2">
            {mode === "login" ? "Acesse seu feed personalizado e ganhos" : "Comece a publicar e monetizar agora"}
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-card border border-border p-6 shadow-elevated">
          <button
            onClick={google}
            className="w-full h-11 rounded-full bg-foreground text-background font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            Continuar com Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Nome completo"
                className="w-full h-11 px-4 rounded-lg bg-input border border-border focus:border-primary outline-none text-sm"
              />
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-input border border-border focus:border-primary outline-none text-sm"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Senha (min. 6 caracteres)"
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-input border border-border focus:border-primary outline-none text-sm"
              />
            </div>
            <button
              disabled={loading}
              className="w-full h-11 rounded-full bg-gradient-ember text-primary-foreground font-semibold shadow-glow disabled:opacity-60"
            >
              {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-5 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
          </button>
        </div>

        <Link to="/" className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground">
          ← Voltar ao feed
        </Link>
      </div>
    </main>
  );
}
