import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const router = useRouter();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-gradient-to-r from-green-700 to-green-600 text-white shadow">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/dashboard" className="text-lg font-bold tracking-tight">
            Intrusão 2.0
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            <Link
              to="/dashboard"
              className="rounded px-3 py-1.5 hover:bg-white/10"
              activeProps={{ className: "rounded px-3 py-1.5 bg-white/20 font-semibold" }}
            >
              Pipeline
            </Link>
            <Link
              to="/orcamento"
              className="rounded px-3 py-1.5 hover:bg-white/10"
              activeProps={{ className: "rounded px-3 py-1.5 bg-white/20 font-semibold" }}
            >
              Novo Orçamento
            </Link>
            <Link
              to="/perfil"
              className="rounded px-3 py-1.5 hover:bg-white/10"
              activeProps={{ className: "rounded px-3 py-1.5 bg-white/20 font-semibold" }}
            >
              Perfil
            </Link>
            <button
              onClick={handleSignOut}
              className="ml-2 rounded border border-white/40 px-3 py-1.5 hover:bg-white/10"
            >
              Sair
            </button>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
