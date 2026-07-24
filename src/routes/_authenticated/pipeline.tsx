import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listQuotes, updateQuoteStatus, deleteQuote, type QuoteStatus } from "@/lib/quotes.functions";
import { AdsCarousel } from "@/components/AdsCarousel";

export const Route = createFileRoute("/_authenticated/pipeline")({
  component: Pipeline,
  head: () => ({
    meta: [
      { title: "Pipeline de Vendas - Intrusão 2.0" },
      { name: "description", content: "Acompanhe seus orçamentos em um pipeline kanban." },
    ],
  }),
});

const BRL = (n: number) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const COLUMNS: { id: QuoteStatus; label: string; color: string }[] = [
  { id: "rascunho", label: "Rascunho", color: "bg-slate-200 text-slate-800" },
  { id: "enviado", label: "Enviado", color: "bg-blue-200 text-blue-900" },
  { id: "negociacao", label: "Negociação", color: "bg-amber-200 text-amber-900" },
  { id: "fechado", label: "Fechado", color: "bg-green-200 text-green-900" },
  { id: "perdido", label: "Perdido", color: "bg-red-200 text-red-900" },
];

type Quote = {
  id: string;
  title: string;
  client_name: string | null;
  client_company: string | null;
  status: QuoteStatus;
  total_venda: number;
  taxa_instalacao: number;
  mensalidade: number;
  created_at: string;
};

function Pipeline() {
  const list = useServerFn(listQuotes);
  const setStatus = useServerFn(updateQuoteStatus);
  const remove = useServerFn(deleteQuote);
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<QuoteStatus | null>(null);
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

  const move = async (id: string, status: QuoteStatus) => {
    setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
    try {
      await setStatus({ data: { id, status } });
    } finally {
      await load();
    }
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  const onDragEnd = () => {
    setDraggingId(null);
    setDragOverCol(null);
  };
  const onDragOverCol = (e: React.DragEvent, col: QuoteStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== col) setDragOverCol(col);
  };
  const onDropCol = (e: React.DragEvent, col: QuoteStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    setDragOverCol(null);
    setDraggingId(null);
    if (!id) return;
    const q = quotes.find((x) => x.id === id);
    if (!q || q.status === col) return;
    move(id, col);
  };

  const askDelete = (q: Quote) => setConfirmDelete(q);
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

  const totals = COLUMNS.reduce<Record<QuoteStatus, { count: number; venda: number; mrr: number }>>(
    (acc, c) => {
      const items = quotes.filter((q) => q.status === c.id);
      acc[c.id] = {
        count: items.length,
        venda: items.reduce((s, q) => s + Number(q.total_venda || 0) + Number(q.taxa_instalacao || 0), 0),
        mrr: items.reduce((s, q) => s + Number(q.mensalidade || 0), 0),
      };
      return acc;
    },
    {} as Record<QuoteStatus, { count: number; venda: number; mrr: number }>,
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
          <p className="text-sm text-slate-500">Arraste seus orçamentos entre as etapas</p>
        </div>
        <Link
          to="/orcamento"
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          + Novo Orçamento
        </Link>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">
          Carregando...
        </div>
      ) : quotes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="mb-3 text-slate-600">Nenhum orçamento ainda.</p>
          <Link
            to="/orcamento"
            className="inline-block rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Criar primeiro orçamento
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {COLUMNS.map((col) => {
            const items = quotes.filter((q) => q.status === col.id);
            const t = totals[col.id];
            return (
              <div
                key={col.id}
                onDragOver={(e) => onDragOverCol(e, col.id)}
                onDragLeave={() => setDragOverCol((c) => (c === col.id ? null : c))}
                onDrop={(e) => onDropCol(e, col.id)}
                className={`rounded-lg border bg-white transition ${
                  dragOverCol === col.id ? "border-green-500 ring-2 ring-green-300" : "border-slate-200"
                }`}
              >
                <div className={`flex items-center justify-between rounded-t-lg px-3 py-2 text-xs font-semibold ${col.color}`}>
                  <span>{col.label}</span>
                  <span>{t.count}</span>
                </div>
                <div className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-500">
                  <div>Venda + Inst.: {BRL(t.venda)}</div>
                  <div>MRR: {BRL(t.mrr)}</div>
                </div>
                <div className={`min-h-[80px] space-y-2 p-2 ${items.length > 4 ? "max-h-[420px] overflow-y-auto" : ""}`}>
                  {items.map((q) => (
                    <div
                      key={q.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, q.id)}
                      onDragEnd={onDragEnd}
                      className={`cursor-grab rounded border border-slate-200 bg-slate-50 p-2 text-sm active:cursor-grabbing ${
                        draggingId === q.id ? "opacity-40" : ""
                      }`}
                    >
                      <div
                        className="cursor-pointer font-semibold text-slate-800 hover:text-green-700"
                        onClick={() => router.navigate({ to: "/orcamento/$id", params: { id: q.id } })}
                      >
                        {q.title}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {q.client_company || q.client_name || "Sem cliente"}
                      </div>
                      <div className="mt-1 text-xs text-slate-700">
                        Venda: <span className="font-semibold">{BRL(Number(q.total_venda) + Number(q.taxa_instalacao))}</span>
                      </div>
                      {Number(q.mensalidade) > 0 && (
                        <div className="text-xs text-slate-700">
                          MRR: <span className="font-semibold">{BRL(Number(q.mensalidade))}</span>
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        <select
                          value={q.status}
                          onChange={(e) => move(q.id, e.target.value as QuoteStatus)}
                          className="flex-1 rounded border border-slate-300 bg-white px-1 py-1 text-[11px]"
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => askDelete(q)}
                          className="rounded border border-red-200 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AdsCarousel />

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
              <span className="font-semibold text-slate-800">{confirmDelete.title}</span>
              {confirmDelete.client_company || confirmDelete.client_name ? (
                <> de <span className="font-semibold text-slate-800">{confirmDelete.client_company || confirmDelete.client_name}</span></>
              ) : null}
              ? Esta ação não pode ser desfeita.
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
