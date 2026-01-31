import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "./LoginPage";

const mockNavigate = vi.fn();
const mockSignIn = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    user: null,
    loading: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({ error: null });
  });

  it("zobrazí nadpis Přihlášení", async () => {
    renderLoginPage();
    await waitFor(() => {
      expect(screen.getByText("Přihlášení")).toBeInTheDocument();
    });
  });

  it("zobrazí formulář s emailem a heslem", async () => {
    renderLoginPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Heslo/i)).toBeInTheDocument();
    });
  });

  it("zobrazí tlačítko Přihlásit se", async () => {
    renderLoginPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Přihlásit se/i })).toBeInTheDocument();
    });
  });

  it("zobrazí odkaz na registraci", async () => {
    renderLoginPage();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Zaregistrujte se/i })).toBeInTheDocument();
    });
  });

  it("odešle formulář s emailem a heslem", async () => {
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Heslo/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Přihlásit se/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
    });
  });

  it("naviguje na /admin po úspěšném přihlášení", async () => {
    mockSignIn.mockResolvedValue({ error: null });

    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Heslo/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Přihlásit se/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/admin");
    });
  });

  it("zobrazí chybu při neplatném přihlášení", async () => {
    const { toast } = await import("sonner");
    mockSignIn.mockResolvedValue({ error: new Error("Invalid credentials") });

    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: "wrong@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Heslo/i), {
      target: { value: "wrongpassword" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Přihlásit se/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("má odkaz zpět na úvodní stránku", async () => {
    renderLoginPage();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Zpět na úvodní stránku/i })).toHaveAttribute(
        "href",
        "/"
      );
    });
  });
});
