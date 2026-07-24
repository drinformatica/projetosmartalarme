import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { InstallPrompt } from "../components/InstallPrompt";
import { registerPWA } from "../lib/pwa-register";
import { flushOutbox } from "../lib/offline-outbox";
import { saveQuote } from "../lib/quotes.functions";
import { useServerFn } from "@tanstack/react-start";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
      { title: "Intrusão 2.0 - Orçamentos & Pipeline" },
      { name: "description", content: "Plataforma para geração de propostas comerciais em PDF e pipeline de vendas de sistemas de alarme e monitoramento." },
      { property: "og:title", content: "Intrusão 2.0 - Orçamentos & Pipeline" },
      { property: "og:description", content: "Plataforma para geração de propostas comerciais em PDF e pipeline de vendas de sistemas de alarme e monitoramento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Intrusão 2.0 - Orçamentos & Pipeline" },
      { name: "twitter:description", content: "Plataforma para geração de propostas comerciais em PDF e pipeline de vendas de sistemas de alarme e monitoramento." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4eff2be6-7064-4629-a3f4-97fcb1b82818/id-preview-54a161b6--c6140a8a-6d4f-43d4-89c4-fb60dd6e59c9.lovable.app-1784247446886.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4eff2be6-7064-4629-a3f4-97fcb1b82818/id-preview-54a161b6--c6140a8a-6d4f-43d4-89c4-fb60dd6e59c9.lovable.app-1784247446886.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700;800;900&family=Epilogue:wght@300;400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/apple-touch-icon.png", type: "image/png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-4 text-center text-sm text-slate-600">
      <p>
        Plataforma desenvolvido pelo executivo{" "}
        <a
          href="https://www.linkedin.com/in/david-ramon-nascimento-6982b5164/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-green-700 hover:underline"
        >
          David Nascimento
        </a>{" "}
        e Executivo{" "}
        <a
          href="https://www.linkedin.com/in/thiago-garcia-7131b3184?utm_source=share_via&utm_content=profile&utm_medium=member_ios"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-green-700 hover:underline"
        >
          Thiago Brito
        </a>
      </p>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const save = useServerFn(saveQuote);

  useEffect(() => {
    registerPWA();
    const doFlush = () => {
      flushOutbox((payload) =>
        save({ data: payload }) as Promise<{ id?: string } | null>,
      ).then((r) => {
        if (r.flushed > 0) console.info(`[outbox] ${r.flushed} sincronizado(s).`);
      });
    };
    window.addEventListener("online", doFlush);
    doFlush();
    return () => window.removeEventListener("online", doFlush);
  }, [save]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Footer />
      <InstallPrompt />
      <SpeedInsights />
      <Analytics />
    </QueryClientProvider>
  );
}
