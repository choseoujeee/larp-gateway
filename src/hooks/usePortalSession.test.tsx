import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { PortalProvider, usePortalSession } from "./usePortalSession";

const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PortalProvider>{children}</PortalProvider>
);

describe("usePortalSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("vyhodí chybu mimo PortalProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      renderHook(() => usePortalSession(), {
        wrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      });
    } catch (e) {
      expect((e as Error).message).toBe("usePortalSession must be used within a PortalProvider");
    }
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("na začátku má session null a loading false po hydrataci", async () => {
    const { result } = renderHook(() => usePortalSession(), { wrapper });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("verifyAccess vrací false při prázdné odpovědi RPC", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => usePortalSession(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean = false;
    await act(async () => {
      ok = await result.current.verifyAccess("bublik", "heslo");
    });

    expect(ok).toBe(false);
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBe("Neplatné heslo nebo přístupový odkaz");
  });

  it("verifyAccess vrací false při chybě RPC", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("DB error") });
    const { result } = renderHook(() => usePortalSession(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean = false;
    await act(async () => {
      ok = await result.current.verifyAccess("bublik", "heslo");
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe("Chyba při ověřování přístupu");
  });

  it("verifyAccess při úspěchu nastaví session a vrací true", async () => {
    const row = {
      person_id: "person-1",
      person_name: "Jan Novák",
      person_type: "postava",
      larp_id: "larp-1",
      larp_name: "Krypta",
      larp_theme: "wwii",
      group_name: "Skupina A",
      performer: null,
      performance_times: null,
    };
    mockRpc.mockResolvedValue({ data: [row], error: null });
    const { result } = renderHook(() => usePortalSession(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean = false;
    await act(async () => {
      ok = await result.current.verifyAccess("bublik", "heslo");
    });

    expect(ok).toBe(true);
    expect(result.current.session).not.toBeNull();
    expect(result.current.session?.personId).toBe("person-1");
    expect(result.current.session?.personName).toBe("Jan Novák");
    expect(result.current.session?.personType).toBe("postava");
    expect(result.current.session?.larpName).toBe("Krypta");
    expect(result.current.session?.larpTheme).toBe("wwii");
    expect(result.current.session?.personSlug).toBe("bublik");
    expect(localStorage.getItem("larp_portal_session")).toBeTruthy();
  });

  it("clearSession smaže session a localStorage", async () => {
    const row = {
      person_id: "p1",
      person_name: "X",
      person_type: "postava",
      larp_id: "l1",
      larp_name: "L",
      larp_theme: null,
      group_name: null,
      performer: null,
      performance_times: null,
    };
    mockRpc.mockResolvedValue({ data: [row], error: null });
    const { result } = renderHook(() => usePortalSession(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.verifyAccess("slug", "h");
    });
    expect(result.current.session).not.toBeNull();

    act(() => {
      result.current.clearSession();
    });
    expect(result.current.session).toBeNull();
    expect(localStorage.getItem("larp_portal_session")).toBeNull();
  });
});
