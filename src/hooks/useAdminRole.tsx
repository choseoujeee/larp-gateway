import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL as string | undefined;

export interface AdminRoleContextType {
  isSuperAdmin: boolean;
  organizerLarpIds: string[];
  canManageLarp: (larpId: string | null) => boolean;
  loading: boolean;
}

export function useAdminRole(): AdminRoleContextType {
  const { user, loading: authLoading } = useAuth();
  const [organizerLarpIds, setOrganizerLarpIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin =
    !!SUPER_ADMIN_EMAIL && !!user?.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    if (!user) {
      setOrganizerLarpIds([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_my_organizer_larp_ids");
      if (cancelled) return;
      if (!error && Array.isArray(data)) {
        setOrganizerLarpIds((data as { larp_id: string }[]).map((r) => r.larp_id));
      } else {
        setOrganizerLarpIds([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const canManageLarp = (larpId: string | null): boolean => {
    if (!larpId) return false;
    if (isSuperAdmin) return true;
    return organizerLarpIds.includes(larpId);
  };

  return {
    isSuperAdmin,
    organizerLarpIds,
    canManageLarp,
    loading: authLoading || loading,
  };
}
