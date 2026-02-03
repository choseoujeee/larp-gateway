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
  // Token je nyní slug, přesměrujeme na novou URL
  return <Navigate to={token ? `/hrac/${token}` : "/"} replace />;
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

                  {/* Alias: staré URL → nové (zpětná kompatibilita) */}
                  <Route path="/orgove/skryta" element={<Navigate to="/admin" replace />} />
                  <Route path="/portal/:token" element={<RedirectPortalToHrac />} />
                  <Route path="/portal/:token/view" element={<RedirectPortalToHrac />} />

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

                  {/* Portal - hráčský portál */}
                  <Route path="/hrac/:slug" element={<PortalAccessPage />} />
                  <Route path="/hrac/:slug/view" element={<PortalViewPage />} />
                  
                  {/* CP Portal - rozcestník pro všechny CP */}
                  <Route path="/cp/:larpSlug" element={<CpPortalPage />} />
                  {/* CP Portal - konkrétní CP (stejný obsah jako /hrac/:slug/view) */}
                  <Route path="/cp/:larpSlug/:slug" element={<PortalViewPage />} />

                  {/* Produkční portál – tým produkce (token + heslo) */}
                  <Route path="/produkce-portal/:token" element={<ProductionPortalPage />} />

                  {/* Portál harmonogramu – read-only harmonogram běhu (token + heslo) */}
                  <Route path="/harmonogram-portal/:token" element={<SchedulePortalPage />} />

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
