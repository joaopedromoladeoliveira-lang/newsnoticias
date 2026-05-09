import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-8xl text-gradient-ember">404</h1>
        <h2 className="mt-4 font-display text-2xl">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O conteúdo que você procura foi movido ou não existe.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-ember px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          Voltar para o feed
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-gradient-ember px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Tentar novamente
          </button>
          <a href="/" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NewsFlow AI — Notícias inteligentes em tempo real" },
      {
        name: "description",
        content:
          "O portal de notícias inteligente. Tecnologia, IA, games, futebol, negócios, cripto e o que está viralizando — em um só lugar.",
      },
      { name: "theme-color", content: "#1a1a1a" },
      { property: "og:title", content: "NewsFlow AI — Notícias inteligentes em tempo real" },
      { property: "og:description", content: "NewsFlow AI is a comprehensive SaaS platform for creating and consuming news and blog content." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "NewsFlow AI — Notícias inteligentes em tempo real" },
      { name: "description", content: "NewsFlow AI is a comprehensive SaaS platform for creating and consuming news and blog content." },
      { name: "twitter:description", content: "NewsFlow AI is a comprehensive SaaS platform for creating and consuming news and blog content." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a1f0451b-cec9-4db2-a989-93f0d021e498/id-preview-7d85a8c4--f9a7baaa-7333-4d2a-9b39-6e531cc2e6bf.lovable.app-1778369603214.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a1f0451b-cec9-4db2-a989-93f0d021e498/id-preview-7d85a8c4--f9a7baaa-7333-4d2a-9b39-6e531cc2e6bf.lovable.app-1778369603214.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Header />
          <Outlet />
        </div>
        <Toaster theme="dark" position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
