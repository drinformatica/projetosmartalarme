import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAllAds, createAd, toggleAd, deleteAd } from "@/lib/ads.functions";

type Ad = {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  preview_url: string;
  storage_path: string | null;
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export function AdsManager() {
  const list = useServerFn(listAllAds);
  const create = useServerFn(createAd);
  const toggle = useServerFn(toggleAd);
  const remove = useServerFn(deleteAd);

  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [active, setActive] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = (await list()) as Ad[];
      setAds(data);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const file = fileRef.current?.files?.[0];
      const payload: Parameters<typeof createAd>[0]["data"] = {
        title,
        link_url: linkUrl,
        active,
        sort_order: Number(sortOrder) || 0,
      };
      if (file) {
        payload.upload = {
          filename: file.name,
          contentType: file.type || "image/png",
          base64: await fileToBase64(file),
        };
      } else if (imageUrl.trim()) {
        payload.image_url = imageUrl.trim();
      } else {
        throw new Error("Envie um arquivo ou informe uma URL de imagem");
      }
      await create({ data: payload });
      setTitle("");
      setLinkUrl("");
      setImageUrl("");
      setSortOrder(0);
      setActive(true);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async (a: Ad) => {
    setAds((prev) => prev.map((x) => (x.id === a.id ? { ...x, active: !a.active } : x)));
    try {
      await toggle({ data: { id: a.id, active: !a.active } });
    } finally {
      await load();
    }
  };

  const onDelete = async (a: Ad) => {
    if (!confirm(`Excluir o anúncio "${a.title}"?`)) return;
    await remove({ data: { id: a.id } });
    await load();
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800">Anúncios do Pipeline</h2>
        <p className="text-sm text-slate-500">
          Imagens exibidas abaixo do pipeline. Se houver mais de um ativo, vira carrossel automático.
        </p>
      </div>

      <form onSubmit={submit} className="mb-6 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
        <label className="flex flex-col text-xs font-semibold text-slate-700 sm:col-span-2">
          Título
          <input
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal"
            placeholder="Ex.: Lançamento IVP 5000 SMART LD"
          />
        </label>
        <label className="flex flex-col text-xs font-semibold text-slate-700 sm:col-span-2">
          Link do anúncio (para onde clica)
          <input
            required
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal"
            placeholder="https://..."
          />
        </label>
        <label className="flex flex-col text-xs font-semibold text-slate-700">
          Imagem — Upload
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="mt-1 text-sm font-normal"
          />
        </label>
        <label className="flex flex-col text-xs font-semibold text-slate-700">
          ou URL da imagem
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal"
            placeholder="https://..."
          />
        </label>
        <label className="flex flex-col text-xs font-semibold text-slate-700">
          Ordem
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="mt-1 w-24 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal"
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Ativo
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Adicionar anúncio"}
          </button>
          {err && <span className="ml-3 text-sm text-red-700">{err}</span>}
        </div>
      </form>

      {loading ? (
        <div className="text-sm text-slate-500">Carregando...</div>
      ) : ads.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Nenhum anúncio cadastrado.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((a) => (
            <li key={a.id} className="overflow-hidden rounded-md border border-slate-200 bg-white">
              <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
                {a.preview_url ? (
                  <img src={a.preview_url} alt={a.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    imagem indisponível
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="font-semibold text-slate-800">{a.title}</div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      a.active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {a.active ? "ativo" : "inativo"}
                  </span>
                </div>
                <a
                  href={a.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-1 block text-xs text-blue-700 hover:underline"
                >
                  {a.link_url}
                </a>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => onToggle(a)}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {a.active ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    onClick={() => onDelete(a)}
                    className="rounded border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
