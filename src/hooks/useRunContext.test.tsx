import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { ReactNode } from "react";
import { RunProvider, useRunContext } from "./useRunContext";
import { LarpProvider } from "./useLarpContext";
import { AuthProvider } from "./useAuth";

const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn();

const mockFromRuns = vi.fn();
const mockFromLarps = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      getSession: () => mockGetSession(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: (table: string) => {
      if (table === "runs") {
        return {
          select: () => ({
            eq: () => ({
              order: () => mockFromRuns(),
            }),
          }),
        };
      }
      if (table === "larps") {
        return {
          select: () => ({
            order: () => mockFromLarps(),
          }),
        };
      }
      return {
        select: () => ({ order: () => ({ data: [] }) }),
      };
    },
  },
}));

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LarpProvider>
        <RunProvider>{children}</RunProvider>
      </LarpProvider>
    </AuthProvider>
  );
}

describe("useRunContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockFromLarps.mockResolvedValue({ data: [] });
    mockFromRuns.mockResolvedValue({ data: [] });
  });

  it("vyhodí chybu při použití mimo RunProvider", () => {
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      renderHook(() => useRunContext());
    }).toThrow("useRunContext must be used within a RunProvider");

    console.error = originalError;
  });

  it("výchozí stav: runs prázdné, selectedRunId prázdný", async () => {
    const { result } = renderHook(() => useRunContext(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.runs).toEqual([]);
    expect(result.current.selectedRunId).toBe("");
  });

  it("načte běhy po vybrání LARPu", async () => {
    const mockLarps = [{ id: "l1", name: "LARP 1", slug: "l1", theme: "wwii" }];
    const mockRuns = [
      { id: "r1", name: "Běh 1", larp_id: "l1", larps: { name: "LARP 1", theme: "wwii" } },
      { id: "r2", name: "Běh 2", larp_id: "l1", larps: { name: "LARP 1", theme: "wwii" } },
    ];
    mockFromLarps.mockResolvedValue({ data: mockLarps });
    mockFromRuns.mockResolvedValue({ data: mockRuns });

    let authStateCallback: (event: string, session: unknown) => void = () => {};
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useRunContext(), { wrapper: Wrapper });

    act(() => {
      authStateCallback("SIGNED_IN", { user: { id: "u1" } });
    });

    await waitFor(() => {
      expect(result.current.runs.length).toBe(2);
    });

    expect(result.current.runs[0].name).toBe("Běh 1");
  });

  it("automaticky vybere první běh", async () => {
    const mockLarps = [{ id: "l1", name: "LARP 1", slug: "l1", theme: null }];
    const mockRuns = [
      { id: "r1", name: "Běh 1", larp_id: "l1", larps: { name: "LARP 1", theme: null } },
    ];
    mockFromLarps.mockResolvedValue({ data: mockLarps });
    mockFromRuns.mockResolvedValue({ data: mockRuns });

    let authStateCallback: (event: string, session: unknown) => void = () => {};
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useRunContext(), { wrapper: Wrapper });

    act(() => {
      authStateCallback("SIGNED_IN", { user: { id: "u1" } });
    });

    await waitFor(() => {
      expect(result.current.selectedRunId).toBe("r1");
    });
  });

  it("setSelectedRunId mění vybraný běh a ukládá do localStorage", async () => {
    const mockLarps = [{ id: "l1", name: "LARP 1", slug: "l1", theme: null }];
    const mockRuns = [
      { id: "r1", name: "Běh 1", larp_id: "l1", larps: { name: "LARP 1", theme: null } },
      { id: "r2", name: "Běh 2", larp_id: "l1", larps: { name: "LARP 1", theme: null } },
    ];
    mockFromLarps.mockResolvedValue({ data: mockLarps });
    mockFromRuns.mockResolvedValue({ data: mockRuns });

    let authStateCallback: (event: string, session: unknown) => void = () => {};
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useRunContext(), { wrapper: Wrapper });

    act(() => {
      authStateCallback("SIGNED_IN", { user: { id: "u1" } });
    });

    await waitFor(() => {
      expect(result.current.runs.length).toBe(2);
    });

    act(() => {
      result.current.setSelectedRunId("r2");
    });

    expect(result.current.selectedRunId).toBe("r2");
    expect(localStorage.getItem("larp_admin_selected_run_id")).toBe("r2");
  });

  it("aplikuje téma LARPu na document", async () => {
    const mockLarps = [{ id: "l1", name: "LARP 1", slug: "l1", theme: "fantasy" }];
    const mockRuns = [
      { id: "r1", name: "Běh 1", larp_id: "l1", larps: { name: "LARP 1", theme: "fantasy" } },
    ];
    mockFromLarps.mockResolvedValue({ data: mockLarps });
    mockFromRuns.mockResolvedValue({ data: mockRuns });

    let authStateCallback: (event: string, session: unknown) => void = () => {};
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useRunContext(), { wrapper: Wrapper });

    act(() => {
      authStateCallback("SIGNED_IN", { user: { id: "u1" } });
    });

    await waitFor(() => {
      expect(result.current.selectedRunId).toBe("r1");
    });

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("fantasy");
    });
  });
});
