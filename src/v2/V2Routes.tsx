import { Routes, Route } from "react-router-dom";
import V2Dashboard from "./pages/V2Dashboard";
import V2LarpHome from "./pages/V2LarpHome";
import V2Stub from "./pages/V2Stub";

export default function V2Routes() {
  return (
    <Routes>
      <Route index element={<V2Dashboard />} />
      <Route path="larp/:larpSlug" element={<V2LarpHome />} />
      <Route path="larp/:larpSlug/dokumenty" element={<V2Stub title="Dokumenty" description="Nový editor dokumentů (Etapa 1). Obsah stávajících dokumentů zůstává v DB beze změny." />} />
      <Route path="larp/:larpSlug/postavy" element={<V2Stub title="Postavy" description="Katalog postav LARPu (Etapa 1)." />} />
      <Route path="larp/:larpSlug/cp" element={<V2Stub title="CP" description="Katalog CP rolí a performerů (Etapa 1)." />} />
      <Route path="larp/:larpSlug/design" element={<V2Stub title="Design" description="Vizuální identita LARPu (Etapa 1)." />} />
      <Route path="larp/:larpSlug/beh/:runSlug" element={<V2Stub title="Cockpit běhu" description="Pre-flight přehled — kdo má magic link, kdo zaplatil, kdo si přečetl dokumenty (Etapa 2)." />} />
      <Route path="larp/:larpSlug/beh/:runSlug/hraci" element={<V2Stub title="Hráči a magic linky" description="Pozvánky hráčů přes Lovable Emails (Etapa 2)." />} />
      <Route path="larp/:larpSlug/beh/:runSlug/cp" element={<V2Stub title="CP performeři" description="Přiřazení performerů k rolím a scénám (Etapa 3)." />} />
      <Route path="larp/:larpSlug/beh/:runSlug/harmonogram" element={<V2Stub title="Harmonogram" description="Harmonogram běhu (Etapa 2)." />} />
      <Route path="larp/:larpSlug/beh/:runSlug/produkce" element={<V2Stub title="Produkce" description="Checklist, materiály, tiskoviny (Etapa 2)." />} />
      <Route path="larp/:larpSlug/beh/:runSlug/komunikace" element={<V2Stub title="Komunikace" description="E-mail šablony a historie odeslaných (Etapa 2)." />} />
      <Route path="*" element={<V2Stub title="Nenalezeno" description="Tato stránka v2 neexistuje." />} />
    </Routes>
  );
}
