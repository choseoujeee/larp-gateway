import { ReactNode } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Gamepad2, 
  Calendar, 
  Users, 
  UserCog,
  FileText, 
  Clock, 
  Link as LinkIcon, 
  Printer,
  LogOut,
  ChevronRight,
  ArrowLeft,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLarpContext } from "@/hooks/useLarpContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import LarpPickerPage from "@/pages/admin/LarpPickerPage";

interface AdminLayoutProps {
  children: ReactNode;
}

// Dashboard - samostatně nahoře
const dashboardItem = { name: "Přehled", href: "/admin", icon: LayoutDashboard };

// Sekce 1: Organizace běhů (dynamická data per běh)
const runOrganizationNavigation = [
  { name: "Běhy", href: "/admin/behy", icon: Calendar },
  { name: "Harmonogram", href: "/admin/harmonogram", icon: Clock },
];

// Sekce 2: Obsah LARPu (statická data)
const larpContentNavigation = [
  { name: "Dokumenty", href: "/admin/dokumenty", icon: FileText },
  { name: "Postavy", href: "/admin/osoby", icon: Users },
  { name: "Cizí postavy", href: "/admin/cp", icon: UserCog },
  { name: "Produkce", href: "/admin/produkce", icon: LinkIcon },
  { name: "Tiskoviny", href: "/admin/tiskoviny", icon: Printer },
];

// Sekce 3: Správa (globální)
const larpManagement = [
  { name: "LARPy", href: "/admin/larpy", icon: Gamepad2 },
  { name: "Portál", href: "/admin/portal", icon: MessageSquare },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading, signOut } = useAuth();
  const { currentLarpId, currentLarp, setCurrentLarpId, loading: larpsLoading } = useLarpContext();
  const location = useLocation();

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

  // Po přihlášení nejdřív výběr LARPu (pokud není vybraný)
  if (!larpsLoading && !currentLarpId) {
    return <LarpPickerPage />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="no-print w-64 flex-shrink-0 border-r border-sidebar-border bg-sidebar">
        <div className="flex h-full flex-col">
          {/* Logo + aktuální LARP */}
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-sidebar-primary">
              <FileText className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-typewriter text-sm tracking-wider text-sidebar-foreground truncate">
                {currentLarp?.name ?? "LARP"}
              </h1>
              <button
                type="button"
                onClick={() => setCurrentLarpId(null)}
                className="text-[10px] text-sidebar-foreground/60 tracking-widest uppercase hover:text-sidebar-foreground flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Změnit LARP
              </button>
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

            {/* Organizace běhů */}
            <div className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest px-3 py-1">
              Organizace běhů
            </div>
            {runOrganizationNavigation.map((item) => {
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
