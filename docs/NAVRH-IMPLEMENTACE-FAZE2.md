# Návrh implementace – Fáze 2 (úpravy UX po uživatelských testech)

Tento dokument popisuje **konkrétní kroky implementace** bodů A–J z plánu „Uživatelské testy a úpravy UX“. Každý bod obsahuje: cíl, soubory k úpravě, přesné změny (před/po nebo diff-style), pořadí a závislosti.

**Předpoklad:** Report uživatelských testů ([VYSLEDKY-UZIVATELSKYCH-TESTU.md](VYSLEDKY-UZIVATELSKYCH-TESTU.md)) je vyplněn; uživatel schválil, které body se realizují.

---

## Přehled bodů a souborů

| Bod | Název | Hlavní soubory |
|-----|--------|----------------|
| A | Čitelnost těla dokumentu na portálech | PortalViewPage.tsx, ProductionPortalPage.tsx, CpPortalPage.tsx |
| B | Jednotná výraznost nadpisů sekcí | PortalViewPage.tsx, ProductionPortalPage.tsx, SchedulePortalPage.tsx, CpPortalPage.tsx |
| C | Vizuální oddělení accordion položek | ProductionPortalPage.tsx, PortalViewPage.tsx (DocumentItem, DocumentCategory) |
| D | Stejné chování dokumentů na produkčním portálu | ProductionPortalPage.tsx (Accordion vs Collapsible – vizuál) |
| E | Nápověda „jak rozbalit“ na produkčním portálu | ProductionPortalPage.tsx |
| F | Jednotný vzhled přihlašovacích stránek | PortalAccessPage.tsx, ProductionPortalPage.tsx, SchedulePortalPage.tsx |
| G | Focus a klávesnice (accordion/collapsible) | Ověření Radix; případně DocumentItem „Sbalit“ |
| H | ARIA a sémantika sekcí | PortalViewPage.tsx, ProductionPortalPage.tsx, SchedulePortalPage.tsx, CpPortalPage.tsx |
| I | Odkaz „Otevřít portál“ v adminu u postavy | PersonsPage.tsx (úprava textu tlačítka) |
| J | Produkční portál – odkaz v Admin/Produkce | ProductionPage.tsx (drobné úpravy textu / vizuálu) |

---

## A. Zvýšení čitelnosti těla dokumentu na portálech

**Cíl:** Tělo textu v dokumentech lépe čitelné (větší písmo, řádkování, konzistentní kontrast).

### A.1 PortalViewPage.tsx – DocumentItem (obsah dokumentu)

- **Soubor:** `src/pages/portal/PortalViewPage.tsx`
- **Pozice:** Komponenta `DocumentItem`, řádek s `className` u `div` s `dangerouslySetInnerHTML` (obsah dokumentu).

**Aktuálně (přibližně ř. 809–811):**
```tsx
<div
  className="prose prose-sm max-w-none text-muted-foreground [&_h1]:mt-6 ..."
  dangerouslySetInnerHTML={{ __html: sanitizeHtml(document.content) }}
/>
```

**Změna:**
- Nahradit `prose prose-sm` za `prose max-w-none text-base leading-relaxed` (nebo ponechat `prose` a přidat `text-base leading-relaxed`).
- Barvu ponechat `text-foreground` pro lepší kontrast (místo `text-muted-foreground` pro tělo dokumentu), nebo ponechat muted jen u vedlejších textů; u hlavního obsahu dokumentu použít `text-foreground`.
- Výsledný řetězec například:  
  `"prose max-w-none text-base leading-relaxed text-foreground [&_h1]:mt-6 [&_h1]:mb-3 ..."`  
  (všechny stávající `[&_h1]` atd. ponechat).

**Přesná náhrada:**  
Najít řádek:
```tsx
className="prose prose-sm max-w-none text-muted-foreground [&_h1]:mt-6 ...
```
Nahradit za:
```tsx
className="prose max-w-none text-base leading-relaxed text-foreground [&_h1]:mt-6 [&_h1]:mb-3 [&_h1:first-child]:mt-0 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2:first-child]:mt-0 [&_h3]:mt-4 [&_h3]:mb-2 [&_h3:first-child]:mt-0 [&_p]:mb-3 [&_p:last-child]:mb-0"
```

### A.2 PortalViewPage.tsx – medailonek a mission briefing (prose)

- **Medailonek** (ř. cca 234–236): třída obsahuje `prose prose-sm` – změnit na `prose text-base leading-relaxed` a barvu podle kontextu (např. `text-muted-foreground` pro medailonek ponechat).
- **Mission briefing** (ř. cca 288): stejně – `prose prose-sm` → `prose text-base leading-relaxed`; barvu ponechat.

### A.3 ProductionPortalPage.tsx – obsah dokumentu v accordionu

- **Pozice:** AccordionContent s obsahem dokumentu (ř. cca 303–305).

**Aktuálně:**
```tsx
className="prose prose-sm max-w-none text-foreground pb-2"
```

**Změna:**  
`prose prose-sm` → `prose max-w-none text-base leading-relaxed text-foreground pb-2`.

### A.4 CpPortalPage.tsx – obsah dokumentu (prose)

- **Pozice:** Řádek s `prose prose-sm max-w-none text-muted-foreground` u CP dokumentů (ř. cca 586).

**Změna:**  
Stejný princip: `prose text-base leading-relaxed text-foreground` (nebo ponechat muted podle designu CP sekce).

---

## B. Jednotná výraznost nadpisů sekcí na portálech

**Cíl:** Všechny nadpisy sekcí (Dokumenty, Mission Briefing, Checklist, Materiály atd.) používají stejný vizuální styl.

**Konvence:** `font-typewriter text-xl tracking-wider uppercase text-foreground` (+ případně `flex items-center gap-2` a ikona).

### B.1 PortalViewPage.tsx

- Sekce „Dokumenty“ (ř. cca 455):  
  Aktuálně: `font-typewriter text-xl tracking-wider uppercase text-foreground mb-4`  
  Ponechat nebo sjednotit na: `font-typewriter text-xl tracking-wider uppercase text-foreground mb-4` (již odpovídá).
- PaperCardTitle pro „Mission Briefing“, „Rychlé info“ atd. – v komponentě PaperCardTitle je již `font-typewriter text-xl tracking-wide`. Pro jednotu s ostatními portály lze v těchto kartách použít přímo na nadpisech třídu `font-typewriter text-xl tracking-wider uppercase text-foreground` (pokud se má sjednotit s produkčním portálem).

### B.2 ProductionPortalPage.tsx

- „Dokumenty“ (ř. cca 291):  
  Aktuálně: `font-typewriter text-lg flex items-center gap-2 mb-3`  
  **Změna:** `font-typewriter text-xl tracking-wider uppercase text-foreground flex items-center gap-2 mb-3`.
- „Checklist před během“ (ř. cca 254):  
  Aktuálně: `font-typewriter text-xl tracking-wide flex ...`  
  **Změna:** `font-typewriter text-xl tracking-wider uppercase text-foreground flex ...`.
- „Materiály“ (ř. cca 323):  
  Stejná úprava: `font-typewriter text-xl tracking-wider uppercase text-foreground flex items-center gap-2 mb-3`.

### B.3 SchedulePortalPage.tsx

- Nadpis „Harmonogram“ a podnadpisy – přidat/sjednotit na `font-typewriter text-xl tracking-wider uppercase text-foreground` tam, kde jsou to sekční nadpisy.

### B.4 CpPortalPage.tsx

- „Společné dokumenty pro CP“, „Moje scény“, „Hráči“ atd. – již používají `font-typewriter text-xl tracking-wider uppercase`. Ověřit, že všude je i `text-foreground` a `tracking-wider` pro shodu.

---

## C. Vizuální oddělení accordion položek

**Cíl:** Každá položka accordionu/collapsible vypadá jako samostatná karta (border, pozadí, padding, hover).

### C.1 ProductionPortalPage.tsx – AccordionItem

- **Aktuálně:** `AccordionItem key={doc.id} value={doc.id} className="border rounded-md px-3 bg-muted/20"`.
- **Změna:** Zvýraznit oddělení: např. `className="border rounded-md px-3 bg-muted/20 mb-2 last:mb-0"` a u AccordionTrigger přidat `hover:bg-muted/40 transition-colors` a dostatečný padding (již `py-3`).

### C.2 PortalViewPage.tsx – DocumentItem (Collapsible)

- **Aktuálně:** Tlačítko trigger má `py-2 px-4` a `isEven ? "bg-muted/20" : ""`.
- **Změna:** Obalit každý dokument do kontejneru s `border rounded-md bg-muted/20` (nebo podobně), aby byl vizuálně oddělený; trigger `hover:bg-muted/40 rounded-md`.

### C.3 PortalViewPage.tsx – DocumentCategory

- Trigger kategorie: ponechat nebo přidat `rounded-t-md` pokud je karta pod ním s borderem, aby nebyl „zlom“.

---

## D. Stejné chování dokumentů na produkčním portálu jako na hráčském

**Cíl:** Produkční portál používá accordion s více rozbalenými položkami; vizuálně podobné hráčskému (šipka, padding).

- **Stav:** ProductionPortalPage již používá `<Accordion type="multiple">` – více dokumentů lze mít rozbalených.
- **Vizuál:** Radix AccordionTrigger již přidává ChevronDown (v `src/components/ui/accordion.tsx`). Na hráčském portálu je ChevronRight s rotací. Pro sblížení vizuálu lze:
  - Buď ponechat stávající Accordion (ChevronDown) – je srozumitelné.
  - Nebo v ProductionPortalPage nepoužívat výchozí AccordionTrigger a vykreslit vlastní trigger s ChevronRight a `rotate-90` při otevření (jako v DocumentItem) – vyžaduje přepsat použití Accordion v ProductionPortalPage na vlastní trigger s AccordionTrigger asChild.

**Doporučení:** Ponechat Radix Accordion s ChevronDown; pouze zajistit jednotný padding a barvy (viz C). Pokud uživatel výslovně chce šipku vpravo jako na hráčském portálu, pak:
- V ProductionPortalPage pro každý AccordionItem použít AccordionTrigger s `asChild` a vlastním obsahem: ikona ChevronRight + název; při `data-state=open` přidat `rotate-90` na šipku (podle Radix data atributu).

---

## E. Nápověda „jak rozbalit“ na produkčním portálu

**Cíl:** Krátká instrukce, že dokumenty se rozbalí kliknutím na název.

- **Soubor:** `src/pages/portal/ProductionPortalPage.tsx`
- **Pozice:** Pod nadpisem „Dokumenty“, nad samotným Accordionem (nebo hned pod ním).

**Přidat jeden odstavec:**
```tsx
<p className="text-sm text-muted-foreground mb-3">
  Kliknutím na název dokumentu rozbalíte jeho obsah.
</p>
```
(vložit mezi `<h2>Dokumenty</h2>` a `<Accordion ...>`).

---

## F. Jednotný vzhled přihlašovacích stránek portálů

**Cíl:** Stejná struktura: název portálu nahoře, jedna karta s formulářem, tlačítko přihlásit, přepínač témat vpravo nahoře; volitelně jednotný podtitul.

### F.1 Struktura (všechny tři)

- **PortalAccessPage:** Již má název „LARP PORTÁL“, podtitul „Přístup k materiálům“, kartu s heslem, ThemeToggle vpravo nahoře.
- **ProductionPortalPage (při !session):** Název „Produkční portál“, podtitul „Přístup pro tým produkce“, ThemeToggle vpravo nahoře. Sjednotit podtitul na něco jako: „Zadejte heslo, které jste obdrželi od organizátora.“ (nebo ponechat „Přístup pro tým produkce“ a pod kartu přidat větu o hesle.)
- **SchedulePortalPage (při !session):** Název „Portál harmonogramu“, podtitul „Read-only zobrazení harmonogramu běhu“. Přidat pod kartu text: „Heslo vám poskytne organizátor.“ a ověřit ThemeToggle vpravo nahoře.

### F.2 Konkrétní úpravy

- **ProductionPortalPage.tsx** – přihlašovací obrazovka: pod formulářem (pod tlačítkem Přihlásit) přidat:  
  `<p className="mt-4 text-center text-xs text-muted-foreground">Heslo vám poskytne organizátor.</p>`  
  (nebo podobně).
- **SchedulePortalPage.tsx** – přihlašovací obrazovka: pod formulářem přidat stejnou nebo podobnou větu o hesle od organizátora.
- **PortalAccessPage.tsx** – již má text „Heslo jste obdrželi od organizátora hry.“ – žádná změna, nebo zkrátit na „Heslo vám poskytne organizátor.“ pro jednotu.

---

## G. Focus a klávesnice

**Cíl:** Rozbalení/sbalení accordionu a collapsible jde z klávesnice (Tab, Enter/Space).

- **Radix Accordion / Collapsible:** Již poskytují fokusovatelné triggery a reakci na Enter/Space. Ověřit v prohlížeči: Tab na trigger, Enter/Space rozbalí/sbalí.
- **PortalViewPage – tlačítko „Sbalit“:** Zajistit, že je to `<button type="button">` (ne div) a že po focusu jde aktivovat Space/Enter. Aktuálně je to `<Button variant="ghost" size="sm">` – tedy button; ověřit, že nemá `tabIndex={-1}` a že je v pořadí tabulátoru za obsahem dokumentu.

**Implementace:** Žádná změna kódu, pokud ověření projde. Pokud by „Sbalit“ nebyl ve fokusu, přidat ho do tab order a případně `aria-label="Sbalit dokument"`.

---

## H. ARIA a sémantika sekcí

**Cíl:** Sekce portálu jsou v `<section>` s `aria-labelledby` odkazujícím na nadpis.

### H.1 PortalViewPage.tsx

- Sekce dokumentů: obalit blok „Dokumenty“ (nadpis + DocumentCategory komponenty) do `<section aria-labelledby="portal-docs-heading">` a nadpisu dát `id="portal-docs-heading"`.
- Mission Briefing: obalit do `<section aria-labelledby="mission-briefing-heading">` a nadpisu dát odpovídající id.
- Podobně karta postavy, CP scény atd. – každá hlavní sekce jako `<section>` s jedinečným `id` na nadpisu a `aria-labelledby` na section.

### H.2 ProductionPortalPage.tsx

- Checklist: `<section aria-labelledby="prod-checklist-heading">` a nadpis `id="prod-checklist-heading"`.
- Dokumenty: `<section aria-labelledby="prod-docs-heading">`.
- Materiály: `<section aria-labelledby="prod-materials-heading">`.

### H.3 SchedulePortalPage.tsx a CpPortalPage.tsx

- Hlavní obsahové bloky obalit do `<section>` s `aria-labelledby` a odpovídajícími id na nadpisech.

---

## I. Odkaz „Otevřít portál“ v adminu u postavy

**Cíl:** Organizátor rychle otevře hráčský portál v novém okně.

- **Stav:** V PersonsPage.tsx na ř. cca 720–726 je tlačítko s textem „Portál“ a `onClick={() => window.open(\`/hrac/${detailPerson.slug}\`, "_blank")}`.
- **Změna:** Pouze úprava textu tlačítka (a případně title) na „Otevřít hráčský portál“, aby bylo zřejmé, co se stane. Např.:
  - Text tlačítka: `Otevřít hráčský portál` (místo „Portál“).
  - `title="Otevře portál hráče v novém okně"` na Button.

---

## J. Produkční portál – odkaz v Admin/Produkce

**Cíl:** Odkaz pro tým je zřetelně viditelný; instrukce „sdílejte s heslem“ jasná.

- **Stav:** Na ProductionPage je karta „Přístup k produkčnímu portálu“, uvnitř read-only Input s URL, tlačítka „Zkopírovat odkaz“ a „Změnit heslo“, text „Sdílejte odkaz a heslo jen s důvěryhodnými členy týmu.“
- **Změna:** Drobné úpravy textu pro jednotu a jasnost:
  - Pod inputem s URL přidat jednořádkovou instrukci: „Sdílejte tento odkaz a heslo s členy týmu produkce.“ (nebo ponechat stávající a doplnit „Heslo nastavíte tlačítkem Změnit heslo.“)
  - Nadpis karty ponechat; případně podnadpis upřesnit, že „odkaz + heslo“ se sdílí společně.

Žádná zásadní změna layoutu – odkaz již není v rozbalovce, je v kartě nahoře.

---

## Pořadí implementace a závislosti

1. **A, B** – lze paralelně; ovlivňují všechny portály (čitelnější text, sjednocené nadpisy).
2. **C** – vizuál accordionů; závisí jen na znalosti komponent.
3. **D** – volitelné (vizuál šipky na produkčním portálu); lze po C.
4. **E** – nezávislé; jedna nápověda v ProductionPortalPage.
5. **F** – nezávislé; úpravy tří přihlašovacích stránek.
6. **G** – ověření + případně malé úpravy tlačítka Sbalit.
7. **H** – přidání `<section>` a id/aria-labelledby; lze po A/B.
8. **I** – jedna úprava textu v PersonsPage.
9. **J** – drobné úpravy textu v ProductionPage.

**Doporučené pořadí:** A → B → C → E → F → H → I → J → G → D (D volitelně na závěr).

---

## Kontrolní seznam před dokončením

- [ ] Všechny úpravy prose (A) aplikovány na PortalViewPage, ProductionPortalPage, CpPortalPage; v dark režimu ověřena čitelnost.
- [ ] Nadpisy sekcí (B) sjednoceny na `font-typewriter text-xl tracking-wider uppercase text-foreground` tam, kde je to sekční nadpis.
- [ ] Accordion/collapsible položky (C) mají border/pozadí a hover.
- [ ] Na produkčním portálu je nápověda (E) „Kliknutím na název dokumentu rozbalíte jeho obsah.“
- [ ] Přihlašovací stránky (F) mají jednotnou větu o hesle od organizátora.
- [ ] Sekce portálů (H) jsou v `<section>` s aria-labelledby.
- [ ] Tlačítko v adminu u postavy (I) má text „Otevřít hráčský portál“.
- [ ] Produkce (J) má jasnou instrukci k sdílení odkazu a hesla.
- [ ] Klávesnice (G) ověřena na accordionu a tlačítku Sbalit.
