import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getProfile, saveProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: PerfilPage,
  head: () => ({ meta: [{ title: "Perfil - Intrusão 2.0" }] }),
});

function PerfilPage() {
  const load = useServerFn(getProfile);
  const save = useServerFn(saveProfile);
  const [form, setForm] = useState({
    full_name: "",
    company_name: "",
    phone: "",
    address: "",
    logo_url: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load().then((p) => {
      if (p) setForm({
        full_name: p.full_name ?? "",
        company_name: p.company_name ?? "",
        phone: p.phone ?? "",
        address: p.address ?? "",
        logo_url: p.logo_url ?? "",
      });
      setLoading(false);
    });
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    await save({ data: form });
    setMsg("Perfil salvo!");
  };

  if (loading) return <main className="p-6 text-slate-500">Carregando...</main>;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold">Perfil da Empresa</h1>
      <p className="mb-6 text-sm text-slate-500">
        Estes dados aparecerão automaticamente no cabeçalho das propostas em PDF.
      </p>
      <form onSubmit={submit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        {[
          { k: "full_name", label: "Seu nome" },
          { k: "company_name", label: "Nome da empresa" },
          { k: "phone", label: "Telefone" },
          { k: "address", label: "Endereço" },
          { k: "logo_url", label: "URL do logo (opcional)" },
        ].map((f) => (
          <div key={f.k}>
            <label className="mb-1 block text-xs font-semibold text-slate-600">{f.label}</label>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={form[f.k as keyof typeof form]}
              onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
            />
          </div>
        ))}
        {msg && <div className="rounded bg-green-50 p-2 text-sm text-green-700">{msg}</div>}
        <button className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">
          Salvar
        </button>
      </form>
    </main>
  );
}
