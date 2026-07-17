import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminUserDetail, setUserAdmin, getMyRoles } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/$userId")({
  component: AdminUserDetail,
  head: () => ({ meta: [{ title: "Admin - Usuário" }] }),
});

const BRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Detail = {
  profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    company_name: string | null;
    phone: string | null;
    address: string | null;
    cnpj: string | null;
    created_at: string;
  } | null;
  roles: string[];
  stats: {
    totalOrcamentos: number;
    totalGerado: number;
    totalFechado: number;
    qFechados: number;
    mrrFechado: number;
  };
  topItems: { nome: string; qtde: number; ocorrencias: number }[];
  quotes: {
    id: string;
    status: string;
    total_venda: number;
    mensalidade: number;
    taxa_instalacao: number;
    created_at: string;
  }[];
};

function AdminUserDetail() {
  const { userId } = Route.useParams();
  const router = useRouter();
  const getDetail = useServerFn(getAdminUserDetail);
  const setAdmin = useServerFn(setUserAdmin);
  const rolesFn = useServerFn(getMyRoles);
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    try {
      const d = (await getDetail({ data: { userId } })) as Detail;
      setData(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const rs = await rolesFn();
        if (!rs.includes("super_admin") && !rs.includes("admin")) {
          router.navigate({ to: "/dashboard", replace: true });
          return;
        }
        setIsSuper(rs.includes("super_admin"));
        await reload();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Erro");
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const toggleAdmin = async () => {
    if (!data) return;
    const isCurrentlyAdmin = data.roles.includes("admin");
    setSaving(true);
    try {
      await setAdmin({ data: { userId, makeAdmin: !isCurrentlyAdmin } });
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-lg border bg-white p-6 text-center text-slate-500">Carregando...</div>
      </main>
    );
  }
  if (err || !data || !data.profile) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded bg-red-50 p-4 text-sm text-red-700">{err || "Usuário não encontrado"}</div>
        <Link to="/admin" className="mt-3 inline-block text-sm text-green-700 hover:underline">← Voltar</Link>
      </main>
    );
  }

  const p = data.profile;
  const isSuperTarget = data.roles.includes("super_admin");
  const isAdminTarget = data.roles.includes("admin");

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-4">
        <Link to="/admin" className="text-sm text-green-700 hover:underline">← Voltar</Link>
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{p.full_name || p.email}</h1>
            <p className="text-sm text-slate-500">{p.email}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {data.roles.length === 0 && (
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">user</span>
              )}
              {data.roles.map((r) => (
                <span
                  key={r}
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    r === "super_admin"
                      ? "bg-purple-100 text-purple-800"
                      : r === "admin"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
          {isSuper && !isSuperTarget && (
            <button
              onClick={toggleAdmin}
              disabled={saving}
              className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                isAdminTarget ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "..." : isAdminTarget ? "Remover admin" : "Tornar admin"}
            </button>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Empresa</dt>
            <dd className="text-slate-800">{p.company_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">CPF/CNPJ</dt>
            <dd className="text-slate-800">{p.cnpj || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Telefone</dt>
            <dd className="text-slate-800">{p.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Endereço</dt>
            <dd className="text-slate-800">{p.address || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Cadastro</dt>
            <dd className="text-slate-800">{new Date(p.created_at).toLocaleString("pt-BR")}</dd>
          </div>
        </dl>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Orçamentos gerados" value={data.stats.totalOrcamentos.toString()} />
        <StatCard label="Total gerado" value={BRL(data.stats.totalGerado)} />
        <StatCard
          label="Total fechado"
          value={BRL(data.stats.totalFechado)}
          hint={`${data.stats.qFechados} fechado(s)`}
        />
        <StatCard label="MRR fechado" value={BRL(data.stats.mrrFechado)} hint="mensalidades ativas" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold uppercase text-slate-700">Itens mais utilizados</h2>
          {data.topItems.length === 0 ? (
            <p className="text-sm text-slate-500">Sem itens ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2 text-left">Produto</th>
                  <th className="pb-2 text-right">Qtd. total</th>
                  <th className="pb-2 text-right">Em N orçamentos</th>
                </tr>
              </thead>
              <tbody>
                {data.topItems.map((it, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1.5">{it.nome}</td>
                    <td className="py-1.5 text-right font-semibold">{it.qtde}</td>
                    <td className="py-1.5 text-right text-slate-500">{it.ocorrencias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold uppercase text-slate-700">Orçamentos (resumo)</h2>
          {data.quotes.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum orçamento.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-xs uppercase text-slate-500">
                  <tr>
                    <th className="pb-2 text-left">Data</th>
                    <th className="pb-2 text-left">Status</th>
                    <th className="pb-2 text-right">Venda</th>
                    <th className="pb-2 text-right">MRR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.quotes.map((q) => (
                    <tr key={q.id} className="border-t border-slate-100">
                      <td className="py-1.5 text-xs text-slate-500">
                        {new Date(q.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-1.5">{q.status}</td>
                      <td className="py-1.5 text-right">{BRL(q.total_venda)}</td>
                      <td className="py-1.5 text-right">{BRL(q.mensalidade)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-800">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
