import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { ReactNode } from "react";
import { LarpProvider, useLarpContext } from "./useLarpContext";
import { AuthProvider } from "./useAuth";

const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn();
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
    from: () => ({
      select: () => ({
        order: () => mockFromLarps(),
      }),
    }),
  },
}));

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LarpProvider>{children}</LarpProvider>
    </AuthProvider>
  );
}

describe("useLarpContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockFromLarps.mockResolvedValue({ data: [] });
  });

  it("vyhodí chybu při použití mimo LarpProvider", () => {
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      renderHook(() => useLarpContext());
    }).toThrow("useLarpContext must be used within a LarpProvider");

    console.error = originalError;
  });

  it("výchozí stav: larps prázdné, currentLarpId null", async () => {
    const { result } = renderHook(() => useLarpContext(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.larps).toEqual([]);
    expect(result.current.currentLarpId).toBeNull();
  });

  it("načte larpy po přihlášení uživatele", async () => {
    const mockLarps = [
      { id: "l1", name: "LARP 1", slug: "larp-1", theme: "wwii" },
      { id: "l2", name: "LARP 2", slug: "larp-2", theme: "fantasy" },
    ];
    mockFromLarps.mockResolvedValue({ data: mockLarps });
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });

    let authStateCallback: (event: string, session: unknown) => void = () => {};
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      // Okamžitě zavolat callback s přihlášeným uživatelem
      setTimeout(() => callback("SIGNED_IN", { user: { id: "u1" } }), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useLarpContext(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.larps.length).toBe(2);
    }, { timeout: 3000 });

    expect(result.current.larps[0].name).toBe("LARP 1");
  });

  it("automaticky vybere jediný LARP", async () => {
    const mockLarps = [{ id: "single", name: "Jediný LARP", slug: "jediny", theme: null }];
    mockFromLarps.mockResolvedValue({ data: mockLarps });
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });

    mockOnAuthStateChange.mockImplementation((callback) => {
      setTimeout(() => callback("SIGNED_IN", { user: { id: "u1" } }), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useLarpContext(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.currentLarpId).toBe("single");
    }, { timeout: 3000 });
  });

  it("setCurrentLarpId mění aktuální LARP a ukládá do localStorage", async () => {
    const mockLarps = [
      { id: "l1", name: "LARP 1", slug: "l1", theme: null },
      { id: "l2", name: "LARP 2", slug: "l2", theme: null },
    ];
    mockFromLarps.mockResolvedValue({ data: mockLarps });
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });

    mockOnAuthStateChange.mockImplementation((callback) => {
      setTimeout(() => callback("SIGNED_IN", { user: { id: "u1" } }), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useLarpContext(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.larps.length).toBe(2);
    }, { timeout: 3000 });

    act(() => {
      result.current.setCurrentLarpId("l2");
    });

    expect(result.current.currentLarpId).toBe("l2");
    expect(localStorage.getItem("larp_admin_selected_larp_id")).toBe("l2");
  });

  it("currentLarp vrací objekt vybraného LARPu", async () => {
    const mockLarps = [
      { id: "l1", name: "LARP 1", slug: "l1", theme: "wwii" },
      { id: "l2", name: "LARP 2", slug: "l2", theme: "fantasy" },
    ];
    mockFromLarps.mockResolvedValue({ data: mockLarps });
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });

    mockOnAuthStateChange.mockImplementation((callback) => {
      setTimeout(() => callback("SIGNED_IN", { user: { id: "u1" } }), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useLarpContext(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.larps.length).toBe(2);
    }, { timeout: 3000 });

    act(() => {
      result.current.setCurrentLarpId("l2");
    });

    expect(result.current.currentLarp?.name).toBe("LARP 2");
    expect(result.current.currentLarp?.theme).toBe("fantasy");
  });
});
