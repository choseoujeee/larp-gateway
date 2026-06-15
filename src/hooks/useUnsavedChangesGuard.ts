import { useEffect } from "react";

/**
 * Shows a browser confirmation dialog when the user tries to
 * leave the page (close tab / navigate away) while there are unsaved changes.
 *
 * Note: in-app navigation blocking requires a data router (createBrowserRouter).
 * The app currently uses <BrowserRouter>, so only browser-level guard is wired up.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}

