# Lovable Upgrade Spec – LARP Gateway

**Účel:** Tento dokument je technické zadání pro upgrade aplikace ze stavu po `git pull` z repozitáře (např. `choseoujeee/larp-gateway`) do cílového stavu s úpravami popsanými níže. Cíl: provést změny s **minimem kreditů** a **bez rozbití návaznosti na Supabase**.

---

## 1. Úvod a kontext

### Výchozí stav

- Aplikace ve stavu po `git pull` z GitHubu (main branch).
- Frontend: Vite, React, TypeScript, Tailwind, shadcn/ui, Supabase client.
- Backend: Supabase (PostgreSQL, Auth, RLS, RPC). Migrace v `supabase/migrations/`.
- **Žádné nové migrace** v rámci tohoto upgradu nejsou potřeba. Tabulky `organizer_accounts`, `larp_organizers` a související RLS/RPC již existují.

### Cílový stav po upgradu

- **Organizátoři:** Editace organizátora (klik na řádek → dialog, úprava jména/kontaktu); vytváření nového (Edge Function `create-organizer`, super admin z env); nápověda v UI a README.
- **Blank page:** Odstraněna (next-themes hydration) pomocí `suppressHydrationWarning` v `index.html`.
- **Produkční portál:** Dokumenty zobrazeny jako accordion (stejné chování jako na hráčském portálu); nápověda „jak rozbalit“.
- **Přepínač témat:** ThemeToggle na všech portálech (hráč, přístup, produkce, CP, harmonogram), včetně přihlašovacích obrazovek.
- **UX (Fáze 2):** Čitelnost dokumentů (prose), sjednocené nadpisy sekcí, vizuál accordionů, jednotná věta o hesle na přihlášení, ARIA sekce, tlačítko „Otevřít hráčský portál“ v adminu, text u produkčního odkazu; PaperCardTitle s volitelným `id`.
- **Dokumentace:** Šablona reportu uživatelských testů a návrh implementace Fáze 2; odkazy v projektové dokumentaci a README.

### Pro koho

Lovable (nebo kdokoli provádějící upgrade). Neměnit názvy RPC, tabulek ani sloupců. Env proměnné zůstávají: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPER_ADMIN_EMAIL`.

---

## 2. Přehled změněných a nových souborů

| Soubor | Typ | Oblast |
|--------|-----|--------|
| `index.html` | úprava | blank page |
| `src/pages/admin/OrganizersPage.tsx` | úprava | organizátoři – editace + UI |
| `supabase/functions/create-organizer/index.ts` | úprava | super admin z env |
| `README.md` | úprava | sekce Edge Function + set-super-admin |
| `supabase/scripts/set-super-admin-email.sql` | nový | volitelný DB skript |
| `src/pages/portal/ProductionPortalPage.tsx` | úprava | accordion, nápověda, theme, ARIA, heslo |
| `src/pages/portal/PortalViewPage.tsx` | úprava | theme, prose, ARIA, DocumentItem, Sbalit |
| `src/pages/portal/PortalAccessPage.tsx` | úprava | theme toggle |
| `src/pages/portal/CpPortalPage.tsx` | úprava | theme, prose, ARIA |
| `src/pages/portal/SchedulePortalPage.tsx` | úprava | theme, nadpis, heslo, ARIA |
| `src/pages/admin/PersonsPage.tsx` | úprava | tlačítko „Otevřít hráčský portál“ |
| `src/pages/admin/ProductionPage.tsx` | úprava | text u odkazu a hesla |
| `src/components/ui/paper-card.tsx` | úprava | PaperCardTitle `id` |
| `docs/VYSLEDKY-UZIVATELSKYCH-TESTU.md` | nový | šablona reportu testů |
| `docs/NAVRH-IMPLEMENTACE-FAZE2.md` | nový | podrobný návrh UX (A–J) |
| `docs/PROJEKTOVA-DOKUMENTACE.md` | úprava | odkazy na nové docs |
| `docs/LOVABLE-UPGRADE-SPEC.md` | nový | tento dokument |

---

## 3. Bloky implementace (po pořadí – minimalizace kreditů)

### Blok 1: Blank page

**Zadání:** Odstranit prázdnou stránku při prvním načtení (next-themes hydration).

**Soubor:** `index.html`

**Změny:**

1. Na tagu `<html>` přidat atribut `suppressHydrationWarning`.  
   Před: `<html lang="cs">`  
   Po: `<html lang="cs" suppressHydrationWarning>`

2. Na tagu `<body>` přidat atribut `suppressHydrationWarning`.  
   Před: `<body>`  
   Po: `<body suppressHydrationWarning>`

---

### Blok 2: Organizátoři – editace

**Zadání:** Na stránce Organizátoři lze kliknout na řádek organizátora a otevře se dialog pro úpravu jména, kontaktního e-mailu a telefonu. Uložení mění pouze tabulku `organizer_accounts` (UPDATE). Žádná změna DB schématu ani RPC.

**Soubor:** `src/pages/admin/OrganizersPage.tsx`

**Změny:**

1. **Import:** Přidat ikonu `Pencil` z `lucide-react`.

2. **State:** Přidat: `editOpen`, `editingRow` (LarpOrganizerRow | null), `editDisplayName`, `editContactEmail`, `editContactPhone`.

3. **Funkce:**  
   - `openEdit(row)` – nastaví `editingRow`, z `accountsByUserId[row.user_id]` naplní pole pro jméno/e-mail/telefon, otevře dialog (`setEditOpen(true)`).  
   - `handleSaveEdit()` – volá `supabase.from("organizer_accounts").update({ display_name, contact_email, contact_phone }).eq("user_id", editingRow.user_id)`, po úspěchu toast, zavření dialogu, refresh `fetchOrganizerAccounts()`.

4. **Řádek v seznamu:**  
   - Každý `<li>` organizátora udělat klikatelný (onClick → `openEdit(row)`), přidat `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space → openEdit), třídy např. `cursor-pointer hover:bg-muted/50`.  
   - Uvnitř řádku vedle labelu přidat dvě tlačítka v `<div onClick={e => e.stopPropagation()}>`:  
     - Tlačítko s ikonou Pencil, onClick → `openEdit(row)`, title „Upravit“.  
     - Tlačítko s ikonou Trash2 (smazat) – stávající chování (setSelected, setDeleteOpen).  
   - Text tlačítka smazat: title „Odebrat z LARPu“.

5. **Dialog pro úpravu:**  
   - Nový `<Dialog open={editOpen} onOpenChange={...}>` s titulkem „Upravit organizátora“.  
   - Uvnitř: zobrazení loginu (read-only) z `accountsByUserId[editingRow.user_id]?.login`, pak Inputy pro jméno, kontaktní e-mail, telefon; tlačítka Zrušit a Uložit.  
   - Při zavření dialogu (`onOpenChange(false)`) nastavit `editingRow` na null.

Žádné volání Edge Function ani nové RPC. Pouze stávající `organizer_accounts` (SELECT už existuje, UPDATE je povolen RLS pro super admina).

---

### Blok 3: Organizátoři – Edge Function a README

**Zadání:** Edge Function `create-organizer` má brát e-mail super admina z env proměnné. README má obsahovat sekci o nasazení Edge Function a volitelném SQL skriptu pro změnu super admin e-mailu v DB. **DB migrace se nemění.** Skript `set-super-admin-email.sql` je volitelný (pouze když chce uživatel v DB jiný e-mail než výchozí).

**Soubor:** `supabase/functions/create-organizer/index.ts`

**Změny:**

1. Na začátku (po konstantách `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ORGANIZER_EMAIL_DOMAIN`) přidat konstantu:  
   `const SUPER_ADMIN_EMAIL = Deno.env.get("SUPER_ADMIN_EMAIL") ?? "chousef@gmail.com";`  
   (s komentářem, že hodnota se nastavuje v Supabase Edge Functions → create-organizer → Secrets).

2. V podmínce kontroly super admina nahradit pevný řetězec:  
   Před: `if (user.email !== "chousef@gmail.com")`  
   Po: `if (user.email !== SUPER_ADMIN_EMAIL)`

**Soubor:** `README.md`

**Změny:**

1. V sekci „Proměnné prostředí“ (nebo hned za ní) doplnit u `VITE_SUPER_ADMIN_EMAIL` větu: „Pokud používáte jiný e-mail než výchozí v DB, spusťte jednou v SQL Editoru skript `supabase/scripts/set-super-admin-email.sql` (nahraďte v něm e-mail a spusťte).“

2. Přidat novou podsekci **„4. Edge Function Nový organizátor (volitelně)“**:  
   - Tlačítko „Nový organizátor“ volá Edge Function `create-organizer`. Bez nasazení funkce akce hlásí chybu; lze používat „Přiřadit podle e-mailu“.  
   - Návod na nasazení: `npx supabase link`, `npx supabase functions deploy create-organizer`.  
   - V Supabase Dashboard u funkce create-organizer v Secrets volitelně nastavit `SUPER_ADMIN_EMAIL` (stejný jako `VITE_SUPER_ADMIN_EMAIL`).

**Soubor (nový):** `supabase/scripts/set-super-admin-email.sql`

- Obsah: jeden `DO $$ ... END $$` blok s proměnnou `super_admin text := 'VAS@EMAIL.cz';` (instrukce nahradit e-mailem).  
- Uvnitř bloku: DROP/CREATE POLICY pro `organizer_accounts` (SELECT, INSERT, UPDATE) a `larp_organizers` (SELECT, INSERT, DELETE); CREATE OR REPLACE FUNCTION pro `can_access_larp`, `can_access_portal_as_organizer`, `can_access_cp_portal_as_organizer`, `assign_organizer_by_email` s použitím `super_admin` (pomocí `EXECUTE format(...)`).  
- Tento soubor už v repozitáři existuje; pokud Lovable vychází ze staršího stavu bez něj, vytvořit podle obsahu z aktuálního repa.

**OrganizersPage – nápověda v dialogu „Nový organizátor“:**  
V dialogu pod textem o přihlašování loginem přidat krátký odstavec (např. žlutý box): „Vyžaduje nasazenou Edge Function `create-organizer`. Návod: README → Edge Function Nový organizátor. Bez ní použijte „Přiřadit podle e-mailu“ a vytvořte uživatele v Supabase Authentication ručně.“

---

### Blok 4: Produkční portál – accordion dokumentů a nápověda

**Zadání:** Sekce „Dokumenty“ na produkčním portálu má zobrazovat dokumenty v accordionu (jako na hráčském portálu). Pod nadpisem „Dokumenty“ přidat nápovědu, že kliknutím na název se obsah rozbalí.

**Soubor:** `src/pages/portal/ProductionPortalPage.tsx`

**Změny:**

1. **Import:** Přidat z `@/components/ui/accordion`: `Accordion`, `AccordionContent`, `AccordionItem`, `AccordionTrigger`. Přidat `ThemeToggle` z `@/components/ThemeToggle`.

2. **Přihlašovací obrazovka (!session):**  
   - Obalit obsah do `<div className="... relative">` a přidat vpravo nahoře `<div className="absolute top-4 right-4"><ThemeToggle /></div>`.

3. **Přihlášený stav – header:**  
   - Vedle tlačítka Odhlásit přidat `<ThemeToggle />` (v `<div className="flex items-center gap-2">`).

4. **Přihlašovací formulář:**  
   - Pod tlačítkem Přihlásit přidat:  
     `<p className="mt-4 text-center text-xs text-muted-foreground">Heslo vám poskytne organizátor.</p>`

5. **Sekce Dokumenty (po přihlášení):**  
   - Nahradit plochý seznam dokumentů (divy s titulkem a obsahem) za:  
     - Nadpis h2: „Dokumenty“ s třídou `font-typewriter text-xl tracking-wider uppercase text-foreground flex items-center gap-2 mb-3`.  
     - Odstavec: `<p className="text-sm text-muted-foreground mb-3">Kliknutím na název dokumentu rozbalíte jeho obsah.</p>`  
     - `<Accordion type="multiple" className="w-full" defaultValue={[]}>`  
       Pro každý dokument: `<AccordionItem key={doc.id} value={doc.id} className="border rounded-md px-3 bg-muted/20 mb-2 last:mb-0">`, `<AccordionTrigger className="hover:no-underline hover:bg-muted/40 transition-colors py-3">` s `<span className="font-medium text-left">{doc.title}</span>`, `<AccordionContent>` s obsahem (sanitizeHtml) v divu s třídou `prose max-w-none text-base leading-relaxed text-foreground pb-2`.  
   - Sekce Checklist a Materiály: nadpisy sjednotit na `font-typewriter text-xl tracking-wider uppercase text-foreground` a obalit každou sekci do `<section aria-labelledby="...">` s odpovídajícím `id` na h2 (např. `prod-checklist-heading`, `prod-docs-heading`, `prod-materials-heading`).

6. **Čitelnost obsahu dokumentu:**  
   U divu s obsahem dokumentu v AccordionContent použít třídu: `prose max-w-none text-base leading-relaxed text-foreground pb-2` (ne `prose-sm`).

---

### Blok 5: Theme toggle na všech portálech

**Zadání:** Na každém portálu (hráčský view, přístup heslem, produkční, CP, harmonogram) musí být dostupný přepínač světlý/tmavý režim (komponenta ThemeToggle).

**Soubory a umístění:**

- **PortalViewPage.tsx:** V headeru v bloku „Quick actions“ (vedle Zpět/Odhlásit) přidat `<ThemeToggle />`. Import: `import { ThemeToggle } from "@/components/ThemeToggle";`
- **PortalAccessPage.tsx:** Obalit hlavní obsah do `relative` a přidat `<div className="absolute top-4 right-4 no-print"><ThemeToggle /></div>`. Import ThemeToggle.
- **ProductionPortalPage.tsx:** (již v Bloku 4 – přihlašovací obrazovka + přihlášený header.)
- **CpPortalPage.tsx:** V headeru v divu s tlačítkem „Odhlásit se z CP portálu“ přidat před toto tlačítko `<ThemeToggle />`. Import ThemeToggle.
- **SchedulePortalPage.tsx:** Na přihlašovací obrazovce (`!session`) přidat `relative` na obal a `<div className="absolute top-4 right-4"><ThemeToggle /></div>`. V přihlášeném stavu v řádku s tlačítky (Spustit běh / Odhlásit) přidat `<ThemeToggle />` před tlačítko Odhlásit. Import ThemeToggle.

---

### Blok 6: UX Fáze 2 (A–J)

Podrobný popis je v [docs/NAVRH-IMPLEMENTACE-FAZE2.md](NAVRH-IMPLEMENTACE-FAZE2.md). Zde zkrácený přehled s názvy souborů a přesnými úpravami.

**A – Čitelnost těla dokumentu**

- **PortalViewPage.tsx:**  
  - V komponentě `DocumentItem` u divu s `dangerouslySetInnerHTML` (obsah dokumentu): nahradit `prose prose-sm max-w-none text-muted-foreground` za `prose max-w-none text-base leading-relaxed text-foreground` (všechny `[&_h1]` atd. ponechat).  
  - Medailonek a mission briefing: `prose prose-sm` → `prose max-w-none text-base leading-relaxed` (barvu ponechat).  
  - CP scény – popis scény: `prose prose-sm` → `prose max-w-none text-base leading-relaxed`.
- **ProductionPortalPage.tsx:** (accordion obsah – již v Bloku 4: `prose max-w-none text-base leading-relaxed text-foreground pb-2`.)
- **CpPortalPage.tsx:** U obsahu CP dokumentu (prose): `prose prose-sm max-w-none text-muted-foreground` → `prose max-w-none text-base leading-relaxed text-foreground`.

**B – Nadpisy sekcí**

- **ProductionPortalPage.tsx:** Checklist, Dokumenty, Materiály – h2 s třídou `font-typewriter text-xl tracking-wider uppercase text-foreground flex items-center gap-2 mb-3`.
- **SchedulePortalPage.tsx:** Hlavní nadpis „Harmonogram“ (přihlášený stav): přidat `tracking-wider uppercase text-foreground`.

**C – Vizuál accordion/collapsible**

- **ProductionPortalPage.tsx:** AccordionItem již s `mb-2 last:mb-0`, AccordionTrigger s `hover:bg-muted/40 transition-colors`.
- **PortalViewPage.tsx – DocumentItem:** Na trigger (button) přidat `rounded-md border border-transparent hover:bg-muted/40 hover:border-border/50`.

**E – Nápověda na produkčním portálu:** (již v Bloku 4.)

**F – Jednotná věta o hesle:** (ProductionPortalPage a SchedulePortalPage již v blocích 4 a 5.) PortalAccessPage může zůstat s textem „Heslo jste obdrželi od organizátora hry.“

**G – Tlačítko Sbalit**

- **PortalViewPage.tsx – DocumentItem:** U tlačítka „Sbalit“ přidat `type="button"` a `aria-label="Sbalit dokument"`.

**H – ARIA sekce**

- **PortalViewPage.tsx:**  
  - Character card obalit do `<section aria-labelledby="portal-person-heading">`, na h2 (jméno postavy) přidat `id="portal-person-heading"`.  
  - Mission Briefing obalit do `<section aria-labelledby="mission-briefing-heading">`, na PaperCardTitle přidat `id="mission-briefing-heading"`.  
  - Sekce Dokumenty: jeden blok (nadpis + prázdný stav nebo seznam dokumentů + tlačítko Sbalit vše) obalit do `<section aria-labelledby="portal-docs-heading">`, h2 mít `id="portal-docs-heading"`. Struktura: když `loading` → jen loading spinner; jinak `<section>` + h2 + buď prázdný stav, nebo seznam DocumentCategory + podmíněně tlačítko Sbalit vše.
- **ProductionPortalPage.tsx:** Checklist, Dokumenty, Materiály – každá sekce `<section aria-labelledby="prod-checklist-heading">` atd. a na příslušný h2 přidat `id="prod-checklist-heading"` atd.
- **SchedulePortalPage.tsx:** Hlavní obsah (od nadpisu Harmonogram po konec gridu událostí) obalit do `<section aria-labelledby="sched-harmonogram-heading">`, na h1 „Harmonogram“ přidat `id="sched-harmonogram-heading"`.
- **CpPortalPage.tsx:** U sekcí „Společné dokumenty pro CP“ a „Cizí postavy“ přidat na section `aria-labelledby="cp-docs-heading"` a `aria-labelledby="cp-roles-heading"`, na příslušné h2 `id="cp-docs-heading"` a `id="cp-roles-heading"`.

**PaperCardTitle:** V `src/components/ui/paper-card.tsx` rozšířit props o volitelný `id?: string` a předat ho na `<h2>`.

**I – Admin – postavy**

- **PersonsPage.tsx:** Tlačítko, které volá `window.open(\`/hrac/${detailPerson.slug}\`, "_blank")`, změnit text z „Portál“ na „Otevřít hráčský portál“ a přidat `title="Otevře portál hráče v novém okně"`.

**J – Admin – produkce**

- **ProductionPage.tsx:** U karty „Přístup k produkčnímu portálu“ změnit text pod inputem z „Sdílejte odkaz a heslo jen s důvěryhodnými členy týmu.“ na: „Sdílejte tento odkaz a heslo s členy týmu produkce. Heslo nastavíte tlačítkem Změnit heslo.“

---

### Blok 7: Dokumentace

- **Vytvořit** `docs/VYSLEDKY-UZIVATELSKYCH-TESTU.md` – šablona reportu (metadata, tabulka s řádky pro testy W1–U6, souhrn). Obsah lze zkopírovat z aktuálního repa.
- **Vytvořit** `docs/NAVRH-IMPLEMENTACE-FAZE2.md` – podrobný návrh implementace bodů A–J (soubory, před/po, kontrolní seznam). Obsah z aktuálního repa.
- **Upravit** `docs/PROJEKTOVA-DOKUMENTACE.md`: V sekci „Odkazy na další dokumenty“ přidat odkaz na `VYSLEDKY-UZIVATELSKYCH-TESTU.md` a `NAVRH-IMPLEMENTACE-FAZE2.md` (a na tento soubor `LOVABLE-UPGRADE-SPEC.md`).
- **Upravit** `README.md`: V sekci Dokumentace zmínit `VYSLEDKY-UZIVATELSKYCH-TESTU.md` a případně `LOVABLE-UPGRADE-SPEC.md`.

Lovable nemusí z dokumentace generovat kód; stačí soubory vytvořit/aktualizovat podle výše uvedeného.

---

## 4. Supabase – co neporušit a co ověřit

### Neměnit

- Názvy RPC: `get_person_documents`, `verify_person_by_slug`, `get_production_portal_data`, `verify_production_portal_access`, `get_my_organizer_larp_ids`, `can_access_portal_as_organizer`, `get_portal_session_as_organizer`, `assign_organizer_by_email`, `can_access_cp_portal_as_organizer`, `verify_production_portal_access`, `get_schedule_portal_events`, `verify_schedule_portal_access`, atd.
- Názvy tabulek: `organizer_accounts`, `larp_organizers`, `persons`, `documents`, `larps`, `runs`, atd.
- Názvy sloupců používaných frontendem.
- **Žádná nová migrace** v rámci tohoto upgradu. Všechny potřebné tabulky a RLS již existují.

### Volitelné (pro uživatele, ne Lovable)

- Uživatel může v Supabase SQL Editoru spustit `supabase/scripts/set-super-admin-email.sql` (po nahrazení e-mailu v proměnné), pokud chce v DB jiný e-mail super admina než výchozí.
- Nasazení Edge Function `create-organizer`: `npx supabase functions deploy create-organizer`. Tlačítko „Nový organizátor“ funguje až po nasazení; do té doby lze používat „Přiřadit podle e-mailu“.

### Po upgradu ověřit

1. **Build:** `npm run build` proběhne bez chyby.
2. **Env v Lovable:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPER_ADMIN_EMAIL` jsou nastavené (viz [docs/SYNC-GITHUB-LOVABLE.md](SYNC-GITHUB-LOVABLE.md)).
3. **Smoke test:** Přihlášení do adminu; načtení LARPů a běhů; hráčský portál (odkaz + heslo, zobrazení dokumentů, rozbalení accordionu); produkční portál (heslo, dokumenty v accordionu, theme toggle); Admin → Organizátoři (přiřazení podle e-mailu, klik na řádek → editace, odebrání).

---

## 5. Doporučené pořadí aplikace změn

1. **index.html** (Blok 1)
2. **OrganizersPage.tsx** (Blok 2)
3. **create-organizer/index.ts** + **README.md** (+ volitelně set-super-admin-email.sql a nápověda v OrganizersPage) (Blok 3)
4. **ProductionPortalPage.tsx** (Blok 4)
5. **PortalViewPage.tsx**, **PortalAccessPage.tsx**, **CpPortalPage.tsx**, **SchedulePortalPage.tsx** – theme toggle a UX (Bloky 5 a 6)
6. **PersonsPage.tsx**, **ProductionPage.tsx** (Blok 6 – I, J)
7. **paper-card.tsx** (Blok 6 – PaperCardTitle id)
8. **docs** – nové soubory a odkazy (Blok 7)

**Checklist po dokončení:** Build OK; env nastavené; přihlášení admin; portál hráče (heslo + dokumenty); produkční portál (heslo + accordion + theme); Organizátoři (editace řádku, přiřazení e-mailem).

---

## 6. Reference

- [docs/NAVRH-IMPLEMENTACE-FAZE2.md](NAVRH-IMPLEMENTACE-FAZE2.md) – podrobné před/po pro body A–J (soubory, třídy, přesné náhrady).
- [docs/SYNC-GITHUB-LOVABLE.md](SYNC-GITHUB-LOVABLE.md) – env proměnné a ověření po syncu.
- [README.md](../README.md) – nastavení projektu, migrace, Edge Function.
