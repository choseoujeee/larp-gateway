# Analýza aplikace LARP Gateway

**Účel:** Referenční dokument pro společné ladění. Před většími změnami nebo laděním si připomeň strukturu, kontexty a rizika – abychom nic neposrali.

**Související dokumentace:**
- [README](README.md) – stack, env, migrace, spuštění
- [docs/DOKUMENTACE.md](docs/DOKUMENTACE.md) – datový model, API/RLS, user flow
- [docs/PROJEKTOVA-DOKUMENTACE.md](docs/PROJEKTOVA-DOKUMENTACE.md) – detailní mapa rout, stránek, komponent a modulů
- Kořen repozitáře: [../README.md](../README.md) – mapa celého larpapp (Gateway, Krypta, docs, cp/, herni/, …)

---

## 1. Rozsah aplikace

**Aplikace = celá složka `larp-gateway-app`.**  
Zbytek v `larpapp` (cp/, herni/, docs/, harmonogram/, tisk/, produkce/, postava/, organizacni/, zaloha/, krypta1942-app-main/, larp-portal/) jsou předchozí materiály, data nebo jiné varianty portálu – ne součást této webové aplikace.

---

## 2. Ověření env

- **Použité proměnné:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (v `client.ts` jako `SUPABASE_PUBLISHABLE_KEY`). Volitelně `VITE_SUPER_ADMIN_EMAIL` pro super administrátora (vidí LARPy všech a stránku Organizátoři).
- **Ověření shody:** Postava vytvořená v Cursoru se zobrazí v Lovable → používá se stejný Supabase projekt (stejné env).

---

## 3. Technický stack

| Vrstva | Technologie |
|--------|-------------|
| Build | Vite 5, port **8080** |
| UI | React 18, TypeScript, React Router 6 |
| Data / cache | TanStack Query, Supabase JS client |
| Styl | Tailwind, shadcn/ui (Radix), next-themes |
| Editor | TipTap (rich text), @dnd-kit (drag and drop) |
| Ostatní | DOMPurify (sanitize), date-fns, qrcode.react, recharts |
| Dev | lovable-tagger (pro Lovable), Vitest |

---

## 4. Vstup a strom providerů

- **Entry:** `main.tsx` → `App.tsx` → `index.css`.
- **Pořadí providerů v `App.tsx`:**  
  `ThemeProvider` → `QueryClientProvider` → `AuthProvider` → `LarpProvider` → `RunProvider` → `PortalProvider` → `TooltipProvider` → `BrowserRouter` → `ErrorBoundary` → `Routes`.  
  Na pořadí závisí přístup k auth, LARPu, běhu a portálové session – neměň ho bez důvodu.

---

## 5. Routování

| Kategorie | Cesty |
|-----------|--------|
| **Veřejné** | `/` (LandingPage), `/login`, `/register` (→ /login) |
| **Aliasy** | `/orgove/skryta` → `/admin`, `/portal/:token` → `/hrac/:slug` |
| **Admin** | `/admin` (dashboard), `/admin/larpy`, `/admin/behy`, `/admin/behy/:slug`, `/admin/osoby`, `/admin/osoby/:slug`, `/admin/skupiny`, `/admin/skupiny/:groupSlug`, `/admin/cp`, `/admin/cp/:slug`, `/admin/dokumenty`, `/admin/harmonogram`, `/admin/produkce`, `/admin/tiskoviny`, `/admin/portal` (feedback), `/admin/organizatori` (jen super admin) |
| **Portál hráče** | `/hrac/:slug` (přístup – heslo), `/hrac/:slug/view` (pohled na materiály) |
| **Portál CP** | `/cp/:larpSlug` (rozcestník pro CP), `/cp/:larpSlug/:slug` (zobrazení konkrétní CP – stejný obsah jako hráčský portál) |

---

## 6. Auth a kontexty

- **useAuth**  
  Supabase Auth: `user`, `session`, `loading`, `signIn`, `signUp`, `signOut`.  
  Admin stránky jsou chráněné přes **AdminLayout**: pokud `!user` → redirect na `/login`.  
  `loading=false` se nastavuje až po vyřešení `getSession()` (ne při INITIAL_SESSION), aby nedošlo k předčasnému redirectu.

- **useAdminRole**  
  Volá RPC `get_my_organizer_larp_ids`. Super admin = e-mail v `VITE_SUPER_ADMIN_EMAIL`. Organizátor = záznam v `larp_organizers` pro daný LARP. Určuje viditelnost LARPů a přístup ke stránce Organizátoři.

- **useLarpContext**  
  Načte `larps` z DB (podle organizátora/super admina); `currentLarpId` v `localStorage` (`larp_admin_selected_larp_id`). Při syncu `larps` se platný `currentLarpId` nemazáže. V AdminLayout: pokud je uživatel přihlášený ale `!currentLarpId` → **LarpPickerPage** (výběr LARPu). Plný loading jen když `larpsLoading && !currentLarpId`.

- **useRunContext**  
  Načte `runs` pro `currentLarpId`; `selectedRunId` v `localStorage` (`larp_admin_selected_run_id`). Nastavuje **téma stránky**: `document.documentElement.dataset.theme = run.larps.theme || "wwii"`.

- **usePortalSession**  
  Portál (hráč/CP): `verifyAccess(slug, password)` volá RPC **`verify_person_by_slug`**; při úspěchu uloží session do state a `localStorage` (`larp_portal_session`) a nastaví téma z `larpTheme`. Organizátor může vstoupit bez hesla přes **`can_access_portal_as_organizer`** / **`get_portal_session_as_organizer`**.

---

## 7. Databáze (Supabase) – přehled

**Tabulky:**  
`larps` (včetně `footer_text`), `runs`, `persons`, `run_person_assignments`, `documents`, `hidden_documents`, `hidden_document_groups`, `schedule_events`, `cp_scenes`, `cp_performers`, `printables`, `production_links`, `portal_feedback`, `larp_organizers`.

**Důležité vazby:**  
- **persons:** `larp_id`, `type` = `postava` | `cp`, `slug`, `group_name`, `password_hash`, `access_token`.  
- **run_person_assignments:** propojení hráče (email, jméno, heslo) s `person_id` a `run_id`.  
- **documents:** `larp_id`, `run_id` (null = pro všechny běhy), `doc_type`, `target_type` (vsichni/skupina/osoba), `target_group`, `target_person_id`, `visible_to_cp`, `sort_order`, `priority`.  
- **hidden_documents:** skrytí dokumentu pro konkrétní osobu (`document_id`, `person_id`).  
- **hidden_document_groups:** skrytí dokumentu pro celou skupinu (`document_id`, `group_name`).  
- **schedule_events:** `run_id`, `event_type`, `cp_id`, `cp_scene_id` (vazba na cp_scenes).  
- **cp_scenes:** `cp_id`, `run_id`, `schedule_event_id` (obousměrná vazba s harmonogramem), `title`, `is_preherni`.  
- **larp_organizers:** `larp_id`, `user_id` (auth.uid()) – organizátoři LARPu; super admin je mimo tuto tabulku (e-mail v env).

**RPC používané v kódu:**  
- `verify_person_by_slug(p_slug, p_password)` – přístup hráče/CP k portálu.  
- `get_person_documents(p_person_id)` – dokumenty pro zobrazení na portálu (respektuje hidden_documents, hidden_document_groups).  
- `get_cp_scenes_for_portal(p_person_id)` – scény CP na portálu.  
- `verify_cp_portal_access(p_larp_slug, p_password)` – přístup CP k rozcestníku `/cp/:larpSlug`.  
- `create_person_assignment_with_password(...)` – přiřazení hráče k postavě v běhu (RunsPage).  
- **Organizátoři:** `get_my_organizer_larp_ids`, `can_access_portal_as_organizer`, `get_portal_session_as_organizer`, `assign_organizer_by_email`, `can_access_cp_portal_as_organizer`.

---

## 8. Tok dat – admin

- Všechny admin stránky obaluje **AdminLayout** (sidebar: Dokumenty, Postavy, Skupiny, Cizí postavy, Harmonogram, Produkce, Tiskoviny; LARPy, Organizátoři, Portál).  
- Data jsou vázaná na **currentLarpId** (LarpContext) a **selectedRunId** (RunContext).  
- **PersonsPage:** postavy (type = postava), přiřazení, dokumenty; DnD pořadí; DocumentEditDialog.  
- **GroupsPage:** skupiny = distinct `group_name` z postav; detail skupiny = členové + skupinové dokumenty (target_type skupina, target_group = název).  
- **DocumentsPage:** dokumenty pro LARP, 6 možností cílení (všem hráčům, všem + CP, všem CP, konkrétní skupině, konkrétnímu hráči, konkrétnímu CP), Skrýt před (osoby + skupiny); DnD; na /admin/dokumenty název s doplněním „ - Jméno“ u osoba, tag jen „Konkrétnímu hráči“.  
- **RunsPage:** běhy, přiřazení; create_person_assignment_with_password.  
- **CpPage / CpDetailPage:** CP, scény (cp_scenes), performeři, dokumenty; CpSceneDialog (addToSchedule → sync do schedule_events); smazání scény v dialogu.  
- **SchedulePage:** schedule_events pro run; drag & drop s přepočtem času; sync času do cp_scenes; scény se stejným časem vedle sebe; layout DEN + čas vlevo, typ/CP/scéna/lokace vpravo.  
- **LarpsPage, PrintablesPage, ProductionPage, PortalFeedbackPage, OrganizersPage:** přímé CRUD na příslušné tabulky.

---

## 9. Tok dat – portál

- **PortalAccessPage** (`/hrac/:slug`): heslo → `verify_person_by_slug` nebo (organizátor) `can_access_portal_as_organizer` + `get_portal_session_as_organizer` → session → redirect na `/hrac/:slug/view`.  
- **PortalViewPage** (`/hrac/:slug/view`, `/cp/:larpSlug/:slug`): bez session → redirect na přístup. Načte dokumenty přes **get_person_documents**, u CP i **get_cp_scenes_for_portal**. Obsah přes **sanitizeHtml**. Zápatí z `run_footer_text` (v DB z larps.footer_text).  
- **CpPortalPage** (`/cp/:larpSlug`): přístup přes **verify_cp_portal_access** nebo (organizátor) **can_access_cp_portal_as_organizer**; zobrazení karet CP s počty individuálních dokumentů a scén.

---

## 10. Důležité souvislosti pro ladění

- **LARP a běh:** Každá admin stránka závisí na `currentLarpId` a (kde je to relevantní) na `selectedRunId`.  
- **Dokumenty:** Řazení `sortDocuments` (priority → sort_order → created_at). Změna pořadí `updateDocumentOrder`. Skrytí: `hidden_documents`, `hidden_document_groups`. Cílení: 6 UI možností (documentTargetOptions, constants).  
- **Skupiny:** Odvozeny z `persons.group_name` (postava); stránka Skupiny jen pro hráčské skupiny (ne „CP“).  
- **Scény CP a harmonogram:** Scény s „Přidat do harmonogramu“ vytvoří záznam v schedule_events a propojí cp_scene_id. Editace času v harmonogramu syncuje do cp_scenes. Drag & drop v harmonogramu přepočítá časy a aktualizuje cp_scenes.  
- **Osoby:** Postavy/CP přímo insert/update do `persons`. Přiřazení hráče přes **create_person_assignment_with_password**.  
- **Téma:** Z RunContext (admin) nebo PortalSession (portál) → `data-theme` na `<html>`.  
- **Rich text:** TipTap; ukládá HTML; zobrazení přes **sanitizeHtml**.  
- **Feedback:** FeedbackButton → `portal_feedback`.

---

## 11. Co může „posrat“ při změnách

| Oblast | Riziko |
|--------|--------|
| **Provider order** | Změna pořadí Auth → Larp → Run → Portal rozbije závislosti hooků. |
| **AdminLayout** | Odstranění kontroly `user` / `currentLarpId` nebo LarpPickerPage povede k prázdnému/rozbitému adminu. Plný loading jen když `larpsLoading && !currentLarpId`. |
| **useAuth / useLarpContext** | `loading=false` až po vyřešení getSession(); při syncu larps nemazat platný currentLarpId. |
| **Supabase types** | Změna schématu bez úpravy `types.ts` = chyby nebo nefunkční volání. |
| **RPC** | Změna názvů/parametrů RPC bez úpravy volání v kódu rozbije portál nebo přiřazování. |
| **documentUtils / documentTargetOptions** | DocumentsPage a PersonsPage spoléhají na sortDocuments, updateDocumentOrder a 6 možností cílení. |
| **Portál** | PortalViewPage předpokládá strukturu session a výstup get_person_documents, get_cp_scenes_for_portal. |

---

## 12. Shrnutí pro společné ladění

- **Aplikace** = jen `larp-gateway-app`.  
- **Strom providerů a AdminLayout** neměň bez důvodu.  
- **Všechna volání Supabase** (tabulky i RPC) jsou svázaná s `types.ts` a s konkrétními stránkami.  
- **Klíčové moduly:** useAuth, useLarpContext, useRunContext, usePortalSession, useAdminRole, AdminLayout, documentUtils, documentTargetOptions, sanitize, DocumentEditDialog, CpSceneDialog, SchedulePage (DnD + sync cp_scenes), PortalViewPage, CpPortalPage.

Před většími změnami nebo laděním si tento dokument připomeň.
