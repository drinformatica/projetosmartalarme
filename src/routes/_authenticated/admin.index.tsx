import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAdminUsers, getMyRoles } from "@/lib/admin.functions";
import { AdsManager } from "@/components/AdsManager";


export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminList,
  head: () => ({ meta: [{ title: "Admin - Usuários" }] }),
});

const BRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Row = {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  cnpj: string | null;
  created_at: string;
  roles: string[];
  stats: { total: number; totalVenda: number; fechados: number; valorFechado: number };
};

function AdminList() {
  const router = useRouter();
  const list = useServerFn(listAdminUsers);
  const rolesFn = useServerFn(getMyRoles);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const rs = await rolesFn();
        if (!rs.includes("super_admin") && !rs.includes("admin")) {
          router.navigate({ to: "/dashboard", replace: true });
          return;
        }
        const data = (await list()) as Row[];
        setRows(data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Erro");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = rows.filter((r) => {
    const t = q.toLowerCase();
    return (
      !t ||
      (r.email ?? "").toLowerCase().includes(t) ||
      (r.full_name ?? "").toLowerCase().includes(t) ||
      (r.company_name ?? "").toLowerCase().includes(t) ||
      (r.cnpj ?? "").toLowerCase().includes(t)
    );
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Administração</h1>
          <p className="text-sm text-slate-500">Usuários cadastrados na plataforma</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            to="/admin/produtos"
            className="rounded bg-green-700 px-3 py-1.5 font-semibold text-white hover:bg-green-800"
          >
            Gerenciar Produtos
          </Link>
          <Link to="/dashboard" className="rounded border px-3 py-1.5 text-green-700 hover:bg-slate-50">
            ← Voltar ao pipeline
          </Link>
        </div>
      </div>

      <div className="mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por email, nome, empresa ou CNPJ..."
          className="w-full max-w-md rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-6 text-center text-slate-500">Carregando...</div>
      ) : err ? (
        <div className="rounded bg-red-50 p-4 text-sm text-red-700">{err}</div>
      ) : (
        <>
          {/* Desktop / tablet: tabela */}
          <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Usuário</th>
                  <th className="px-3 py-2 text-left">Empresa</th>
                  <th className="px-3 py-2 text-left">CPF/CNPJ</th>
                  <th className="px-3 py-2 text-left">Papéis</th>
                  <th className="px-3 py-2 text-right">Orçamentos</th>
                  <th className="px-3 py-2 text-right">Total Gerado</th>
                  <th className="px-3 py-2 text-right">Fechado</th>
                  <th className="px-3 py-2 text-left">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() =>
                      router.navigate({ to: "/admin/$userId", params: { userId: r.id } })
                    }
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{r.full_name || "—"}</div>
                      <div className="text-xs text-slate-500">{r.email}</div>
                    </td>
                    <td className="px-3 py-2">{r.company_name || "—"}</td>
                    <td className="px-3 py-2">{r.cnpj || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.roles.length === 0 && (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">user</span>
                        )}
                        {r.roles.map((role) => (
                          <span
                            key={role}
                            className={`rounded px-2 py-0.5 text-xs font-semibold ${
                              role === "super_admin"
                                ? "bg-purple-100 text-purple-800"
                                : role === "admin"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{r.stats.total}</td>
                    <td className="px-3 py-2 text-right">{BRL(r.stats.totalVenda)}</td>
                    <td className="px-3 py-2 text-right">
                      <div>{BRL(r.stats.valorFechado)}</div>
                      <div className="text-xs text-slate-500">{r.stats.fechados} fech.</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <ul className="space-y-2 md:hidden">
            {filtered.map((r) => (
              <li
                key={r.id}
                onClick={() =>
                  router.navigate({ to: "/admin/$userId", params: { userId: r.id } })
                }
                className="cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm active:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-800">{r.full_name || "—"}</div>
                    <div className="truncate text-xs text-slate-500">{r.email}</div>
                    {r.company_name && (
                      <div className="mt-0.5 truncate text-xs text-slate-600">{r.company_name}</div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {r.roles.length === 0 && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">user</span>
                    )}
                    {r.roles.map((role) => (
                      <span
                        key={role}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          role === "super_admin"
                            ? "bg-purple-100 text-purple-800"
                            : role === "admin"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-[11px]">
                  <div>
                    <div className="text-slate-500">Orçamentos</div>
                    <div className="font-semibold text-slate-800">{r.stats.total}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Gerado</div>
                    <div className="font-semibold tabular-nums text-slate-800">{BRL(r.stats.totalVenda)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Fechado</div>
                    <div className="font-semibold tabular-nums text-green-700">{BRL(r.stats.valorFechado)}</div>
                  </div>
                </div>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                Nenhum usuário encontrado.
              </li>
            )}
          </ul>
        </>
      )}

      <div className="mt-8">
        <AdsManager />
      </div>
    </main>
  );
}

