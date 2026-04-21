import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Shows a browser confirmation dialog when the user tries to
 * leave the page (close tab / navigate away) while there are unsaved changes.
 *
 * Also blocks in-app navigation via react-router with a confirm() prompt.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  // Browser close / reload
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // In-app navigation
  useBlocker(({ currentLocation, nextLocation }) => {
    if (!isDirty) return false;
    if (currentLocation.pathname === nextLocation.pathname) return false;
    return !window.confirm("Máte neuložené změny. Opravdu chcete odejít?");
  });
}
