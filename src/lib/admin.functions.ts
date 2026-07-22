import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AppRole = "super_admin" | "admin" | "user";

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_user_roles", {
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as AppRole[];
  });

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_list_users");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: {
      id: string;
      email: string | null;
      full_name: string | null;
      company_name: string | null;
      phone: string | null;
      cnpj: string | null;
      created_at: string;
      roles: AppRole[] | null;
      total_quotes: number | string;
      total_venda: number | string;
      fechados: number | string;
      valor_fechado: number | string;
    }) => ({
      id: r.id,
      email: r.email,
      full_name: r.full_name,
      company_name: r.company_name,
      phone: r.phone,
      cnpj: r.cnpj,
      created_at: r.created_at,
      roles: (r.roles ?? []) as AppRole[],
      stats: {
        total: Number(r.total_quotes ?? 0),
        totalVenda: Number(r.total_venda ?? 0),
        fechados: Number(r.fechados ?? 0),
        valorFechado: Number(r.valor_fechado ?? 0),
      },
    }));
  });

export const getAdminUserDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("admin_get_user_detail", {
      _user_id: data.userId,
    });
    if (error) throw new Error(error.message);
    const payload = (result ?? {}) as {
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
      roles: AppRole[] | null;
      quotes: Array<{
        id: string;
        status: string;
        total_venda: number | string | null;
        mensalidade: number | string | null;
        taxa_instalacao: number | string | null;
        items: unknown;
        created_at: string;
      }> | null;
    };

    const quotes = payload.quotes ?? [];
    const itemCount = new Map<string, { nome: string; qtde: number; ocorrencias: number }>();
    for (const q of quotes) {
      const items = Array.isArray(q.items)
        ? (q.items as Array<{ codigo?: string; nome?: string; qtde?: number }>)
        : [];
      for (const it of items) {
        const key = it.codigo || it.nome || "—";
        const cur = itemCount.get(key) ?? { nome: it.nome ?? key, qtde: 0, ocorrencias: 0 };
        cur.qtde += Number(it.qtde ?? 0);
        cur.ocorrencias += 1;
        itemCount.set(key, cur);
      }
    }
    const topItems = Array.from(itemCount.values())
      .sort((a, b) => b.qtde - a.qtde)
      .slice(0, 10);

    let totalGerado = 0;
    let totalFechado = 0;
    let qFechados = 0;
    let mrrFechado = 0;
    for (const q of quotes) {
      totalGerado += Number(q.total_venda ?? 0);
      if (q.status === "fechado") {
        totalFechado += Number(q.total_venda ?? 0);
        qFechados += 1;
        mrrFechado += Number(q.mensalidade ?? 0);
      }
    }

    return {
      profile: payload.profile,
      roles: (payload.roles ?? []) as AppRole[],
      stats: {
        totalOrcamentos: quotes.length,
        totalGerado,
        totalFechado,
        qFechados,
        mrrFechado,
      },
      topItems,
      quotes: quotes.map((q) => ({
        id: q.id,
        status: q.status,
        total_venda: Number(q.total_venda ?? 0),
        mensalidade: Number(q.mensalidade ?? 0),
        taxa_instalacao: Number(q.taxa_instalacao ?? 0),
        created_at: q.created_at,
      })),
    };
  });

export const setUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; makeAdmin: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_set_user_role", {
      _user_id: data.userId,
      _make_admin: data.makeAdmin,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
