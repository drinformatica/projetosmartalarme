import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PRODUCTS } from "@/lib/products";
import { getQuote, saveQuote, type QuoteStatus } from "@/lib/quotes.functions";
import { getProfile } from "@/lib/profile.functions";

const BRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_OPTS: { v: QuoteStatus; l: string }[] = [
  { v: "rascunho", l: "Rascunho" },
  { v: "enviado", l: "Enviado" },
  { v: "negociacao", l: "Negociação" },
  { v: "fechado", l: "Fechado" },
  { v: "perdido", l: "Perdido" },
];

type Profile = { company_name?: string | null; full_name?: string | null; phone?: string | null; address?: string | null; logo_url?: string | null };

export function QuoteEditor({ id }: { id?: string }) {
  const router = useRouter();
  const save = useServerFn(saveQuote);
  const load = useServerFn(getQuote);
  const loadProfile = useServerFn(getProfile);

  const [title, setTitle] = useState("Proposta Comercial - Sistema de Alarme");
  const [intro, setIntro] = useState(
    "Apresentamos nossa proposta para instalação do sistema de segurança com monitoramento profissional 24h.",
  );
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [qtds, setQtds] = useState<Record<string, number>>({});
  const [margem, setMargem] = useState<number>(30);
  const [possuiCnae, setPossuiCnae] = useState(false);
  const [taxaInstalacao, setTaxaInstalacao] = useState<number>(0);
  const [mensalidade, setMensalidade] = useState<number>(0);
  const [obs, setObs] = useState("");
  const [status, setStatus] = useState<QuoteStatus>("rascunho");
  const [filtro, setFiltro] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savedId, setSavedId] = useState<string | undefined>(id);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    loadProfile().then((p) => setProfile(p ?? null));
    if (id) {
      load({ data: { id } }).then((q) => {
        if (!q) { setLoading(false); return; }
        setTitle(q.title);
        setIntro(q.intro);
        setClientName(q.client_name ?? "");
        setClientCompany(q.client_company ?? "");
        setMargem(Number(q.margem));
        setPossuiCnae(q.possui_cnae);
        setTaxaInstalacao(Number(q.taxa_instalacao));
        setMensalidade(Number(q.mensalidade));
        setObs(q.observacoes ?? "");
        setStatus(q.status);
        const map: Record<string, number> = {};
        (q.items as { codigo: string; qtde: number }[]).forEach((it) => { map[it.codigo] = it.qtde; });
        setQtds(map);
        setLoading(false);
      });
    }
  }, [id, load, loadProfile]);

  const linhas = useMemo(
    () =>
      PRODUCTS.map((p) => {
        const qtde = qtds[p.codigo] ?? 0;
        const semDesconto = /sem desconto de cnae 10%/i.test(p.nome);
        const psdDesc = possuiCnae && !semDesconto ? p.psd * 0.9 : p.psd;
        const custoTotal = psdDesc * qtde;
        const venda = psdDesc * (1 + margem / 100) * qtde;
        return { ...p, qtde, semDesconto, psdDesc, custoTotal, venda };
      }),
    [qtds, margem, possuiCnae],
  );

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return linhas;
    return linhas.filter((l) => l.nome.toLowerCase().includes(q) || l.codigo.includes(q));
  }, [linhas, filtro]);

  const totalCusto = linhas.reduce((s, l) => s + l.custoTotal, 0);
  const totalVenda = linhas.reduce((s, l) => s + l.venda, 0);
  const lucro = totalVenda - totalCusto;
  // Investimento a recuperar = preço de venda (com margem) menos a taxa de instalação já cobrada do cliente
  const investimentoInicial = Math.max(0, totalVenda - Number(taxaInstalacao || 0));
  const paybackMeses = mensalidade > 0 ? investimentoInicial / mensalidade : 0;
  const receita12 = mensalidade * 12;
  const receita24 = mensalidade * 24;
  const receita36 = mensalidade * 36;

  const setQtd = (codigo: string, v: number) =>
    setQtds((prev) => ({ ...prev, [codigo]: Math.max(0, v || 0) }));

  const handleSave = async () => {
    setMsg(null);
    const items = linhas.filter((l) => l.qtde > 0).map((l) => ({
      codigo: l.codigo, nome: l.nome, psd: l.psd, qtde: l.qtde,
    }));
    const res = await save({
      data: {
        id: savedId,
        title, intro,
        client_name: clientName,
        client_company: clientCompany,
        items,
        margem: Number(margem),
        possui_cnae: possuiCnae,
        taxa_instalacao: Number(taxaInstalacao),
        mensalidade: Number(mensalidade),
        observacoes: obs,
        status,
        total_venda: totalVenda,
        total_custo: totalCusto,
      },
    });
    if (res?.id) setSavedId(res.id);
    setMsg("Orçamento salvo!");
    if (!id && res?.id) {
      router.navigate({ to: "/orcamento/$id", params: { id: res.id }, replace: true });
    }
  };

  const gerarPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const data = new Date().toLocaleDateString("pt-BR");

    // Header
    doc.setFillColor(21, 87, 36);
    doc.rect(0, 0, pageW, 90, "F");
    doc.setTextColor(255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(title, 40, 40, { maxWidth: pageW - 80 });
    if (profile?.company_name) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(profile.company_name, 40, 62);
    }
    doc.setFontSize(9);
    doc.text(`Data: ${data}`, pageW - 40, 40, { align: "right" });

    doc.setTextColor(30);
    let y = 120;

    // Client block
    if (clientName || clientCompany) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("PARA:", 40, y);
      doc.setFont("helvetica", "normal");
      y += 14;
      if (clientCompany) { doc.text(clientCompany, 40, y); y += 12; }
      if (clientName) { doc.text(clientName, 40, y); y += 12; }
      y += 6;
    }

    // Intro
    if (intro) {
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(intro, pageW - 80);
      doc.text(lines, 40, y);
      y += lines.length * 12 + 12;
    }

    // Items table — no cost shown
    const itens = linhas.filter((l) => l.qtde > 0);
    autoTable(doc, {
      startY: y,
      head: [["Qtde", "Código", "Produto / Descrição"]],
      body: itens.map((l) => [String(l.qtde), l.codigo, l.nome]),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [21, 87, 36], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 40, halign: "center" },
        1: { cellWidth: 60 },
        2: { cellWidth: "auto" },
      },
    });

    let finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

    // Investment box
    if (finalY > pageH - 200) { doc.addPage(); finalY = 60; }

    doc.setFillColor(245, 249, 246);
    doc.rect(40, finalY, pageW - 80, 100, "F");
    doc.setTextColor(21, 87, 36);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("INVESTIMENTO", 55, finalY + 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    const boxY = finalY + 40;

    doc.text("Instalação (pagamento único):", 55, boxY);
    doc.setFont("helvetica", "bold");
    doc.text(BRL(Number(taxaInstalacao)), pageW - 55, boxY, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.text("Monitoramento 24h (mensal):", 55, boxY + 18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(21, 87, 36);
    doc.setFontSize(12);
    doc.text(BRL(Number(mensalidade)) + " /mês", pageW - 55, boxY + 18, { align: "right" });

    doc.setTextColor(60);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(
      "* Equipamentos inclusos conforme lista acima. Instalação profissional e configuração incluídos.",
      55,
      boxY + 44,
      { maxWidth: pageW - 110 },
    );

    finalY = finalY + 120;

    // Observations
    if (obs) {
      if (finalY > pageH - 120) { doc.addPage(); finalY = 60; }
      doc.setTextColor(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Observações:", 40, finalY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(obs, pageW - 80);
      doc.text(lines, 40, finalY + 14);
      finalY += 14 + lines.length * 12 + 10;
    }

    // Company footer
    doc.setFontSize(8);
    doc.setTextColor(120);
    const footer = [
      profile?.company_name,
      profile?.phone,
      profile?.address,
    ].filter(Boolean).join(" · ");
    if (footer) doc.text(footer, pageW / 2, pageH - 30, { align: "center" });
    doc.text("Proposta válida por 15 dias.", pageW / 2, pageH - 18, { align: "center" });

    const nome = (clientCompany || clientName || "cliente").replace(/\s+/g, "_");
    doc.save(`proposta_${nome}_${Date.now()}.pdf`);
  };

  if (loading) return <main className="p-6 text-slate-500">Carregando...</main>;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{savedId ? "Editar Orçamento" : "Novo Orçamento"}</h1>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as QuoteStatus)}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {STATUS_OPTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
          <button
            onClick={handleSave}
            className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Salvar
          </button>
          <button
            onClick={gerarPDF}
            disabled={linhas.every((l) => l.qtde === 0)}
            className="rounded-md border border-green-700 bg-white px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50"
          >
            Gerar PDF
          </button>
        </div>
      </div>
      {msg && <div className="mb-3 rounded bg-green-50 p-2 text-sm text-green-700">{msg}</div>}

      {/* Título e intro editáveis */}
      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Cabeçalho da Proposta</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Título</label>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Texto de apresentação
            </label>
            <textarea
              rows={3}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Cliente</label>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Empresa cliente</label>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Config comercial */}
      <section className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Margem (%)</label>
          <input
            type="number"
            min={0}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={margem}
            onChange={(e) => setMargem(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Taxa de Instalação (R$)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={taxaInstalacao}
            onChange={(e) => setTaxaInstalacao(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Mensalidade Monitoramento (R$)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={mensalidade}
            onChange={(e) => setMensalidade(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Buscar produto</label>
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Código ou nome"
          />
        </div>
      </section>

      <section className="mb-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
        <input
          id="cnae"
          type="checkbox"
          checked={possuiCnae}
          onChange={(e) => setPossuiCnae(e.target.checked)}
          className="h-5 w-5 accent-green-700"
        />
        <label htmlFor="cnae" className="text-sm font-semibold text-green-900">
          Possui CNAE de monitoramento? (ativa desconto de 10%)
        </label>
      </section>

      {/* Produtos */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-green-700 text-white">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Código</th>
                <th className="px-3 py-2 text-left font-semibold">Produto</th>
                <th className="px-3 py-2 text-right font-semibold">PSD</th>
                {possuiCnae && <th className="px-3 py-2 text-right font-semibold">c/ Desc.</th>}
                <th className="px-3 py-2 text-center font-semibold">Qtde</th>
                <th className="px-3 py-2 text-right font-semibold">Custo</th>
                <th className="px-3 py-2 text-right font-semibold">Venda</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((l, i) => (
                <tr key={l.codigo} className={i % 2 === 0 ? "bg-green-50/40" : "bg-white"}>
                  <td className="px-3 py-1.5 font-mono text-xs">{l.codigo}</td>
                  <td className="px-3 py-1.5">{l.nome}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{BRL(l.psd)}</td>
                  {possuiCnae && (
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {l.semDesconto ? <span className="text-slate-400">—</span> : BRL(l.psdDesc)}
                    </td>
                  )}
                  <td className="px-3 py-1.5 text-center">
                    <input
                      type="number"
                      min={0}
                      value={l.qtde || ""}
                      onChange={(e) => setQtd(l.codigo, Number(e.target.value))}
                      className="w-16 rounded border border-slate-300 px-2 py-1 text-center"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{BRL(l.custoTotal)}</td>
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-green-700">
                    {BRL(l.venda)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-semibold">
              <tr>
                <td colSpan={possuiCnae ? 5 : 4} className="px-3 py-2 text-right">TOTAL</td>
                <td className="px-3 py-2 text-right tabular-nums">{BRL(totalCusto)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-green-700">{BRL(totalVenda)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ROI */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Análise de ROI</h3>
          <div className="space-y-2 text-sm">
            <Row label="Custo produtos" value={BRL(totalCusto)} />
            <Row label="Taxa de instalação (cobrada)" value={BRL(Number(taxaInstalacao))} />
            <Row label="Venda equipamentos" value={BRL(totalVenda)} />
            <Row label="Lucro venda equipamentos" value={BRL(lucro)} bold color="text-green-700" />
            <div className="my-2 border-t border-slate-200" />
            <Row label="Investimento a recuperar (venda − inst.)" value={BRL(investimentoInicial)} />
            <Row label="Mensalidade monitoramento" value={BRL(Number(mensalidade))} />
            <Row
              label="Payback"
              value={mensalidade > 0 ? `${paybackMeses.toFixed(1)} meses` : "—"}
              bold
              color="text-amber-700"
            />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Receita projetada monitoramento</h3>
          <div className="space-y-2 text-sm">
            <Row label="12 meses" value={BRL(receita12)} />
            <Row label="24 meses" value={BRL(receita24)} />
            <Row label="36 meses" value={BRL(receita36)} bold color="text-green-700" />
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Baseado apenas no contrato de monitoramento recorrente.
          </p>
        </div>
      </section>

      <section className="mt-6">
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          Observações (aparecem no PDF)
        </label>
        <textarea
          rows={3}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Condições de pagamento, prazo de validade, etc."
        />
      </section>
    </main>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className={`tabular-nums ${bold ? "font-bold" : ""} ${color ?? ""}`}>{value}</span>
    </div>
  );
}
