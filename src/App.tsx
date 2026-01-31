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
import RegisterPage from "./pages/auth/RegisterPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import LarpsPage from "./pages/admin/LarpsPage";
import RunsPage from "./pages/admin/RunsPage";
import PersonsPage from "./pages/admin/PersonsPage";
import CpPage from "./pages/admin/CpPage";
import CpDetailPage from "./pages/admin/CpDetailPage";
import DocumentsPage from "./pages/admin/DocumentsPage";
import SchedulePage from "./pages/admin/SchedulePage";
import ProductionPage from "./pages/admin/ProductionPage";
import PrintablesPage from "./pages/admin/PrintablesPage";

import PortalAccessPage from "./pages/portal/PortalAccessPage";
import PortalViewPage from "./pages/portal/PortalViewPage";
import PortalFeedbackPage from "./pages/admin/PortalFeedbackPage";
import NotFound from "./pages/NotFound";
import { FeedbackButton } from "./components/FeedbackButton";

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
                <Routes>
                  {/* Public */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />

                  {/* Alias: staré URL → nové (zpětná kompatibilita) */}
                  <Route path="/orgove/skryta" element={<Navigate to="/admin" replace />} />
                  <Route path="/portal/:token" element={<RedirectPortalToHrac />} />
                  <Route path="/portal/:token/view" element={<RedirectPortalToHrac />} />

                  {/* Admin */}
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/larpy" element={<LarpsPage />} />
                  <Route path="/admin/behy" element={<RunsPage />} />
                  <Route path="/admin/behy/:slug" element={<RunsPage />} />
                  <Route path="/admin/osoby" element={<PersonsPage />} />
                  <Route path="/admin/osoby/:slug" element={<PersonsPage />} />
                  <Route path="/admin/cp" element={<CpPage />} />
                  <Route path="/admin/cp/:slug" element={<CpDetailPage />} />
                  <Route path="/admin/dokumenty" element={<DocumentsPage />} />
                  <Route path="/admin/harmonogram" element={<SchedulePage />} />
                  <Route path="/admin/produkce" element={<ProductionPage />} />
                  <Route path="/admin/tiskoviny" element={<PrintablesPage />} />
                  <Route path="/admin/portal" element={<PortalFeedbackPage />} />

                  {/* Portal - hráčský portál */}
                  <Route path="/hrac/:slug" element={<PortalAccessPage />} />
                  <Route path="/hrac/:slug/view" element={<PortalViewPage />} />

                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <FeedbackButton />
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
