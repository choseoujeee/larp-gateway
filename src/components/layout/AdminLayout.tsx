import { ReactNode } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Gamepad2, 
  Calendar, 
  Users, 
  UsersRound,
  UserCog,
  FileText, 
  Clock, 
  Link as LinkIcon,
  LogOut,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useLarpContext } from "@/hooks/useLarpContext";
import { useRunContext } from "@/hooks/useRunContext";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AdminLayoutProps {
  children: ReactNode;
}

// Úvodní stránka adminu – výběr / přepnutí LARPu
const dashboardItem = { name: "Přehled LARPů", href: "/admin", icon: LayoutDashboard };

// Sekce 1: Organizace běhů – Běhy jako rozbalovací seznam (dynamicky z RunContext)
// Harmonogram je v Obsah LARPu za Cizí postavy

// Sekce 2: Obsah LARPu (Harmonogram přesunut za Cizí postavy)
const larpContentNavigation = [
  { name: "Dokumenty", href: "/admin/dokumenty", icon: FileText },
  { name: "Postavy", href: "/admin/osoby", icon: Users },
  { name: "Skupiny", href: "/admin/skupiny", icon: UsersRound },
  { name: "Cizí postavy", href: "/admin/cp", icon: UserCog },
  { name: "Harmonogram", href: "/admin/harmonogram", icon: Clock },
  { name: "Produkce", href: "/admin/produkce", icon: LinkIcon },
];

// Sekce 3: Správa (globální) – Organizátoři jen pro super admina
const larpManagement = [
  { name: "LARPy", href: "/admin/larpy", icon: Gamepad2 },
  { name: "Organizátoři", href: "/admin/organizatori", icon: Users, superAdminOnly: true },
  { name: "Portál", href: "/admin/portal", icon: MessageSquare },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading, signOut } = useAuth();
  const { isSuperAdmin } = useAdminRole();
  const { currentLarpId, currentLarp, loading: larpsLoading } = useLarpContext();
  const { runs } = useRunContext();
  const location = useLocation();
  const runsExpanded = location.pathname.startsWith("/admin/behy");

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="font-typewriter text-xl text-muted-foreground animate-pulse">
            Načítání...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Plný loading jen při prvním načtení (nemáme výběr). Při refetchi (token refresh) layout neskrývat.
  if (larpsLoading && !currentLarpId) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="font-typewriter text-xl text-muted-foreground animate-pulse">
            Načítání...
          </div>
        </div>
      </div>
    );
  }

  // Bez vybraného LARPu: přesměrovat na Přehled LARPů (/admin)
  if (!currentLarpId) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="no-print w-64 flex-shrink-0 border-r border-sidebar-border bg-sidebar">
        <div className="flex h-full flex-col">
          {/* Logo + aktuální LARP (přepnutí jen přes Přehled LARPů) */}
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-sidebar-primary">
              <FileText className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-typewriter text-sm tracking-wider text-sidebar-foreground truncate">
                {currentLarp?.name ?? "LARP"}
              </h1>
              <Link
                to="/admin"
                className="text-[10px] text-sidebar-foreground/60 tracking-widest uppercase hover:text-sidebar-foreground flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Přehled LARPů
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {/* Přehled - samostatně */}
            <Link
              to={dashboardItem.href}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors",
                location.pathname === dashboardItem.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <dashboardItem.icon className="h-4 w-4" />
              <span className="font-mono">{dashboardItem.name}</span>
              {location.pathname === dashboardItem.href && <ChevronRight className="ml-auto h-4 w-4" />}
            </Link>

            {/* Divider */}
            <div className="py-2">
              <div className="border-t border-sidebar-border" />
            </div>

            {/* Organizace běhů – Běhy jako rozbalovací seznam */}
            <div className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest px-3 py-1">
              Organizace běhů
            </div>
            <Collapsible open={runsExpanded}>
              <Link
                to="/admin/behy"
                className={cn(
                  "flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors",
                  runsExpanded
                    ? "bg-sidebar-accent/50 text-sidebar-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Calendar className="h-4 w-4" />
                <span className="font-mono">Běhy</span>
                {runsExpanded ? (
                  <ChevronDown className="ml-auto h-4 w-4" />
                ) : (
                  <ChevronRight className="ml-auto h-4 w-4" />
                )}
              </Link>
              <CollapsibleContent>
                <div className="pl-7 pr-3 py-1 space-y-0.5">
                  {runs.map((run) => {
                    const runHref = `/admin/behy/${run.slug}`;
                    const isActive = location.pathname === runHref;
                    return (
                      <Link
                        key={run.id}
                        to={runHref}
                        className={cn(
                          "flex items-center rounded-sm px-2 py-1.5 text-sm transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                      >
                        <span className="font-mono truncate">{run.name}</span>
                        {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 flex-shrink-0" />}
                      </Link>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Divider */}
            <div className="py-2">
              <div className="border-t border-sidebar-border" />
            </div>

            {/* Obsah LARPu */}
            <div className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest px-3 py-1">
              Obsah LARPu
            </div>
            {larpContentNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="font-mono">{item.name}</span>
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}

            {/* Divider */}
            <div className="py-2">
              <div className="border-t border-sidebar-border" />
            </div>

            {/* Správa */}
            <div className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest px-3 py-1">
              Správa
            </div>
            {larpManagement.map((item) => {
              if ("superAdminOnly" in item && item.superAdminOnly && !isSuperAdmin) return null;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="font-mono">{item.name}</span>
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="border-t border-sidebar-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-sidebar-foreground/60 truncate">
                {user.email}
              </span>
              <ThemeToggle />
            </div>
            <Button
              variant="ghost" 
              size="sm" 
              onClick={signOut}
              className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Odhlásit se
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
