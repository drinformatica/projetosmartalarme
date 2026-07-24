import { createFileRoute, Outlet, redirect, useRouterState, Link } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Footer } from "@/routes/__root";
import { supabase } from "@/integrations/supabase/client";
import { PlusCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/orcamentos": "Orçamentos",
  "/pipeline": "Pipeline",
  "/orcamento": "Novo orçamento",
  "/perfil": "Perfil",
  "/admin": "Admin",
  "/admin/produtos": "Produtos",
  "/admin/anuncios": "Anúncios",
  "/admin/usuarios": "Usuários",
};

function AuthedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title =
    PAGE_TITLES[pathname] ||
    (pathname.startsWith("/orcamento/") ? "Editar orçamento" : pathname.startsWith("/admin") ? "Admin" : "Intrusão 2.0");
  const showNewCta = pathname !== "/orcamento" && !pathname.startsWith("/orcamento/");

  return (
    <SidebarProvider className="flex flex-1 min-h-0">
      <div className="flex w-full flex-1 bg-background text-foreground">
        <AppSidebar />
        <SidebarInset className="min-w-0 flex-1 bg-background">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200/70 bg-white/85 px-2 backdrop-blur-xl sm:px-5">
            <SidebarTrigger className="h-9 w-9 shrink-0 rounded-lg text-slate-600 hover:bg-slate-100" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-sm font-bold text-slate-800 sm:text-base">{title}</div>
            </div>
            {showNewCta && (
              <Link
                to="/orcamento"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-deep px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 sm:px-4 sm:text-sm"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline">Novo</span>
              </Link>
            )}
          </header>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1">
              <Outlet />
            </div>
            <Footer />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
