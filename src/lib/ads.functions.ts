import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_admin", { _user_id: userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado");
}

type AdRow = {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  active: boolean;
  sort_order: number;
  created_at: string;
};

const SIGN_TTL = 60 * 60 * 24 * 7; // 7 days

async function resolveImage(supabase: any, image_url: string): Promise<string> {
  if (image_url.startsWith("storage:")) {
    const path = image_url.slice("storage:".length);
    const { data, error } = await supabase.storage.from("ads").createSignedUrl(path, SIGN_TTL);
    if (error || !data) return "";
    return data.signedUrl;
  }
  return image_url;
}

export const listActiveAds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ads")
      .select("id, title, image_url, link_url, active, sort_order, created_at")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as AdRow[];
    const resolved = await Promise.all(
      rows.map(async (r) => ({ ...r, image_url: await resolveImage(context.supabase, r.image_url) })),
    );
    return resolved.filter((r) => r.image_url);
  });

export const listAllAds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("ads")
      .select("id, title, image_url, link_url, active, sort_order, created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as AdRow[];
    const resolved = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        preview_url: await resolveImage(context.supabase, r.image_url),
        storage_path: r.image_url.startsWith("storage:") ? r.image_url.slice("storage:".length) : null,
      })),
    );
    return resolved;
  });

export const createAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      title: string;
      link_url: string;
      active?: boolean;
      sort_order?: number;
      // one of:
      image_url?: string; // external URL
      upload?: { filename: string; contentType: string; base64: string }; // upload
    }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const title = (data.title || "").trim().slice(0, 200);
    const link_url = (data.link_url || "").trim().slice(0, 2000);
    if (!title) throw new Error("Título obrigatório");
    if (!/^https?:\/\//i.test(link_url)) throw new Error("Link deve começar com http(s)://");

    let image_url = (data.image_url || "").trim();

    if (data.upload) {
      const { filename, contentType, base64 } = data.upload;
      if (!/^image\/(png|jpe?g|webp|gif)$/i.test(contentType)) {
        throw new Error("Formato de imagem não suportado");
      }
      const bytes = Buffer.from(base64, "base64");
      if (bytes.length > 8 * 1024 * 1024) throw new Error("Imagem maior que 8MB");
      const ext = (filename.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const path = `${context.userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await context.supabase.storage
        .from("ads")
        .upload(path, bytes, { contentType, upsert: false });
      if (upErr) throw new Error(upErr.message);
      image_url = `storage:${path}`;
    } else {
      if (!/^https?:\/\//i.test(image_url)) throw new Error("Informe uma imagem (upload ou URL http(s))");
    }

    const { error } = await context.supabase.from("ads").insert({
      title,
      link_url,
      image_url,
      active: data.active ?? true,
      sort_order: data.sort_order ?? 0,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; active: boolean }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("ads")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row } = await context.supabase
      .from("ads")
      .select("image_url")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.image_url?.startsWith("storage:")) {
      const path = row.image_url.slice("storage:".length);
      await context.supabase.storage.from("ads").remove([path]);
    }
    const { error } = await context.supabase.from("ads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
