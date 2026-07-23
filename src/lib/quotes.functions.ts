import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type QuoteStatus = "rascunho" | "enviado" | "negociacao" | "fechado" | "perdido";
export type QuoteModalidade = "comodato" | "venda";

export type QuoteItem = {
  codigo: string;
  nome: string;
  psd: number;
  qtde: number;
};

export type QuoteInput = {
  id?: string;
  title: string;
  intro: string;
  client_name: string;
  client_company: string;
  items: QuoteItem[];
  margem: number;
  possui_cnae: boolean;
  taxa_instalacao: number;
  mensalidade: number;
  observacoes: string;
  status: QuoteStatus;
  modalidade: QuoteModalidade;
  total_venda: number;
  total_custo: number;
};

export const listQuotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("quotes")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getQuote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: q, error } = await context.supabase
      .from("quotes")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return q;
  });

export const saveQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: QuoteInput) => data)
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    if (data.id) {
      const { data: r, error } = await context.supabase
        .from("quotes")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return r;
    }
    const { id: _ignore, ...insertPayload } = payload;
    const { data: r, error } = await context.supabase
      .from("quotes")
      .insert(insertPayload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return r;
  });

export const updateQuoteStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: QuoteStatus }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("quotes")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("quotes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
