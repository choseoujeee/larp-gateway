import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LarpProvider } from "@/hooks/useLarpContext";
import { PortalProvider } from "@/hooks/usePortalSession";
import { RunProvider } from "@/hooks/useRunContext";

// Pages (V1 archiv)
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import RunsPage from "./pages/admin/RunsPage";
import PersonsPage from "./pages/admin/PersonsPage";
import CpPage from "./pages/admin/CpPage";
import CpDetailPage from "./pages/admin/CpDetailPage";
import GroupsPage from "./pages/admin/GroupsPage";
import DocumentsPage from "./pages/admin/DocumentsPage";
import SchedulePage from "./pages/admin/SchedulePage";
import LarpDesignPage from "./pages/admin/LarpDesignPage";
import ProductionPage from "./pages/admin/ProductionPage";

import PortalAccessPage from "./pages/portal/PortalAccessPage";
import PortalViewPage from "./pages/portal/PortalViewPage";
import CpPortalPage from "./pages/portal/CpPortalPage";
import ProductionPortalPage from "./pages/portal/ProductionPortalPage";
import SchedulePortalPage from "./pages/portal/SchedulePortalPage";
import PortalFeedbackPage from "./pages/admin/PortalFeedbackPage";
import OrganizersPage from "./pages/admin/OrganizersPage";
import NotFound from "./pages/NotFound";
import { FeedbackButton } from "./components/FeedbackButton";
import { ErrorBoundary } from "./components/ErrorBoundary";
import V2Routes, { V2RootRoutes } from "./v2/V2Routes";

const queryClient = new QueryClient();

/** Redirect /portal/:token → /hrac/:slug (zpětná kompatibilita) */
function RedirectPortalToHrac() {
  const { token } = useParams<{ token: string }>();
  return <Navigate to={token ? `/hrac/${token}` : "/"} replace />;
}
function RedirectCpPortal() {
  const { larpSlug } = useParams<{ larpSlug: string }>();
  return <Navigate to={larpSlug ? `/${larpSlug}/cp` : "/"} replace />;
}
function RedirectCpPortalDetail() {
  const { larpSlug, slug } = useParams<{ larpSlug: string; slug: string }>();
  return <Navigate to={larpSlug && slug ? `/${larpSlug}/cp/${slug}` : "/"} replace />;
}
function RedirectProductionPortal() {
  const { token } = useParams<{ token: string }>();
  return <Navigate to={token ? `/~/produkce/${token}` : "/"} replace />;
}
function RedirectSchedulePortal() {
  const { token } = useParams<{ token: string }>();
  return <Navigate to={token ? `/~/harmonogram/${token}` : "/"} replace />;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LarpProvider>
          <RunProvider>
            <PortalProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                <ErrorBoundary>
                <Routes>
                  {/* ========== NOVÁ APLIKACE (V2) ========== */}
                  <Route path="/" element={<V2RootRoutes />} />
                  <Route path="/larp/*" element={<V2Routes />} />

                  {/* ========== PORTÁLY (sdílené, root úroveň pro hráče/CP) ========== */}
                  <Route path="/:larpSlug/hrac/:slug" element={<PortalAccessPage />} />
                  <Route path="/:larpSlug/hrac/:slug/view" element={<PortalViewPage />} />
                  <Route path="/:larpSlug/cp" element={<CpPortalPage />} />
                  <Route path="/:larpSlug/cp/:slug" element={<PortalViewPage />} />
                  <Route path="/:larpSlug/produkce/:token" element={<ProductionPortalPage />} />
                  <Route path="/:larpSlug/harmonogram/:token" element={<SchedulePortalPage />} />
                  <Route path="/~/produkce/:token" element={<ProductionPortalPage />} />
                  <Route path="/~/harmonogram/:token" element={<SchedulePortalPage />} />

                  {/* Zpětná kompatibilita portálů */}
                  <Route path="/portal/:token" element={<RedirectPortalToHrac />} />
                  <Route path="/portal/:token/view" element={<RedirectPortalToHrac />} />
                  <Route path="/hrac/:slug" element={<PortalAccessPage />} />
                  <Route path="/hrac/:slug/view" element={<PortalViewPage />} />
                  <Route path="/cp/:larpSlug" element={<RedirectCpPortal />} />
                  <Route path="/cp/:larpSlug/:slug" element={<RedirectCpPortalDetail />} />
                  <Route path="/produkce-portal/:token" element={<RedirectProductionPortal />} />
                  <Route path="/harmonogram-portal/:token" element={<RedirectSchedulePortal />} />

                  {/* ========== ARCHIV (V1) — kompletní stará aplikace pod /_archiv ========== */}
                  <Route path="/_archiv" element={<LandingPage />} />
                  <Route path="/_archiv/login" element={<LoginPage />} />
                  <Route path="/_archiv/zapomenute-heslo" element={<ForgotPasswordPage />} />
                  <Route path="/_archiv/reset-heslo" element={<ResetPasswordPage />} />
                  <Route path="/_archiv/admin" element={<AdminDashboard />} />
                  <Route path="/_archiv/admin/larpy" element={<Navigate to="/_archiv/admin" replace />} />
                  <Route path="/_archiv/admin/behy" element={<RunsPage />} />
                  <Route path="/_archiv/admin/behy/:slug" element={<RunsPage />} />
                  <Route path="/_archiv/admin/osoby" element={<PersonsPage />} />
                  <Route path="/_archiv/admin/osoby/:slug" element={<PersonsPage />} />
                  <Route path="/_archiv/admin/cp/:slug" element={<ErrorBoundary><CpDetailPage /></ErrorBoundary>} />
                  <Route path="/_archiv/admin/cp" element={<CpPage />} />
                  <Route path="/_archiv/admin/skupiny" element={<GroupsPage />} />
                  <Route path="/_archiv/admin/skupiny/:groupSlug" element={<GroupsPage />} />
                  <Route path="/_archiv/admin/dokumenty" element={<DocumentsPage />} />
                  <Route path="/_archiv/admin/harmonogram" element={<SchedulePage />} />
                  <Route path="/_archiv/admin/produkce" element={<ProductionPage />} />
                  <Route path="/_archiv/admin/design" element={<LarpDesignPage />} />
                  <Route path="/_archiv/admin/tiskoviny" element={<Navigate to="/_archiv/admin/produkce" replace />} />
                  <Route path="/_archiv/admin/portal" element={<PortalFeedbackPage />} />
                  <Route path="/_archiv/admin/organizatori" element={<OrganizersPage />} />

                  {/* Přesměrování starých admin URL do archivu */}
                  <Route path="/login" element={<Navigate to="/_archiv/login" replace />} />
                  <Route path="/zapomenute-heslo" element={<Navigate to="/_archiv/zapomenute-heslo" replace />} />
                  <Route path="/reset-heslo" element={<Navigate to="/_archiv/reset-heslo" replace />} />
                  <Route path="/register" element={<Navigate to="/_archiv/login" replace />} />
                  <Route path="/admin/*" element={<RedirectAdminToArchiv />} />
                  <Route path="/orgove/skryta" element={<Navigate to="/_archiv/admin" replace />} />
                  <Route path="/v1-archiv" element={<Navigate to="/_archiv" replace />} />
                  <Route path="/v2" element={<Navigate to="/" replace />} />
                  <Route path="/v2/*" element={<RedirectV2ToRoot />} />

                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <FeedbackButton />
                </ErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </PortalProvider>
        </RunProvider>
      </LarpProvider>
    </AuthProvider>
  </QueryClientProvider>
</ThemeProvider>
);

function RedirectAdminToArchiv() {
  const path = window.location.pathname.replace(/^\/admin/, "/_archiv/admin");
  return <Navigate to={path + window.location.search} replace />;
}

function RedirectV2ToRoot() {
  const path = window.location.pathname.replace(/^\/v2/, "") || "/";
  return <Navigate to={path + window.location.search} replace />;
}

export default App;
