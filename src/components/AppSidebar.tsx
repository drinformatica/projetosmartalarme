import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  KanbanSquare,
  PlusCircle,
  LogOut,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles } from "@/lib/admin.functions";

type NavItem = {
  title: string;
  url: "/dashboard" | "/orcamentos" | "/pipeline" | "/orcamento" | "/admin" | "/perfil";
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
};

const primaryItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, description: "Visão geral" },
  { title: "Orçamentos", url: "/orcamentos", icon: FileText, description: "Lista completa" },
  { title: "Pipeline", url: "/pipeline", icon: KanbanSquare, description: "Kanban de vendas" },
  { title: "Novo Orçamento", url: "/orcamento", icon: PlusCircle, description: "Criar proposta" },
];

// Emerald dark theme aligned with the platform identity
const sidebarThemeStyle = {
  "--sidebar": "oklch(0.36 0.09 165)",
  "--sidebar-foreground": "oklch(0.99 0.003 250)",
  "--sidebar-primary": "oklch(1 0 0 / 0.16)",
  "--sidebar-primary-foreground": "oklch(0.99 0.003 250)",
  "--sidebar-accent": "oklch(1 0 0 / 0.10)",
  "--sidebar-accent-foreground": "oklch(0.99 0.003 250)",
  "--sidebar-border": "oklch(1 0 0 / 0.14)",
  "--sidebar-ring": "oklch(0.99 0.003 250)",
} as React.CSSProperties;

export function AppSidebar() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const fetchRoles = useServerFn(getMyRoles);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchRoles()
        .then((rs) => {
          if (!cancelled) setIsAdmin(rs.includes("super_admin") || rs.includes("admin"));
        })
        .catch(() => {});
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

  const isActive = (url: string) => {
    if (url === "/orcamento") return pathname === "/orcamento" || pathname.startsWith("/orcamento/");
    return pathname === url;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <Sidebar
      collapsible="icon"
      style={sidebarThemeStyle}
      className="border-r-0 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_240px_at_0%_0%,rgba(255,255,255,0.10),transparent_60%)]" />
      <SidebarHeader className="relative border-b border-sidebar-border/60 pb-3">
        <Link to="/dashboard" className="flex items-center gap-2 px-1 py-1">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <span className="font-display text-sm font-black text-white">I</span>
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-bold text-white">Intrusão 2.0</div>
              <div className="truncate text-[10px] uppercase tracking-widest text-white/60">Smart Alarme</div>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="relative">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-white/60">Navegação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={`h-11 rounded-xl text-white/80 transition-all hover:bg-white/10 hover:text-white data-[active=true]:bg-white/15 data-[active=true]:text-white data-[active=true]:shadow-inner data-[active=true]:ring-1 data-[active=true]:ring-white/20 ${
                        active ? "font-semibold" : "font-medium"
                      }`}
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        {!collapsed && (
                          <div className="flex flex-1 flex-col leading-tight">
                            <span className="text-sm">{item.title}</span>
                            {item.description && (
                              <span className="text-[10px] font-normal text-white/50">{item.description}</span>
                            )}
                          </div>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isAdmin || true) && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-white/60">Conta</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/perfil")}
                    tooltip="Perfil"
                    className="h-11 rounded-xl text-white/80 hover:bg-white/10 hover:text-white data-[active=true]:bg-white/15 data-[active=true]:text-white data-[active=true]:ring-1 data-[active=true]:ring-white/20"
                  >
                    <Link to="/perfil" className="flex items-center gap-3">
                      <UserCircle className="h-[18px] w-[18px]" />
                      {!collapsed && <span className="text-sm">Perfil</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith("/admin")}
                      tooltip="Admin"
                      className="h-11 rounded-xl text-white/80 hover:bg-white/10 hover:text-white data-[active=true]:bg-white/15 data-[active=true]:text-white data-[active=true]:ring-1 data-[active=true]:ring-white/20"
                    >
                      <Link to="/admin" className="flex items-center gap-3">
                        <ShieldCheck className="h-[18px] w-[18px]" />
                        {!collapsed && <span className="text-sm">Admin</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="relative border-t border-sidebar-border/60">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Sair"
              className="h-11 rounded-xl text-white/85 hover:bg-red-500/20 hover:text-white"
            >
              <LogOut className="h-[18px] w-[18px]" />
              {!collapsed && <span className="text-sm font-medium">Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
