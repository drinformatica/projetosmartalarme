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
    fetchRoles()
      .then((rs) => setIsAdmin(rs.includes("super_admin") || rs.includes("admin")))
      .catch(() => {});
  }, [fetchRoles]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };
  const linkBase = "shrink-0 rounded px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm hover:bg-white/10";
  const linkActive = { className: `${linkBase} bg-white/20 font-semibold` };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 bg-gradient-to-r from-green-700 to-green-600 text-white shadow">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 sm:flex sm:flex-wrap sm:justify-between sm:px-6 sm:py-4">
          <Link to="/dashboard" className="min-w-0 truncate text-base font-bold tracking-tight sm:text-lg">
            Intrusão 2.0
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
              className="ml-auto shrink-0 rounded border border-white/40 px-2.5 py-1.5 text-xs hover:bg-white/10 sm:ml-1 sm:px-3 sm:text-sm"
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
