# Implementace zpetne vazby z portalu

## Prehled zpetne vazby (roztrideno podle temat)

### A. Bugy (kriticke)

1. **Proklik z CP portalu na konkretni CP/hrace nefunguje** - zobrazuje obsah posledne navstiveneho CP (staly session v localStorage)
2. **Hledani v harmonogramu nefunguje podle performera** - filtr kontroluje jen jmeno CP, ne performera

### B. Chybejici funkce

3. **CP detail (admin): chybi tlacitko pro prideleni performera** - existuje jen maly edit button u textu "Hraje:"
4. **Produkcni portal: odkaz nahoře + volitelne heslo** - chybi odkaz na portal nahore na strance + moznost nechat portal bez hesla
5. **Hesla na portály** - nastavení hesel přes admina k různým portálům (hráč má svůj originál) + existuje možnost  heslo zrušit, pak to pustí portál bez hesla (link rovnou skáče na obsah a není tam "zadat heslo) 
6. **Vice checklistu ve sloupcich** - moznost pridat pojmenovane checklisty vedle sebe

### C. Designove vylepseni

6. **Harmonogram: vizualni redesign** - sjednotit design s boxiky CP a hracu, odlisit CP vstupy od materialu
7. **Portály -** při scrollování když jsou otevřené dokumenty, tak header (název dokumentu, na který lze kliknout a sbalit) zůstává viditelný nahoře na stránku
8. Mobilní verze admin - boční lišta se sbalí doleva jen na proužek, když je rozbalená, tak totiž nejde vidět na mobilu zbytek aplikace

### D. Odlozeno (slozite, vyzaduje dalsi analyzu)

7. Tisk/stazeni jednotlivych podcasti portalu (PDF export) - vyzaduje knihovnu pro PDF generovani
  1. bude možnost tisku každého dokumentu zvlášť
8. Harmonogram: neaktivni sbalene, uplynule mizi v live modu - caste zmeny stavu
9. Dashboard jako vyber larpu - zmena architektury navigace

---

## Plan implementace (5 ukolu)

### Ukol 1: Oprava navigace z CP portalu (bug)

**Problem:** `usePortalSession` uklada session do localStorage pod jednim klicem `larp_portal_session`. Kdyz uzivatel klikne na CP portalu na jinou postavu, `PortalViewPage` pouzije starý session z localStorage misto toho, aby nacetl data pro novy slug z URL.

**Reseni:** V `PortalViewPage.tsx` pridat kontrolu, zda `session.personSlug` odpovida aktuálnímu `slug` z URL. Pokud ne, automaticky znovu nacist session pro spravny slug (pres `enterWithoutPassword` pro CP portal, resp. presmerovat na prihlaseni pro hracsky portal).

**Soubory:**

- `src/pages/portal/PortalViewPage.tsx` - pridat useEffect pro detekci zmeny slugu a refresh session

### Ukol 2: Oprava hledani v harmonogramu podle performera

**Problem:** Filtr na radku 599-604 v `SchedulePage.tsx` kontroluje `e.title`, `e.description`, `e.location` a `e.persons?.name`, ale ne `e.performer_text` ani `e.persons?.performer`.

**Reseni:** Pridat do filtru kontrolu `e.performer_text` a `(e.persons as any)?.performer`.

**Soubory:**

- `src/pages/admin/SchedulePage.tsx` - rozsirit filteredEvents o performer

### Ukol 3: Tlacitko pro prideleni performera na CP detailu + vizualni vylepseni

**Problem:** Na strance CP detailu je performer zobrazen jen jako maly text "Hraje: XY" s drobnym edit ikonou. Uzivatel ho snadno prehlédne.

**Reseni:** Pridat do action baru (vedle tlacitek "Upravit", "Smazat", "Portal") viditelne tlacitko "Pridat performera" / "Zmenit performera" se vyraznou ikonou.

**Soubory:**

- `src/pages/admin/CpDetailPage.tsx` - pridat tlacitko do horni action lišty

### Ukol 4: Produkcni portal - odkaz nahore + volitelne heslo

**Problem:** 

- Na admin strance Produkce je sekce "Pristup k produkcnimu portalu" dole na strance, zatimco u Hracu a CP je odkaz nahore.
- Neni moznost ponechat portal bez hesla.

**Reseni:**
a) Presunout sekci s odkazem na portal nahoru (pod nadpis, pred checklist), jednotny s ostatnimi admin strankami.
b) Pridat moznost "Bez hesla" - tlacitko "Vytvorit pristup bez hesla" vedle "Vytvorit pristup". V DB to bude znamenat ulozeni prazdneho password_hash.
c) Pridat tlacitko "Zrusit heslo" vedle "Zmenit heslo" pro existujici pristupy.
d) Na produkcnim portalu (`ProductionPortalPage.tsx`) pri overovani: pokud je password_hash prazdny, pustit bez hesla.

**Soubory:**

- `src/pages/admin/ProductionPage.tsx` - presunout portal sekci nahoru, pridat tlacitka pro bez-hesla rezimy
- `src/pages/portal/ProductionPortalPage.tsx` - upravit overovani aby podporovalo prazdne heslo
- Migrace: vytvorit RPC `create_production_portal_access_no_password` nebo upravit existujici

### Ukol 5: Vice checklistu ve sloupcich

**Problem:** Aktualne existuje jeden checklist pro beh. Uzivatel chce mit vice pojmenovanych checklistu vedle sebe (napr. "Nakupy", "Priprava lokace", "Technika").

**Reseni:**
a) Pridat do tabulky `run_checklist` sloupec `checklist_group` (text, default "Hlavni").
b) Na admin strance seskupit polozky podle `checklist_group` a zobrazit je ve sloupcich (responsive grid).
c) Pridat moznost vytvorit novy checklist (= novou skupinu) a pojmenovat ho.
d) Na produkcnim portalu zobrazit checklisty ve sloupcich.

**Soubory:**

- Migrace: ALTER TABLE `run_checklist` ADD COLUMN `checklist_group` text NOT NULL DEFAULT 'Hlavni'
- `src/pages/admin/ProductionPage.tsx` - seskupit polozky do sloupcu, pridat dialog pro novy checklist
- `src/pages/portal/ProductionPortalPage.tsx` - zobrazit checklisty ve sloupcich

---

## Technicke detaily

### Databazove zmeny

1. **run_checklist** - novy sloupec `checklist_group text NOT NULL DEFAULT 'Hlavni'`
2. **production_portal_access** - upravit RPC aby podporovalo prazdne heslo (password_hash = '' nebo null)

### Zmeny v souborech


| Soubor                                      | Popis zmeny                                       |
| ------------------------------------------- | ------------------------------------------------- |
| `src/pages/portal/PortalViewPage.tsx`       | Detekce zmeny slugu, refresh session              |
| `src/pages/admin/SchedulePage.tsx`          | Rozsireni filtru o performer                      |
| `src/pages/admin/CpDetailPage.tsx`          | Tlacitko pro performera v action baru             |
| `src/pages/admin/ProductionPage.tsx`        | Portal nahore, checklisty ve sloupcich, bez-hesla |
| `src/pages/portal/ProductionPortalPage.tsx` | Podpora bez-hesla, checklisty ve sloupcich        |


### Poradi implementace

1. Bug fixy (ukoly 1, 2) - nejdrive
2. UX vylepseni (ukoly 3, 4) - pote
3. Nova funkcionalita (ukol 5) - nakonec