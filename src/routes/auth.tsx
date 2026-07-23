import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCpfCnpj, isValidCpfCnpj, onlyDigits } from "@/lib/br-doc";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
  head: () => ({ meta: [{ title: "Entrar - Intrusão 2.0" }] }),
});

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const MAX_ATTEMPTS = 5;
  const locked = mode === "login" && failedAttempts >= MAX_ATTEMPTS;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.navigate({ to: "/dashboard", replace: true });
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (mode === "login" && failedAttempts >= MAX_ATTEMPTS) {
      setErr("Muitas tentativas incorretas. Recupere sua senha para continuar.");
      return;
    }
    if (mode === "signup" && !isValidCpfCnpj(cnpj)) {
      setErr("CPF ou CNPJ inválido. Informe um documento válido.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name, cnpj: onlyDigits(cnpj) },
          },
        });
        if (error) throw error;
        setMsg(
          "Cadastro criado! Enviamos um e-mail de confirmação. Confirme o e-mail para acessar sua conta.",
        );
        setMode("login");
        setPassword("");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMsg(
          "Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes. Verifique também a caixa de spam.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setFailedAttempts(0);
        router.navigate({ to: "/dashboard", replace: true });
      }
    } catch (e: unknown) {
      if (mode === "login") {
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        if (next >= MAX_ATTEMPTS) {
          setErr(
            `Você atingiu ${MAX_ATTEMPTS} tentativas incorretas. Por segurança, recupere sua senha para continuar.`,
          );
        } else {
          const restantes = MAX_ATTEMPTS - next;
          setErr(
            `E-mail ou senha inválidos. Você tem mais ${restantes} tentativa${restantes === 1 ? "" : "s"} antes de precisar recuperar a senha.`,
          );
        }
      } else {
        setErr(e instanceof Error ? e.message : "Erro ao autenticar");
      }
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
            {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha"}
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
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                CPF ou CNPJ <span className="text-red-500">*</span>
              </label>
              <input
                required
                inputMode="numeric"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={cnpj}
                onChange={(e) => setCnpj(formatCpfCnpj(e.target.value))}
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
          {mode !== "forgot" && (
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
          )}
          {err && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</div>}
          {msg && <div className="rounded bg-green-50 p-2 text-sm text-green-700">{msg}</div>}
          <button
            disabled={loading || locked}
            className="w-full rounded-md bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
          >
            {loading
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar"
                : mode === "signup"
                  ? "Cadastrar"
                  : "Enviar link de recuperação"}
          </button>
          {locked && (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setErr(null);
                setMsg(null);
                setFailedAttempts(0);
              }}
              className="w-full rounded-md border border-green-700 bg-white py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
            >
              Recuperar minha senha
            </button>
          )}
        </form>

        <div className="mt-4 space-y-2 text-center text-sm text-slate-600">
          {mode === "login" && (
            <>
              <div>
                <button
                  type="button"
                  className="font-semibold text-green-700 hover:underline"
                  onClick={() => {
                    setMode("forgot");
                    setErr(null);
                    setMsg(null);
                  }}
                >
                  Esqueci minha senha
                </button>
              </div>
              <div>
                Não tem conta?{" "}
                <button
                  type="button"
                  className="font-semibold text-green-700"
                  onClick={() => setMode("signup")}
                >
                  Cadastre-se
                </button>
              </div>
            </>
          )}
          {mode === "signup" && (
            <div>
              Já tem conta?{" "}
              <button
                type="button"
                className="font-semibold text-green-700"
                onClick={() => setMode("login")}
              >
                Entrar
              </button>
            </div>
          )}
          {mode === "forgot" && (
            <div>
              <button
                type="button"
                className="font-semibold text-green-700 hover:underline"
                onClick={() => {
                  setMode("login");
                  setErr(null);
                  setMsg(null);
                }}
              >
                ← Voltar para login
              </button>
            </div>
          )}
        </div>
        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-slate-500 hover:underline">← Voltar</Link>
        </div>
      </div>
    </div>
  );
}
