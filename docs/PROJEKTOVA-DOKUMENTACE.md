# LARP Gateway – projektová dokumentace (mapa aplikace)

**Účel:** Kompletní přehled rout, stránek, komponent, datového modelu a klíčových modulů pro orientaci a předatelnost projektu.

**Verze:** 1.0 | **Datum:** 2025-02-01

---

## 1. Přehled aplikace

LARP Gateway je SPA pro organizátory larpů a pro hráče/CP. Organizátoři spravují LARPy, běhy, postavy, CP, dokumenty, harmonogram, produkci a tiskoviny. Hráči a CP přistupují přes odkaz a heslo k vlastnímu portálu s dokumenty a scénami.

- **Entry:** `src/main.tsx` → `App.tsx` → `index.css`
- **Build:** Vite 5, port 8080
- **Backend:** Supabase (PostgreSQL, Auth, RLS, RPC)

---

## 2. Strom providerů a vstup

**Pořadí v `App.tsx`** (neměnit bez důvodu):

1. `ThemeProvider` (next-themes)
2. `QueryClientProvider` (TanStack Query)
3. `AuthProvider` – Supabase session, signIn/signOut
4. `LarpProvider` – seznam LARPů, currentLarpId (localStorage)
5. `RunProvider` – běhy pro aktuální LARP, selectedRunId (localStorage), téma stránky
6. `PortalProvider` – session portálu (hráč/CP), verifyAccess, clearSession
7. `TooltipProvider`
8. `BrowserRouter`
9. `ErrorBoundary` + `Routes`

Závislosti: Admin stránky potřebují Auth → Larp → Run. Portál potřebuje PortalSession (po ověření heslem nebo organizátorem).

---

## 3. Routování – kompletní mapa

### 3.1 Veřejné

| Cesta | Komponenta | Popis |
|-------|------------|--------|
| `/` | LandingPage | Úvodní stránka |
| `/login` | LoginPage | Přihlášení organizátora |
| `/register` | → Navigate to `/login` | Registrace přesměrována na login |

### 3.2 Aliasy (zpětná kompatibilita)

| Cesta | Akce |
|-------|------|
| `/orgove/skryta` | Redirect na `/admin` |
| `/portal/:token` | Redirect na `/hrac/:token` (token = slug) |
| `/portal/:token/view` | Redirect na `/hrac/:token/view` |

### 3.3 Admin (chráněno AdminLayout, přihlášený uživatel + výběr LARPu)

| Cesta | Komponenta | Popis |
|-------|------------|--------|
| `/admin` | AdminDashboard | Dashboard – kachlíky na sekce |
| `/admin/larpy` | LarpsPage | CRUD LARPů |
| `/admin/behy` | RunsPage | Seznam běhů |
| `/admin/behy/:slug` | RunsPage | Detail běhu, přiřazení hráčů |
| `/admin/osoby` | PersonsPage | Postavy (type = postava) |
| `/admin/osoby/:slug` | PersonsPage | Detail postavy, dokumenty, pořadí |
| `/admin/skupiny` | GroupsPage | Skupiny = distinct group_name z postav |
| `/admin/skupiny/:groupSlug` | GroupsPage | Detail skupiny, členové, dokumenty |
| `/admin/cp` | CpPage | Přehled CP |
| `/admin/cp/:slug` | CpDetailPage | Detail CP – scény, performeři, dokumenty |
| `/admin/dokumenty` | DocumentsPage | Dokumenty LARPu – CRUD, cílení, skrýt před, DnD |
| `/admin/harmonogram` | SchedulePage | Události běhu, DnD, vazba na cp_scenes |
| `/admin/produkce` | ProductionPage | Produkční odkazy |
| `/admin/tiskoviny` | PrintablesPage | Tiskoviny a odkazy |
| `/admin/portal` | PortalFeedbackPage | Feedback z portálu |
| `/admin/organizatori` | OrganizersPage | Jen super admin – přiřazení organizátorů k LARPu |

### 3.4 Portál hráče

| Cesta | Komponenta | Popis |
|-------|------------|--------|
| `/hrac/:slug` | PortalAccessPage | Formulář hesla → verify_person_by_slug → session → redirect na view |
| `/hrac/:slug/view` | PortalViewPage | Zobrazení dokumentů (get_person_documents), Mission Briefing, zápatí, tisk |

### 3.5 Portál CP

| Cesta | Komponenta | Popis |
|-------|------------|--------|
| `/cp/:larpSlug` | CpPortalPage | Rozcestník – přístup heslem (verify_cp_portal_access) nebo organizátor; karty CP |
| `/cp/:larpSlug/:slug` | PortalViewPage | Stejný obsah jako hráčský view – dokumenty + scény CP (get_cp_scenes_for_portal) |

### 3.6 Ostatní

| Cesta | Komponenta |
|-------|------------|
| `*` | NotFound |

---

## 4. Stránky – přehled podle složky

### 4.1 `src/pages/`

| Soubor | Účel |
|--------|------|
| Index.tsx | Obal / redirect (pokud potřeba) |
| LandingPage.tsx | Veřejná úvodní stránka |
| NotFound.tsx | 404 |

### 4.2 `src/pages/auth/`

| Soubor | Účel |
|--------|------|
| LoginPage.tsx | Přihlášení (e-mail + heslo), redirect na /admin |
| RegisterPage.tsx | Registrace (pouze redirect na /login) |

### 4.3 `src/pages/admin/`

| Soubor | Účel |
|--------|------|
| AdminDashboard.tsx | Kachlíky: LARPy, Běhy, Postavy, Skupiny, CP, Dokumenty, Harmonogram, Produkce, Tiskoviny, Portál, Organizátoři |
| LarpPickerPage.tsx | Výběr LARPu (zobrazeno v AdminLayout, když je user ale není currentLarpId) |
| LarpsPage.tsx | CRUD LARPů (název, téma, footer_text) |
| RunsPage.tsx | Běhy – CRUD, přiřazení hráčů (create_person_assignment_with_password) |
| PersonsPage.tsx | Postavy – CRUD, heslo, link, pořadí dokumentů (DnD), DocumentEditDialog |
| GroupsPage.tsx | Skupiny odvozené z postav, skupinové dokumenty |
| CpPage.tsx | Přehled CP – karty, linky |
| CpDetailPage.tsx | Detail CP – scény (CpSceneList, CpSceneDialog), performeři, dokumenty |
| DocumentsPage.tsx | Dokumenty – seznam, filtry, DnD, DocumentEditDialog (TipTap, cílení, skrýt před) |
| SchedulePage.tsx | Harmonogram – události, DnD, vazba na cp_scenes, sync času |
| ProductionPage.tsx | Produkční odkazy – CRUD |
| PrintablesPage.tsx | Tiskoviny – CRUD |
| PortalFeedbackPage.tsx | Přehled feedbacku z portálu (portal_feedback) |
| OrganizersPage.tsx | Přiřazení organizátorů k LARPu (RPC assign_organizer_by_email) – jen super admin |

### 4.4 `src/pages/portal/`

| Soubor | Účel |
|--------|------|
| PortalAccessPage.tsx | Formulář hesla; volá verify_person_by_slug nebo (organizátor) can_access_portal_as_organizer + get_portal_session_as_organizer |
| PortalViewPage.tsx | Mission Briefing, dokumenty (get_person_documents), u CP scény (get_cp_scenes_for_portal), zápatí, tlačítka tisk |
| CpPortalPage.tsx | Přístup verify_cp_portal_access nebo can_access_cp_portal_as_organizer; karty CP s počty dokumentů a scén |

---

## 5. Komponenty

### 5.1 `src/components/admin/`

| Komponenta | Účel |
|------------|------|
| DocumentEditDialog | Dialog pro vytvoření/editaci dokumentu – TipTap (HTML), typ, cílení, skrýt před (hidden_documents, hidden_document_groups) |
| DocumentListItem | Řádek dokumentu v seznamu (název, typ, cílení, akce) |
| SortableDocumentItem | Položka v DnD seznamu dokumentů (@dnd-kit) |
| CpCard | Karta CP (jméno, performer, link) |
| CpSceneDialog | Dialog pro přidání/editaci scény CP – vazba na harmonogram (addToSchedule → schedule_events) |
| CpSceneList | Seznam scén CP s možností úpravy/smazání |

### 5.2 `src/components/layout/`

| Komponenta | Účel |
|------------|------|
| AdminLayout | Sidebar (navigace), výběr LARPu a běhu, Header; obaluje všechny /admin/* kromě LarpPickerPage; redirect na /login když !user, LarpPickerPage když !currentLarpId |
| Header | Hlavička adminu (téma, odhlášení) |

### 5.3 Ostatní komponenty

| Komponenta | Účel |
|------------|------|
| ErrorBoundary | Zachycení chyb v React stromu |
| FeedbackButton | Tlačítko pro feedback z portálu → portal_feedback |
| NavLink.tsx | Navigační link (aktivní stav) |
| ThemeToggle | Přepínač světlý/tmavý režim |

### 5.4 `src/components/ui/`

UI knihovna (shadcn/ui, Radix) – button, card, dialog, form, input, select, table, tabs, toast, tooltip, sidebar, accordion, badge, calendar, checkbox, dropdown-menu, popover, scroll-area, separator, skeleton, switch, textarea, rich-text-editor (TipTap), paper-card, stamp, doc-badge atd.

---

## 6. Hooks

| Hook | Účel |
|------|------|
| useAuth | Supabase Auth: user, session, loading, signIn, signUp, signOut; loading=false až po getSession() |
| useAdminRole | RPC get_my_organizer_larp_ids; super admin = VITE_SUPER_ADMIN_EMAIL; určuje viditelnost LARPů a přístup k OrganizersPage |
| useLarpContext | Načte larps (podle organizátora/super admina), currentLarpId v localStorage; při syncu nemazat platný currentLarpId |
| useRunContext | Načte runs pro currentLarpId, selectedRunId v localStorage; nastavuje data-theme na html (run.larps.theme) |
| usePortalSession | verifyAccess(slug, password) → verify_person_by_slug; session v state + localStorage; organizátor: can_access_portal_as_organizer, get_portal_session_as_organizer |
| use-mobile.tsx | Detekce mobilního viewportu |
| use-toast | Toast notifikace |

---

## 7. Knihovny a integrace

### 7.1 `src/lib/`

| Soubor | Účel |
|--------|------|
| constants.ts | Konstanty (např. typy dokumentů, cílení) |
| documentUtils.ts | sortDocuments (priority → sort_order → created_at), updateDocumentOrder |
| documentTargetOptions.ts | 6 možností cílení dokumentu pro UI (všichni, všichni+CP, všem CP, skupina, osoba) |
| sanitize.ts | sanitizeHtml (DOMPurify) pro zobrazení obsahu dokumentů |
| cpUtils.ts | Pomocné funkce pro CP |
| utils.ts | Obecné utility (cn, atd.) |

### 7.2 `src/integrations/supabase/`

| Soubor | Účel |
|--------|------|
| client.ts | Supabase client (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY) |
| types.ts | TypeScript typy pro tabulky a RPC (generované / ruční) |

---

## 8. Databáze – přehled

### 8.1 Tabulky

| Tabulka | Účel |
|---------|------|
| larps | id, name, slug, description, theme, footer_text, owner_id |
| runs | id, larp_id, name, slug, date_from, date_to, location, address, contact, footer_text, mission_briefing, is_active |
| persons | id, run_id, type (postava \| cp), slug, name, group_name, performer, performance_times, password_hash, access_token; UNIQUE(run_id, slug) |
| run_person_assignments | Přiřazení hráče (email, jméno, heslo) k person_id a run_id |
| documents | id, run_id, doc_type, target_type, target_group, target_person_id, visible_to_cp, sort_order, priority, title, content (HTML) |
| hidden_documents | document_id, person_id – skrytí dokumentu pro osobu |
| hidden_document_groups | document_id, group_name – skrytí dokumentu pro skupinu |
| schedule_events | run_id, day_number, start_time, duration_minutes, event_type, cp_id, cp_scene_id (vazba na cp_scenes), title, description, location |
| cp_scenes | cp_id, run_id, schedule_event_id, title, is_preherni |
| cp_performers | Vazba CP – performer (podle potřeby) |
| printables | run_id, title, url, print_instructions, sort_order |
| production_links | run_id, title, url, description, link_type, sort_order |
| portal_feedback | Feedback z portálu |
| larp_organizers | larp_id, user_id – organizátoři LARPu (kromě super admina) |

### 8.2 RPC používané v kódu

| RPC | Účel |
|-----|------|
| verify_person_by_slug(p_slug, p_password) | Přístup hráče/CP k portálu; vrací data osoby a běhu |
| get_person_documents(p_person_id) | Dokumenty pro zobrazení na portálu (respektuje hidden_*) |
| get_cp_scenes_for_portal(p_person_id) | Scény CP na portálu |
| verify_cp_portal_access(p_larp_slug, p_password) | Přístup CP k rozcestníku /cp/:larpSlug |
| create_person_assignment_with_password(...) | Přiřazení hráče k postavě v běhu (RunsPage) |
| get_my_organizer_larp_ids | LARPy, k nimž má uživatel přístup |
| can_access_portal_as_organizer | Organizátor vstoupí na portál hráče bez hesla |
| get_portal_session_as_organizer | Session pro organizátora na portálu hráče |
| can_access_cp_portal_as_organizer | Organizátor vstoupí na CP rozcestník |
| assign_organizer_by_email | Přiřazení organizátora k LARPu (OrganizersPage) |

---

## 9. Klíčové toky dat

### 9.1 Admin – kontext

- **LarpContext:** Načte LARPy podle oprávnění → uživatel volí currentLarpId (nebo LarpPickerPage).
- **RunContext:** Načte běhy pro currentLarpId → uživatel volí selectedRunId; nastaví téma stránky (data-theme).
- Všechny admin stránky čtou currentLarpId a selectedRunId z kontextu (ne z URL, kromě detailů s :slug).

### 9.2 Dokumenty

- **Řazení:** sortDocuments (priority → sort_order → created_at).
- **Změna pořadí:** updateDocumentOrder (DnD).
- **Cílení:** 6 možností (documentTargetOptions) – vsichni, vsichni+CP, vsem CP, skupina, osoba (postava), osoba (CP).
- **Skrytí:** hidden_documents (osoba), hidden_document_groups (skupina); ukládáno v DocumentEditDialog.

### 9.3 Scény CP a harmonogram

- Scéna CP (cp_scenes) může být vázaná na schedule_event (schedule_event_id / cp_scene_id).
- V CpSceneDialog „Přidat do harmonogramu“ vytvoří schedule_event a propojí cp_scene_id.
- V SchedulePage drag & drop přepočítá časy a syncuje do cp_scenes.

### 9.4 Portál

- **Přístup:** slug + heslo → verify_person_by_slug; nebo organizátor → can_access_portal_as_organizer + get_portal_session_as_organizer.
- **Obsah:** get_person_documents; u CP navíc get_cp_scenes_for_portal.
- **Zobrazení:** sanitizeHtml pro HTML z dokumentů; zápatí z run (footer_text).

---

## 10. Struktura souborů (shrnutí)

```
larp-gateway-app/
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── pages/           # Landing, auth, admin/*, portal/*
│   ├── components/     # admin/, layout/, ui/
│   ├── hooks/          # useAuth, useLarpContext, useRunContext, usePortalSession, useAdminRole
│   ├── lib/            # constants, documentUtils, documentTargetOptions, sanitize, cpUtils
│   └── integrations/supabase/  # client, types
├── supabase/migrations/  # SQL migrace v pořadí podle data
├── scripts/              # seed-krypta.mjs
├── docs/                 # DOKUMENTACE, PROJEKTOVA-DOKUMENTACE, LOGIKA-DOKUMENTU, SQL-RUCNI-UPRAVY, ...
├── README.md
├── ANALYZA-APLIKACE.md
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## 11. Odkazy na další dokumenty

- [README](../README.md) – nastavení, env, migrace, spuštění, seed
- [ANALYZA-APLIKACE.md](../ANALYZA-APLIKACE.md) – kontexty, rizika, co může „posrat“ změny
- [DOKUMENTACE.md](DOKUMENTACE.md) – datový model, API/RLS, user flow (pozn.: část RPC může být popsána s tokenem; v kódu se používá slug a verify_person_by_slug)
- [LOGIKA-DOKUMENTU.md](LOGIKA-DOKUMENTU.md) – logika cílení a skrývání dokumentů
- [SQL-RUCNI-UPRAVY-DB.md](SQL-RUCNI-UPRAVY-DB.md) – manuální úpravy DB
- [ZALOHOVANI-DB.md](ZALOHOVANI-DB.md) – zálohování databáze
- [VYSLEDKY-TESTU.md](VYSLEDKY-TESTU.md) – výsledky testů
