# Etapa 2 — Běh kompletně (bez harmonogramu)

Postavím všechny stránky a komponenty pro správu běhu kromě harmonogramu. Magic linky a e-maily zůstávají na samostatný sub-sprint (jsou velké a vyžadují email-domain setup) — připravím ale DB hooky tak, aby se to napojilo později bez refaktoru.

## Co tato dávka přináší

Zakládání profilů lidí - možnost vytvářet nové hráče a performery přes relevantní stránky (přes CP, přes Hráče i přes běh. 

### 1. Stránka Hráči v běhu — `/larp/:larpSlug/beh/:runSlug/hraci`

Plnohodnotná tabulka postav v běhu (zdroj pravdy = `run_person_assignments`):

- Řádek = postava z LARPu (typ `postava`), s případným přiřazeným hráčem.
- Sloupce: postava (+ skupina), jméno hráče, e-mail, telefon, stav platby, akce.
- **Přiřazení hráče** — inline edit (jméno/email/telefon), uložení vytvoří/updatuje řádek v `run_person_assignments`.
- **Z dřívějších běhů** — autocomplete při vyplňování jména/emailu nabídne hráče, kteří už hráli některý běh tohoto LARPu (využiju logiku z `V2LarpPlayersPage`).
- **Platba** — toggle "Zaplaceno" → `paid_at = now()` / `null`.
- **Heslo do portálu** — tlačítko "Vygenerovat heslo" (přes RPC `create_person_assignment_with_password`), zobrazí náhled hesla.
- **Hromadné akce** — "Přiřadit všechny postavy" (založí prázdné assignmenty), "Označit všechny zaplacené".
- **Filtry** — vyhledávání + filtr "jen nepřiřazené" / "jen nezaplacené".
- **Souhrn nahoře** — N/M přiřazeno, K zaplaceno.

### 2. Stránka CP performeři v běhu — `/larp/:larpSlug/beh/:runSlug/cp`

Zdroj pravdy = `cp_performers`:

- Řádek = CP z LARPu (typ `cp`).
- Sloupce: CP (+ skupina), performer (jméno/email/telefon), akce.
- **Inline edit** performer dat, uložení vytvoří/updatuje řádek v `cp_performers`.
- **Návrh performera z minulých běhů** — autocomplete (cross-run aggregation podobně jako hráči, pouze pro CP).
- **Hromadné akce** — "Zkopírovat performery z předchozího běhu" (vezme nejnovější uplynulý běh a překlopí přiřazení 1:1).

### 3. Detail postavy — sjednocení

- `PlayerAssignmentsCard` dnes existuje na detailu postavy. Nechávám, ale přidám tlačítko "Otevřít v běhu →" které odkáže na novou stránku Hráči konkrétního běhu.

### 4. Cockpit běhu — vylepšení

- Stat "Hráči" linkuje na novou stránku.
- Stat "CP performeři" linkuje na novou stránku.
- V issues přibude přesnější rozpis nezaplacených / bez performera.

### 5. Hraci v LARPu (cross-run directory)

- Stávající `V2LarpPlayersPage` rozšířím o tlačítko "Pozvat do běhu" které otevře dialog s výběrem běhu + postavy → vytvoří assignment s prefill daty.

## Co teď NESTAVÍM (oddělím do dalšího sub-sprintu, abychom dokončili tuto dávku rychle)

- Magic linky + veřejné `/m/:token` routy.
- E-mailové šablony, odesílání pozvánek.
- Hráčský portál na `/p/:larpSlug/:personSlug` (zůstává stávající `/portal/...`).
- Harmonogram (next sprint dle uživatele).

Po schválení tohoto kroku ti potvrdím a hned přejdeme na magic linky + e-maily jako samostatný PR.

## Technické poznámky

- Žádné DB změny — schéma `run_person_assignments` a `cp_performers` stačí.
- Pro autocomplete dřívějších hráčů použiju agregaci přes všechny runy LARPu (existuje již v `V2LarpPlayersPage`) — vytáhnu do hooku `useLarpPlayerHistory(larpId)`.
- Komponenty: `V2RunPlayersPage.tsx`, `V2RunCpPage.tsx`, sdílený `PlayerAutocompleteInput.tsx`, `PerformerAutocompleteInput.tsx`.
- Tlačítka stylem jednotná (variant="outline" + ikona, jak jsme sjednotili dříve).

## Akceptace

- Můžu otevřít běh → Hráči, vidím všechny postavy, přiřadím hráče, označím platbu.
- Můžu otevřít běh → CP, přiřadím performery.
- Při psaní jména/emailu mi to navrhne hráče z minulých běhů.
- Cockpit ukazuje správná čísla a odkazy fungují.

Mám stavět?