import { ReactNode, useState, useEffect } from "react";
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
  MessageSquare,
  Menu,
  PanelLeftClose
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useLarpContext } from "@/hooks/useLarpContext";
import { useRunContext } from "@/hooks/useRunContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminLayoutProps {
  children: ReactNode;
}

const dashboardItem = { name: "Přehled LARPů", href: "/admin", icon: LayoutDashboard };

const larpContentNavigation = [
  { name: "Dokumenty", href: "/admin/dokumenty", icon: FileText },
  { name: "Postavy", href: "/admin/osoby", icon: Users },
  { name: "Skupiny", href: "/admin/skupiny", icon: UsersRound },
  { name: "Cizí postavy", href: "/admin/cp", icon: UserCog },
  { name: "Harmonogram", href: "/admin/harmonogram", icon: Clock },
  { name: "Produkce", href: "/admin/produkce", icon: LinkIcon },
];

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
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse on mobile
  useEffect(() => {
    setCollapsed(isMobile);
  }, [isMobile]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="font-typewriter text-xl text-muted-foreground animate-pulse">Načítání...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (larpsLoading && !currentLarpId) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="font-typewriter text-xl text-muted-foreground animate-pulse">Načítání...</div>
      </div>
    );
  }

  if (!currentLarpId) return <Navigate to="/admin" replace />;

  const isOpen = !collapsed;

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "no-print flex-shrink-0 border-r border-sidebar-border bg-sidebar transition-all duration-200 flex flex-col",
          isMobile
            ? cn("fixed inset-y-0 left-0 z-50", isOpen ? "w-64" : "w-14")
            : cn(isOpen ? "w-64" : "w-14")
        )}
      >
        {/* Toggle + Logo */}
        <div className={cn("flex h-16 items-center border-b border-sidebar-border", isOpen ? "px-4 gap-3" : "justify-center px-1")}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {isOpen ? <PanelLeftClose className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          {isOpen && (
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
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {/* Dashboard */}
          <NavItem item={dashboardItem} isOpen={isOpen} location={location} />

          <Divider />

          {isOpen && <SectionLabel>Organizace běhů</SectionLabel>}

          {/* Runs collapsible */}
          <Collapsible open={runsExpanded}>
            <Link
              to="/admin/behy"
              className={cn(
                "flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors",
                runsExpanded
                  ? "bg-sidebar-accent/50 text-sidebar-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                !isOpen && "justify-center px-0"
              )}
              title="Běhy"
            >
              <Calendar className="h-4 w-4 flex-shrink-0" />
              {isOpen && (
                <>
                  <span className="font-mono">Běhy</span>
                  {runsExpanded ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
                </>
              )}
            </Link>
            {isOpen && (
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
            )}
          </Collapsible>

          <Divider />

          {isOpen && <SectionLabel>Obsah LARPu</SectionLabel>}
          {larpContentNavigation.map((item) => (
            <NavItem key={item.name} item={item} isOpen={isOpen} location={location} />
          ))}

          <Divider />

          {isOpen && <SectionLabel>Správa</SectionLabel>}
          {larpManagement.map((item) => {
            if ("superAdminOnly" in item && item.superAdminOnly && !isSuperAdmin) return null;
            return <NavItem key={item.name} item={item} isOpen={isOpen} location={location} />;
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-sidebar-border p-2">
          {isOpen ? (
            <>
              <div className="mb-2 flex items-center justify-between px-2">
                <span className="text-xs text-sidebar-foreground/60 truncate">{user.email}</span>
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
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="h-8 w-8 text-sidebar-foreground/80 hover:text-sidebar-foreground"
                title="Odhlásit se"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content - add left margin on mobile when collapsed */}
      <main className={cn("flex-1 overflow-auto", isMobile && "ml-14")}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

/* ---------- Small helper components ---------- */

function NavItem({ item, isOpen, location }: { item: { name: string; href: string; icon: any }; isOpen: boolean; location: { pathname: string } }) {
  const isActive = location.pathname === item.href;
  return (
    <Link
      to={item.href}
      title={item.name}
      className={cn(
        "flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        !isOpen && "justify-center px-0"
      )}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      {isOpen && (
        <>
          <span className="font-mono">{item.name}</span>
          {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
        </>
      )}
    </Link>
  );
}

function Divider() {
  return <div className="py-2"><div className="border-t border-sidebar-border" /></div>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest px-3 py-1">{children}</div>;
}
