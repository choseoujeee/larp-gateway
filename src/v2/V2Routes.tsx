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
import V2RunCockpit from "./pages/V2RunCockpit";
import V2GroupsPage from "./pages/V2GroupsPage";
import V2LarpPlayersPage from "./pages/V2LarpPlayersPage";
import V2RunPlayersPage from "./pages/V2RunPlayersPage";
import V2RunCpPage from "./pages/V2RunCpPage";
import V2LarpProductionPage from "./pages/V2LarpProductionPage";
import V2RunProductionPage from "./pages/V2RunProductionPage";
import V2RunSchedulePage from "./pages/V2RunSchedulePage";
import V2LarpSchedulePage from "./pages/V2LarpSchedulePage";
import V2LarpDesignPage from "./pages/V2LarpDesignPage";
import V2RunCommunicationPage from "./pages/V2RunCommunicationPage";
import { SectionGuard } from "./components/SectionGuard";

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
      <Route path=":larpSlug/dokumenty" element={<SectionGuard section="documents"><V2DocumentsPage /></SectionGuard>} />
      <Route path=":larpSlug/dokumenty/:docId" element={<SectionGuard section="documents"><V2DocumentEditorPage /></SectionGuard>} />
      <Route path=":larpSlug/postavy" element={<SectionGuard section="characters"><V2PersonsListPage kind="postava" /></SectionGuard>} />
      <Route path=":larpSlug/postavy/:personId" element={<SectionGuard section="characters"><V2PersonDetailPage /></SectionGuard>} />
      <Route path=":larpSlug/cp" element={<SectionGuard section="cp"><V2PersonsListPage kind="cp" /></SectionGuard>} />
      <Route path=":larpSlug/cp/:personId" element={<SectionGuard section="cp"><V2PersonDetailPage /></SectionGuard>} />
      <Route path=":larpSlug/skupiny" element={<SectionGuard section="groups"><V2GroupsPage /></SectionGuard>} />
      <Route path=":larpSlug/hraci" element={<SectionGuard section="players"><V2LarpPlayersPage /></SectionGuard>} />
      <Route path=":larpSlug/organizatori" element={<V2OrganizersPage />} />
      <Route path=":larpSlug/design" element={<SectionGuard section="design"><V2LarpDesignPage /></SectionGuard>} />
      <Route path=":larpSlug/produkce" element={<SectionGuard section="production"><V2LarpProductionPage /></SectionGuard>} />
      <Route path=":larpSlug/drivejsi-behy" element={<V2PastRunsPage />} />
      <Route path=":larpSlug/beh/:runSlug" element={<V2RunCockpit />} />
      <Route path=":larpSlug/beh/:runSlug/hraci" element={<SectionGuard section="players"><V2RunPlayersPage /></SectionGuard>} />
      <Route path=":larpSlug/beh/:runSlug/cp" element={<SectionGuard section="cp"><V2RunCpPage /></SectionGuard>} />
      <Route path=":larpSlug/harmonogram" element={<SectionGuard section="schedule"><V2LarpSchedulePage /></SectionGuard>} />
      <Route path=":larpSlug/beh/:runSlug/harmonogram" element={<SectionGuard section="schedule"><V2RunSchedulePage /></SectionGuard>} />
      <Route path=":larpSlug/beh/:runSlug/produkce" element={<SectionGuard section="production"><V2RunProductionPage /></SectionGuard>} />
      <Route path=":larpSlug/beh/:runSlug/komunikace" element={<SectionGuard section="communication"><V2Stub title="Komunikace" description="E-mail šablony a historie odeslaných (Etapa 2)." /></SectionGuard>} />
      <Route path="*" element={<V2Stub title="Nenalezeno" description="Tato stránka v2 neexistuje." />} />
    </Routes>
  );
}
