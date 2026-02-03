# LARP Portál (LARP Gateway)

Jednotný nástroj pro tvorbu a distribuci dokumentů k larpům. Organizátoři v něm zakládají LARPy a běhy, píší dokumenty, spravují postavy, skupiny a CP, sestavují harmonogram a produkci. Hráči a CP dostanou jedinečný odkaz a heslo a v prohlížeči vidí jen to, co jim patří – včetně tisku a PDF.

## Stack

- **Frontend:** Vite 5, React 18, TypeScript, Tailwind CSS, shadcn/ui (Radix)
- **Backend a databáze:** Supabase (PostgreSQL, Auth, RLS)
- **Editor dokumentů:** TipTap (HTML výstup), DOMPurify pro sanitaci při zobrazení
- **Routing:** React Router v6
- **Drag & drop:** @dnd-kit (pořadí dokumentů, harmonogram)

## Požadavky

- **Node.js** 18+ (doporučeno LTS)
- **npm** nebo **bun**
- **Účet Supabase** – projekt s databází a Auth

## Nastavení

### 1. Klonování a závislosti

```sh
git clone <URL_REPO>
cd larp-gateway-app
npm install
```

### 2. Proměnné prostředí

Zkopíruj `.env.example` na `.env` a doplň hodnoty z Supabase Dashboard (Project Settings → API):

```sh
cp .env.example .env
```

- `VITE_SUPABASE_URL` – URL projektu (API URL)
- `VITE_SUPABASE_PUBLISHABLE_KEY` – veřejný (anon) klíč; **nepoužívej** service_role v prohlížeči
- `VITE_SUPER_ADMIN_EMAIL` (volitelně) – e-mail super administrátora; vidí LARPy všech a stránku Organizátoři

### 3. Migrace databáze

Schéma a funkce jsou v `supabase/migrations/`. Aplikace očekává, že v Supabase projektu jsou spuštěné migrace v pořadí podle data v názvu souboru.

- **Přes Supabase Dashboard:** SQL Editor → zkopíruj a spusť obsah migračních souborů v pořadí (od nejstaršího).
- **Lokálně s Supabase CLI:** `npx supabase link` (projekt) a `npx supabase db push`.

Po migraci musí být dostupné tabulky: `larps`, `runs`, `persons`, `run_person_assignments`, `documents`, `hidden_documents`, `hidden_document_groups`, `schedule_events`, `cp_scenes`, `cp_performers`, `printables`, `production_links`, `portal_feedback`, `larp_organizers` (pokud používáte organizátory). RPC: `verify_person_by_slug`, `get_person_documents`, `get_cp_scenes_for_portal`, `verify_cp_portal_access`, `create_person_assignment_with_password`; pro organizátory: `get_my_organizer_larp_ids`, `can_access_portal_as_organizer`, `get_portal_session_as_organizer`, `assign_organizer_by_email`, `can_access_cp_portal_as_organizer`.

## Spuštění

- **Vývoj:** `npm run dev` – dev server s HMR (typicky http://localhost:8080)
- **Build:** `npm run build` – výstup do `dist/`
- **Náhled buildu:** `npm run preview`
- **Testy:** `npm run test`

### Import LARPu Krypta ze zálohy

Pokud máš složku `zaloha` s daty ze starého portálu (LARP Krypta – .md soubory s frontmatterem), můžeš je jednorázově naimportovat:

1. Do `.env` doplň (pro seed se používá service_role klíč):
   - `SUPABASE_SERVICE_ROLE_KEY` – z Project Settings → API (nikdy neposílej do frontendu)
   - `LARP_OWNER_ID` – UUID tvého účtu z Authentication → Users
2. Složka `zaloha` vedle `larp-gateway-app`, nebo nastav `ZALOHA_PATH`.
3. Spusť: `npm run seed:krypta`

Výchozí heslo pro všechny osoby je `krypta2024` – po přihlášení do aplikace ho v adminu u jednotlivých osob změň.

## Struktura projektu

| Složka / soubor | Popis |
|-----------------|--------|
| `src/pages/admin/` | Admin stránky: Přehled, LARPy, Běhy, Postavy, Skupiny, Cizí postavy, Dokumenty, Harmonogram, Produkce, Tiskoviny, Portál (feedback), Organizátoři |
| `src/pages/portal/` | Portál hráče (přístup + zobrazení), portál CP (rozcestník + zobrazení) |
| `src/pages/auth/` | Přihlášení, registrace |
| `src/components/admin/` | Komponenty adminu: DocumentEditDialog, CpCard, CpSceneDialog, CpSceneList, SortableDocumentItem, DocumentListItem |
| `src/components/layout/` | AdminLayout (sidebar, výběr LARPu/běhu), Header |
| `src/hooks/` | useAuth, useLarpContext, useRunContext, usePortalSession, useAdminRole |
| `src/lib/` | constants, documentUtils, documentTargetOptions, sanitize, cpUtils |
| `src/integrations/supabase/` | Supabase client a typy |
| `supabase/migrations/` | SQL migrace |

## Dokumentace

- **Analýza aplikace (struktura, kontexty, rizika):** [ANALYZA-APLIKACE.md](ANALYZA-APLIKACE.md) – referenční dokument pro společné ladění.
- **Datový model, API/RLS a user flow:** [docs/DOKUMENTACE.md](docs/DOKUMENTACE.md) – popis tabulek, RPC a flow organizátora a hráče/CP.
- **Projektová dokumentace (mapa aplikace):** [docs/PROJEKTOVA-DOKUMENTACE.md](docs/PROJEKTOVA-DOKUMENTACE.md) – kompletní přehled rout, stránek, datového modelu a klíčových modulů.

Další soubory v `docs/`: LOGIKA-DOKUMENTU.md, SQL-RUCNI-UPRAVY-DB.md, ZALOHOVANI-DB.md, VYSLEDKY-TESTU.md.
