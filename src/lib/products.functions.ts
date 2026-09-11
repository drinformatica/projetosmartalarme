import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Product = {
  id: string;
  segmento: string;
  codigo: string;
  nome: string;
  psd: number;
  descricao_orcamento: string;
  descricao_proposta: string;
  no_cnae_discount: boolean;
  active: boolean;
  sort_order: number;
};

export type ProductInput = {
  id?: string;
  segmento?: string;
  codigo: string;
  nome: string;
  psd: number;
  descricao_orcamento: string;
  descricao_proposta: string;
  no_cnae_discount: boolean;
  active: boolean;
  sort_order?: number;
};

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Product[];
  });

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ProductInput) => data)
  .handler(async ({ data, context }) => {
    const payload = {
      segmento: (data.segmento ?? "").trim(),
      codigo: data.codigo.trim(),
      nome: data.nome.trim(),
      psd: Number(data.psd) || 0,
      descricao_orcamento: data.descricao_orcamento ?? "",
      descricao_proposta: data.descricao_proposta ?? "",
      no_cnae_discount: !!data.no_cnae_discount,
      active: !!data.active,
      sort_order: Number(data.sort_order ?? 0),
    };
    if (data.id) {
      const { data: r, error } = await context.supabase
        .from("products")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return r as Product;
    }
    const { data: r, error } = await context.supabase
      .from("products")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return r as Product;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type BulkPriceUpdate = { codigo: string; psd: number };

export const bulkUpdatePrices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { updates: BulkPriceUpdate[] }) => data)
  .handler(async ({ data, context }) => {
    const { data: existing, error: listErr } = await context.supabase
      .from("products")
      .select("id, codigo");
    if (listErr) throw new Error(listErr.message);
    const byCode = new Map<string, string>();
    (existing ?? []).forEach((p: { id: string; codigo: string }) => {
      byCode.set(String(p.codigo).trim().toLowerCase(), p.id);
    });

    let updated = 0;
    const notFound: string[] = [];
    for (const u of data.updates) {
      const key = String(u.codigo).trim().toLowerCase();
      const id = byCode.get(key);
      if (!id) {
        notFound.push(u.codigo);
        continue;
      }
      const psd = Number(u.psd);
      if (!Number.isFinite(psd) || psd < 0) continue;
      const { error } = await context.supabase
        .from("products")
        .update({ psd })
        .eq("id", id);
      if (error) throw new Error(error.message);
      updated += 1;
    }
    return { updated, notFound, total: data.updates.length };
  });

export type BulkProductInput = {
  segmento: string;
  codigo: string;
  nome: string;
  psd: number;
  descricao_orcamento: string;
  descricao_proposta: string;
  no_cnae_discount: boolean;
};

export const bulkInsertProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { products: BulkProductInput[] }) => data)
  .handler(async ({ data, context }) => {
    const products = data.products.map((product) => ({
      segmento: product.segmento.trim(),
      codigo: product.codigo.trim(),
      nome: product.nome.trim(),
      psd: Number(product.psd),
      descricao_orcamento: product.descricao_orcamento.trim(),
      descricao_proposta: product.descricao_proposta.trim(),
      no_cnae_discount: Boolean(product.no_cnae_discount),
      active: true,
      sort_order: 0,
    }));

    for (const [index, product] of products.entries()) {
      if (
        !product.segmento ||
        !product.codigo ||
        !product.nome ||
        !product.descricao_orcamento ||
        !Number.isFinite(product.psd) ||
        product.psd < 0
      ) {
        throw new Error(`Produto inválido na linha ${index + 2}. Verifique Segmento, Código, PSD, Nome do produto e Descrição do produto.`);
      }
    }

    const { error } = await context.supabase.from("products").insert(products);
    if (error) throw new Error(error.message);
    return { count: products.length };
  });
