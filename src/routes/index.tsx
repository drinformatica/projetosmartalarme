import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  return (
    <div className="min-h-[calc(100svh-64px)] bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 text-white">
      <div className="mx-auto flex min-h-[calc(100svh-64px)] max-w-4xl flex-col items-center justify-center px-6 py-10 text-center">
        <div className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest">
          Intrusão 2.0
        </div>
        <h1 className="mb-4 text-4xl font-bold sm:text-6xl">
          Orçamentos & Pipeline de Vendas
        </h1>
        <p className="mb-8 max-w-2xl text-lg text-slate-200">
          Simulador de venda AMT 1000 Smart & AMT 2018 E Smart. Gere propostas
          formais em PDF, calcule ROI do monitoramento e acompanhe seu funil de
          vendas.
        </p>
        <div className="flex gap-3">
          {signedIn ? (
            <Link
              to="/dashboard"
              className="rounded-lg bg-green-500 px-6 py-3 font-semibold text-white hover:bg-green-600"
            >
              Ir para o Dashboard →
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                className="rounded-lg bg-green-500 px-6 py-3 font-semibold text-white hover:bg-green-600"
              >
                Entrar / Cadastrar
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
