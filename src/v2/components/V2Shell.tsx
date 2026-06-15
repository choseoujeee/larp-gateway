import { ReactNode, useEffect, useState } from "react";
import { Link, NavLink, useParams, useLocation } from "react-router-dom";
import { Menu, X, LayoutDashboard, FileText, Users, Theater, Palette, Calendar, ClipboardCheck, Mail, ChevronRight, ChevronDown, LogOut, CalendarDays, UserCog, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";

interface V2ShellProps {
  children: ReactNode;
  larpName?: string;
  runName?: string;
}

interface NavItem {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
}

export function V2Shell({ children, larpName, runName }: V2ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { larpSlug, runSlug } = useParams<{ larpSlug: string; runSlug: string }>();
  const { signOut, user } = useAuth();
  const { isSuperAdmin } = useAdminRole();
  const [runs, setRuns] = useState<Array<{ id: string; name: string; slug: string; is_active: boolean | null; date_from: string | null }>>([]);

  useEffect(() => {
    if (!larpSlug) { setRuns([]); return; }
    (async () => {
      const { data: l } = await supabase.from("larps").select("id").eq("slug", larpSlug).maybeSingle();
      if (!l) return;
      const { data } = await supabase.from("runs")
        .select("id, name, slug, is_active, date_from")
        .eq("larp_id", l.id)
        .order("date_from", { ascending: false });
      setRuns(data ?? []);
    })();
  }, [larpSlug]);

  const larpNav: NavItem[] = larpSlug
    ? [
        { to: `/larp/${larpSlug}`, icon: LayoutDashboard, label: "Přehled" },
        { to: `/larp/${larpSlug}/dokumenty`, icon: FileText, label: "Dokumenty" },
        { to: `/larp/${larpSlug}/postavy`, icon: Users, label: "Postavy" },
        { to: `/larp/${larpSlug}/cp`, icon: Theater, label: "CP" },
        { to: `/larp/${larpSlug}/design`, icon: Palette, label: "Design" },
        ...(isSuperAdmin ? [{ to: `/larp/${larpSlug}/organizatori`, icon: UserCog, label: "Organizátoři" }] : []),
      ]
    : [];

  const runNav: NavItem[] = larpSlug && runSlug
    ? [
        { to: `/larp/${larpSlug}/beh/${runSlug}`, icon: LayoutDashboard, label: "Cockpit" },
        { to: `/larp/${larpSlug}/beh/${runSlug}/hraci`, icon: Users, label: "Hráči" },
        { to: `/larp/${larpSlug}/beh/${runSlug}/cp`, icon: Theater, label: "CP performeři" },
        { to: `/larp/${larpSlug}/beh/${runSlug}/harmonogram`, icon: Calendar, label: "Harmonogram" },
        { to: `/larp/${larpSlug}/beh/${runSlug}/produkce`, icon: ClipboardCheck, label: "Produkce" },
        { to: `/larp/${larpSlug}/beh/${runSlug}/komunikace`, icon: Mail, label: "Komunikace" },
      ]
    : [];

  const Sidebar = (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Link to="/" className="font-typewriter text-lg tracking-wider text-foreground">
          LARP <span className="text-primary">v2</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <V2NavGroup label="Přehled">
          <V2NavLink to="/" icon={LayoutDashboard} label="Moje LARPy" onClick={() => setMobileOpen(false)} />
        </V2NavGroup>

        {larpSlug && (
          <V2NavGroup label={larpName || larpSlug}>
            {larpNav.map((item) => (
              <V2NavLink key={item.to} {...item} onClick={() => setMobileOpen(false)} />
            ))}
          </V2NavGroup>
        )}

        {larpSlug && (
          <V2RunsNavSection
            larpSlug={larpSlug}
            runs={runs}
            currentRunSlug={runSlug}
            onNavigate={() => setMobileOpen(false)}
          />
        )}
      </nav>
      {user && (
        <div className="border-t border-border p-3">
          <div className="mb-2 truncate text-xs text-muted-foreground">{user.email}</div>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start">
            <LogOut className="mr-2 h-4 w-4" />
            Odhlásit
          </Button>
        </div>
      )}
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">{Sidebar}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">{Sidebar}</div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <V2Breadcrumb larpName={larpName} runName={runName} />
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}

function V2NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function V2NavLink({ to, icon: Icon, label, onClick }: NavItem & { onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded px-2 py-2 text-sm transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-muted"
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

function V2Breadcrumb({ larpName, runName }: { larpName?: string; runName?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link to="/" className="hover:text-foreground">LARP Portál</Link>
      {larpName && (
        <>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{larpName}</span>
        </>
      )}
      {runName && (
        <>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{runName}</span>
        </>
      )}
    </nav>
  );
}
