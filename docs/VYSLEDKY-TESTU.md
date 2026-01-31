# Výsledky testů – LARP Gateway

**Datum:** 2025-01-31  
**Prostředí:** Vitest 3.2.4, jsdom, @testing-library/react

---

## Shrnutí

| Stav | Počet |
|------|--------|
| **Prošlo** | 78 testů |
| **Selhalo** | 0 |
| **Soubory** | 13 testovacích souborů |

---

## Testovací sady

### 1. `src/lib/sanitize.test.ts` (6 testů)
- **Účel:** Jednotkové testy sanitizace HTML (DOMPurify).
- **Testy:** Prázdný/ne-string vstup; ponechání bezpečného HTML (p, strong, a); odstranění script a nebezpečných tagů; odstranění onclick; povolené atributy u odkazu.
- **Výsledek:** ✓ Vše prošlo.

### 2. `src/lib/constants.test.ts` (6 testů)
- **Účel:** Konstanty aplikace (APP_NAME, DOCUMENT_TYPES, EVENT_TYPES, PERSON_TYPES, TARGET_TYPES, ROUTES).
- **Výsledek:** ✓ Vše prošlo.

### 3. `src/hooks/usePortalSession.test.tsx` (6 testů)
- **Účel:** Hook portálové session – ověření přístupu (RPC), session, clearSession.
- **Testy:** Vyhození chyby mimo PortalProvider; výchozí stav (session null); verifyAccess při prázdné odpovědi RPC (false); verifyAccess při chybě RPC (false); verifyAccess při úspěchu (session + localStorage, včetně larpTheme); clearSession smaže session a localStorage.
- **Mock:** Supabase `rpc` mockován.
- **Výsledek:** ✓ Vše prošlo.

### 4. `src/pages/portal/PortalAccessPage.test.tsx` (4 testy)
- **Účel:** Stránka ověření přístupu k portálu (heslo).
- **Testy:** Zobrazení nadpisu a formuláře hesla; odkaz „Zpět na úvodní stránku"; po úspěšném ověření přesměrování na `/portal/:token/view` a volání RPC; zobrazení chybové hlášky při neplatném hesle.
- **Výsledek:** ✓ Vše prošlo.

### 5. `src/App.routes.test.tsx` (4 testy)
- **Účel:** Routování a přístup k veřejným stránkám.
- **Testy:** `/` – úvodní stránka (LandingPage, LARP PORTÁL); `/login` – přihlašovací stránka; `/portal/:token` – stránka ověření hesla; neexistující cesta – 404 (NotFound).
- **Poznámka:** Testy renderují jednotlivé stránky s MemoryRouter a potřebnými providery (AuthProvider, RunProvider, PortalProvider), bez vnořeného BrowserRouter z App.
- **Výsledek:** ✓ Vše prošlo.

### 6. `src/test/example.test.ts` (1 test)
- **Účel:** Základní sanity test.
- **Výsledek:** ✓ Prošel.

### 7. `src/hooks/useAuth.test.tsx` (6 testů)
- **Účel:** Autentizační hook – stav session, login, logout, registrace.
- **Výsledek:** ✓ Vše prošlo.

### 8. `src/hooks/useLarpContext.test.tsx` (6 testů)
- **Účel:** Kontext pro správu LARPů – načtení, výběr, aktualizace.
- **Výsledek:** ✓ Vše prošlo.

### 9. `src/hooks/useRunContext.test.tsx` (6 testů)
- **Účel:** Kontext pro správu běhů – načtení běhů podle LARPu, výběr běhu.
- **Výsledek:** ✓ Vše prošlo.

### 10. `src/pages/LandingPage.test.tsx` (6 testů)
- **Účel:** Úvodní stránka – zobrazení nadpisu, tlačítek, navigace.
- **Výsledek:** ✓ Vše prošlo.

### 11. `src/pages/auth/LoginPage.test.tsx` (8 testů)
- **Účel:** Přihlašovací stránka – formulář, validace, přihlášení.
- **Výsledek:** ✓ Vše prošlo.

### 12. `src/pages/admin/SchedulePage.test.tsx` (10 testů)
- **Účel:** Stránka harmonogramu – zobrazení, vytváření, filtrování událostí.
- **Testy:** Zobrazení nadpisu; prázdný stav; tlačítko přidat; existující události; typ jako badge; otevření dialogu; zpráva bez běhů; vyhledávací pole; filtrování; tlačítko spustit běh.
- **Výsledek:** ✓ Vše prošlo.

### 13. `src/pages/admin/RunsPage.test.tsx` (9 testů)
- **Účel:** Stránka běhů – CRUD, navigace na detail, přiřazení hráčů.
- **Testy:** Zobrazení nadpisu; prázdný stav; tlačítko nový běh; existující běhy; otevření dialogu; LarpPicker bez vybraného LARPu; navigace na detail; detail s přiřazeními hráčů.
- **Výsledek:** ✓ Vše prošlo.

---

## Úpravy aplikace provedené na základě testů

1. **usePortalSession – chybějící `larpTheme` v session**  
   V RPC `verify_person_access` se vrací `larp_theme`, ale do objektu session a do localStorage se neukládal. Do rozhraní `PortalSession` byl doplněn `larpTheme`, do sestavení session z řádku RPC bylo přidáno `larpTheme: row.larp_theme ?? null` a při aplikaci tématu se používá `newSession.larpTheme`.

2. **PortalViewPage – precedence operátorů `??` a `||`**  
   Výraz `(session.performer ?? session.groupName || session.performanceTimes)` byl upraven na `((session.performer ?? session.groupName) || session.performanceTimes)` kvůli požadavku linteru na závorky při míchání `??` a `||`.

3. **Testy**  
   - Oprava testu „vyhodí chybu mimo PortalProvider" (expect().toThrow() nechytal chybu v Reactu) – doplněn try/catch a kontrola console.error.  
   - App.routes: zrušen render celého App uvnitř MemoryRouter (dva Routery), místo toho render jednotlivých stránek s Routes a potřebnými providery.  
   - Landing a Login vyžadují AuthProvider (a Landing i RunProvider); doplněno do testů.  
   - Landing test: na stránce je více výskytů textu „LARP PORTÁL" – assertion změněna na `getAllByText(...).length > 0`.
   - RunsPage.test.tsx: Opraveny selektory pro dialog (použití `getByRole("heading", { level: 2 })` místo `getByText`).
   - RunsPage.test.tsx: Opraven test „zobrazí zprávu když není vybrán LARP" – stránka zobrazuje LarpPicker, ne vlastní zprávu.

---

## Varování v průběhu testů (nebrání průchodu)

- **React Router Future Flag:** varování k v7_startTransition a v7_relativeSplatPath – informační, žádná úprava v této fázi.
- **An update to AuthProvider inside a test was not wrapped in act(...):** asynchronní nastavení session v AuthProvider po getSession(); testy procházejí, případně lze v budoucnu obalit render do `waitFor` / `act`.
- **Missing `Description` for {DialogContent}:** varování pro dialogy bez aria-describedby – kosmetické.

---

## Spuštění testů

```sh
cd larp-gateway-app
npm run test -- --run
```

Průběžné spouštění (watch): `npm run test` (bez `--run`).
