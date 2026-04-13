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

// Pages
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

const queryClient = new QueryClient();

/** Redirect /portal/:token → /hrac/:slug (zpětná kompatibilita se starým portálem) */
function RedirectPortalToHrac() {
  const { token } = useParams<{ token: string }>();
  return <Navigate to={token ? `/hrac/${token}` : "/"} replace />;
}

/** Redirect old /cp/:larpSlug → /:larpSlug/cp */
function RedirectCpPortal() {
  const { larpSlug } = useParams<{ larpSlug: string }>();
  return <Navigate to={larpSlug ? `/${larpSlug}/cp` : "/"} replace />;
}

/** Redirect old /cp/:larpSlug/:slug → /:larpSlug/cp/:slug */
function RedirectCpPortalDetail() {
  const { larpSlug, slug } = useParams<{ larpSlug: string; slug: string }>();
  return <Navigate to={larpSlug && slug ? `/${larpSlug}/cp/${slug}` : "/"} replace />;
}

/** Redirect old /produkce-portal/:token → need larpSlug; can't easily determine, redirect to NotFound or keep as-is */
function RedirectProductionPortal() {
  const { token } = useParams<{ token: string }>();
  // We can't determine larpSlug from just the token on the client side,
  // so we keep a catch-all route for old production portal URLs
  return <Navigate to={token ? `/~/produkce/${token}` : "/"} replace />;
}

/** Redirect old /harmonogram-portal/:token */
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
                  {/* Public */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/zapomenute-heslo" element={<ForgotPasswordPage />} />
                  <Route path="/reset-heslo" element={<ResetPasswordPage />} />
                  <Route path="/register" element={<Navigate to="/login" replace />} />

                  {/* Backward compatibility redirects */}
                  <Route path="/orgove/skryta" element={<Navigate to="/admin" replace />} />
                  <Route path="/portal/:token" element={<RedirectPortalToHrac />} />
                  <Route path="/portal/:token/view" element={<RedirectPortalToHrac />} />
                  {/* Old /hrac/:slug → we can't determine larpSlug, keep as fallback route */}
                  <Route path="/hrac/:slug" element={<PortalAccessPage />} />
                  <Route path="/hrac/:slug/view" element={<PortalViewPage />} />
                  {/* Old /cp/:larpSlug → redirect to new /:larpSlug/cp */}
                  <Route path="/cp/:larpSlug" element={<RedirectCpPortal />} />
                  <Route path="/cp/:larpSlug/:slug" element={<RedirectCpPortalDetail />} />
                  {/* Old production/schedule portal URLs */}
                  <Route path="/produkce-portal/:token" element={<RedirectProductionPortal />} />
                  <Route path="/harmonogram-portal/:token" element={<RedirectSchedulePortal />} />

                  {/* Admin */}
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/larpy" element={<Navigate to="/admin" replace />} />
                  <Route path="/admin/behy" element={<RunsPage />} />
                  <Route path="/admin/behy/:slug" element={<RunsPage />} />
                  <Route path="/admin/osoby" element={<PersonsPage />} />
                  <Route path="/admin/osoby/:slug" element={<PersonsPage />} />
                  <Route
                    path="/admin/cp/:slug"
                    element={
                      <ErrorBoundary>
                        <CpDetailPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route path="/admin/cp" element={<CpPage />} />
                  <Route path="/admin/skupiny" element={<GroupsPage />} />
                  <Route path="/admin/skupiny/:groupSlug" element={<GroupsPage />} />
                  <Route path="/admin/dokumenty" element={<DocumentsPage />} />
                  <Route path="/admin/harmonogram" element={<SchedulePage />} />
                  <Route path="/admin/produkce" element={<ProductionPage />} />
                  <Route path="/admin/tiskoviny" element={<Navigate to="/admin/produkce" replace />} />
                  <Route path="/admin/portal" element={<PortalFeedbackPage />} />
                  <Route path="/admin/organizatori" element={<OrganizersPage />} />

                  {/* New portal routes: /:larpSlug/... */}
                  <Route path="/:larpSlug/hrac/:slug" element={<PortalAccessPage />} />
                  <Route path="/:larpSlug/hrac/:slug/view" element={<PortalViewPage />} />
                  <Route path="/:larpSlug/cp" element={<CpPortalPage />} />
                  <Route path="/:larpSlug/cp/:slug" element={<PortalViewPage />} />
                  <Route path="/:larpSlug/produkce/:token" element={<ProductionPortalPage />} />
                  <Route path="/:larpSlug/harmonogram/:token" element={<SchedulePortalPage />} />
                  {/* Fallback for production/schedule portals without known larpSlug */}
                  <Route path="/~/produkce/:token" element={<ProductionPortalPage />} />
                  <Route path="/~/harmonogram/:token" element={<SchedulePortalPage />} />

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

export default App;
