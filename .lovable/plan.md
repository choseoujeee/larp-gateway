## Cíl

V2 sekce „Produkce" — jednotná pracovní plocha pro produkční přípravu LARPu + běhu, plus veřejný portál pro produkční tým (sdílí se odkazem, volitelně heslo).

V databázi už existuje vše potřebné (`production_materials`, `production_links`, `printables`, `run_checklist`, `production_portal_access` + příslušné security-definer RPC), nepřidávám tedy žádné migrace.

## Architektura

Dvě V2 stránky pro produkci (LARP-úroveň + Běh-úroveň) sdílí stejné moduly:

```
/larp/:slug/produkce              ← V2LarpProductionPage (globální)
/larp/:slug/beh/:runSlug/produkce ← V2RunProductionPage  (běh-specifické)
```

Logika:
- **Dokumenty produkční**: čte z `documents` kde `doc_category = 'produkcni'`. Editace je v Dokumentech (jen výpis + odkaz na editor).
- **Tiskoviny** (`printables`): vázané na běh, ale v LARP-pohledu zobrazím za všechny běhy s badgem běhu.
- **Soubory / odkazy** (`production_materials`): Google Drive, audio, video, ostatní. `material_type` = doc/audio/video/other. Pole: title, url, note. Na LARP-úrovni `run_id = null` = globální materiál; v běhu se filtruje na `run_id = current OR null`.
- **Externí odkazy** (`production_links`): jednodušší pomocné odkazy (volitelně, sloučím do „Soubory" sekce jako kategorii „other").
- **Checklist** (`run_checklist`): jen Běh-úroveň. Skupiny (`checklist_group`), drag-and-drop pořadí (jen pomocí šipek pro jednoduchost), `completed` toggle.
- **Portál produkce**: panel pro správu přístupu — generuj odkaz `/produkce/:token`, nastav/odstraň heslo, kopíruj URL. Reuse existující `create_production_portal_access*` + `set_production_portal_password` RPCs.

## Komponenty

```
src/v2/pages/V2LarpProductionPage.tsx
src/v2/pages/V2RunProductionPage.tsx
src/v2/components/production/
  ProductionDocsList.tsx       (čte documents.doc_category='produkcni')
  ProductionMaterialsCard.tsx  (CRUD production_materials + production_links)
  ProductionPrintablesCard.tsx (CRUD printables)
  ProductionChecklistCard.tsx  (CRUD run_checklist + toggle + skupiny) — jen v Běh
  ProductionPortalCard.tsx     (přístup do portálu — token, heslo, URL)
  MaterialEditDialog.tsx
  PrintableEditDialog.tsx
src/v2/pages/V2ProductionPortalPage.tsx ← /produkce/:token (veřejný)
  + login formulář pokud má heslo
  + read-only seznam dokumentů, tiskovin, materiálů, checklist (interaktivní toggle přes set_checklist_item_completed RPC)
```

V2Shell už má položku „Produkce" v larpNav i v běh-navu, jen je zatím prázdná.

## Routing

```ts
// V2Routes.tsx
<Route path="/larp/:larpSlug/produkce" element={<V2LarpProductionPage />} />
<Route path="/larp/:larpSlug/beh/:runSlug/produkce" element={<V2RunProductionPage />} />
<Route path="/produkce/:token" element={<V2ProductionPortalPage />} />
```

## Vzhled

- Stejný styl jako Dokumenty/Hráči: `max-w-5xl`, hlavička `Produkce` + tmavé tlačítko „Nový…" vpravo nahoře (kontextové podle aktivní sekce).
- Sekce v kartách (Card + CardHeader): Dokumenty, Tiskoviny, Soubory & odkazy, Checklist (jen běh), Portál produkce.
- Pro materiály a tiskoviny jednoduchá tabulka (Tabulka name | typ | náhled URL | poznámka | akce).
- Portál: kompaktní karta s URL (read-only Input + Copy), Switch „Heslo vyžadováno" a tlačítka „Nový odkaz" / „Otevřít".

## Test data

Po dokončení vložím 3–4 ukázkové soubory (Google Drive doc, audio, video), 2 tiskoviny a checklist se 2 skupinami × 4 položkami pro běh duben-2026.

## Mimo rozsah (do dalších iterací)

- Bulk upload souborů (jen externí odkazy zatím).
- Editor produkčních dokumentů — vede do stávajícího V2DocumentEditorPage.
- Real-time sync checklistu mezi portálem a adminem (stačí refetch při focus).
- Drag-and-drop řazení (jen šipky / sort_order updaty).