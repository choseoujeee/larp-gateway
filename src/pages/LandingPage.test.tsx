import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "./LandingPage";

const mockUseAuth = vi.fn();
const mockUseRunContext = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/useRunContext", () => ({
  useRunContext: () => mockUseRunContext(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
    },
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [] }),
      }),
    }),
  },
}));

function renderLandingPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );
}

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseRunContext.mockReturnValue({ runs: [], selectedRunId: "" });
  });

  it("zobrazí nadpis LARP PORTÁL", async () => {
    renderLandingPage();
    await waitFor(() => {
      const headings = screen.getAllByText(/LARP PORTÁL/i);
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  it("zobrazí odkaz na přihlášení", async () => {
    renderLandingPage();
    await waitFor(() => {
      // Hledáme tlačítko Přihlášení uvnitř odkazu na /login
      const loginLink = screen.getByRole("link", { name: /Přihlášení/i });
      expect(loginLink).toHaveAttribute("href", "/login");
    });
  });

  it("zobrazí odkaz na admin pokud je uživatel přihlášen", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "test@test.cz" },
      loading: false,
    });

    renderLandingPage();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Administrace/i })).toBeInTheDocument();
    });
  });

  it("má odkaz na přihlášení směřující na /login", async () => {
    renderLandingPage();
    await waitFor(() => {
      const loginLink = screen.getByRole("link", { name: /Přihlášení/i });
      expect(loginLink).toHaveAttribute("href", "/login");
    });
  });

  it("má odkaz na admin směřující na /admin", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "test@test.cz" },
      loading: false,
    });

    renderLandingPage();

    await waitFor(() => {
      const adminLink = screen.getByRole("link", { name: /Administrace/i });
      expect(adminLink).toHaveAttribute("href", "/admin");
    });
  });

  it("zobrazí informační text o portálu", async () => {
    renderLandingPage();
    await waitFor(() => {
      expect(screen.getByText(/Komplexní systém pro organizátory/i)).toBeInTheDocument();
    });
  });
});
