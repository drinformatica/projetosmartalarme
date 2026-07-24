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

  const cta = signedIn ? { to: "/dashboard", label: "Ir para o Dashboard" } : { to: "/auth", label: "Entrar / Cadastrar" };

  return (
    <div className="relative min-h-[calc(100svh-64px)] overflow-hidden bg-hero text-foreground">
      {/* Ambient mesh */}
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-80" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary-glow/20 blur-3xl" />

      <main className="relative mx-auto max-w-7xl px-6 pb-24 pt-16 sm:pt-24">
        {/* Top bar */}
        <div className="mb-12 flex items-center justify-between animate-rise">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-gradient shadow-emerald">
              <span className="text-sm font-black text-white">I</span>
            </div>
            <span className="font-display text-sm font-bold tracking-tight text-foreground">Intrusão 2.0</span>
          </div>
          <Link
            to={cta.to}
            className="rounded-full border border-border/70 bg-white/70 px-4 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition hover:border-primary/40 hover:text-primary sm:text-sm"
          >
            {signedIn ? "Dashboard →" : "Acessar plataforma"}
          </Link>
        </div>

        {/* Hero */}
        <section className="mb-16 grid items-end gap-10 lg:mb-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="animate-rise inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-deep">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Parceiro credenciado Intelbras
            </span>
            <h1 className="animate-rise-delay-1 mt-6 font-display text-5xl font-black leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Propostas comerciais{" "}
              <span className="bg-emerald-gradient bg-clip-text text-transparent">com acabamento premium.</span>
            </h1>
            <p className="animate-rise-delay-2 mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-balance">
              Simule vendas do AMT 1000 Smart e AMT 2018 E Smart, calcule ROI de monitoramento e acompanhe cada oportunidade num pipeline visual — tudo numa única plataforma.
            </p>
            <div className="animate-rise-delay-3 mt-9 flex flex-wrap items-center gap-3">
              <Link
                to={cta.to}
                className="group inline-flex items-center gap-2 rounded-full bg-emerald-gradient px-6 py-3.5 text-sm font-semibold text-white shadow-emerald transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevate"
              >
                {cta.label}
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
              <a
                href="#recursos"
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/60 px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur transition hover:border-primary/40 hover:text-primary"
              >
                Ver recursos
              </a>
            </div>
            <div className="animate-rise-delay-4 mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> PDF instantâneo</span>
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Pipeline Kanban</span>
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Modo comodato e venda</span>
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> PWA offline</span>
            </div>
          </div>

          {/* Preview card */}
          <div className="animate-rise-delay-2 relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-emerald-gradient opacity-20 blur-3xl" />
            <div className="glass-card relative rounded-3xl p-6 shadow-elevate">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Proposta #2087</p>
                  <p className="mt-1 font-display text-lg font-bold">Residência Vila Nova</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-deep">Rascunho</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Stat label="Investimento único" value="R$ 1.480" />
                <Stat label="Mensalidade" value="R$ 149" tone="glow" />
                <Stat label="Payback" value="10 meses" />
                <Stat label="Margem" value="30%" />
              </div>
              <div className="mt-5 rounded-2xl border border-border/70 bg-white/70 p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>AMT 2018 E Smart</span>
                  <span className="font-mono text-foreground">×1</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Sensor IVP 8000 Pet</span>
                  <span className="font-mono text-foreground">×4</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Sirene SIN 2000</span>
                  <span className="font-mono text-foreground">×1</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bento grid */}
        <section id="recursos" className="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 md:grid-cols-6">
          <BentoCard className="animate-rise md:col-span-4" eyebrow="Editor de orçamento" title="Do catálogo à proposta em minutos.">
            <p className="text-sm text-muted-foreground">
              Preços PSD atualizáveis por planilha, desconto CNAE automático, comodato ou venda com mão de obra — a mesma tela cobre todo o funil comercial.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="rounded-xl border border-border/70 bg-white/60 p-3">Comodato</div>
              <div className="rounded-xl border border-primary/30 bg-accent/50 p-3 text-primary-deep">Venda</div>
              <div className="rounded-xl border border-border/70 bg-white/60 p-3">Híbrido</div>
            </div>
          </BentoCard>

          <BentoCard className="animate-rise-delay-1 md:col-span-2 bg-emerald-gradient text-white" eyebrow="ROI" title="Cálculo em tempo real." dark>
            <p className="text-sm text-white/85">
              Preço de venda com margem, menos taxa de instalação, dividido pela mensalidade — o payback aparece em segundos.
            </p>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-display text-4xl font-black">10</span>
              <span className="text-sm text-white/80">meses de retorno</span>
            </div>
          </BentoCard>

          <BentoCard className="animate-rise-delay-2 md:col-span-2" eyebrow="Pipeline Kanban" title="Arraste, priorize, feche.">
            <div className="mt-4 flex gap-2">
              {["Lead", "Rascunho", "Enviado", "Fechado"].map((c, i) => (
                <div key={c} className="flex-1 rounded-xl border border-border/70 bg-white/70 p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{c}</p>
                  <div className="mt-2 space-y-1">
                    <div className="h-2 rounded bg-primary/20" style={{ width: `${80 - i * 15}%` }} />
                    <div className="h-2 rounded bg-primary/10" style={{ width: `${60 - i * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>

          <BentoCard className="animate-rise-delay-3 md:col-span-2" eyebrow="PDF proposta" title="Layout formal, marca sua.">
            <p className="text-sm text-muted-foreground">Logo da sua empresa, selo Parceiro Credenciado Intelbras e blocos de investimento destacados.</p>
          </BentoCard>

          <BentoCard className="animate-rise-delay-4 md:col-span-2" eyebrow="PWA" title="Funciona offline. Instala como app.">
            <p className="text-sm text-muted-foreground">Feche orçamentos sem sinal — sincronizam sozinhos quando a conexão volta.</p>
          </BentoCard>
        </section>

        {/* Bottom CTA */}
        <section className="animate-rise-delay-5 mt-16 overflow-hidden rounded-3xl border border-border/70 bg-white/70 p-8 shadow-soft backdrop-blur sm:p-12">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
                Pronto para uma proposta impecável?
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Crie sua conta em segundos e comece a gerar orçamentos com identidade da sua empresa.
              </p>
            </div>
            <Link
              to={cta.to}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-gradient px-6 py-3.5 text-sm font-semibold text-white shadow-emerald transition hover:-translate-y-0.5 hover:shadow-elevate"
            >
              {cta.label} →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "glow" }) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        tone === "glow"
          ? "border-primary/30 bg-accent/60 text-primary-deep"
          : "border-border/70 bg-white/70 text-foreground"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-bold">{value}</p>
    </div>
  );
}

function BentoCard({
  className = "",
  eyebrow,
  title,
  children,
  dark,
}: {
  className?: string;
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border p-6 shadow-soft transition-all duration-500 hover:-translate-y-1 hover:shadow-elevate sm:p-7 ${
        dark ? "border-white/15" : "border-border/70 bg-white/70 backdrop-blur"
      } ${className}`}
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
          dark ? "text-white/70" : "text-primary-deep/80"
        }`}
      >
        {eyebrow}
      </p>
      <h3 className={`mt-2 font-display text-xl font-bold tracking-tight sm:text-2xl ${dark ? "text-white" : ""}`}>
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}
