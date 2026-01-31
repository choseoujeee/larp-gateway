import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import DocumentsPage from "./pages/admin/DocumentsPage";
import SchedulePage from "./pages/admin/SchedulePage";
import ProductionPage from "./pages/admin/ProductionPage";
import PrintablesPage from "./pages/admin/PrintablesPage";
import RunAssignmentsPage from "./pages/admin/RunAssignmentsPage";
import PortalAccessPage from "./pages/portal/PortalAccessPage";
import PortalViewPage from "./pages/portal/PortalViewPage";
import PortalFeedbackPage from "./pages/admin/PortalFeedbackPage";
import NotFound from "./pages/NotFound";
import { FeedbackButton } from "./components/FeedbackButton";

const queryClient = new QueryClient();

/** Redirect /hrac/:token → /portal/:token (zpětná kompatibilita s původním portálem) */
function RedirectHracToPortal() {
  const { token } = useParams<{ token: string }>();
  return <Navigate to={token ? `/portal/${token}` : "/"} replace />;
}

const App = () => (
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

              {/* Alias: původní URL → nové (zpětná kompatibilita) */}
              <Route path="/orgove/skryta" element={<Navigate to="/admin" replace />} />
              <Route path="/hrac/:token" element={<RedirectHracToPortal />} />

              {/* Admin */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/larpy" element={<LarpsPage />} />
              <Route path="/admin/behy" element={<RunsPage />} />
              <Route path="/admin/osoby" element={<PersonsPage />} />
              <Route path="/admin/osoby/:slug" element={<PersonsPage />} />
              <Route path="/admin/cp" element={<CpPage />} />
              <Route path="/admin/cp/:slug" element={<CpPage />} />
              <Route path="/admin/dokumenty" element={<DocumentsPage />} />
              <Route path="/admin/harmonogram" element={<SchedulePage />} />
              <Route path="/admin/produkce" element={<ProductionPage />} />
              <Route path="/admin/tiskoviny" element={<PrintablesPage />} />
              <Route path="/admin/prirazeni" element={<RunAssignmentsPage />} />
              <Route path="/admin/portal" element={<PortalFeedbackPage />} />

              {/* Portal */}
              <Route path="/portal/:token" element={<PortalAccessPage />} />
              <Route path="/portal/:token/view" element={<PortalViewPage />} />

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
);

export default App;
