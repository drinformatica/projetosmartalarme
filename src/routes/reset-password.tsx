import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Redefinir senha - Intrusão 2.0" }] }),
});

function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Supabase coloca o token no hash da URL; ao carregar, o cliente
    // detecta e cria uma sessão temporária de recuperação.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (password.length < 6) {
      setErr("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setErr("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg("Senha atualizada com sucesso! Redirecionando...");
      setTimeout(() => router.navigate({ to: "/dashboard", replace: true }), 1500);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro ao atualizar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-block rounded-full bg-green-100 px-4 py-1 text-xs font-semibold text-green-800">
            Intrusão 2.0
          </div>
          <h1 className="text-2xl font-bold">Redefinir senha</h1>
          <p className="text-sm text-slate-500">Escolha uma nova senha para sua conta</p>
        </div>

        {!ready ? (
          <div className="rounded bg-amber-50 p-3 text-sm text-amber-800">
            Validando link de recuperação... Se você não acessou esta página pelo link
            enviado no seu e-mail, volte e solicite um novo link.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Nova senha</label>
              <input
                required
                type="password"
                minLength={6}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Confirmar senha</label>
              <input
                required
                type="password"
                minLength={6}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {err && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</div>}
            {msg && <div className="rounded bg-green-50 p-2 text-sm text-green-700">{msg}</div>}
            <button
              disabled={loading}
              className="w-full rounded-md bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? "Aguarde..." : "Salvar nova senha"}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <Link to="/auth" className="text-xs text-slate-500 hover:underline">← Voltar para login</Link>
        </div>
      </div>
    </div>
  );
}
