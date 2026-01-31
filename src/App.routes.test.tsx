import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import PortalAccessPage from "./pages/portal/PortalAccessPage";
import NotFound from "./pages/NotFound";
import { PortalProvider } from "./hooks/usePortalSession";
import { AuthProvider } from "./hooks/useAuth";
import { LarpProvider } from "./hooks/useLarpContext";
import { RunProvider } from "./hooks/useRunContext";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe("App – routování a přístup", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("na / zobrazí úvodní stránku (landing)", () => {
    render(
      <AuthProvider>
        <LarpProvider>
          <RunProvider>
            <MemoryRouter initialEntries={["/"]}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
              </Routes>
            </MemoryRouter>
          </RunProvider>
        </LarpProvider>
      </AuthProvider>
    );
    expect(screen.getAllByText(/LARP PORTÁL/i).length).toBeGreaterThan(0);
  });

  it("na /login zobrazí přihlašovací stránku", () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );
    expect(screen.getByText(/LARP PORTÁL/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Přihlásit/i })).toBeInTheDocument();
  });

  it("na /portal/:token zobrazí stránku ověření přístupu (heslo)", () => {
    render(
      <PortalProvider>
        <MemoryRouter initialEntries={["/portal/abc-123"]}>
          <Routes>
            <Route path="/portal/:token" element={<PortalAccessPage />} />
          </Routes>
        </MemoryRouter>
      </PortalProvider>
    );
    expect(screen.getByText("LARP PORTÁL")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/přístupové heslo/i)).toBeInTheDocument();
  });

  it("na neexistující cestu zobrazí 404", () => {
    render(
      <MemoryRouter initialEntries={["/neexistujici-cesta"]}>
        <Routes>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText(/Page not found/i)).toBeInTheDocument();
  });
});
