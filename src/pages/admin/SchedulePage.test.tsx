import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import SchedulePage from "./SchedulePage";

// Mock hooks
const mockUseRunContext = vi.fn();
const mockUseLarpContext = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/hooks/useRunContext", () => ({
  useRunContext: () => mockUseRunContext(),
}));

vi.mock("@/hooks/useLarpContext", () => ({
  useLarpContext: () => mockUseLarpContext(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "schedule_events") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => mockSelect(),
              }),
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
              eq: () => ({
                order: () => Promise.resolve({ data: [] }),
              }),
            }),
          }),
        };
      }
      return { select: () => ({ order: () => ({ data: [] }) }) };
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function renderSchedulePage() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <SchedulePage />
      </TooltipProvider>
    </MemoryRouter>
  );
}

describe("SchedulePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "u1" }, loading: false });
    mockUseLarpContext.mockReturnValue({
      currentLarpId: "l1",
      currentLarp: { id: "l1", name: "Test LARP" },
      larps: [{ id: "l1", name: "Test LARP" }],
      loading: false,
    });
    mockUseRunContext.mockReturnValue({
      runs: [{ id: "r1", name: "Běh 1" }],
      selectedRunId: "r1",
      loading: false,
    });
    mockSelect.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockUpdate.mockResolvedValue({ error: null });
    mockDelete.mockResolvedValue({ error: null });
  });

  it("zobrazí nadpis Harmonogram", async () => {
    renderSchedulePage();
    await waitFor(() => {
      // Najdeme h1 element s nadpisem
      expect(screen.getByRole("heading", { level: 1, name: "Harmonogram" })).toBeInTheDocument();
    });
  });

  it("zobrazí prázdný stav když nejsou žádné události", async () => {
    renderSchedulePage();
    await waitFor(() => {
      expect(screen.getByText(/Tento běh zatím nemá žádné události/i)).toBeInTheDocument();
    });
  });

  it("zobrazí tlačítko Přidat událost", async () => {
    renderSchedulePage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Přidat událost/i })).toBeInTheDocument();
    });
  });

  it("zobrazí existující události seskupené podle dne", async () => {
    mockSelect.mockResolvedValue({
      data: [
        {
          id: "e1",
          day_number: 1,
          start_time: "09:00",
          duration_minutes: 60,
          event_type: "programovy_blok",
          title: "Úvodní briefing",
          description: null,
          location: "Hlavní sál",
          cp_id: null,
          persons: null,
        },
        {
          id: "e2",
          day_number: 1,
          start_time: "12:00",
          duration_minutes: 60,
          event_type: "jidlo",
          title: "Oběd",
          description: null,
          location: null,
          cp_id: null,
          persons: null,
        },
      ],
      error: null,
    });

    renderSchedulePage();

    await waitFor(() => {
      expect(screen.getByText("Den 1")).toBeInTheDocument();
    });

    expect(screen.getByText("Úvodní briefing")).toBeInTheDocument();
    expect(screen.getByText("Oběd")).toBeInTheDocument();
    expect(screen.getByText("Hlavní sál")).toBeInTheDocument();
  });

  it("zobrazí typ události jako badge", async () => {
    mockSelect.mockResolvedValue({
      data: [
        {
          id: "e1",
          day_number: 1,
          start_time: "09:00",
          duration_minutes: 60,
          event_type: "programovy_blok",
          title: "Test",
          description: null,
          location: null,
          cp_id: null,
          persons: null,
        },
      ],
      error: null,
    });

    renderSchedulePage();

    await waitFor(() => {
      expect(screen.getByText("Programový blok")).toBeInTheDocument();
    });
  });

  it("otevře dialog pro vytvoření nové události", async () => {
    renderSchedulePage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Přidat událost/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Přidat událost/i }));

    await waitFor(() => {
      expect(screen.getByText("Nová událost")).toBeInTheDocument();
    });
  });

  it("zobrazí zprávu když nejsou žádné běhy", async () => {
    mockUseRunContext.mockReturnValue({
      runs: [],
      selectedRunId: "",
      loading: false,
    });

    renderSchedulePage();

    await waitFor(() => {
      expect(screen.getByText(/Nejprve vytvořte LARP a běh/i)).toBeInTheDocument();
    });
  });

  it("zobrazí vyhledávací pole", async () => {
    renderSchedulePage();
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Hledat v harmonogramu/i)).toBeInTheDocument();
    });
  });

  it("filtruje události podle vyhledávání", async () => {
    mockSelect.mockResolvedValue({
      data: [
        {
          id: "e1",
          day_number: 1,
          start_time: "09:00",
          duration_minutes: 60,
          event_type: "programovy_blok",
          title: "Briefing",
          description: null,
          location: null,
          cp_id: null,
          persons: null,
        },
        {
          id: "e2",
          day_number: 1,
          start_time: "12:00",
          duration_minutes: 60,
          event_type: "jidlo",
          title: "Oběd",
          description: null,
          location: null,
          cp_id: null,
          persons: null,
        },
      ],
      error: null,
    });

    renderSchedulePage();

    await waitFor(() => {
      expect(screen.getByText("Briefing")).toBeInTheDocument();
      expect(screen.getByText("Oběd")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Hledat v harmonogramu/i), {
      target: { value: "Briefing" },
    });

    await waitFor(() => {
      expect(screen.getByText("Briefing")).toBeInTheDocument();
      expect(screen.queryByText("Oběd")).not.toBeInTheDocument();
    });
  });

  it("zobrazí tlačítko Spustit běh", async () => {
    renderSchedulePage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Spustit běh/i })).toBeInTheDocument();
    });
  });
});
