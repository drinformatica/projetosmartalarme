import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getProfile, saveProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: PerfilPage,
  head: () => ({ meta: [{ title: "Perfil - Intrusão 2.0" }] }),
});

function PerfilPage() {
  const load = useServerFn(getProfile);
  const save = useServerFn(saveProfile);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    company_name: "",
    phone: "",
    address: "",
    logo_url: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load().then((p) => {
      if (p)
        setForm({
          full_name: p.full_name ?? "",
          company_name: p.company_name ?? "",
          phone: p.phone ?? "",
          address: p.address ?? "",
          logo_url: p.logo_url ?? "",
        });
      setLoading(false);
    });
  }, [load]);

  const onFile = async (file: File | null) => {
    setErr(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErr("Imagem muito grande. Use até 2MB.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    setForm((f) => ({ ...f, logo_url: dataUrl }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    await save({ data: form });
    setMsg("Perfil salvo!");
  };

  if (loading) return <main className="p-6 text-slate-500">Carregando...</main>;

  const textFields: { k: keyof typeof form; label: string }[] = [
    { k: "full_name", label: "Seu nome" },
    { k: "company_name", label: "Nome da empresa" },
    { k: "phone", label: "Telefone" },
    { k: "address", label: "Endereço" },
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold">Perfil da Empresa</h1>
      <p className="mb-6 text-sm text-slate-500">
        Estes dados aparecerão automaticamente no cabeçalho das propostas em PDF.
      </p>
      <form onSubmit={submit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        {textFields.map((f) => (
          <div key={f.k}>
            <label className="mb-1 block text-xs font-semibold text-slate-600">{f.label}</label>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={form[f.k]}
              onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
            />
          </div>
        ))}

        <div className="space-y-2 rounded border border-dashed border-slate-300 p-4">
          <label className="block text-xs font-semibold text-slate-600">Logo da empresa</label>
          <p className="text-xs text-slate-500">
            Aparecerá no topo da proposta em PDF, acima do título. Cole um link ou envie um arquivo
            do seu dispositivo (até 2MB).
          </p>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">
              URL do logo
            </label>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="https://..."
              value={form.logo_url.startsWith("data:") ? "" : form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Escolher arquivo do dispositivo
            </button>
            {form.logo_url && (
              <button
                type="button"
                onClick={() => setForm({ ...form, logo_url: "" })}
                className="text-xs text-red-600 hover:underline"
              >
                remover
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {err && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}

          {form.logo_url && (
            <div className="mt-2 flex items-center gap-3 rounded bg-slate-50 p-2">
              <img
                src={form.logo_url}
                alt="Prévia do logo"
                className="h-14 w-14 rounded border border-slate-200 bg-white object-contain p-1"
              />
              <span className="text-xs text-slate-500">Prévia</span>
            </div>
          )}
        </div>

        {msg && <div className="rounded bg-green-50 p-2 text-sm text-green-700">{msg}</div>}
        <button className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">
          Salvar
        </button>
      </form>
    </main>
  );
}
