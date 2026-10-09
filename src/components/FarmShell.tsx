import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BarChart3, LayoutDashboard, ListTree, LogOut, Users } from "lucide-react";
import type { ReactNode } from "react";

export function FarmShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = [
    { to: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { to: "/flock" as const, label: "Flock", icon: ListTree },
    { to: "/herds" as const, label: "Herds", icon: Users },

    { to: "/reports" as const, label: "Reports", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
          <Link to="/dashboard" className="font-display text-base font-semibold">
            Flockbook
          </Link>
          <nav className="order-3 flex w-full items-center justify-between gap-1 sm:order-none sm:w-auto sm:flex-1 sm:justify-start">
            {nav.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-3 sm:gap-2 sm:px-3 text-sm transition-colors ${
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Button className="ml-auto" variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="size-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">Sign out</span>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
