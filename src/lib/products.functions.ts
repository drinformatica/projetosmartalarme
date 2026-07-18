import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Product = {
  id: string;
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
