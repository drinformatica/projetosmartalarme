import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, Plus, Trash2, FileText, Filter } from "lucide-react";
import { listQuotes, deleteQuote, type QuoteStatus, type QuoteModalidade } from "@/lib/quotes.functions";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  component: OrcamentosPage,
  head: () => ({
    meta: [
      { title: "Orçamentos - Intrusão 2.0" },
      { name: "description", content: "Lista completa dos seus orçamentos com busca por cliente." },
    ],
  }),
});

const BRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

type Quote = {
  id: string;
  title: string;
  client_name: string | null;
  client_company: string | null;
  status: QuoteStatus;
  modalidade: QuoteModalidade;
  total_venda: number;
  taxa_instalacao: number;
  mensalidade: number;
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

const MODALIDADE_LABEL: Record<QuoteModalidade, string> = {
  comodato: "Comodato",
  venda: "Venda",
  hibrido: "Híbrido",
};

function OrcamentosPage() {
  const list = useServerFn(listQuotes);
  const remove = useServerFn(deleteQuote);
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");
  const [confirmDelete, setConfirmDelete] = useState<Quote | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = (await list()) as Quote[];
    setQuotes(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return quotes.filter((qt) => {
      if (statusFilter !== "all" && qt.status !== statusFilter) return false;
      if (!term) return true;
      const hay = `${qt.title || ""} ${qt.client_name || ""} ${qt.client_company || ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [quotes, q, statusFilter]);

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await remove({ data: { id: confirmDelete.id } });
      setConfirmDelete(null);
      await load();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Orçamentos</h1>
          <p className="text-sm text-slate-500">
            {loading ? "Carregando..." : `${filtered.length} de ${quotes.length} orçamento(s)`}
          </p>
        </div>
        <Link
          to="/orcamento"
          className="inline-flex items-center gap-2 rounded-full bg-primary-deep px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> Novo orçamento
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar por cliente, empresa ou título..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | "all")}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">Todos os status</option>
            {(Object.keys(STATUS_LABEL) as QuoteStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <FileText className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">
              {quotes.length === 0 ? "Nenhum orçamento criado ainda." : "Nenhum resultado para os filtros."}
            </p>
            {quotes.length === 0 && (
              <Link
                to="/orcamento"
                className="inline-flex items-center gap-2 rounded-full bg-primary-deep px-4 py-2 text-xs font-semibold text-white hover:brightness-110"
              >
                <Plus className="h-3 w-3" /> Criar primeiro
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Cliente / Título</th>
                    <th className="px-4 py-3">Modalidade</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Venda + Inst.</th>
                    <th className="px-4 py-3 text-right">MRR</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((qt) => (
                    <tr key={qt.id} className="cursor-pointer transition hover:bg-slate-50" onClick={() => router.navigate({ to: "/orcamento/$id", params: { id: qt.id } })}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{qt.client_company || qt.client_name || "Sem cliente"}</div>
                        <div className="text-xs text-slate-500">{qt.title}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{MODALIDADE_LABEL[qt.modalidade] || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[qt.status]}`}>
                          {STATUS_LABEL[qt.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {BRL(Number(qt.total_venda) + Number(qt.taxa_instalacao))}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {Number(qt.mensalidade) > 0 ? BRL(Number(qt.mensalidade)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(qt.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setConfirmDelete(qt)}
                          className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50"
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filtered.map((qt) => (
                <div
                  key={qt.id}
                  className="cursor-pointer p-3 transition active:bg-slate-50"
                  onClick={() => router.navigate({ to: "/orcamento/$id", params: { id: qt.id } })}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-slate-800">
                        {qt.client_company || qt.client_name || "Sem cliente"}
                      </div>
                      <div className="truncate text-xs text-slate-500">{qt.title}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[qt.status]}`}>
                      {STATUS_LABEL[qt.status]}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {BRL(Number(qt.total_venda) + Number(qt.taxa_instalacao))}
                      </div>
                      {Number(qt.mensalidade) > 0 && (
                        <div className="text-slate-500">MRR {BRL(Number(qt.mensalidade))}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{new Date(qt.created_at).toLocaleDateString("pt-BR")}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(qt);
                        }}
                        className="rounded-lg p-1.5 text-red-600 active:bg-red-50"
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !deleting && setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-slate-800">Excluir orçamento?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Tem certeza que deseja excluir{" "}
              <span className="font-semibold text-slate-800">{confirmDelete.title}</span>? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteAction}
                disabled={deleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
