import { Routes, Route } from "react-router-dom";
import V2Dashboard from "./pages/V2Dashboard";
import V2LarpHome from "./pages/V2LarpHome";
import V2DocumentsPage from "./pages/V2DocumentsPage";
import V2DocumentEditorPage from "./pages/V2DocumentEditorPage";
import V2PersonsListPage from "./pages/V2PersonsListPage";
import V2PersonDetailPage from "./pages/V2PersonDetailPage";
import V2Stub from "./pages/V2Stub";
import V2OrganizersPage from "./pages/V2OrganizersPage";
import V2PastRunsPage from "./pages/V2PastRunsPage";

/** V2 dashboard mounted at "/" */
export function V2RootRoutes() {
  return (
    <Routes>
      <Route index element={<V2Dashboard />} />
    </Routes>
  );
}

/** V2 LARP routes mounted at "/larp/*" */
export default function V2Routes() {
  return (
    <Routes>
      <Route path=":larpSlug" element={<V2LarpHome />} />
      <Route path=":larpSlug/dokumenty" element={<V2DocumentsPage />} />
      <Route path=":larpSlug/dokumenty/:docId" element={<V2DocumentEditorPage />} />
      <Route path=":larpSlug/postavy" element={<V2PersonsListPage kind="postava" />} />
      <Route path=":larpSlug/postavy/:personId" element={<V2PersonDetailPage />} />
      <Route path=":larpSlug/cp" element={<V2PersonsListPage kind="cp" />} />
      <Route path=":larpSlug/cp/:personId" element={<V2PersonDetailPage />} />
      <Route path=":larpSlug/organizatori" element={<V2OrganizersPage />} />
      <Route path=":larpSlug/design" element={<V2Stub title="Design" description="Vizuální identita LARPu — zatím spravujte v archivu (/_archiv/admin/design)." />} />
      <Route path=":larpSlug/produkce" element={<V2Stub title="Produkce (sdílené pro celý LARP)" description="Sdílené produkční dokumenty, soubory, materiály a šablony checklistů — vše, co je stejné napříč běhy. Konkrétní použití pro daný běh najdete na stránce běhu → Produkce." />} />
      <Route path=":larpSlug/drivejsi-behy" element={<V2PastRunsPage />} />
      <Route path=":larpSlug/beh/:runSlug" element={<V2Stub title="Cockpit běhu" description="Pre-flight přehled (Etapa 2)." />} />
      <Route path=":larpSlug/beh/:runSlug/hraci" element={<V2Stub title="Hráči a magic linky" description="Pozvánky hráčů přes Lovable Emails (Etapa 2)." />} />
      <Route path=":larpSlug/beh/:runSlug/cp" element={<V2Stub title="CP performeři" description="Přiřazení performerů k rolím a scénám (Etapa 3)." />} />
      <Route path=":larpSlug/beh/:runSlug/harmonogram" element={<V2Stub title="Harmonogram" description="Harmonogram běhu (Etapa 2)." />} />
      <Route path=":larpSlug/beh/:runSlug/produkce" element={<V2Stub title="Produkce" description="Checklist, materiály, tiskoviny (Etapa 2)." />} />
      <Route path=":larpSlug/beh/:runSlug/komunikace" element={<V2Stub title="Komunikace" description="E-mail šablony a historie odeslaných (Etapa 2)." />} />
      <Route path="*" element={<V2Stub title="Nenalezeno" description="Tato stránka v2 neexistuje." />} />
    </Routes>
  );
}
