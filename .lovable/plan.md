
# Redesign harmonogramu - vizualni grid + UX vylepseni

## 1. Vizualni redesign gridu

### Aktualni stav
- Grid pouziva 15min sloty s vyskou 88px (prilis velke, plytve mistem)
- Boxy udalosti jsou vizualne monotonni - tezke rozlisit CP vstupy od materialu
- Vsechny informace jsou viditelne naraz (preplnene boxy)
- Barvy jsou "stone/amber" paleta - neni dostatecne kontrastni

### Nove reseni
- **Zmensit SLOT_HEIGHT_PX na 4px** (1 slot = 1 minuta) - grid bude plynulejsi, udalosti budou mit presnou vysku odpovidajici delce
- **MINUTES_PER_SLOT = 5** - jemnejsi grid s casovymi znackami po 30 minutach (misto kazdy slot)
- **Kompaktni boxy** - zaklad zobrazuje jen:
  - CP VSTUP: typ label + jmeno CP (tucne)
  - Material: typ label + nazev materialu
  - Ostatni: typ + nazev
- **Rozkliknuti** (click) rozbali box horizontalne (pres vice lane) a zobrazi detaily: lokace, performer, popis, tlacitka edit/delete
- **Vizualni odliseni typu:**
  - CP vstupy: vyrazny levy border (4px) v barve CP + jemne pozadi
  - Materialy: sedy border + ikona balicku
  - Organizacni/jidlo/presun: jemne neutralni pozadi
- **Plynule barvy** - pouzit CSS transitions na hover a expand
- **Casove znacky** - zobrazovat jen cele a pul hodiny (ne kazdych 15 min)

### Technicke detaily
- `MINUTES_PER_SLOT = 5`, `SLOT_HEIGHT_PX = 4` (kazda minuta = 4px, takze 15min udalost = 60px, 60min = 240px)
- Casove labely zobrazovat jen pro celou hodinu a pulhodinu
- `ScheduleEventBox` dostane stav `expanded` (useState) - click toggle
- Expanded box dostane `z-index: 20`, `position: absolute` pres vice lane, vetsi padding, zobrazi vsechny detaily
- Transition: `transition-all duration-200 ease-in-out`

## 2. Odkaz na portal nahore + sprava hesla

### Aktualni stav
- Sekce "Pristup k portalu harmonogramu" je dole na strance (radky 1467-1505)
- Pouziva Input + tlacitko Zkopirovat (stejny problem jako u produkce)
- Chybi moznost zrusit heslo (bez-hesla pristup)

### Nove reseni
- **Presunout portal sekci nahoru** - pod nadpis "Harmonogram", pred filtry
- **Nahradit Input+Copy za primy odkaz** `<a href={url} target="_blank">` (jako u produkce)
- **Pridat tlacitko "Zrusit heslo"** vedle "Zmenit heslo" - nastavi password_hash na prazdny retezec
- **Pridat tlacitko "Vytvorit bez hesla"** vedle "Vytvorit pristup" pro bez-hesla rezim
- **Na portalu** (`SchedulePortalPage.tsx`) - podpora prazdneho hesla (skip login screen)

### DB zmeny
- Vytvorit RPC `create_schedule_portal_access_no_password` (analogie k produkci)
- Vytvorit RPC `remove_schedule_portal_password` 
- Vytvorit RPC `check_schedule_portal_passwordless` - overi token a vrati run_id pokud je heslo prazdne
- Upravit `verify_schedule_portal_access` nebo pridat novou logiku

## 3. Editace sceny a materialu primo z harmonogramu

### Aktualni stav
- CP sceny: uz existuje `openCpSceneEdit` (radek 820) + `CpSceneDialog` - FUNGUJE
- Materialy: zadna editace z harmonogramu - chybi

### Nove reseni
- **CP sceny**: V expanded boxu pridat tlacitko "Upravit scenu" ktere zavola `openCpSceneEdit`
- **Materialy**: V expanded boxu pridat tlacitko "Upravit material" - otevre dialog s editaci nazvu, URL, poznamky materialu
- Pridat novy `MaterialEditDialog` komponent (nebo inline dialog)

## 4. Soubory ke zmene

| Soubor | Zmeny |
|--------|-------|
| `src/pages/admin/SchedulePage.tsx` | Redesign gridu, presun portalu nahore, expand boxy, edit materialu |
| `src/pages/portal/SchedulePortalPage.tsx` | Podpora bez-hesla, vizualni update boxu |
| Migrace SQL | RPCs pro bez-hesla pristup k harmonogramu |

## 5. Poradi implementace

1. DB migrace - RPCs pro passwordless harmonogram
2. Admin SchedulePage - portal nahore + hesla
3. Admin SchedulePage - vizualni redesign gridu (slot height, barvy, kompaktni boxy)
4. Admin SchedulePage - expandovatelne boxy s edit tlacitky
5. SchedulePortalPage - passwordless + vizualni update
6. Testovani - overeni DnD, expand/collapse, edit scen a materialu
