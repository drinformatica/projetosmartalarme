import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/confirmar-email")({
  ssr: false,
  component: ConfirmPage,
  head: () => ({
    meta: [
      { title: "Confirmação de e-mail — Intrusão 2.0" },
      { name: "description", content: "Confirmação de cadastro da sua conta na plataforma." },
      { property: "og:title", content: "Confirmação de e-mail — Intrusão 2.0" },
      { property: "og:description", content: "Confirmação de cadastro da sua conta na plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Status = "loading" | "success" | "error";

function ConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [hasSession, setHasSession] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  useEffect(() => {
    let done = false;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const get = (k: string) => hash.get(k) ?? query.get(k);

    const fail = (m: string) => { if (!done) { done = true; setErrMsg(m); setStatus("error"); } };
    const ok = (session: boolean) => { if (!done) { done = true; setHasSession(session); setStatus("success"); } };

    const errorCode = get("error_code") || get("error");
    if (errorCode) {
      const desc = get("error_description") ?? "";
      fail(/expired/i.test(errorCode + desc)
        ? "Este link de confirmação expirou."
        : "Este link de confirmação é inválido ou já foi utilizado.");
      return;
    }

    const type = get("type");
    const tokenHash = query.get("token_hash");
    const code = query.get("code");
    const accessToken = hash.get("access_token");
    const legit = !!tokenHash || !!code || (!!accessToken && (type === "signup" || type === "email"));
    if (!legit) {
      fail("Não encontramos uma confirmação válida neste link.");
      return;
    }

    const checkConfirmed = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email_confirmed_at) { ok(true); return true; }
      return false;
    };

    (async () => {
      try {
        if (tokenHash) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: (type === "email" ? "email" : "signup"),
          });
          if (error) throw error;
          if (data.user?.email_confirmed_at) return ok(!!data.session);
          return fail("Não foi possível confirmar seu e-mail.");
        }
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error && !(await checkConfirmed())) throw error;
        }
        // implicit flow: client detects the session from URL hash automatically
        for (let i = 0; i < 10 && !done; i++) {
          if (await checkConfirmed()) break;
          await new Promise((r) => setTimeout(r, 400));
        }
        fail("Não foi possível validar a confirmação. O link pode ter expirado.");
      } catch (e) {
        const m = e instanceof Error ? e.message : "";
        fail(/expired/i.test(m) ? "Este link de confirmação expirou." : "Este link de confirmação é inválido ou já foi utilizado.");
      } finally {
        // limpa tokens da barra de endereço
        window.history.replaceState(null, "", window.location.pathname);
      }
    })();
  }, []);

  const resend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResendMsg(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/confirmar-email` },
    });
    setSending(false);
    setResendMsg(error
      ? "Não foi possível reenviar agora. Tente novamente em alguns minutos."
      : "Se o e-mail estiver cadastrado e pendente, um novo link foi enviado. Verifique também o spam.");
  };

  return (
    <div className="relative flex min-h-[calc(100svh-64px)] items-center justify-center overflow-hidden bg-hero px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-70" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary-glow/25 blur-3xl" />
      <div className="animate-rise relative w-full max-w-md rounded-3xl border border-border/70 bg-white/75 p-8 text-center shadow-elevate backdrop-blur-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-deep">Intrusão 2.0</p>

        {status === "loading" && (
          <div className="py-10">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Validando sua confirmação...</p>
          </div>
        )}

        {status === "success" && (
          <>
            <div className="relative mx-auto mt-6 grid h-20 w-20 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 [animation-iteration-count:2]" />
              <div className="relative grid h-20 w-20 place-items-center rounded-full bg-emerald-gradient shadow-emerald">
                <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
            <h1 className="mt-6 font-display text-3xl font-black tracking-tight">E-mail confirmado com sucesso!</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Sua conta SmartAlarmes foi ativada. Agora você já pode acessar a plataforma.
            </p>
            <button
              onClick={() => router.navigate({ to: hasSession ? "/dashboard" : "/auth", replace: true })}
              className="group mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-gradient py-3 text-sm font-semibold text-primary-foreground shadow-emerald transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevate"
            >
              Acessar minha conta <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mt-6 grid h-16 w-16 place-items-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-black tracking-tight">Link inválido ou expirado</h1>
            <p className="mt-2 text-sm text-muted-foreground">{errMsg} Solicite um novo e-mail de confirmação abaixo.</p>
            <form onSubmit={resend} className="mt-6 space-y-3 text-left">
              <input
                required type="email" placeholder="seu@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-white/80 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              />
              <button disabled={sending} className="w-full rounded-full bg-emerald-gradient py-3 text-sm font-semibold text-primary-foreground shadow-emerald disabled:opacity-50">
                {sending ? "Enviando..." : "Reenviar e-mail de confirmação"}
              </button>
            </form>
            {resendMsg && <div className="mt-4 rounded-xl border border-primary/20 bg-accent/60 px-3 py-2 text-sm text-primary-deep">{resendMsg}</div>}
            <Link to="/auth" className="mt-6 inline-block text-sm font-semibold text-primary hover:text-primary-deep">Ir para o login</Link>
          </>
        )}
      </div>
    </div>
  );
}
