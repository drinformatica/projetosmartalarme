import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PRODUCTS } from "@/lib/products";

export const Route = createFileRoute("/")({
  component: QuotePage,
});

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function QuotePage() {
  const [qtds, setQtds] = useState<Record<string, number>>({});
  const [margem, setMargem] = useState<number>(30);
  const [cliente, setCliente] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [obs, setObs] = useState("");
  const [filtro, setFiltro] = useState("");
  const [possuiCnae, setPossuiCnae] = useState(false);

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
    return linhas.filter(
      (l) =>
        l.nome.toLowerCase().includes(q) || l.codigo.includes(q),
    );
  }, [linhas, filtro]);

  const totalCusto = linhas.reduce((s, l) => s + l.custoTotal, 0);
  const totalVenda = linhas.reduce((s, l) => s + l.venda, 0);
  const lucro = totalVenda - totalCusto;

  const setQtd = (codigo: string, v: number) =>
    setQtds((prev) => ({ ...prev, [codigo]: Math.max(0, v || 0) }));

  const limpar = () => setQtds({});

  const gerarPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const data = new Date().toLocaleDateString("pt-BR");

    doc.setFillColor(34, 139, 34);
    doc.rect(0, 0, pageW, 60, "F");
    doc.setTextColor(255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("ORÇAMENTO - PROJETO INTRUSÃO 2.0", 40, 28);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Simulador de Venda AMT 1000 Smart | AMT 2018 E Smart", 40, 46);

    doc.setTextColor(0);
    doc.setFontSize(10);
    let y = 80;
    if (empresa) { doc.text(`Empresa: ${empresa}`, 40, y); y += 14; }
    if (cliente) { doc.text(`Cliente: ${cliente}`, 40, y); y += 14; }
    doc.text(`Data: ${data}`, 40, y);
    doc.text(`Margem: ${margem}%`, pageW - 140, y);
    y += 14;
    doc.text(`Desconto CNAE 10%: ${possuiCnae ? "SIM" : "NÃO"}`, 40, y);
    y += 10;

    const itens = linhas.filter((l) => l.qtde > 0);

    const head = possuiCnae
      ? ["Código", "Produto", "Qtde", "PSD c/ Desc.", "Valor Unit.", "Total"]
      : ["Código", "Produto", "Qtde", "Valor Unit.", "Total"];

    const body = itens.map((l) => {
      const unit = l.psdDesc * (1 + margem / 100);
      if (possuiCnae) {
        return [
          l.codigo,
          l.nome,
          String(l.qtde),
          BRL(l.psdDesc),
          BRL(unit),
          BRL(l.venda),
        ];
      }
      return [l.codigo, l.nome, String(l.qtde), BRL(unit), BRL(l.venda)];
    });

    const columnStyles: {
      [key: string]: Partial<{
        cellWidth: number | "auto";
        halign: "left" | "center" | "right";
      }>;
    } = possuiCnae
      ? {
          0: { cellWidth: 55 },
          1: { cellWidth: "auto" },
          2: { cellWidth: 35, halign: "center" },
          3: { cellWidth: 65, halign: "right" },
          4: { cellWidth: 65, halign: "right" },
          5: { cellWidth: 65, halign: "right" },
        }
      : {
          0: { cellWidth: 55 },
          1: { cellWidth: "auto" },
          2: { cellWidth: 35, halign: "center" },
          3: { cellWidth: 65, halign: "right" },
          4: { cellWidth: 65, halign: "right" },
        };

    autoTable(doc, {
      startY: y + 6,
      head: [head],
      body,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [34, 139, 34], textColor: 255 },
      columnStyles,
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } })
      .lastAutoTable.finalY;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL GERAL: ${BRL(totalVenda)}`, pageW - 40, finalY + 24, {
      align: "right",
    });

    if (obs) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Observações:", 40, finalY + 50);
      const lines = doc.splitTextToSize(obs, pageW - 80);
      doc.text(lines, 40, finalY + 64);
    }

    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      "PSD | Julho 2026 - Valores sujeitos a variação mensal.",
      40,
      doc.internal.pageSize.getHeight() - 24,
    );

    const nome = cliente ? cliente.replace(/\s+/g, "_") : "cliente";
    doc.save(`orcamento_${nome}_${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-gradient-to-r from-green-700 to-green-600 text-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Gerador de Orçamentos
          </h1>
          <p className="text-sm text-green-50">
            Simulador de Venda AMT 1000 Smart | AMT 2018 E Smart - Projeto Intrusão 2.0
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <section className="mb-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Empresa
            </label>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Sua empresa"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Cliente
            </label>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nome do cliente"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Margem de lucro (%)
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              value={margem}
              onChange={(e) => setMargem(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Buscar produto
            </label>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Código ou nome"
            />
          </div>
        </section>

        <section className="mb-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
          <input
            id="cnae"
            type="checkbox"
            checked={possuiCnae}
            onChange={(e) => setPossuiCnae(e.target.checked)}
            className="h-5 w-5 accent-green-700 cursor-pointer"
          />
          <label htmlFor="cnae" className="cursor-pointer text-sm font-semibold text-green-900">
            Possui CNAE de monitoramento? (ativa desconto de 10% nos itens permitidos)
          </label>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-green-700 text-white">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Código</th>
                  <th className="px-3 py-2 text-left font-semibold">Produto / Resumo</th>
                  <th className="px-3 py-2 text-right font-semibold">PSD</th>
                  <th className="px-3 py-2 text-right font-semibold">PSD c/ Desc. 10%</th>
                  <th className="px-3 py-2 text-center font-semibold">Qtde</th>
                  <th className="px-3 py-2 text-right font-semibold">Total Custo</th>
                  <th className="px-3 py-2 text-right font-semibold">Venda</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((l, i) => (
                  <tr
                    key={l.codigo}
                    className={
                      i % 2 === 0 ? "bg-green-50/40" : "bg-white"
                    }
                  >
                    <td className="px-3 py-1.5 font-mono text-xs">{l.codigo}</td>
                    <td className="px-3 py-1.5">{l.nome}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {BRL(l.psd)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {l.semDesconto ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        BRL(l.psdDesc)
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <input
                        type="number"
                        min={0}
                        value={l.qtde || ""}
                        onChange={(e) =>
                          setQtd(l.codigo, Number(e.target.value))
                        }
                        className="w-16 rounded border border-slate-300 px-2 py-1 text-center focus:border-green-600 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {BRL(l.custoTotal)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-green-700">
                      {BRL(l.venda)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-semibold">
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-right">
                    TOTAL GERAL
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {BRL(totalCusto)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-green-700">
                    {BRL(totalVenda)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Observações (aparecerão no PDF)
            </label>
            <textarea
              className="min-h-[100px] w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Condições de pagamento, prazo de validade, etc."
            />
          </div>
          <div className="grid content-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Custo total</span>
              <span className="tabular-nums">{BRL(totalCusto)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Lucro estimado</span>
              <span className="tabular-nums">{BRL(lucro)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold">
              <span>Total venda</span>
              <span className="tabular-nums text-green-700">
                {BRL(totalVenda)}
              </span>
            </div>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <button
                onClick={gerarPDF}
                disabled={totalVenda === 0}
                className="flex-1 rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Gerar PDF
              </button>
              <button
                onClick={limpar}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Limpar
              </button>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-slate-500">
          PSD | Julho 2026 — Valores sujeitos a variação mensal.
        </p>
      </main>
    </div>
  );
}
