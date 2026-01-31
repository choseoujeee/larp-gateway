import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PortalSession {
  personId: string;
  personName: string;
  personType: "postava" | "cp";
  runId: string;
  larpName: string;
  runName: string;
  missionBriefing: string | null;
  /** Skupina (postava) nebo performer (CP) */
  groupName: string | null;
  /** Pro CP: performer / interpret */
  performer: string | null;
  /** Pro CP: časy vystoupení */
  performanceTimes: string | null;
  /** Kontakt (zápatí portálu) */
  runContact: string | null;
  /** Text zápatí (poznámka) */
  runFooterText: string | null;
  /** Téma LARPu (pro data-theme na portálu) */
  larpTheme: string | null;
  /** Platba: transparentní účet, cena, splatnost, zda hráč zaplatil */
  runPaymentAccount: string | null;
  runPaymentAmount: string | null;
  runPaymentDueDate: string | null;
  personPaidAt: string | null;
}

/** Řádek vrácený RPC verify_person_access (snake_case z DB) */
interface VerifyPersonAccessRow {
  person_id: string;
  person_name: string;
  person_type: "postava" | "cp";
  run_id: string;
  larp_name: string;
  run_name: string;
  mission_briefing: string | null;
  group_name: string | null;
  performer: string | null;
  performance_times: string | null;
  run_contact: string | null;
  run_footer_text: string | null;
  larp_theme: string | null;
  run_payment_account: string | null;
  run_payment_amount: string | null;
  run_payment_due_date: string | null;
  person_paid_at: string | null;
}

interface PortalContextType {
  session: PortalSession | null;
  loading: boolean;
  error: string | null;
  verifyAccess: (accessToken: string, password: string) => Promise<boolean>;
  clearSession: () => void;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

const STORAGE_KEY = "larp_portal_session";

export function PortalProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSession(parsed);
        const theme = parsed.larpTheme?.trim() || "wwii";
        document.documentElement.dataset.theme = theme;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const verifyAccess = async (accessToken: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("verify_person_access", {
        p_access_token: accessToken,
        p_password: password,
      });

      if (rpcError) {
        setError("Chyba při ověřování přístupu");
        setLoading(false);
        return false;
      }

      if (!data || data.length === 0) {
        setError("Neplatné heslo nebo přístupový odkaz");
        setLoading(false);
        return false;
      }

      const row = data[0] as VerifyPersonAccessRow;
      const newSession: PortalSession = {
        personId: row.person_id,
        personName: row.person_name,
        personType: row.person_type,
        runId: row.run_id,
        larpName: row.larp_name,
        runName: row.run_name,
        missionBriefing: row.mission_briefing,
        groupName: row.group_name ?? null,
        performer: row.performer ?? null,
        performanceTimes: row.performance_times ?? null,
        runContact: row.run_contact ?? null,
        runFooterText: row.run_footer_text ?? null,
        larpTheme: row.larp_theme ?? null,
        runPaymentAccount: row.run_payment_account ?? null,
        runPaymentAmount: row.run_payment_amount ?? null,
        runPaymentDueDate: row.run_payment_due_date ?? null,
        personPaidAt: row.person_paid_at ?? null,
      };

      setSession(newSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      const theme = newSession.larpTheme?.trim() || "wwii";
      document.documentElement.dataset.theme = theme;
      setLoading(false);
      return true;
    } catch {
      setError("Neočekávaná chyba");
      setLoading(false);
      return false;
    }
  };

  const clearSession = () => {
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.removeAttribute("data-theme");
  };

  return (
    <PortalContext.Provider value={{ session, loading, error, verifyAccess, clearSession }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortalSession() {
  const context = useContext(PortalContext);
  if (context === undefined) {
    throw new Error("usePortalSession must be used within a PortalProvider");
  }
  return context;
}
