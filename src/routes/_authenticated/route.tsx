import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Footer } from "@/routes/__root";
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
  return (
    <SidebarProvider className="flex flex-1 min-h-0">
      <div className="flex w-full flex-1 bg-background text-foreground">
        <AppSidebar />
        <SidebarInset className="min-w-0 flex-1 bg-background">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200/70 bg-white/80 px-3 backdrop-blur-xl sm:px-5">
            <SidebarTrigger className="h-9 w-9 rounded-lg text-slate-600 hover:bg-slate-100" />
            <div className="flex-1" />
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
