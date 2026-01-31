import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PortalProvider } from "@/hooks/usePortalSession";

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
import PortalAccessPage from "./pages/portal/PortalAccessPage";
import PortalViewPage from "./pages/portal/PortalViewPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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

              {/* Admin */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/larpy" element={<LarpsPage />} />
              <Route path="/admin/behy" element={<RunsPage />} />
              <Route path="/admin/osoby" element={<PersonsPage />} />
              <Route path="/admin/cp" element={<CpPage />} />
              <Route path="/admin/dokumenty" element={<DocumentsPage />} />
              <Route path="/admin/harmonogram" element={<SchedulePage />} />
              <Route path="/admin/produkce" element={<ProductionPage />} />
              <Route path="/admin/tiskoviny" element={<PrintablesPage />} />

              {/* Portal */}
              <Route path="/portal/:token" element={<PortalAccessPage />} />
              <Route path="/portal/:token/view" element={<PortalViewPage />} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </PortalProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
