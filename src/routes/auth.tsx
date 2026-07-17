import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
  head: () => ({ meta: [{ title: "Entrar - Intrusão 2.0" }] }),
});

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.navigate({ to: "/dashboard", replace: true });
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        // auto-confirm is on — sign in immediately
        const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signErr) {
          setMsg("Cadastro criado! Faça login.");
          setMode("login");
        } else {
          router.navigate({ to: "/dashboard", replace: true });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.navigate({ to: "/dashboard", replace: true });
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro ao autenticar");
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
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h1>
          <p className="text-sm text-slate-500">
            Gerador de orçamentos & pipeline de vendas
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Nome completo</label>
              <input
                required
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
            <input
              required
              type="email"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Senha</label>
            <input
              required
              type="password"
              minLength={6}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {err && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</div>}
          {msg && <div className="rounded bg-green-50 p-2 text-sm text-green-700">{msg}</div>}
          <button
            disabled={loading}
            className="w-full rounded-md bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
          >
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-600">
          {mode === "login" ? (
            <>
              Não tem conta?{" "}
              <button className="font-semibold text-green-700" onClick={() => setMode("signup")}>
                Cadastre-se
              </button>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <button className="font-semibold text-green-700" onClick={() => setMode("login")}>
                Entrar
              </button>
            </>
          )}
        </div>
        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-slate-500 hover:underline">← Voltar</Link>
        </div>
      </div>
    </div>
  );
}
