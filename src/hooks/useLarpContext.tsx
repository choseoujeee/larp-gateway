import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LarpOption {
  id: string;
  name: string;
  slug: string;
  theme: string | null;
}

interface LarpContextType {
  larps: LarpOption[];
  currentLarpId: string | null;
  currentLarp: LarpOption | null;
  setCurrentLarpId: (id: string | null) => void;
  fetchLarps: () => Promise<void>;
  loading: boolean;
}

const STORAGE_KEY = "larp_admin_selected_larp_id";
const LarpContext = createContext<LarpContextType | undefined>(undefined);

export function LarpProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [larps, setLarps] = useState<LarpOption[]>([]);
  const [currentLarpId, setCurrentLarpIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLarps = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("larps")
      .select("id, name, slug, theme")
      .order("name");
    setLarps(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchLarps();
    } else {
      setLarps([]);
      setCurrentLarpIdState(null);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (larps.length === 0) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const validStored = stored && larps.some((l) => l.id === stored);
    if (validStored) {
      setCurrentLarpIdState(stored);
    } else if (larps.length === 1) {
      setCurrentLarpIdState(larps[0].id);
      localStorage.setItem(STORAGE_KEY, larps[0].id);
    } else {
      setCurrentLarpIdState(null);
    }
  }, [larps]);

  const setCurrentLarpId = (id: string | null) => {
    setCurrentLarpIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  };

  const currentLarp = currentLarpId ? larps.find((l) => l.id === currentLarpId) ?? null : null;

  return (
    <LarpContext.Provider
      value={{
        larps,
        currentLarpId,
        currentLarp,
        setCurrentLarpId,
        fetchLarps,
        loading,
      }}
    >
      {children}
    </LarpContext.Provider>
  );
}

export function useLarpContext() {
  const context = useContext(LarpContext);
  if (context === undefined) {
    throw new Error("useLarpContext must be used within a LarpProvider");
  }
  return context;
}
