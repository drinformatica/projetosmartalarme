import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Intrusão 2.0 — Orçamentos, ROI e pipeline comercial" },
      {
        name: "description",
        content:
          "Crie propostas profissionais, analise o retorno do investimento e acompanhe cada oportunidade até o fechamento.",
      },
      { property: "og:title", content: "Intrusão 2.0 — Orçamentos, ROI e pipeline comercial" },
      {
        property: "og:description",
        content:
          "Crie propostas profissionais, analise o retorno do investimento e acompanhe cada oportunidade até o fechamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Landing() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  const cta = signedIn
    ? { to: "/dashboard", label: "Ir para o Dashboard" }
    : { to: "/auth", label: "Começar Gratuitamente" };

  return (
    <div className="relative min-h-[calc(100svh-64px)] overflow-hidden bg-hero text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-70" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary-glow/20 blur-3xl" />

      <main className="relative mx-auto flex min-h-[calc(100svh-64px)] max-w-5xl flex-col px-6 pb-16 pt-10 sm:pt-16">
        {/* Top bar */}
        <div className="mb-14 flex items-center justify-between animate-rise">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-gradient shadow-emerald">
              <span className="text-sm font-black text-white">I</span>
            </div>
            <span className="font-display text-sm font-bold tracking-tight">Intrusão 2.0</span>
          </div>
          <Link
            to={cta.to}
            className="rounded-full border border-border/70 bg-white/70 px-4 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition hover:border-primary/40 hover:text-primary sm:text-sm"
          >
            {signedIn ? "Dashboard →" : "Entrar"}
          </Link>
        </div>

        {/* Hero — centered, focused */}
        <section className="mx-auto flex max-w-3xl flex-1 flex-col items-center text-center">
          <h1 className="animate-rise-delay-1 font-display text-5xl font-black leading-[1.02] tracking-tight text-balance sm:text-6xl">
            Orçamentos, ROI e pipeline comercial{" "}
            <span className="relative inline-block">
              <span className="absolute inset-x-0 bottom-[12%] h-[40%] rounded-full bg-gradient-to-r from-primary/30 via-primary-glow/40 to-primary/20 blur-md" aria-hidden="true" />
              em uma única plataforma.
            </span>
          </h1>

          <p className="animate-rise-delay-2 mt-6 max-w-xl text-base leading-relaxed text-muted-foreground text-balance sm:text-lg">
            Crie propostas profissionais, analise o retorno do investimento e acompanhe cada oportunidade até o fechamento.
          </p>

          <div className="animate-rise-delay-3 mt-9">
            <Link
              to={cta.to}
              className="group inline-flex items-center gap-2 rounded-full bg-emerald-gradient px-7 py-3.5 text-sm font-semibold text-white shadow-emerald transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevate"
            >
              {cta.label}
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>

          <p className="animate-rise-delay-3 mt-4 max-w-lg text-xs text-muted-foreground/80 text-balance sm:text-sm">
            Utilizado por integradores, distribuidores e equipes comerciais para acelerar o fechamento de projetos.
          </p>

          {/* Compact features row */}
          <div className="animate-rise-delay-4 mt-14 grid w-full grid-cols-1 gap-3 sm:mt-16 sm:grid-cols-3">
            <Feature title="Solução completa" desc="Catálogo, desconto CNAE, comodato, venda ou híbrido." />
            <Feature title="ROI instantâneo" desc="Calcule payback e retorno financeiro em segundos." />
            <Feature title="Pipeline comercial" desc="Acompanhe oportunidades do orçamento ao fechamento." />
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white/60 p-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft">
      <p className="font-display text-sm font-bold tracking-tight">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
