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
    // Check for existing session in localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSession(JSON.parse(stored));
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

      const row = data[0];
      const newSession: PortalSession = {
        personId: row.person_id,
        personName: row.person_name,
        personType: row.person_type,
        runId: row.run_id,
        larpName: row.larp_name,
        runName: row.run_name,
        missionBriefing: row.mission_briefing,
      };

      setSession(newSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
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
