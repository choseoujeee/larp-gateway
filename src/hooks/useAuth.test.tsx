import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./useAuth";

const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      getSession: () => mockGetSession(),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: () => mockSignOut(),
    },
  },
}));

function TestConsumer() {
  const { user, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? "loading" : "loaded"}</span>
      <span data-testid="user">{user?.email || "no-user"}</span>
    </div>
  );
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("vyhodí chybu při použití mimo AuthProvider", () => {
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");

    console.error = originalError;
  });

  it("výchozí stav: loading je true, user je null", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("no-user");
    });
  });

  it("nastaví user po načtení session", async () => {
    const mockUser = { id: "user-1", email: "test@example.com" };
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    });

    let authStateCallback: (event: string, session: unknown) => void = () => {};
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Simulovat onAuthStateChange
    act(() => {
      authStateCallback("SIGNED_IN", { user: mockUser });
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
    });
  });

  it("signIn volá supabase.auth.signInWithPassword", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signIn("test@example.com", "password123");
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
  });

  it("signUp volá supabase.auth.signUp", async () => {
    mockSignUp.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password123",
      options: expect.objectContaining({ emailRedirectTo: expect.any(String) }),
    });
  });

  it("signOut volá supabase.auth.signOut a vynuluje user", async () => {
    mockSignOut.mockResolvedValue({ error: null });
    const mockUser = { id: "user-1", email: "test@example.com" };

    let authStateCallback: (event: string, session: unknown) => void = () => {};
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Simulovat přihlášení
    act(() => {
      authStateCallback("SIGNED_IN", { user: mockUser });
    });

    await waitFor(() => expect(result.current.user?.email).toBe("test@example.com"));

    // Odhlásit
    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });
});
