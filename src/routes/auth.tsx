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
        const { data: exists, error: existsErr } = await (supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: boolean | null; error: unknown }>)("cpf_cnpj_exists", {
          _cnpj: onlyDigits(cnpj),
        });
        if (existsErr) throw existsErr as Error;
        if (exists) {
          setErr("Este CPF/CNPJ já está cadastrado em nossa base. Faça login ou recupere sua senha.");
          setLoading(false);
          return;
        }
      }
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
        const errObj = e as { code?: string; message?: string } | null;
        const code = errObj?.code ?? "";
        const message = errObj?.message ?? "";
        const isNotConfirmed =
          code === "email_not_confirmed" ||
          /email.*not.*confirm/i.test(message) ||
          /not.*confirm/i.test(message);

        if (isNotConfirmed) {
          try {
            await supabase.auth.resend({
              type: "signup",
              email,
              options: { emailRedirectTo: `${window.location.origin}/auth` },
            });
          } catch {
            // ignora, apenas informa o usuário
          }
          setErr(
            "Seu e-mail ainda não foi verificado. Reenviamos o link de confirmação — verifique sua caixa de entrada (e o spam) antes de entrar.",
          );
        } else {
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
        }
      } else {
        setErr(e instanceof Error ? e.message : "Erro ao autenticar");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100svh-64px)] items-center justify-center overflow-hidden bg-hero px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-70" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary-glow/25 blur-3xl" />

      <div className="animate-rise relative w-full max-w-md rounded-3xl border border-border/70 bg-white/75 p-8 shadow-elevate backdrop-blur-xl">
        <div className="mb-7 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-emerald-gradient shadow-emerald">
            <span className="font-display text-base font-black text-white">I</span>
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-deep">Intrusão 2.0</p>
          <h1 className="mt-2 font-display text-3xl font-black tracking-tight">
            {mode === "login" ? "Bem-vindo de volta" : mode === "signup" ? "Criar sua conta" : "Recuperar senha"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "forgot" ? "Enviaremos um link para redefinir sua senha." : "Orçamentos premium e pipeline de vendas."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <Field label="Nome completo">
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </Field>
          )}
          {mode === "signup" && (
            <Field label="CPF ou CNPJ" required>
              <input
                required
                inputMode="numeric"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                className={inputCls}
                value={cnpj}
                onChange={(e) => setCnpj(formatCpfCnpj(e.target.value))}
              />
            </Field>
          )}
          <Field label="E-mail">
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
          {mode !== "forgot" && (
            <Field label="Senha">
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
              />
            </Field>
          )}

          {err && <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{err}</div>}
          {msg && <div className="rounded-xl border border-primary/20 bg-accent/60 px-3 py-2 text-sm text-primary-deep">{msg}</div>}

          <button
            disabled={loading || locked}
            className="group flex w-full items-center justify-center gap-2 rounded-full bg-emerald-gradient py-3 text-sm font-semibold text-white shadow-emerald transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevate disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
            {!loading && <span className="transition-transform group-hover:translate-x-1">→</span>}
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
              className="w-full rounded-full border border-primary/40 bg-white/60 py-3 text-sm font-semibold text-primary-deep transition hover:bg-accent/60"
            >
              Recuperar minha senha
            </button>
          )}
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
          {mode === "login" && (
            <>
              <button
                type="button"
                className="font-semibold text-primary transition hover:text-primary-deep"
                onClick={() => { setMode("forgot"); setErr(null); setMsg(null); }}
              >
                Esqueci minha senha
              </button>
              <div>
                Ainda não tem conta?{" "}
                <button type="button" className="font-semibold text-primary transition hover:text-primary-deep" onClick={() => setMode("signup")}>
                  Cadastre-se
                </button>
              </div>
            </>
          )}
          {mode === "signup" && (
            <div>
              Já tem conta?{" "}
              <button type="button" className="font-semibold text-primary transition hover:text-primary-deep" onClick={() => setMode("login")}>
                Entrar
              </button>
            </div>
          )}
          {mode === "forgot" && (
            <button
              type="button"
              className="font-semibold text-primary transition hover:text-primary-deep"
              onClick={() => { setMode("login"); setErr(null); setMsg(null); }}
            >
              ← Voltar para login
            </button>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70 transition hover:text-foreground">
            ← Início
          </Link>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border/70 bg-white/80 px-3.5 py-2.5 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/10";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}
