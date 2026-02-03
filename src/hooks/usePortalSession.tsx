import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PortalSession {
  personId: string;
  personName: string;
  personType: "postava" | "cp";
  personSlug: string;
  larpId: string;
  larpName: string;
  larpSlug: string | null;
  larpTheme: string | null;
  larpMotto: string | null;
  groupName: string | null;
  performer: string | null;
  performanceTimes: string | null;
  runId: string | null;
  runName: string | null;
  runDateFrom: string | null;
  runDateTo: string | null;
  runLocation: string | null;
  runAddress: string | null;
  missionBriefing: string | null;
  medailonek: string | null;
  runFooterText: string | null;
  runContact: string | null;
  runPaymentAccount: string | null;
  runPaymentAmount: string | null;
  runPaymentDueDate: string | null;
  personPaidAt: string | null;
  playerName: string | null;
}

/** Řádek vrácený RPC get_portal_session_as_organizer (snake_case z DB) */
interface GetPortalSessionAsOrganizerRow {
  person_id: string;
  person_name: string;
  person_type: "postava" | "cp";
  larp_id: string;
  larp_name: string;
  larp_slug: string | null;
  larp_theme: string | null;
  larp_motto: string | null;
  group_name: string | null;
  performer: string | null;
  performance_times: string | null;
  run_id: string | null;
  run_name: string | null;
  run_date_from: string | null;
  run_date_to: string | null;
  run_location: string | null;
  run_address: string | null;
  mission_briefing: string | null;
  person_medailonek: string | null;
  run_footer_text: string | null;
  run_contact: string | null;
  run_payment_account: string | null;
  run_payment_amount: string | null;
  run_payment_due_date: string | null;
  person_paid_at: string | null;
  player_name: string | null;
}

/** Řádek vrácený RPC verify_person_by_slug (snake_case z DB) */
interface VerifyPersonBySlugRow {
  person_id: string;
  person_name: string;
  person_type: "postava" | "cp";
  larp_id: string;
  larp_name: string;
  larp_slug: string | null;
  larp_theme: string | null;
  larp_motto: string | null;
  group_name: string | null;
  performer: string | null;
  performance_times: string | null;
  run_id: string | null;
  run_name: string | null;
  run_date_from: string | null;
  run_date_to: string | null;
  run_location: string | null;
  run_address: string | null;
  mission_briefing: string | null;
  person_medailonek: string | null;
  run_footer_text: string | null;
  run_contact: string | null;
  run_payment_account: string | null;
  run_payment_amount: string | null;
  run_payment_due_date: string | null;
  person_paid_at: string | null;
  player_name: string | null;
}

interface PortalContextType {
  session: PortalSession | null;
  loading: boolean;
  error: string | null;
  verifyAccess: (slug: string, password: string) => Promise<boolean>;
  /** Vstup na hráčský portál jako organizátor/super admin bez hesla. Vrátí true při úspěchu. */
  enterAsOrganizer: (slug: string) => Promise<boolean>;
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

  const verifyAccess = async (slug: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("verify_person_by_slug", {
        p_slug: slug,
        p_password: password,
      });

      if (rpcError) {
        console.error("RPC error:", rpcError);
        setError("Chyba při ověřování přístupu");
        setLoading(false);
        return false;
      }

      if (!data || data.length === 0) {
        setError("Neplatné heslo nebo přístupový odkaz");
        setLoading(false);
        return false;
      }

      const row = data[0] as VerifyPersonBySlugRow;
      const newSession: PortalSession = {
        personId: row.person_id,
        personName: row.person_name,
        personType: row.person_type,
        personSlug: slug,
        larpId: row.larp_id,
        larpName: row.larp_name,
        larpSlug: row.larp_slug ?? null,
        larpTheme: row.larp_theme ?? null,
        larpMotto: row.larp_motto ?? null,
        groupName: row.group_name ?? null,
        performer: row.performer ?? null,
        performanceTimes: row.performance_times ?? null,
        runId: row.run_id ?? null,
        runName: row.run_name ?? null,
        runDateFrom: row.run_date_from ?? null,
        runDateTo: row.run_date_to ?? null,
        runLocation: row.run_location ?? null,
        runAddress: row.run_address ?? null,
        missionBriefing: row.mission_briefing ?? null,
        medailonek: row.person_medailonek ?? null,
        runFooterText: row.run_footer_text ?? null,
        runContact: row.run_contact ?? null,
        runPaymentAccount: row.run_payment_account ?? null,
        runPaymentAmount: row.run_payment_amount ?? null,
        runPaymentDueDate: row.run_payment_due_date ?? null,
        personPaidAt: row.person_paid_at ?? null,
        playerName: row.player_name ?? null,
      };

      setSession(newSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      const theme = newSession.larpTheme?.trim() || "wwii";
      document.documentElement.dataset.theme = theme;
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Neočekávaná chyba");
      setLoading(false);
      return false;
    }
  };

  /** Vstup na portál bez hesla, pokud je volající organizátor/super admin pro LARP dané osoby. */
  const enterAsOrganizer = async (slug: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // Fetch person by slug and check if user can access via can_access_larp
      const { data: personRow, error: personError } = await supabase
        .from("persons")
        .select("larp_id")
        .eq("slug", slug)
        .single();
      if (personError || !personRow?.larp_id) {
        setLoading(false);
        return false;
      }
      const { data: canAccess } = await supabase.rpc("can_access_larp", {
        p_larp_id: personRow.larp_id,
      });
      if (!canAccess) {
        setLoading(false);
        return false;
      }
      const { data: rows, error: rpcError } = await supabase.rpc("get_portal_session_as_organizer", {
        p_person_slug: slug,
      });
      if (rpcError || !rows?.length) {
        setLoading(false);
        return false;
      }
      const row = rows[0] as GetPortalSessionAsOrganizerRow;
      const newSession: PortalSession = {
        personId: row.person_id,
        personName: row.person_name,
        personType: row.person_type,
        personSlug: slug,
        larpId: row.larp_id,
        larpName: row.larp_name,
        larpSlug: row.larp_slug ?? null,
        larpTheme: row.larp_theme ?? null,
        larpMotto: row.larp_motto ?? null,
        groupName: row.group_name ?? null,
        performer: row.performer ?? null,
        performanceTimes: row.performance_times ?? null,
        runId: row.run_id ?? null,
        runName: row.run_name ?? null,
        runDateFrom: row.run_date_from ?? null,
        runDateTo: row.run_date_to ?? null,
        runLocation: row.run_location ?? null,
        runAddress: row.run_address ?? null,
        missionBriefing: row.mission_briefing ?? null,
        medailonek: row.person_medailonek ?? null,
        runFooterText: row.run_footer_text ?? null,
        runContact: row.run_contact ?? null,
        runPaymentAccount: row.run_payment_account ?? null,
        runPaymentAmount: row.run_payment_amount ?? null,
        runPaymentDueDate: row.run_payment_due_date ?? null,
        personPaidAt: row.person_paid_at ?? null,
        playerName: row.player_name ?? null,
      };
      setSession(newSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      const theme = newSession.larpTheme?.trim() || "wwii";
      document.documentElement.dataset.theme = theme;
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Unexpected error enterAsOrganizer:", err);
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
    <PortalContext.Provider value={{ session, loading, error, verifyAccess, enterAsOrganizer, clearSession }}>
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
