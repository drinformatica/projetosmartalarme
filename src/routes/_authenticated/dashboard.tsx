import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  DollarSign,
  Repeat,
  Package,
  ArrowRight,
  Target,
} from "lucide-react";
import { listQuotes, type QuoteStatus, type QuoteModalidade } from "@/lib/quotes.functions";
import { AdsCarousel } from "@/components/AdsCarousel";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard - Intrusão 2.0" },
      { name: "description", content: "Visão geral de orçamentos, receita e produtos." },
    ],
  }),
});

const BRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

type QuoteItem = { codigo: string; nome: string; qtde: number; psd: number };

type Quote = {
  id: string;
  title: string;
  client_name: string | null;
  client_company: string | null;
  status: QuoteStatus;
  modalidade: QuoteModalidade;
  total_venda: number;
  total_custo: number;
  taxa_instalacao: number;
  mensalidade: number;
  items: QuoteItem[] | null;
  created_at: string;
};

const STATUS_LABEL: Record<QuoteStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

const STATUS_COLOR: Record<QuoteStatus, string> = {
  rascunho: "bg-slate-100 text-slate-700",
  enviado: "bg-blue-100 text-blue-800",
  negociacao: "bg-amber-100 text-amber-800",
  fechado: "bg-emerald-100 text-emerald-800",
  perdido: "bg-red-100 text-red-800",
};

function DashboardPage() {
  const list = useServerFn(listQuotes);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = (await list()) as Quote[];
      setQuotes(data);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = useMemo(() => {
    const total = quotes.length;
    const fechados = quotes.filter((q) => q.status === "fechado");
    const emAndamento = quotes.filter((q) => q.status === "enviado" || q.status === "negociacao");
    const receitaFechada = fechados.reduce(
      (s, q) => s + Number(q.total_venda || 0) + Number(q.taxa_instalacao || 0),
      0,
    );
    const mrrFechado = fechados.reduce((s, q) => s + Number(q.mensalidade || 0), 0);
    const pipelineValor = emAndamento.reduce(
      (s, q) => s + Number(q.total_venda || 0) + Number(q.taxa_instalacao || 0),
      0,
    );
    const decididos = fechados.length + quotes.filter((q) => q.status === "perdido").length;
    const conversao = decididos > 0 ? (fechados.length / decididos) * 100 : 0;

    // distribuição por status
    const porStatus: Record<QuoteStatus, number> = {
      rascunho: 0,
      enviado: 0,
      negociacao: 0,
      fechado: 0,
      perdido: 0,
    };
    quotes.forEach((q) => (porStatus[q.status] = (porStatus[q.status] || 0) + 1));

    // top produtos (baseado em orçamentos fechados)
    const prodMap = new Map<string, { nome: string; qtde: number }>();
    fechados.forEach((q) => {
      (q.items || []).forEach((it) => {
        const key = it.codigo || it.nome;
        const cur = prodMap.get(key) || { nome: it.nome || it.codigo, qtde: 0 };
        cur.qtde += Number(it.qtde || 0);
        prodMap.set(key, cur);
      });
    });
    const topProdutos = Array.from(prodMap.values())
      .sort((a, b) => b.qtde - a.qtde)
      .slice(0, 5);

    return { total, fechados: fechados.length, emAndamento: emAndamento.length, receitaFechada, mrrFechado, pipelineValor, conversao, porStatus, topProdutos };
  }, [quotes]);

  const recentes = quotes.slice(0, 5);

  const kpis = [
    {
      label: "Orçamentos",
      value: metrics.total.toString(),
      hint: `${metrics.emAndamento} em andamento`,
      icon: TrendingUp,
      gradient: "from-emerald-500 to-emerald-700",
    },
    {
      label: "Fechados",
      value: metrics.fechados.toString(),
      hint: `Conversão ${metrics.conversao.toFixed(0)}%`,
      icon: CheckCircle2,
      gradient: "from-teal-500 to-emerald-600",
    },
    {
      label: "Receita Fechada",
      value: BRL(metrics.receitaFechada),
      hint: "Venda + Instalação",
      icon: DollarSign,
      gradient: "from-emerald-600 to-green-700",
    },
    {
      label: "MRR Fechado",
      value: BRL(metrics.mrrFechado),
      hint: "Receita recorrente",
      icon: Repeat,
      gradient: "from-lime-600 to-emerald-700",
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-3xl">Dashboard</h1>
          <p className="text-xs text-slate-500 sm:text-sm">Resumo do seu funil e performance comercial</p>
        </div>
        <Link
          to="/orcamento"
          className="hidden items-center gap-2 rounded-full bg-primary-deep px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:brightness-110 sm:inline-flex"
        >
          Novo orçamento <ArrowRight className="h-4 w-4" />
        </Link>
      </div>


      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Carregando...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <div
                key={k.label}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${k.gradient} opacity-10`} />
                <div className={`inline-flex rounded-xl bg-gradient-to-br ${k.gradient} p-2 text-white shadow`}>
                  <k.icon className="h-4 w-4" />
                </div>
                <div className="mt-3 text-xs font-medium uppercase tracking-wider text-slate-500">{k.label}</div>
                <div className="mt-1 font-display text-2xl font-bold text-slate-900">{k.value}</div>
                <div className="mt-0.5 text-xs text-slate-500">{k.hint}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {/* Distribuição do pipeline */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">Distribuição do pipeline</h2>
                  <p className="text-xs text-slate-500">Total em negociação: {BRL(metrics.pipelineValor)}</p>
                </div>
                <Target className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="space-y-3">
                {(Object.keys(STATUS_LABEL) as QuoteStatus[]).map((s) => {
                  const count = metrics.porStatus[s];
                  const pct = metrics.total > 0 ? (count / metrics.total) * 100 : 0;
                  return (
                    <div key={s}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_COLOR[s]}`}>{STATUS_LABEL[s]}</span>
                        <span className="text-slate-500">{count} · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-700 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top produtos */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-slate-900">Top produtos</h2>
                <Package className="h-5 w-5 text-emerald-600" />
              </div>
              {metrics.topProdutos.length === 0 ? (
                <p className="text-sm text-slate-500">Feche orçamentos para ver os produtos mais vendidos.</p>
              ) : (
                <ol className="space-y-2">
                  {metrics.topProdutos.map((p, i) => (
                    <li key={p.nome} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-deep text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate text-sm text-slate-700">{p.nome}</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        {p.qtde}x
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {/* Recentes */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">Orçamentos recentes</h2>
                <p className="text-xs text-slate-500">Últimos 5 criados</p>
              </div>
              <Link to="/orcamentos" className="text-xs font-semibold text-primary-deep hover:underline">
                Ver todos →
              </Link>
            </div>
            {recentes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Clock className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">Nenhum orçamento ainda.</p>
                <Link
                  to="/orcamento"
                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary-deep px-4 py-2 text-xs font-semibold text-white hover:brightness-110"
                >
                  Criar primeiro <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentes.map((q) => (
                  <li key={q.id}>
                    <Link
                      to="/orcamento/$id"
                      params={{ id: q.id }}
                      className="flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-800">{q.title}</div>
                        <div className="truncate text-xs text-slate-500">
                          {q.client_company || q.client_name || "Sem cliente"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-slate-800 sm:text-sm">
                          {BRL(Number(q.total_venda) + Number(q.taxa_instalacao))}
                        </div>
                        {Number(q.mensalidade) > 0 && (
                          <div className="text-[10px] text-slate-500 sm:text-[11px]">MRR {BRL(Number(q.mensalidade))}</div>
                        )}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[q.status]}`}>
                        {STATUS_LABEL[q.status]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Anúncios */}
          <div className="mt-6">
            <AdsCarousel />
          </div>
        </>

      )}
    </main>
  );
}
