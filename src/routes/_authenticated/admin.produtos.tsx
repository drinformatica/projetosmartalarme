import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles } from "@/lib/admin.functions";
import {
  listProducts,
  upsertProduct,
  deleteProduct,
  bulkUpdatePrices,
  type Product,
  type ProductInput,
} from "@/lib/products.functions";
import * as XLSX from "xlsx";


export const Route = createFileRoute("/_authenticated/admin/produtos")({
  component: AdminProdutos,
  head: () => ({ meta: [{ title: "Admin - Produtos" }] }),
});

const BRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const EMPTY: ProductInput = {
  codigo: "",
  nome: "",
  psd: 0,
  descricao_orcamento: "",
  descricao_proposta: "",
  no_cnae_discount: false,
  active: true,
  sort_order: 0,
};

function AdminProdutos() {
  const router = useRouter();
  const rolesFn = useServerFn(getMyRoles);
  const listFn = useServerFn(listProducts);
  const saveFn = useServerFn(upsertProduct);
  const delFn = useServerFn(deleteProduct);
  const bulkFn = useServerFn(bulkUpdatePrices);

  const [priceImport, setPriceImport] = useState<{
    open: boolean;
    parsing: boolean;
    updating: boolean;
    rows: { codigo: string; psd: number }[];
    result: { updated: number; notFound: string[]; total: number } | null;
    error: string | null;
  }>({ open: false, parsing: false, updating: false, rows: [], result: null, error: null });

  const handleFile = async (file: File) => {
    setPriceImport((s) => ({ ...s, parsing: true, error: null, rows: [], result: null }));
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const rows: { codigo: string; psd: number }[] = [];
      for (const r of json) {
        const keys = Object.keys(r);
        const codKey = keys.find((k) => k.toLowerCase().trim().replace(/[óô]/g, "o") === "codigo");
        const psdKey = keys.find((k) => k.toLowerCase().trim() === "psd");
        if (!codKey || !psdKey) continue;
        const codigo = String(r[codKey] ?? "").trim();
        const raw = String(r[psdKey] ?? "").replace(/[R$\s.]/g, "").replace(",", ".");
        const psd = Number(raw);
        if (!codigo || !Number.isFinite(psd)) continue;
        rows.push({ codigo, psd });
      }
      if (rows.length === 0) {
        setPriceImport((s) => ({
          ...s,
          parsing: false,
          error: "Nenhuma linha válida encontrada. A planilha precisa ter as colunas 'codigo' e 'PSD'.",
        }));
        return;
      }
      setPriceImport((s) => ({ ...s, parsing: false, rows }));
    } catch (e) {
      setPriceImport((s) => ({
        ...s,
        parsing: false,
        error: e instanceof Error ? e.message : "Erro ao ler planilha",
      }));
    }
  };

  const confirmImport = async () => {
    setPriceImport((s) => ({ ...s, updating: true, error: null }));
    try {
      const result = await bulkFn({ data: { updates: priceImport.rows } });
      setPriceImport((s) => ({ ...s, updating: false, result }));
      await refresh();
    } catch (e) {
      setPriceImport((s) => ({
        ...s,
        updating: false,
        error: e instanceof Error ? e.message : "Erro ao atualizar",
      }));
    }
  };

  const closeImport = () =>
    setPriceImport({
      open: false,
      parsing: false,
      updating: false,
      rows: [],
      result: null,
      error: null,
    });


  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<ProductInput | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const data = (await listFn()) as Product[];
    setItems(data);
  };

  useEffect(() => {
    (async () => {
      try {
        const rs = await rolesFn();
        if (!rs.includes("super_admin") && !rs.includes("admin")) {
          router.navigate({ to: "/dashboard", replace: true });
          return;
        }
        await refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Erro");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = items.filter((p) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (
      p.codigo.toLowerCase().includes(t) ||
      p.nome.toLowerCase().includes(t) ||
      p.descricao_orcamento.toLowerCase().includes(t) ||
      p.descricao_proposta.toLowerCase().includes(t)
    );
  });

  const startNew = () => setEditing({ ...EMPTY, sort_order: items.length + 1 });
  const startEdit = (p: Product) =>
    setEditing({
      id: p.id,
      codigo: p.codigo,
      nome: p.nome,
      psd: Number(p.psd),
      descricao_orcamento: p.descricao_orcamento,
      descricao_proposta: p.descricao_proposta,
      no_cnae_discount: p.no_cnae_discount,
      active: p.active,
      sort_order: p.sort_order,
    });

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.codigo.trim() || !editing.nome.trim()) {
      setErr("Código e nome são obrigatórios.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await saveFn({ data: editing });
      setEditing(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Excluir o produto "${p.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await delFn({ data: { id: p.id } });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao excluir");
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Produtos</h1>
          <p className="text-sm text-slate-500">
            Cadastro utilizado em todos os orçamentos e propostas geradas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link to="/admin" className="rounded border px-3 py-1.5 hover:bg-slate-50">
            ← Usuários & Anúncios
          </Link>
          <button
            onClick={startNew}
            className="rounded bg-green-700 px-3 py-1.5 font-semibold text-white hover:bg-green-800"
          >
            + Novo Produto
          </button>
        </div>
      </div>

      {err && <div className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{err}</div>}

      <div className="mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por código, nome ou descrição..."
          className="w-full max-w-md rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-6 text-center text-slate-500">Carregando...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">Descrição Proposta</th>
                <th className="px-3 py-2 text-right">PSD</th>
                <th className="px-3 py-2 text-center">CNAE</th>
                <th className="px-3 py-2 text-center">Ativo</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{p.codigo}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800">{p.nome}</div>
                    <div className="text-xs text-slate-500 line-clamp-1">{p.descricao_orcamento}</div>
                  </td>
                  <td className="px-3 py-2 max-w-xs text-xs text-slate-600">
                    <span className="line-clamp-2">{p.descricao_proposta}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{BRL(Number(p.psd))}</td>
                  <td className="px-3 py-2 text-center text-xs">
                    {p.no_cnae_discount ? (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">sem desc.</span>
                    ) : (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">com desc.</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {p.active ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">Sim</span>
                    ) : (
                      <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Não</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(p)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">
              {editing.id ? "Editar Produto" : "Novo Produto"}
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Código</label>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={editing.codigo}
                  onChange={(e) => setEditing({ ...editing, codigo: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">PSD (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={editing.psd}
                  onChange={(e) => setEditing({ ...editing, psd: Number(e.target.value) })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">Nome</label>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={editing.nome}
                  onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Descrição para tela de Orçamento
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Aparece na lista interna ao montar o orçamento"
                  value={editing.descricao_orcamento}
                  onChange={(e) => setEditing({ ...editing, descricao_orcamento: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Descrição para Proposta em PDF
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Aparece no PDF entregue ao cliente. Use uma linguagem comercial."
                  value={editing.descricao_proposta}
                  onChange={(e) => setEditing({ ...editing, descricao_proposta: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Ordem</label>
                <input
                  type="number"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={editing.sort_order ?? 0}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.active}
                    onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                    className="h-4 w-4 accent-green-700"
                  />
                  Ativo
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.no_cnae_discount}
                    onChange={(e) =>
                      setEditing({ ...editing, no_cnae_discount: e.target.checked })
                    }
                    className="h-4 w-4 accent-green-700"
                  />
                  Sem desconto CNAE 10%
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
