import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AppRole = "super_admin" | "admin" | "user";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r: { role: AppRole }) => r.role);
  const isAdmin = roles.includes("super_admin") || roles.includes("admin");
  if (!isAdmin) throw new Error("Acesso negado");
  return { isSuperAdmin: roles.includes("super_admin"), roles };
}

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.role as AppRole);
  });

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const [profilesRes, rolesRes, quotesRes] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, email, full_name, company_name, phone, cnpj, created_at")
        .order("created_at", { ascending: false }),
      context.supabase.from("user_roles").select("user_id, role"),
      context.supabase.from("quotes").select("user_id, status, total_venda"),
    ]);
    if (profilesRes.error) throw new Error(profilesRes.error.message);
    if (rolesRes.error) throw new Error(rolesRes.error.message);
    if (quotesRes.error) throw new Error(quotesRes.error.message);

    const rolesByUser = new Map<string, AppRole[]>();
    for (const r of rolesRes.data ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role as AppRole);
      rolesByUser.set(r.user_id, arr);
    }

    const statsByUser = new Map<
      string,
      { total: number; totalVenda: number; fechados: number; valorFechado: number }
    >();
    for (const q of quotesRes.data ?? []) {
      const s = statsByUser.get(q.user_id) ?? {
        total: 0,
        totalVenda: 0,
        fechados: 0,
        valorFechado: 0,
      };
      s.total += 1;
      s.totalVenda += Number(q.total_venda ?? 0);
      if (q.status === "fechado") {
        s.fechados += 1;
        s.valorFechado += Number(q.total_venda ?? 0);
      }
      statsByUser.set(q.user_id, s);
    }

    return (profilesRes.data ?? []).map((p) => ({
      ...p,
      roles: rolesByUser.get(p.id) ?? [],
      stats: statsByUser.get(p.id) ?? {
        total: 0,
        totalVenda: 0,
        fechados: 0,
        valorFechado: 0,
      },
    }));
  });

export const getAdminUserDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const [profileRes, rolesRes, quotesRes] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, email, full_name, company_name, phone, address, cnpj, created_at")
        .eq("id", data.userId)
        .maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", data.userId),
      context.supabase
        .from("quotes")
        .select("id, status, total_venda, mensalidade, taxa_instalacao, items, created_at")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false }),
    ]);
    if (profileRes.error) throw new Error(profileRes.error.message);
    if (rolesRes.error) throw new Error(rolesRes.error.message);
    if (quotesRes.error) throw new Error(quotesRes.error.message);

    const quotes = quotesRes.data ?? [];

    // aggregate top items (ignore client-side info entirely)
    const itemCount = new Map<string, { nome: string; qtde: number; ocorrencias: number }>();
    for (const q of quotes) {
      const items = Array.isArray(q.items) ? (q.items as Array<{ codigo?: string; nome?: string; qtde?: number }>) : [];
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
      profile: profileRes.data,
      roles: (rolesRes.data ?? []).map((r) => r.role as AppRole),
      stats: {
        totalOrcamentos: quotes.length,
        totalGerado,
        totalFechado,
        qFechados,
        mrrFechado,
      },
      topItems,
      // sanitized quote summaries — NO client info
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
    const { isSuperAdmin } = await assertAdmin(context.supabase, context.userId);
    if (!isSuperAdmin) throw new Error("Apenas super admin pode alterar papéis");

    if (data.makeAdmin) {
      const { error } = await context.supabase
        .from("user_roles")
        .insert({ user_id: data.userId, role: "admin" });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
