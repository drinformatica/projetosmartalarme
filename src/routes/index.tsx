import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Intrusão 2.0 — Orçamentos premium e pipeline de vendas" },
      {
        name: "description",
        content:
          "Plataforma premium para gerar propostas em PDF, calcular ROI e gerenciar o pipeline de vendas de alarme e monitoramento Intelbras.",
      },
      { property: "og:title", content: "Intrusão 2.0 — Orçamentos & Pipeline" },
      {
        property: "og:description",
        content:
          "Orçamentos formais, ROI, comodato ou venda e Kanban de vendas — tudo em uma experiência refinada.",
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
    : { to: "/auth", label: "Entrar / Cadastrar" };

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
            {signedIn ? "Dashboard →" : "Acessar"}
          </Link>
        </div>

        {/* Hero — centered, focused */}
        <section className="mx-auto flex max-w-3xl flex-1 flex-col items-center text-center">
          <h1 className="animate-rise-delay-1 font-display text-5xl font-black leading-[1.02] tracking-tight text-balance sm:text-6xl">
            Propostas comerciais de alta conversão{" "}
            <span className="bg-emerald-gradient bg-clip-text text-transparent">
              com acabamento premium.
            </span>
          </h1>

          <p className="animate-rise-delay-2 mt-6 max-w-xl text-base leading-relaxed text-muted-foreground text-balance sm:text-lg">
            Orçamentos, ROI e pipeline de vendas e orçamentos de soluções — numa única plataforma.
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

          {/* Compact features row */}
          <div className="animate-rise-delay-4 mt-16 grid w-full grid-cols-1 gap-3 sm:mt-20 sm:grid-cols-3">
            <Feature title="Solução completa" desc="Catálogo, desconto CNAE, comodato, venda ou híbrido." />
            <Feature title="ROI em tempo real" desc="Payback calculado automaticamente." />
            <Feature title="Pipeline Kanban" desc="Arraste, priorize e feche negócios." />
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
