

# Oprava prazdnych PDF a pridani download menu

## Problem 1: Prazdne (bile) PDF

Pricina je v `src/lib/pdf-export.ts` na radku 74. Kontejner ma `opacity:0`, coz zpusobi, ze `html2canvas` vykresli pruhledne pixely = prazdna stranka. Kontejner je sice ve viewportu (fixed, left:0, top:0), ale nulova opacity = nic neni viditelne pro screenshot engine.

**Oprava:** Odstranit `opacity:0` z CSS kontejneru. Element je uz na `z-index:-1` a `pointer-events:none`, takze nebude videt ani klikatelny. Pripadne pouzit `clip: rect(0,0,0,0); overflow:hidden;` misto opacity pro plne skryti.

## Problem 2: Tlacitka PDF na jednotlivych dokumentech

Kod uz tlacitka na jednotlivych dokumentech obsahuje (radky 928-944 v `PortalViewPage.tsx`). Jsou uvnitr `CollapsibleContent` - zobrazi se az kdyz uzivatel dokument rozbalí. Tlacitko "PDF" je vedle tlacitka "Sbalit". Toto uz funguje spravne - uzivatel je mozna nevidel kvuli tomu ze PDF bylo prazdne a myslel si ze tlacitko nefunguje.

## Problem 3: Download menu na konci (vyber co stahnout)

Nahradit jednoduche tlacitko "Stahnout PDF" v paticce za dropdown menu s checkboxy. Uzivatel si vybere ktere kategorie/sekce chce zahrnout do PDF a pak klikne "Stahnout".

### Zmeny v souborech

**`src/lib/pdf-export.ts`** (radek 74)
- Odstranit `opacity:0` z `container.style.cssText`
- Pouzit misto toho skryti pres `clip:rect(0,0,0,0);overflow:hidden;` nebo jednoduche odstraneni opacity (z-index:-1 staci)

**`src/pages/portal/PortalViewPage.tsx`** (radky 593-610)
- Nahradit jednoduche tlacitko "Stahnout PDF" za komponent s Popover/DropdownMenu
- Menu bude obsahovat checkboxy pro: Organizacni, Herni, Osobni, CP materialy, Moje sceny (pokud CP)
- Vychozi stav: vse zaskrtnute
- Tlacitko "Stahnout" na konci menu vygeneruje PDF z vybranych sekci

**`src/pages/portal/ProductionPortalPage.tsx`** a **`src/pages/portal/CpPortalPage.tsx`**
- Stejna uprava download menu v paticce (pridat checkboxy pro vyber obsahu)

### Technicke detaily

Oprava blank PDF v `generatePdf`:
```text
Aktualni: opacity:0; pointer-events:none; z-index:-1;
Oprava:   pointer-events:none; z-index:-1; (bez opacity)
```

Download menu struktura:
```text
[Stahnout PDF v]
  ┌─────────────────────────┐
  │ [x] Organizacni (3)     │
  │ [x] Herni (5)           │
  │ [x] Osobni (2)          │
  │ [x] CP materialy (1)    │
  │ [x] Moje sceny (4)      │
  │─────────────────────────│
  │   [ Stahnout vyber ]    │
  └─────────────────────────┘
```

