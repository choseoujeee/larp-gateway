import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import RunsPage from "./RunsPage";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUseLarpContext = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/hooks/useLarpContext", () => ({
  useLarpContext: () => mockUseLarpContext(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockFromRuns = vi.fn();
const mockFromPersons = vi.fn();
const mockFromAssignments = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "runs") {
        return {
          select: () => ({
            eq: () => ({
              order: () => mockFromRuns(),
            }),
          }),
          insert: (data: unknown) => mockInsert(data),
          update: (data: unknown) => ({
            eq: () => mockUpdate(data),
          }),
          delete: () => ({
            eq: () => mockDelete(),
          }),
        };
      }
      if (table === "persons") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => mockFromPersons(),
              }),
            }),
          }),
        };
      }
      if (table === "run_person_assignments") {
        return {
          select: () => ({
            eq: () => ({
              order: () => mockFromAssignments(),
            }),
          }),
          update: (data: unknown) => ({
            eq: () => mockUpdate(data),
          }),
          delete: () => ({
            eq: () => mockDelete(),
          }),
        };
      }
      return { select: () => ({ order: () => ({ data: [] }) }) };
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function renderRunsPage(initialPath = "/admin/behy") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <TooltipProvider>
        <Routes>
          <Route path="/admin/behy" element={<RunsPage />} />
          <Route path="/admin/behy/:slug" element={<RunsPage />} />
        </Routes>
      </TooltipProvider>
    </MemoryRouter>
  );
}

describe("RunsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "u1" }, loading: false });
    mockUseLarpContext.mockReturnValue({
      currentLarpId: "l1",
      currentLarp: { id: "l1", name: "Test LARP" },
      larps: [{ id: "l1", name: "Test LARP" }],
      loading: false,
    });
    mockFromRuns.mockResolvedValue({ data: [], error: null });
    mockFromPersons.mockResolvedValue({ data: [], error: null });
    mockFromAssignments.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockUpdate.mockResolvedValue({ error: null });
    mockDelete.mockResolvedValue({ error: null });
    mockRpc.mockResolvedValue({ error: null });
  });

  it("zobrazí nadpis Běhy", async () => {
    renderRunsPage();
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Běhy" })).toBeInTheDocument();
    });
  });

  it("zobrazí prázdný stav když nejsou žádné běhy", async () => {
    renderRunsPage();
    await waitFor(() => {
      expect(screen.getByText(/Tento LARP zatím nemá žádné běhy/i)).toBeInTheDocument();
    });
  });

  it("zobrazí tlačítko Nový běh", async () => {
    renderRunsPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Nový běh/i })).toBeInTheDocument();
    });
  });

  it("zobrazí existující běhy jako karty", async () => {
    mockFromRuns.mockResolvedValue({
      data: [
        {
          id: "r1",
          larp_id: "l1",
          name: "Běh Jaro 2024",
          slug: "beh-jaro-2024",
          date_from: "2024-04-01",
          date_to: "2024-04-03",
          location: "Hradec Králové",
          is_active: true,
          larps: { name: "Test LARP" },
        },
      ],
      error: null,
    });

    renderRunsPage();

    await waitFor(() => {
      expect(screen.getByText("Běh Jaro 2024")).toBeInTheDocument();
    });

    expect(screen.getByText("Hradec Králové")).toBeInTheDocument();
  });

  it("otevře dialog pro vytvoření nového běhu", async () => {
    renderRunsPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Nový běh/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Nový běh/i }));

    await waitFor(() => {
      // Dialog heading je h2 s role="heading"
      expect(screen.getByRole("heading", { level: 2, name: "Nový běh" })).toBeInTheDocument();
    });
  });

  it("zobrazí LarpPicker když není vybrán LARP", async () => {
    mockUseLarpContext.mockReturnValue({
      currentLarpId: null,
      currentLarp: null,
      larps: [],
      loading: false,
    });

    renderRunsPage();

    await waitFor(() => {
      // Když není vybrán LARP, zobrazí se LarpPickerPage s hlavičkou "Vaše LARPy"
      expect(screen.getByText(/Vaše LARPy/i)).toBeInTheDocument();
    });
  });

  it("kliknutí na běh naviguje na detail", async () => {
    mockFromRuns.mockResolvedValue({
      data: [
        {
          id: "r1",
          larp_id: "l1",
          name: "Běh Test",
          slug: "beh-test",
          date_from: null,
          date_to: null,
          location: null,
          is_active: false,
          larps: { name: "Test LARP" },
        },
      ],
      error: null,
    });

    renderRunsPage();

    await waitFor(() => {
      expect(screen.getByText("Běh Test")).toBeInTheDocument();
    });

    // Najdeme klikatelný element - hledáme nadpis uvnitř karty
    const runCard = screen.getByText("Běh Test").closest("[class*='paper-card']");
    expect(runCard).toBeInTheDocument();

    if (runCard) {
      fireEvent.click(runCard);
    }

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/admin/behy/beh-test");
    });
  });

  it("zobrazí detail běhu na URL s parametrem slug", async () => {
    mockFromRuns.mockResolvedValue({
      data: [
        {
          id: "r1",
          larp_id: "l1",
          name: "Běh Detail",
          slug: "beh-detail",
          date_from: "2024-05-01",
          date_to: "2024-05-03",
          location: "Praha",
          is_active: true,
          contact: "info@test.cz",
          larps: { name: "Test LARP" },
        },
      ],
      error: null,
    });
    mockFromAssignments.mockResolvedValue({ data: [], error: null });

    renderRunsPage("/admin/behy/beh-detail");

    await waitFor(() => {
      // Detail běhu by měl zobrazit název běhu a záložky
      expect(screen.getByRole("heading", { name: "Běh Detail" })).toBeInTheDocument();
    });

    // Detail běhu by měl zobrazit záložky
    expect(screen.getByRole("tab", { name: /Přiřazení/i })).toBeInTheDocument();
  });

  it("zobrazí tabulku přiřazení hráčů v detailu běhu", async () => {
    mockFromRuns.mockResolvedValue({
      data: [
        {
          id: "r1",
          larp_id: "l1",
          name: "Běh S Hráči",
          slug: "beh-s-hraci",
          date_from: null,
          date_to: null,
          location: null,
          is_active: true,
          larps: { name: "Test LARP" },
        },
      ],
      error: null,
    });
    mockFromAssignments.mockResolvedValue({
      data: [
        {
          id: "a1",
          run_id: "r1",
          person_id: "p1",
          player_name: "Jan Novák",
          player_email: "jan@test.cz",
          paid_at: null,
          access_token: "token123",
          persons: { name: "Postava 1", type: "postava", group_name: null, slug: "postava-1" },
        },
      ],
      error: null,
    });

    renderRunsPage("/admin/behy/beh-s-hraci");

    await waitFor(() => {
      expect(screen.getByText("Postava 1")).toBeInTheDocument();
    });

    expect(screen.getByText("Jan Novák")).toBeInTheDocument();
  });
});
