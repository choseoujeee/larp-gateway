import { ReactNode, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLarpPermissions, type SectionKey } from "../hooks/useLarpPermissions";
import { V2Shell } from "./V2Shell";
import { Loader2 } from "lucide-react";

interface Props {
  section: SectionKey;
  children: ReactNode;
}

/**
 * Redirects to LARP home with a toast when the user lacks at least `view`
 * permission for the given section. Owner / super-admin always pass.
 */
export function SectionGuard({ section, children }: Props) {
  const { larpSlug } = useParams<{ larpSlug: string }>();
  const navigate = useNavigate();
  const { loading, canView } = useLarpPermissions(larpSlug);

  useEffect(() => {
    if (loading || !larpSlug) return;
    if (!canView(section)) {
      toast.error("K této sekci nemáš oprávnění.");
      navigate(`/larp/${larpSlug}`, { replace: true });
    }
  }, [loading, canView, section, larpSlug, navigate]);

  if (loading) {
    return (
      <V2Shell>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </V2Shell>
    );
  }
  if (!canView(section)) return null;
  return <>{children}</>;
}
