import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PortalAccessPage from "./PortalAccessPage";
import { PortalProvider } from "@/hooks/usePortalSession";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockRpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

function renderWithRouter(token: string) {
  return render(
    <PortalProvider>
      <MemoryRouter initialEntries={[`/portal/${token}`]}>
        <Routes>
          <Route path="/portal/:token" element={<PortalAccessPage />} />
        </Routes>
      </MemoryRouter>
    </PortalProvider>
  );
}

describe("PortalAccessPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("zobrazí nadpis LARP PORTÁL a formulář hesla", async () => {
    renderWithRouter("abc-123");
    await waitFor(() => {
      expect(screen.getByText("LARP PORTÁL")).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Zadejte heslo/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/přístupové heslo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vstoupit/i })).toBeInTheDocument();
  });

  it("zobrazí odkaz Zpět na úvodní stránku", () => {
    renderWithRouter("t");
    expect(screen.getByRole("link", { name: /Zpět na úvodní stránku/i })).toHaveAttribute("href", "/");
  });

  it("po úspěšném ověření přesměruje na /portal/:token/view", async () => {
    mockRpc.mockResolvedValue({
      data: [{
        person_id: "p1",
        person_name: "X",
        person_type: "postava",
        run_id: "r1",
        larp_name: "L",
        run_name: "R",
        mission_briefing: null,
        group_name: null,
        performer: null,
        performance_times: null,
        run_contact: null,
        run_footer_text: null,
        larp_theme: null,
      }],
      error: null,
    });
    renderWithRouter("my-token");
    await waitFor(() => expect(screen.getByRole("button", { name: /Vstoupit/i })).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/přístupové heslo/i), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /Vstoupit/i }));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("verify_person_access", {
        p_access_token: "my-token",
        p_password: "secret",
      });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/portal/my-token/view");
    });
  });

  it("zobrazí chybovou hlášku při neplatném hesle", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    renderWithRouter("t");
    fireEvent.change(screen.getByPlaceholderText(/přístupové heslo/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /Vstoupit/i }));

    await waitFor(() => {
      expect(screen.getByText(/Neplatné heslo nebo přístupový odkaz/i)).toBeInTheDocument();
    });
  });
});
