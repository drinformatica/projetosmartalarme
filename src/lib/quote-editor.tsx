import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { listProducts, type Product } from "@/lib/products.functions";
import { getQuote, saveQuote, type QuoteStatus, type QuoteModalidade } from "@/lib/quotes.functions";
import { getProfile } from "@/lib/profile.functions";
import stepSensorImg from "@/assets/step-sensor.jpg";
import stepCentralImg from "@/assets/step-central.jpg";
import stepNotifImg from "@/assets/step-notif.png";
import stepViewImg from "@/assets/step-view.jpg";
import partnerBadgeAsset from "@/assets/parceiro-credenciado.png.asset.json";

const loadImg = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const loadImgSafe = (src: string): Promise<HTMLImageElement | null> =>
  loadImg(src).catch((err) => {
    console.warn("[pdf] falha ao carregar imagem:", src, err);
    return null;
  });


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
  const loadProducts = useServerFn(listProducts);

  const [title, setTitle] = useState("Proposta Comercial - Sistema de Alarme Smart");
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
  const [modalidade, setModalidade] = useState<QuoteModalidade>("comodato");
  const [filtro, setFiltro] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savedId, setSavedId] = useState<string | undefined>(id);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, prods] = await Promise.all([loadProfile(), loadProducts()]);
      if (cancelled) return;
      setProfile(p ?? null);
      setProducts((prods ?? []).filter((x) => x.active));
      if (id) {
        const q = await load({ data: { id } });
        if (cancelled) return;
        if (q) {
          setSavedId(q.id);
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
          (q.items as { codigo: string; qtde: number }[]).forEach((it) => {
            map[it.codigo] = Number(it.qtde) || 0;
          });
          setQtds(map);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // Only re-run when the quote id changes. useServerFn returns a fresh
    // function reference each render; including it here caused the effect to
    // re-fetch and overwrite user edits on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);


  const linhas = useMemo(
    () =>
      products.map((p) => {
        const qtde = qtds[p.codigo] ?? 0;
        const semDesconto = !!p.no_cnae_discount;
        const psdBase = Number(p.psd) || 0;
        const psdDesc = possuiCnae && !semDesconto ? psdBase * 0.9 : psdBase;
        const custoTotal = psdDesc * qtde;
        const venda = psdDesc * (1 + margem / 100) * qtde;
        const displayName = (p.descricao_orcamento && p.descricao_orcamento.trim()) || p.nome;
        return {
          codigo: p.codigo,
          nome: p.nome,
          psd: psdBase,
          descricao_orcamento: p.descricao_orcamento,
          descricao_proposta: p.descricao_proposta,
          displayName,
          qtde,
          semDesconto,
          psdDesc,
          custoTotal,
          venda,
        };
      }),
    [products, qtds, margem, possuiCnae],
  );

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return linhas;
    return linhas.filter(
      (l) =>
        l.displayName.toLowerCase().includes(q) ||
        l.nome.toLowerCase().includes(q) ||
        l.codigo.includes(q),
    );
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

  const locked = status === "fechado";

  const persist = async (overrides?: { status?: QuoteStatus; silent?: boolean }) => {
    const items = linhas.filter((l) => l.qtde > 0).map((l) => ({
      codigo: l.codigo, nome: l.nome, psd: l.psd, qtde: l.qtde,
      descricao_orcamento: l.descricao_orcamento, descricao_proposta: l.descricao_proposta,
    }));
    const effStatus = overrides?.status ?? status;
    const payload = {
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
      status: effStatus,
      total_venda: totalVenda,
      total_custo: totalCusto,
    };

    // Offline: enqueue to outbox and continue without blocking.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const { enqueueQuote } = await import("@/lib/offline-outbox");
      enqueueQuote({ clientOpId: savedId ?? `local-${Date.now()}`, payload });
      if (overrides?.status) setStatus(overrides.status);
      if (!overrides?.silent) setMsg("Sem conexão — orçamento salvo localmente e será sincronizado.");
      return null;
    }

    const res = await save({ data: payload });
    if (res?.id) setSavedId(res.id);
    if (overrides?.status) setStatus(overrides.status);
    if (!overrides?.silent) setMsg("Orçamento salvo!");
    if (!id && res?.id) {
      router.navigate({ to: "/orcamento/$id", params: { id: res.id }, replace: true });
    }
    return res;
  };

  const handleSave = async () => {
    if (locked) return;
    setMsg(null);
    await persist();
  };

  const gerarPDF = async () => {
    // Auto-save antes de gerar o PDF. Se ainda não existir, entra como "rascunho".
    if (!locked) {
      try {
        await persist({ status: savedId ? status : "rascunho", silent: true });
      } catch (e) {
        console.error("Falha ao salvar antes do PDF", e);
      }
    }

    const [stepSensor, stepCentral, stepNotif, stepView, partnerBadge] = await Promise.all([
      loadImgSafe(stepSensorImg),
      loadImgSafe(stepCentralImg),
      loadImgSafe(stepNotifImg),
      loadImgSafe(stepViewImg),
      loadImgSafe(partnerBadgeAsset.url),
    ]);
    const stepImgs = [stepSensor, stepCentral, stepNotif, stepView];
    const stepFmts = ["JPEG", "JPEG", "PNG", "JPEG"] as const;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const data = new Date().toLocaleDateString("pt-BR");

    // Paleta
    const DARK: [number, number, number] = [15, 20, 25];
    const DARK2: [number, number, number] = [28, 34, 40];
    const GREEN: [number, number, number] = [0, 168, 104];
    const GRAY: [number, number, number] = [110, 118, 125];
    const LIGHT: [number, number, number] = [245, 247, 246];

    // Divide o título: última palavra em verde
    const words = title.trim().split(/\s+/);
    const titleAccent = words.length > 1 ? words.pop()! : "";
    const titleMain = words.join(" ").toUpperCase();
    const titleAcc = titleAccent.toUpperCase();

    // ============ HERO (topo escuro) ============
    // Carrega logo do perfil (arquivo local em data URL ou URL externa)
    let logoImg: HTMLImageElement | null = null;
    if (profile?.logo_url) {
      try { logoImg = await loadImg(profile.logo_url); } catch { logoImg = null; }
    }
    const logoBandH = 0;
    const heroH = 220;
    doc.setFillColor(...DARK);
    doc.rect(0, 0, pageW, heroH, "F");

    // Badge "PROPOSTA COMERCIAL"
    const badgeY = 28 + logoBandH;
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(1);
    doc.circle(50, badgeY, 8, "S");
    doc.setFillColor(...GREEN);
    doc.circle(50, badgeY, 2.2, "F");
    doc.setTextColor(...GREEN);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("PROPOSTA COMERCIAL", 64, badgeY + 3);

    // Título grande
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    const titleW = pageW * 0.55;
    const mainLines = doc.splitTextToSize(titleMain, titleW);
    let ty = 58 + logoBandH;
    (mainLines as string[]).forEach((l) => { doc.text(l, 40, ty); ty += 17; });
    if (titleAcc) {
      doc.setTextColor(...GREEN);
      doc.text(titleAcc, 40, ty);
      ty += 17;
    }

    // Subtítulo (intro curta)
    if (intro) {
      doc.setTextColor(230);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const sub = doc.splitTextToSize(intro, titleW);
      doc.text(sub, 40, ty + 6);
    }

    // Linha verde decorativa
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(2);
    doc.line(40, heroH - 30, 90, heroH - 30);

    // Data topo direito
    doc.setTextColor(180);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Data: ${data}`, pageW - 40, badgeY + 4, { align: "right" });
    let rightY = badgeY + 4;
    if (clientCompany || clientName) {
      doc.setTextColor(200);
      doc.text(`Para: ${clientCompany || clientName}`, pageW - 40, badgeY + 20, { align: "right" });
      rightY = badgeY + 20;
    }

    // Logo — canto superior direito, abaixo da data
    let logoBottomY = rightY;
    if (logoImg) {
      const maxH = 60;
      const maxW = 140;
      const ratio = logoImg.width / logoImg.height || 1;
      let h = maxH;
      let w = h * ratio;
      if (w > maxW) { w = maxW; h = w / ratio; }
      const lx = pageW - 40 - w;
      const ly = rightY + 12;
      logoBottomY = ly + h;
      const fmt = /png/i.test(profile?.logo_url || "") || (profile?.logo_url || "").startsWith("data:image/png")
        ? "PNG"
        : "JPEG";
      try {
        doc.addImage(logoImg, fmt, lx, ly, w, h);
      } catch {
        try { doc.addImage(logoImg, "PNG", lx, ly, w, h); } catch {}
      }
    }

    // Selo "Parceiro Credenciado Intelbras" — abaixo da logo, dentro do hero
    if (partnerBadge) {
      const sealW = 55;
      const sealH = 55;
      const sx = pageW - 40 - sealW;
      const sy = logoBottomY + 16;
      // Garante que o selo não ultrapasse a faixa de features
      if (sy + sealH <= heroH - 20) {
        try {
          doc.addImage(partnerBadge, "PNG", sx, sy, sealW, sealH);
        } catch {
          try { doc.addImage(partnerBadge, "JPEG", sx, sy, sealW, sealH); } catch {}
        }
      }
    }

    // ============ FAIXA DE FEATURES (fundo escuro secundário) ============
    const featY = heroH;
    const featH = 90;
    doc.setFillColor(...DARK2);
    doc.rect(0, featY, pageW, featH, "F");

    const features = [
      { t: "PROTEÇÃO 24H", d: "Monitoramento contínuo e inteligente" },
      { t: "CONTROLE TOTAL", d: "Gerencie tudo pelo aplicativo" },
      { t: "ALERTAS EM TEMPO REAL", d: "Notificações instantâneas" },
      { t: "INTEGRAÇÃO COM CÂMERAS", d: "Visualize de onde estiver" },
    ];
    const fW = (pageW - 80) / 4;
    features.forEach((f, i) => {
      const fx = 40 + i * fW;
      // ícone (quadrado verde)
      doc.setDrawColor(...GREEN);
      doc.setLineWidth(1.2);
      doc.roundedRect(fx, featY + 16, 20, 20, 3, 3, "S");
      doc.setFillColor(...GREEN);
      doc.circle(fx + 10, featY + 26, 3, "F");

      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(f.t, fx, featY + 52);
      doc.setTextColor(180);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const dd = doc.splitTextToSize(f.d, fW - 10);
      doc.text(dd, fx, featY + 64);
    });

    // ============ COMO FUNCIONA ============
    let y = featY + featH + 30;
    doc.setTextColor(...GREEN);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("COMO FUNCIONA", 40, y);
    y += 20;

    const steps = ["SENSORES", "CENTRAL SMART", "VOCÊ É NOTIFICADO", "VISUALIZE E AJA"];
    const stepsDesc = [
      "Detectam qualquer movimento ou abertura",
      "Processa as informações e aciona alertas",
      "Receba alertas em tempo real no celular",
      "Veja câmeras, verifique e tome ação",
    ];
    const stepW = (pageW - 80) / 4;
    steps.forEach((s, i) => {
      const sx = 40 + i * stepW;
      const bx = sx + 10;
      const by = y;
      const bw = 40;
      const bh = 40;
      doc.setFillColor(...LIGHT);
      doc.roundedRect(bx, by, bw, bh, 4, 4, "F");
      doc.setDrawColor(...GRAY);
      doc.setLineWidth(0.8);
      doc.roundedRect(bx, by, bw, bh, 4, 4, "S");
      // imagem dentro do box
      const pad = 4;
      if (stepImgs[i]) doc.addImage(stepImgs[i]!, stepFmts[i], bx + pad, by + pad, bw - pad * 2, bh - pad * 2);

      // seta
      if (i < steps.length - 1) {
        doc.setDrawColor(...GREEN);
        doc.setLineWidth(1);
        const ax = sx + stepW - 12;
        doc.line(ax - 8, by + 20, ax, by + 20);
        doc.line(ax - 4, by + 16, ax, by + 20);
        doc.line(ax - 4, by + 24, ax, by + 20);
      }
      doc.setTextColor(...DARK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(s, bx, by + bh + 18);
      doc.setTextColor(...GRAY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const dd = doc.splitTextToSize(stepsDesc[i], stepW - 20);
      doc.text(dd, bx, by + bh + 30);
    });
    y += 100;

    // ============ ITENS INCLUSOS ============
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("ITENS INCLUSOS NESTA PROPOSTA", 40, y);
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(1.5);
    doc.line(40, y + 4, 100, y + 4);
    y += 16;

    const itens = linhas.filter((l) => l.qtde > 0);
    autoTable(doc, {
      startY: y,
      head: [["Código", "Descrição", "Qtde"]],
      body: itens.map((l) => {
        const item = l as typeof l & { descricao_proposta?: string };
        const desc = (item.descricao_proposta && item.descricao_proposta.trim()) || l.nome;
        return [l.codigo, desc, String(l.qtde).padStart(2, "0")];
      }),
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 8, lineColor: [230, 230, 230], lineWidth: 0.5 },
      headStyles: { fillColor: [250, 250, 250], textColor: DARK, fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: "bold" },
        1: { cellWidth: "auto", textColor: GRAY },
        2: { cellWidth: 50, halign: "center", fontStyle: "bold" },
      },
      margin: { left: 40, right: 40 },
    });

    let finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 25;

    if (finalY > pageH - 200) { doc.addPage(); finalY = 60; }

    // ============ INVESTIMENTO (bloco escuro) ============
    const invH = 130;
    doc.setFillColor(...DARK);
    doc.rect(40, finalY, pageW - 80, invH, "F");

    doc.setTextColor(...GREEN);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("INVESTIMENTO", 60, finalY + 28);

    // Taxa de instalação (se houver)
    if (Number(taxaInstalacao) > 0) {
      doc.setTextColor(220);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Taxa de Instalação", 60, finalY + 48);

      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.text(BRL(Number(taxaInstalacao)), 60, finalY + 82);

      doc.setTextColor(180);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Condições de pagamento", 60, finalY + 100);
      doc.setTextColor(220);
      doc.text("À vista ou em até 12x no cartão", 60, finalY + 112);
    } else {
      doc.setTextColor(180);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Taxa de instalação não aplicada.", 60, finalY + 52);
    }

    // Divisor
    doc.setDrawColor(60, 70, 78);
    doc.setLineWidth(0.5);
    doc.line(pageW / 2 + 20, finalY + 20, pageW / 2 + 20, finalY + invH - 20);

    // Mensalidade
    if (mensalidade > 0) {
      doc.setTextColor(...GREEN);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("MONITORAMENTO 24H", pageW / 2 + 40, finalY + 40);
      doc.setTextColor(255);
      doc.setFontSize(18);
      doc.text(BRL(Number(mensalidade)) + " /mês", pageW / 2 + 40, finalY + 66);
      doc.setTextColor(180);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Central 24h · Alertas em tempo real", pageW / 2 + 40, finalY + 82);
    }
    // Garantia badge
    doc.setTextColor(...GREEN);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("GARANTIA DE 2 ANOS", pageW / 2 + 40, finalY + 104);
    doc.setTextColor(180);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Suporte técnico especializado", pageW / 2 + 40, finalY + 115);

    finalY += invH + 20;

    // ============ Observações ============
    if (obs) {
      if (finalY > pageH - 100) { doc.addPage(); finalY = 60; }
      doc.setTextColor(...DARK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("OBSERVAÇÕES", 40, finalY);
      doc.setDrawColor(...GREEN);
      doc.setLineWidth(1.2);
      doc.line(40, finalY + 3, 80, finalY + 3);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(obs, pageW - 80);
      doc.text(lines, 40, finalY + 18);
      finalY += 18 + lines.length * 12 + 10;
    }

    // ============ Rodapé (faixa clara) ============
    const footY = pageH - 50;
    doc.setFillColor(...LIGHT);
    doc.rect(0, footY, pageW, 50, "F");
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(1);
    doc.circle(50, footY + 25, 8, "S");
    doc.setFillColor(...GREEN);
    doc.circle(50, footY + 25, 2, "F");
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("NOSSO COMPROMISSO", 68, footY + 22);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.setFontSize(8);
    doc.text("É proteger o que mais importa para você.", 68, footY + 34);

    if (profile?.company_name) {
      doc.setTextColor(...DARK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(profile.company_name, pageW - 40, footY + 22, { align: "right" });
    }
    const contact = [profile?.phone, profile?.address].filter(Boolean).join(" · ");
    if (contact) {
      doc.setTextColor(...GRAY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(contact, pageW - 40, footY + 34, { align: "right" });
    }
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.text("Proposta válida por 15 dias.", pageW / 2, footY + 45, { align: "center" });

    const nome = (clientCompany || clientName || "cliente").replace(/\s+/g, "_");
    const filename = `proposta_${nome}_${Date.now()}.pdf`;
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)").matches ||
        // @ts-expect-error iOS Safari
        window.navigator.standalone === true);
    if (isStandalone) {
      // Em PWA instalado, doc.save() com <a download> costuma ser bloqueado.
      // Abrimos o blob em nova aba para permitir salvar/compartilhar.
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) {
        // Popup bloqueado — fallback: âncora com target=_blank
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } else {
      doc.save(filename);
    }
  };

  if (loading) return <main className="p-6 text-slate-500">Carregando...</main>;

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">
          {savedId ? "Editar Orçamento" : "Novo Orçamento"}
          {locked && (
            <span className="ml-2 inline-block rounded bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800 align-middle sm:text-xs">
              FECHADO — somente leitura
            </span>
          )}
        </h1>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-nowrap">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as QuoteStatus)}
            disabled={locked}
            className="col-span-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-60 sm:col-span-1"
          >
            {STATUS_OPTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
          <button
            onClick={handleSave}
            disabled={locked}
            className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
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

      {locked && (
        <div className="mb-3 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          Este orçamento foi marcado como <strong>fechado</strong> e não pode mais ser alterado. Para editar, mova-o para outra etapa no pipeline.
        </div>
      )}
      {msg && <div className="mb-3 rounded bg-green-50 p-2 text-sm text-green-700">{msg}</div>}

      <fieldset disabled={locked} className={locked ? "opacity-70" : ""}>
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
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Cliente {savedId && <span className="text-slate-400">(bloqueado)</span>}
            </label>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm read-only:bg-slate-100 read-only:text-slate-600 read-only:cursor-not-allowed"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              readOnly={!!savedId}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Empresa cliente {savedId && <span className="text-slate-400">(bloqueado)</span>}
            </label>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm read-only:bg-slate-100 read-only:text-slate-600 read-only:cursor-not-allowed"
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
              readOnly={!!savedId}
            />
          </div>
        </div>
      </section>

      {/* Config comercial */}
      <section className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Margem (%)</label>
          <input
            type="number"
            min={0}
            inputMode="decimal"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={Number.isFinite(margem) ? margem : ""}
            onChange={(e) => {
              const v = e.target.value;
              setMargem(v === "" ? 0 : Number(v));
            }}
            onFocus={(e) => e.target.select()}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Taxa de Instalação (R$)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={taxaInstalacao || ""}
            onChange={(e) => {
              const v = e.target.value;
              setTaxaInstalacao(v === "" ? 0 : Number(v));
            }}
            onFocus={(e) => e.target.select()}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Mensalidade Monitoramento (R$)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={mensalidade || ""}
            onChange={(e) => {
              const v = e.target.value;
              setMensalidade(v === "" ? 0 : Number(v));
            }}
            onFocus={(e) => e.target.select()}
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

      {/* Produtos - desktop (tabela) */}
      <section className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
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
                  <td className="px-3 py-1.5">{l.displayName}</td>
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

      {/* Produtos - mobile (cards) */}
      <section className="space-y-2 md:hidden">
        <div className="rounded-t-lg bg-green-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white">
          Produtos ({filtradas.length})
        </div>
        <ul className="space-y-2">
          {filtradas.map((l) => {
            const ativo = l.qtde > 0;
            return (
              <li
                key={l.codigo}
                className={`rounded-lg border p-3 shadow-sm ${ativo ? "border-green-400 bg-green-50/60" : "border-slate-200 bg-white"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] text-slate-500">{l.codigo}</div>
                    <div className="text-sm font-medium leading-snug text-slate-800">{l.displayName}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] uppercase text-slate-500">PSD</div>
                    <div className="text-xs tabular-nums text-slate-700">{BRL(possuiCnae && !l.semDesconto ? l.psdDesc : l.psd)}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQtd(l.codigo, Math.max(0, (l.qtde || 0) - 1))}
                      className="h-9 w-9 rounded-md border border-slate-300 bg-white text-lg font-bold text-slate-700 active:bg-slate-100"
                      aria-label="Diminuir"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={l.qtde || ""}
                      onChange={(e) => setQtd(l.codigo, Number(e.target.value))}
                      className="h-9 w-14 rounded-md border border-slate-300 text-center text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setQtd(l.codigo, (l.qtde || 0) + 1)}
                      className="h-9 w-9 rounded-md border border-slate-300 bg-white text-lg font-bold text-slate-700 active:bg-slate-100"
                      aria-label="Aumentar"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-slate-500">Venda</div>
                    <div className="text-sm font-semibold tabular-nums text-green-700">{BRL(l.venda)}</div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-100 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Total custo</span>
            <span className="font-semibold tabular-nums">{BRL(totalCusto)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-slate-600">Total venda</span>
            <span className="font-semibold tabular-nums text-green-700">{BRL(totalVenda)}</span>
          </div>
        </div>
      </section>


      {/* ROI */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Análise de ROI</h3>
          <div className="space-y-2 text-sm">
            <Row label="Custo produtos" value={BRL(totalCusto)} />
            <Row label="Taxa de instalação (cobrada)" value={BRL(Number(taxaInstalacao))} />
            <Row label="Venda de Equipamentos / Comodato" value={BRL(totalVenda)} />
            <Row label="Lucro Venda de Equipamentos / Comodato" value={BRL(lucro)} bold color="text-green-700" />
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
      </fieldset>
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
