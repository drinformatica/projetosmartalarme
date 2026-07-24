import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles } from "@/lib/admin.functions";

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
  const fetchRoles = useServerFn(getMyRoles);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchRoles()
        .then((rs) => {
          if (!cancelled) setIsAdmin(rs.includes("super_admin") || rs.includes("admin"));
        })
        .catch((e) => {
          console.error("[nav] getMyRoles falhou:", e);
        });
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") load();
      if (event === "SIGNED_OUT") setIsAdmin(false);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [fetchRoles]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };
  const linkBase =
    "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-white/85 transition hover:bg-white/10 hover:text-white sm:text-sm";
  const linkActive = { className: `${linkBase} bg-white/15 text-white font-semibold ring-1 ring-white/25` };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-primary-deep/95 text-white shadow-soft backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-emerald-gradient opacity-90" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_200px_at_10%_0%,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 sm:flex sm:flex-wrap sm:justify-between sm:px-6">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <span className="font-display text-sm font-black">I</span>
            </span>
            <span className="min-w-0 truncate font-display text-base font-bold tracking-tight sm:text-lg">
              Intrusão 2.0
            </span>
          </Link>
          <nav className="col-span-2 flex flex-wrap items-center gap-1 text-xs sm:col-span-1 sm:flex-nowrap sm:text-sm">
            <Link to="/dashboard" className={linkBase} activeProps={linkActive}>
              Pipeline
            </Link>
            <Link to="/orcamento" className={linkBase} activeProps={linkActive}>
              <span className="sm:hidden">+ Novo</span>
              <span className="hidden sm:inline">Novo Orçamento</span>
            </Link>
            {isAdmin && (
              <Link to="/admin" className={linkBase} activeProps={linkActive}>
                Admin
              </Link>
            )}
            <Link to="/perfil" className={linkBase} activeProps={linkActive}>
              Perfil
            </Link>
            <button
              onClick={handleSignOut}
              className="ml-auto shrink-0 rounded-full border border-white/30 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/10 hover:text-white sm:ml-1 sm:text-sm"
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
