// Simple offline outbox for quote saves. Persists pending writes in localStorage
// and flushes them when the browser reports it is back online.
import type { QuoteStatus } from "@/lib/quotes.functions";

const KEY = "quote-outbox-v1";

export type QueuedQuote = {
  clientOpId: string;
  payload: {
    id?: string;
    title: string;
    intro: string;
    client_name: string;
    client_company: string;
    items: Array<{
      codigo: string;
      nome: string;
      psd: number;
      qtde: number;
      descricao_orcamento?: string | null;
      descricao_proposta?: string | null;
    }>;
    margem: number;
    possui_cnae: boolean;
    taxa_instalacao: number;
    mensalidade: number;
    observacoes: string;
    status: QuoteStatus;
    total_venda: number;
    total_custo: number;
  };
};

function read(): QueuedQuote[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(list: QueuedQuote[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function enqueueQuote(q: QueuedQuote) {
  const list = read().filter((x) => x.clientOpId !== q.clientOpId);
  list.push(q);
  write(list);
}

export function pendingCount(): number {
  return read().length;
}

let syncing = false;
export async function flushOutbox(
  saver: (data: QueuedQuote["payload"]) => Promise<{ id?: string } | null | undefined>,
): Promise<{ flushed: number; failed: number }> {
  if (syncing) return { flushed: 0, failed: 0 };
  if (typeof navigator !== "undefined" && navigator.onLine === false)
    return { flushed: 0, failed: 0 };
  syncing = true;
  let flushed = 0;
  let failed = 0;
  try {
    const list = read();
    const remaining: QueuedQuote[] = [];
    for (const item of list) {
      try {
        await saver(item.payload);
        flushed++;
      } catch (e) {
        console.warn("[outbox] failed to sync item", e);
        failed++;
        remaining.push(item);
      }
    }
    write(remaining);
  } finally {
    syncing = false;
  }
  return { flushed, failed };
}
