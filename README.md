# LARP Portál (LARP Gateway)

Jednotný nástroj pro tvorbu a distribuci dokumentů k larpům. Organizátoři v něm zakládají LARPy a běhy, píší dokumenty, spravují postavy a CP, sestavují harmonogram a produkci. Hráči a CP dostanou jedinečný odkaz a heslo a v prohlížeči vidí jen to, co jim patří – včetně tisku a PDF.

## Stack

- **Frontend:** Vite, React 18, TypeScript, Tailwind CSS, shadcn/ui (Radix)
- **Backend a databáze:** Supabase (PostgreSQL, Auth, Storage)
- **Editor dokumentů:** TipTap (HTML výstup), DOMPurify pro sanitaci při zobrazení
- **Routing:** React Router v6

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

### 3. Migrace databáze

Schéma a funkce jsou v `supabase/migrations/`. Aplikace očekává, že v Supabase projektu jsou spuštěné migrace:

- **Přes Supabase Dashboard:** SQL Editor → zkopíruj a spusť obsah migračních souborů v pořadí podle data v názvu (nejdřív `20260131103359_...`, pak `20260131120000_add_cp_act_info_to_verify.sql`).
- **Lokálně s Supabase CLI:** `npx supabase link` (projekt) a `npx supabase db push` (aplikace migrací).

Po migraci musí být dostupné tabulky: `larps`, `runs`, `persons`, `documents`, `hidden_documents`, `schedule_events`, `print_materials`, `production_links` a RPC `verify_person_access`, `get_person_documents`.

## Spuštění

- **Vývoj:** `npm run dev` – dev server s HMR (typicky http://localhost:5173)
- **Build:** `npm run build` – výstup do `dist/`
- **Náhled buildu:** `npm run preview`

### Import LARPu Krypta ze zálohy

Pokud máš složku `zaloha` s daty ze starého portálu (LARP Krypta – .md soubory s frontmatterem), můžeš je jednorázově naimportovat:

1. Do `.env` doplň (pro seed se používá service_role klíč, aby šlo vložit data bez přihlášení):
   - `SUPABASE_SERVICE_ROLE_KEY` – z Project Settings → API (pozor: nikdy neposílej do frontendu)
   - `LARP_OWNER_ID` – UUID tvého účtu z Authentication → Users (LARP bude patřit tobě)
2. Složka `zaloha` musí být vedle `larp-gateway-app` (tj. `larpapp/zaloha`), nebo nastav `ZALOHA_PATH` na absolutní cestu.
3. Spusť: `npm run seed:krypta`

Skript vytvoří LARP „Krypta“, jeden běh „Běh 1“, postavy (Bublík, Gabčík, Hrubý, Kubiš, Opálka, Petřek, Švarc, Valčík), CP z dokumentů v `zaloha/cp/` a všechny dokumenty z `zaloha/organizacni/`, `zaloha/herni/`, `zaloha/postava/` a `zaloha/cp/`. Výchozí heslo pro všechny osoby je `krypta2024` – po přihlášení do aplikace ho v adminu u jednotlivých osob změň.

## Struktura projektu (výběr)

- `src/pages/admin/` – admin stránky (LARPy, Běhy, Postavy, CP, Dokumenty, Harmonogram, Produkce, Tiskoviny)
- `src/pages/portal/` – přístup k portálu (heslo) a zobrazení portálu pro hráče/CP
- `src/hooks/useRunContext.tsx` – kontext aktuálního běhu v adminu
- `src/hooks/usePortalSession.tsx` – session portálu (po ověření hesla)
- `src/integrations/supabase/` – Supabase client a typy
- `supabase/migrations/` – SQL migrace

## Dokumentace

- **Datový model, API/RLS a user flow:** [docs/DOKUMENTACE.md](docs/DOKUMENTACE.md) – popis tabulek, RPC funkcí (verify_person_access, get_person_documents, get_run_schedule), RLS politik a flow organizátora a hráče/CP.
- **PRD a porovnání:** V nadřazeném repozitáři složka `docs/` obsahuje PRD standalone aplikace a dokument „LARP Gateway vs. PRD a Krypta“.
