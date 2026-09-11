import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles } from "@/lib/admin.functions";
import {
  listProducts,
  upsertProduct,
  deleteProduct,
  bulkUpdatePrices,
  bulkInsertProducts,
  type Product,
  type ProductInput,
  type BulkProductInput,
} from "@/lib/products.functions";
import * as XLSX from "xlsx";
import {
  ChevronDown,
  FileSpreadsheet,
  Plus,
  Upload,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/admin/produtos")({
  component: AdminProdutos,
  head: () => ({ meta: [{ title: "Admin - Produtos" }] }),
});

const BRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const EMPTY: ProductInput = {
  segmento: "",
  codigo: "",
  nome: "",
  psd: 0,
  descricao_orcamento: "",
  descricao_proposta: "",
  no_cnae_discount: false,
  active: true,
  sort_order: 0,
};

const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const parsePrice = (value: unknown) => {
  if (typeof value === "number") return value;
  const cleanValue = String(value ?? "").replace(/[R$\s]/g, "");
  if (!cleanValue) return Number.NaN;
  if (cleanValue.includes(".") && cleanValue.includes(",")) {
    return Number(cleanValue.replace(/\./g, "").replace(",", "."));
  }
  if (cleanValue.includes(",")) return Number(cleanValue.replace(",", "."));
  return Number(cleanValue);
};

function AdminProdutos() {
  const router = useRouter();
  const rolesFn = useServerFn(getMyRoles);
  const listFn = useServerFn(listProducts);
  const saveFn = useServerFn(upsertProduct);
  const delFn = useServerFn(deleteProduct);
  const bulkFn = useServerFn(bulkUpdatePrices);
  const bulkInsertFn = useServerFn(bulkInsertProducts);

  const [batchImport, setBatchImport] = useState<{
    open: boolean;
    parsing: boolean;
    saving: boolean;
    rows: BulkProductInput[];
    error: string | null;
    success: number | null;
  }>({ open: false, parsing: false, saving: false, rows: [], error: null, success: null });

  const generateCommercialDescription = (name: string) => {
    const templates = [
      `Solução de alta performance ${name}, projetada para máxima eficiência e durabilidade em sistemas de segurança de última geração.`,
      `O componente ${name} oferece integração perfeita e tecnologia avançada para garantir a proteção total do seu patrimônio.`,
      `Desenvolvido com padrão de qualidade superior, o ${name} é a escolha ideal para quem busca confiabilidade e inovação tecnológica.`,
      `Aumente a inteligência do seu sistema com o ${name}, proporcionando monitoramento preciso e resposta rápida em qualquer situação.`,
    ];
    const index = Math.floor(Math.random() * templates.length);
    return templates[index] ?? `Solução ${name} para sistemas de segurança.`;
  };

  const handleBatchFile = async (file: File) => {
    setBatchImport((state) => ({
      ...state,
      parsing: true,
      error: null,
      rows: [],
      success: null,
    }));

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("A planilha não possui nenhuma aba.");
      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) throw new Error("Não foi possível ler a primeira aba da planilha.");

      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
      });
      if (rawRows.length === 0) throw new Error("A planilha está vazia.");

      const firstRow = rawRows[0];
      if (!firstRow) throw new Error("A planilha está vazia.");
      const keys = Object.keys(firstRow);
      const findHeader = (aliases: string[]) =>
        keys.find((key) => aliases.includes(normalizeHeader(key)));

      const segmentoKey = findHeader(["segmento"]);
      const codigoKey = findHeader(["codigo", "cod", "codigo produto", "codigo do produto"]);
      const psdKey = findHeader(["psd"]);
      const nomeKey = findHeader(["nome do produto", "nome"]);
      const descricaoKey = findHeader(["descricao do produto", "descricao"]);
      const cnaeKey = findHeader(["cnae"]);

      const missingColumns: string[] = [];
      if (!segmentoKey) missingColumns.push("Segmento");
      if (!codigoKey) missingColumns.push("Código");
      if (!psdKey) missingColumns.push("PSD");
      if (!nomeKey) missingColumns.push("Nome do produto");
      if (!descricaoKey) missingColumns.push("Descrição do produto");

      if (missingColumns.length > 0) {
        throw new Error(`Colunas obrigatórias ausentes: ${missingColumns.join(", ")}.`);
      }

      const rows: BulkProductInput[] = [];
      const invalidRows: string[] = [];

      rawRows.forEach((row, index) => {
        const sheetLine = index + 2;
        const segmento = String(row[segmentoKey] ?? "").trim();
        const codigo = String(row[codigoKey] ?? "").trim();
        const nome = String(row[nomeKey] ?? "").trim();
        const descricao = String(row[descricaoKey] ?? "").trim();
        const psd = parsePrice(row[psdKey]);

        const missingValues: string[] = [];
        if (!segmento) missingValues.push("Segmento");
        if (!codigo) missingValues.push("Código");
        if (!String(row[psdKey] ?? "").trim()) missingValues.push("PSD");
        if (!nome) missingValues.push("Nome do produto");
        if (!descricao) missingValues.push("Descrição do produto");

        if (missingValues.length > 0) {
          invalidRows.push(`linha ${sheetLine}: ${missingValues.join(", ")}`);
          return;
        }
        if (!Number.isFinite(psd) || psd < 0) {
          invalidRows.push(`linha ${sheetLine}: PSD inválido`);
          return;
        }

        const cnaeValue = cnaeKey
          ? normalizeHeader(String(row[cnaeKey] ?? ""))
          : "";
        const appliesDiscount = ["sim", "s", "yes", "com desconto"].includes(cnaeValue);

        rows.push({
          segmento,
          codigo,
          nome,
          psd,
          descricao_orcamento: descricao,
          descricao_proposta: generateCommercialDescription(nome),
          no_cnae_discount: !appliesDiscount,
        });
      });

      if (invalidRows.length > 0) {
        const visibleErrors = invalidRows.slice(0, 5).join("; ");
        const remaining = invalidRows.length - 5;
        throw new Error(
          `Preencha todas as células obrigatórias. ${visibleErrors}${remaining > 0 ? `; e mais ${remaining} linha(s) inválida(s)` : ""}.`,
        );
      }
      if (rows.length === 0) throw new Error("Nenhum produto válido encontrado na planilha.");

      setBatchImport((state) => ({ ...state, parsing: false, rows }));
    } catch (error) {
      setBatchImport((state) => ({
        ...state,
        parsing: false,
        error: error instanceof Error ? error.message : "Erro ao ler planilha",
      }));
    }
  };

  const confirmBatchImport = async () => {
    setBatchImport((state) => ({ ...state, saving: true, error: null }));
    try {
      const result = await bulkInsertFn({ data: { products: batchImport.rows } });
      setBatchImport((state) => ({
        ...state,
        saving: false,
        success: result.count,
        rows: [],
      }));
      await refresh();
    } catch (error) {
      setBatchImport((state) => ({
        ...state,
        saving: false,
        error: error instanceof Error ? error.message : "Erro ao cadastrar produtos",
      }));
    }
  };

  const [priceImport, setPriceImport] = useState<{
    open: boolean;
    parsing: boolean;
    updating: boolean;
    rows: { codigo: string; psd: number }[];
    result: { updated: number; notFound: string[]; total: number } | null;
    error: string | null;
  }>({ open: false, parsing: false, updating: false, rows: [], result: null, error: null });

  const handleFile = async (file: File) => {
    setPriceImport((state) => ({
      ...state,
      parsing: true,
      error: null,
      rows: [],
      result: null,
    }));
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("A planilha não possui nenhuma aba.");
      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) throw new Error("Não foi possível ler a primeira aba da planilha.");
      const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
      });
      const rows: { codigo: string; psd: number }[] = [];
      for (const row of json) {
        const keys = Object.keys(row);
        const codKey = keys.find((key) => {
          const normalized = normalizeHeader(key);
          return ["codigo", "codigo produto", "cod", "codigo do produto"].includes(normalized);
        });
        const psdKey = keys.find((key) => normalizeHeader(key) === "psd");
        if (!codKey || !psdKey) continue;
        const codigo = String(row[codKey] ?? "").trim();
        const psd = parsePrice(row[psdKey]);
        if (!codigo || !Number.isFinite(psd)) continue;
        rows.push({ codigo, psd });
      }
      if (rows.length === 0) {
        setPriceImport((state) => ({
          ...state,
          parsing: false,
          error: "Nenhuma linha válida encontrada. A planilha precisa ter as colunas 'codigo' e 'PSD'.",
        }));
        return;
      }
      setPriceImport((state) => ({ ...state, parsing: false, rows }));
    } catch (error) {
      setPriceImport((state) => ({
        ...state,
        parsing: false,
        error: error instanceof Error ? error.message : "Erro ao ler planilha",
      }));
    }
  };

  const confirmImport = async () => {
    setPriceImport((state) => ({ ...state, updating: true, error: null }));
    try {
      const result = await bulkFn({ data: { updates: priceImport.rows } });
      setPriceImport((state) => ({ ...state, updating: false, result }));
      await refresh();
    } catch (error) {
      setPriceImport((state) => ({
        ...state,
        updating: false,
        error: error instanceof Error ? error.message : "Erro ao atualizar",
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
        const roles = await rolesFn();
        if (!roles.includes("super_admin") && !roles.includes("admin")) {
          router.navigate({ to: "/dashboard", replace: true });
          return;
        }
        await refresh();
      } catch (error) {
        setErr(error instanceof Error ? error.message : "Erro");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = items.filter((product) => {
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return (
      product.segmento.toLowerCase().includes(term) ||
      product.codigo.toLowerCase().includes(term) ||
      product.nome.toLowerCase().includes(term) ||
      product.descricao_orcamento.toLowerCase().includes(term) ||
      product.descricao_proposta.toLowerCase().includes(term)
    );
  });

  const startNew = () => setEditing({ ...EMPTY, sort_order: items.length + 1 });
  const startEdit = (product: Product) =>
    setEditing({
      id: product.id,
      segmento: product.segmento,
      codigo: product.codigo,
      nome: product.nome,
      psd: Number(product.psd),
      descricao_orcamento: product.descricao_orcamento,
      descricao_proposta: product.descricao_proposta,
      no_cnae_discount: product.no_cnae_discount,
      active: product.active,
      sort_order: product.sort_order,
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
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Excluir o produto "${product.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await delFn({ data: { id: product.id } });
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Erro ao excluir");
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Produtos</h1>
          <p className="text-sm text-slate-500">Cadastro utilizado em todos os orçamentos e propostas geradas.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link to="/admin" className="rounded border px-3 py-1.5 hover:bg-slate-50">← Usuários & Anúncios</Link>
          <button onClick={() => setPriceImport((state) => ({ ...state, open: true }))} className="rounded border border-green-700 bg-white px-3 py-1.5 font-semibold text-green-700 hover:bg-green-50">⤴ Atualizar Preços</button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800">
                <Plus className="h-4 w-4" />Novo Produto<ChevronDown className="h-4 w-4 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={startNew} className="cursor-pointer"><Plus className="mr-2 h-4 w-4" />Adicionar 1 a 1</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBatchImport((state) => ({ ...state, open: true }))} className="cursor-pointer"><FileSpreadsheet className="mr-2 h-4 w-4" />Adicionar em lote</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {err && <div className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      <div className="mb-3">
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar por segmento, código, nome ou descrição..." className="w-full max-w-md rounded border border-slate-300 px-3 py-2 text-sm" />
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-6 text-center text-slate-500">Carregando...</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr><th className="px-3 py-2 text-left">Segmento</th><th className="px-3 py-2 text-left">Código</th><th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">Descrição Proposta</th><th className="px-3 py-2 text-right">PSD</th><th className="px-3 py-2 text-center">CNAE</th><th className="px-3 py-2 text-center">Ativo</th><th className="px-3 py-2"></th></tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-xs">{product.segmento || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{product.codigo}</td>
                    <td className="px-3 py-2"><div className="font-medium text-slate-800">{product.nome}</div><div className="line-clamp-1 text-xs text-slate-500">{product.descricao_orcamento}</div></td>
                    <td className="max-w-xs px-3 py-2 text-xs text-slate-600"><span className="line-clamp-2">{product.descricao_proposta}</span></td>
                    <td className="px-3 py-2 text-right tabular-nums">{BRL(Number(product.psd))}</td>
                    <td className="px-3 py-2 text-center text-xs">{product.no_cnae_discount ? <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">sem desc.</span> : <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">com desc.</span>}</td>
                    <td className="px-3 py-2 text-center">{product.active ? <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">Sim</span> : <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Não</span>}</td>
                    <td className="px-3 py-2 text-right"><div className="flex justify-end gap-2"><button onClick={() => startEdit(product)} className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">Editar</button><button onClick={() => handleDelete(product)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50">Excluir</button></div></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">Nenhum produto cadastrado.</td></tr>}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 md:hidden">
            {filtered.map((product) => (
              <li key={product.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1"><div className="text-[10px] text-slate-500">{product.segmento || "Sem segmento"}</div><div className="font-mono text-[10px] text-slate-500">{product.codigo}</div><div className="truncate text-sm font-semibold text-slate-800">{product.nome}</div>{product.descricao_orcamento && <div className="line-clamp-2 text-xs text-slate-500">{product.descricao_orcamento}</div>}</div>
                  <div className="shrink-0 text-right"><div className="text-sm font-semibold tabular-nums text-slate-800">{BRL(Number(product.psd))}</div><div className="mt-1 flex flex-col items-end gap-1">{product.no_cnae_discount ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">sem desc.</span> : <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-800">com desc.</span>}{!product.active && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600">Inativo</span>}</div></div>
                </div>
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-2"><button onClick={() => startEdit(product)} className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-xs font-medium hover:bg-slate-100">Editar</button><button onClick={() => handleDelete(product)} className="flex-1 rounded border border-red-300 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">Excluir</button></div>
              </li>
            ))}
            {filtered.length === 0 && <li className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">Nenhum produto cadastrado.</li>}
          </ul>
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">{editing.id ? "Editar Produto" : "Novo Produto"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-semibold text-slate-600">Segmento</label><input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={editing.segmento ?? ""} onChange={(event) => setEditing({ ...editing, segmento: event.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600">Código</label><input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={editing.codigo} onChange={(event) => setEditing({ ...editing, codigo: event.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600">PSD (R$)</label><input type="number" step="0.01" min={0} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={editing.psd} onChange={(event) => setEditing({ ...editing, psd: Number(event.target.value) })} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600">Nome</label><input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={editing.nome} onChange={(event) => setEditing({ ...editing, nome: event.target.value })} /></div>
              <div className="sm:col-span-2"><label className="mb-1 block text-xs font-semibold text-slate-600">Descrição para tela de Orçamento</label><textarea rows={2} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Aparece na lista interna ao montar o orçamento" value={editing.descricao_orcamento} onChange={(event) => setEditing({ ...editing, descricao_orcamento: event.target.value })} /></div>
              <div className="sm:col-span-2"><label className="mb-1 block text-xs font-semibold text-slate-600">Descrição para Proposta em PDF</label><textarea rows={3} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Aparece no PDF entregue ao cliente. Use uma linguagem comercial." value={editing.descricao_proposta} onChange={(event) => setEditing({ ...editing, descricao_proposta: event.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-600">Ordem</label><input type="number" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={editing.sort_order ?? 0} onChange={(event) => setEditing({ ...editing, sort_order: Number(event.target.value) })} /></div>
              <div className="flex items-center gap-4 pt-6"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active} onChange={(event) => setEditing({ ...editing, active: event.target.checked })} className="h-4 w-4 accent-green-700" />Ativo</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.no_cnae_discount} onChange={(event) => setEditing({ ...editing, no_cnae_discount: event.target.checked })} className="h-4 w-4 accent-green-700" />Sem desconto CNAE 10%</label></div>
            </div>
            <div className="mt-5 flex justify-end gap-2"><button onClick={() => setEditing(null)} disabled={saving} className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancelar</button><button onClick={handleSave} disabled={saving} className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button></div>
          </div>
        </div>
      )}

      {priceImport.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h2 className="mb-2 text-lg font-bold">Atualizar Preços via Planilha</h2>
            <p className="mb-4 text-sm text-slate-600">Envie um arquivo Excel (.xlsx) contendo as colunas <b>codigo</b> e <b>PSD</b>. O sistema cruzará pelo código e atualizará o preço de cada produto correspondente. A planilha não será armazenada.</p>
            {!priceImport.result && <input type="file" accept=".xlsx,.xls,.csv" disabled={priceImport.parsing || priceImport.updating} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }} className="mb-3 block w-full rounded border border-slate-300 p-2 text-sm" />}
            {priceImport.parsing && <div className="rounded bg-slate-50 p-3 text-sm text-slate-600">Lendo planilha...</div>}
            {priceImport.error && <div className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{priceImport.error}</div>}
            {priceImport.rows.length > 0 && !priceImport.result && <div className="mb-3 max-h-64 overflow-auto rounded border border-slate-200"><table className="min-w-full text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-600"><tr><th className="px-2 py-1 text-left">Código</th><th className="px-2 py-1 text-right">Novo PSD</th></tr></thead><tbody>{priceImport.rows.map((row, index) => <tr key={`${row.codigo}-${index}`} className="border-t border-slate-100"><td className="px-2 py-1 font-mono">{row.codigo}</td><td className="px-2 py-1 text-right tabular-nums">{BRL(row.psd)}</td></tr>)}</tbody></table><div className="border-t bg-slate-50 px-2 py-1 text-xs text-slate-600">{priceImport.rows.length} linha(s) prontas para atualizar.</div></div>}
            {priceImport.result && <div className="mb-3 rounded bg-green-50 p-3 text-sm text-green-800"><div className="font-semibold">Atualização concluída</div><div>{priceImport.result.updated} produto(s) atualizado(s) de {priceImport.result.total} linha(s).</div>{priceImport.result.notFound.length > 0 && <div className="mt-2 text-xs text-amber-800">Códigos não encontrados: {priceImport.result.notFound.join(", ")}</div>}</div>}
            <div className="mt-4 flex justify-end gap-2"><button onClick={closeImport} disabled={priceImport.updating} className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">{priceImport.result ? "Fechar" : "Cancelar"}</button>{!priceImport.result && <button onClick={confirmImport} disabled={priceImport.rows.length === 0 || priceImport.updating || priceImport.parsing} className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60">{priceImport.updating ? "Atualizando..." : "Confirmar atualização"}</button>}</div>
          </div>
        </div>
      )}

      {batchImport.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl animate-in rounded-xl bg-white p-6 shadow-2xl duration-200 fade-in zoom-in">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-slate-800">Adicionar Produtos em Lote</h2><button onClick={() => setBatchImport((state) => ({ ...state, open: false, error: null, success: null, rows: [] }))} className="text-slate-400 hover:text-slate-600" aria-label="Fechar">✕</button></div>
            {batchImport.success === null ? (
              <>
                <div className="mb-6 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="mb-2 font-semibold">Instruções da Planilha:</p>
                  <ul className="ml-4 list-disc space-y-1 opacity-90">
                    <li>Colunas obrigatórias: <b>Segmento</b>, <b>Código</b>, <b>PSD</b>, <b>Nome do produto</b> e <b>Descrição do produto</b>.</li>
                    <li>Coluna opcional: <b>CNAE</b>. Informe <b>Sim</b> para permitir o desconto de 10%.</li>
                    <li>Se a coluna CNAE não existir ou a célula estiver vazia, o produto será cadastrado <b>sem desconto</b>.</li>
                    <li>O sistema gerará automaticamente a descrição comercial usada no PDF.</li>
                  </ul>
                  <div className="mt-3 overflow-x-auto rounded border border-emerald-200 bg-white p-2 text-xs">
                    <b>Modelo de cabeçalho:</b> Segmento | Código | PSD | Nome do produto | Descrição do produto | CNAE
                  </div>
                </div>
                <div className="relative mb-6">
                  <input type="file" accept=".xlsx,.xls" id="batch-upload" className="hidden" disabled={batchImport.parsing || batchImport.saving} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleBatchFile(file); event.currentTarget.value = ""; }} />
                  <label htmlFor="batch-upload" className="group flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-8 transition-all hover:border-emerald-500 hover:bg-emerald-50"><Upload className="mb-2 h-10 w-10 text-slate-400 group-hover:text-emerald-600" /><span className="text-sm font-medium text-slate-600 group-hover:text-emerald-700">Clique para selecionar a planilha</span><span className="mt-1 text-xs text-slate-400">Apenas arquivos .xlsx ou .xls</span></label>
                </div>
                {batchImport.parsing && <div className="flex animate-pulse items-center justify-center py-4 text-slate-600"><FileSpreadsheet className="mr-2 h-5 w-5" />Processando arquivo...</div>}
                {batchImport.error && <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" /><span>{batchImport.error}</span></div>}
                {batchImport.rows.length > 0 && (
                  <div className="mb-6">
                    <div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold text-slate-700">Prévia ({batchImport.rows.length} itens)</span></div>
                    <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
                      <table className="min-w-full text-xs">
                        <thead className="sticky top-0 border-b bg-slate-50"><tr><th className="px-3 py-2 text-left">Segmento</th><th className="px-3 py-2 text-left">Código</th><th className="px-3 py-2 text-left">Nome do produto</th><th className="px-3 py-2 text-left">Descrição do produto</th><th className="px-3 py-2 text-right">PSD</th><th className="px-3 py-2 text-center">Desconto CNAE</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {batchImport.rows.slice(0, 5).map((row, index) => <tr key={`${row.codigo}-${index}`} className="hover:bg-slate-50"><td className="px-3 py-2">{row.segmento}</td><td className="px-3 py-2 font-mono">{row.codigo}</td><td className="max-w-[180px] truncate px-3 py-2">{row.nome}</td><td className="max-w-[220px] truncate px-3 py-2">{row.descricao_orcamento}</td><td className="px-3 py-2 text-right">{BRL(row.psd)}</td><td className="px-3 py-2 text-center">{row.no_cnae_discount ? "Não aplica" : "Aplica 10%"}</td></tr>)}
                          {batchImport.rows.length > 5 && <tr><td colSpan={6} className="bg-slate-50 px-3 py-2 text-center text-slate-400">e mais {batchImport.rows.length - 5} produtos</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-3"><button onClick={() => setBatchImport((state) => ({ ...state, open: false, rows: [], error: null }))} disabled={batchImport.saving} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50">Cancelar</button><button onClick={confirmBatchImport} disabled={batchImport.rows.length === 0 || batchImport.saving || batchImport.parsing} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition-colors hover:bg-emerald-700 disabled:opacity-50">{batchImport.saving ? "Cadastrando..." : "Cadastrar Tudo"}</button></div>
              </>
            ) : (
              <div className="py-8 text-center"><div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check className="h-8 w-8" /></div><h3 className="mb-2 text-xl font-bold text-slate-800">Sucesso!</h3><p className="mb-6 text-slate-600">{batchImport.success} produtos foram adicionados com sucesso ao banco de dados.</p><button onClick={() => setBatchImport((state) => ({ ...state, open: false, success: null }))} className="w-full rounded-lg bg-slate-800 py-3 font-bold text-white transition-colors hover:bg-slate-900">Continuar</button></div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
