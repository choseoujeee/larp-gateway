import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLarpContext } from "@/hooks/useLarpContext";

/** Běh s názvem LARPu a tématem pro zobrazení v UI */
export interface RunOption {
  id: string;
  name: string;
  larp_id: string;
  larps?: { name: string; theme: string | null };
}

interface RunContextType {
  runs: RunOption[];
  selectedRunId: string;
  setSelectedRunId: (id: string) => void;
  fetchRuns: () => Promise<void>;
  loading: boolean;
}

const STORAGE_KEY = "larp_admin_selected_run_id";

const RunContext = createContext<RunContextType | undefined>(undefined);

export function RunProvider({ children }: { children: ReactNode }) {
  const { currentLarpId } = useLarpContext();
  const [runs, setRuns] = useState<RunOption[]>([]);
  const [selectedRunId, setSelectedRunIdState] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchRuns = async () => {
    if (!currentLarpId) {
      setRuns([]);
      setSelectedRunIdState("");
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("runs")
      .select("id, name, larp_id, larps(name, theme)")
      .eq("larp_id", currentLarpId)
      .order("date_from", { ascending: false });
    setRuns(data || []);
    setLoading(false);
  };

  // Načíst běhy při vybraném LARPu
  useEffect(() => {
    if (currentLarpId) {
      fetchRuns();
    } else {
      setRuns([]);
      setSelectedRunIdState("");
      setLoading(false);
    }
  }, [currentLarpId]);

  // Po načtení běhů: obnovit vybraný běh z localStorage, nebo zvolit první
  useEffect(() => {
    if (runs.length === 0) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const validStored = stored && runs.some((r) => r.id === stored);
    if (validStored) {
      setSelectedRunIdState(stored);
    } else if (!selectedRunId || !runs.some((r) => r.id === selectedRunId)) {
      setSelectedRunIdState(runs[0].id);
    }
  }, [runs]);

  const setSelectedRunId = (id: string) => {
    setSelectedRunIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  // Aplikovat téma LARPu na document (admin)
  useEffect(() => {
    if (!selectedRunId || runs.length === 0) return;
    const run = runs.find((r) => r.id === selectedRunId);
    const theme = run?.larps?.theme && run.larps.theme.trim() ? run.larps.theme : "wwii";
    document.documentElement.dataset.theme = theme;
    return () => {
      document.documentElement.removeAttribute("data-theme");
    };
  }, [selectedRunId, runs]);

  // Po první změně selectedRunId (např. z localStorage nebo prvního běhu) uložit
  useEffect(() => {
    if (selectedRunId) {
      localStorage.setItem(STORAGE_KEY, selectedRunId);
    }
  }, [selectedRunId]);

  return (
    <RunContext.Provider
      value={{
        runs,
        selectedRunId,
        setSelectedRunId,
        fetchRuns,
        loading,
      }}
    >
      {children}
    </RunContext.Provider>
  );
}

export function useRunContext() {
  const context = useContext(RunContext);
  if (context === undefined) {
    throw new Error("useRunContext must be used within a RunProvider");
  }
  return context;
}
