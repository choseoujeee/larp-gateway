import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";

export type SectionKey =
  | "documents"
  | "characters"
  | "groups"
  | "cp"
  | "players"
  | "production"
  | "design"
  | "schedule"
  | "communication"
  | "runs"
  | "organizers";

export type SectionLevel = "none" | "view" | "edit";

export const SECTION_LABELS: Record<SectionKey, string> = {
  documents: "Dokumenty",
  characters: "Postavy",
  groups: "Skupiny",
  cp: "CP",
  players: "Hráči",
  production: "Produkce",
  design: "Design",
  schedule: "Harmonogram",
  communication: "Komunikace",
  runs: "Správa běhů",
  organizers: "Organizátoři",
};

export const ALL_SECTIONS: SectionKey[] = [
  "documents", "characters", "groups", "cp", "players",
  "production", "design", "schedule", "communication", "runs",
];

export type PermissionsMap = Partial<Record<SectionKey, SectionLevel>>;

interface State {
  loading: boolean;
  isOwner: boolean;
  isSuperAdmin: boolean;
  permissions: PermissionsMap;
}

export function useLarpPermissions(larpSlug?: string) {
  const { user } = useAuth();
  const { isSuperAdmin } = useAdminRole();
  const [state, setState] = useState<State>({
    loading: true, isOwner: false, isSuperAdmin: false, permissions: {},
  });

  useEffect(() => {
    if (!larpSlug) { setState({ loading: false, isOwner: false, isSuperAdmin, permissions: {} }); return; }
    let cancel = false;
    (async () => {
      const { data: larp } = await supabase
        .from("larps")
        .select("id, owner_id")
        .eq("slug", larpSlug)
        .maybeSingle();
      if (cancel) return;
      if (!larp) { setState({ loading: false, isOwner: false, isSuperAdmin, permissions: {} }); return; }
      const isOwner = !!user && larp.owner_id === user.id;
      let perms: PermissionsMap = {};
      if (!isOwner && !isSuperAdmin && user) {
        const { data: org } = await supabase
          .from("larp_organizers")
          .select("permissions")
          .eq("larp_id", larp.id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (org?.permissions && typeof org.permissions === "object") {
          perms = org.permissions as PermissionsMap;
        }
      }
      if (cancel) return;
      setState({ loading: false, isOwner, isSuperAdmin, permissions: perms });
    })();
    return () => { cancel = true; };
  }, [larpSlug, user?.id, isSuperAdmin]);

  const fullAccess = state.isOwner || state.isSuperAdmin;

  const canView = (section: SectionKey) => {
    if (fullAccess) return true;
    if (section === "organizers") return false;
    const lvl = state.permissions[section] ?? "none";
    return lvl === "view" || lvl === "edit";
  };
  const canEdit = (section: SectionKey) => {
    if (fullAccess) return true;
    if (section === "organizers") return false;
    return (state.permissions[section] ?? "none") === "edit";
  };

  return {
    loading: state.loading,
    isOwner: state.isOwner,
    isSuperAdmin: state.isSuperAdmin,
    permissions: state.permissions,
    canView,
    canEdit,
    canManageOrganizers: state.isOwner || state.isSuperAdmin,
  };
}
