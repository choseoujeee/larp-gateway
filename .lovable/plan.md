

# Plan: Redesign hracsky portal podle originalu

## Prehled
Portal pro hrace bude prepracovan tak, aby odpovidal puvodni vzorove verzi z obrazku. Struktura bude:
1. Hlavicka s nazvem LARPu a mottem
2. Karta s medailonkem postavy (jmeno, skupina, popis)
3. Mission Briefing sekce s informacemi o behu
4. Dokumenty - sbalitelne kategorie s jednotlivymi dokumenty uvnitr
5. Export sekce dole

## Zmeny v databazi

### 1. Pridat pole `motto` do tabulky `larps`
- Nove pole pro "motto" LARPu (napr. "Tento pribeh bude o nem, ale bude i o tobe.")
- Typ: `text`, nullable

### 2. Upravit RPC funkci `verify_person_by_slug`
- Pridat vraceni `larp_motto` a informaci o aktivnim behu (date_from, date_to, location, address, mission_briefing, run_name)
- Funkce bude zjistovat aktivni beh pro dany LARP a vratit jeho udaje

### 3. Upravit RPC funkci `get_person_documents`
- Vratit take `is_priority` pole (pokud bude potreba - zatim ne)

## Zmeny v kodu

### 1. Aktualizace `usePortalSession.tsx`
- Rozsirit `PortalSession` interface o nova pole:
  - `larpMotto: string | null`
  - `runName: string | null`
  - `runDateFrom: string | null`
  - `runDateTo: string | null`
  - `runLocation: string | null`
  - `runAddress: string | null`
  - `missionBriefing: string | null`
- Aktualizovat mapovani z RPC odpovedi

### 2. Kompletni prepracovani `PortalViewPage.tsx`
Nova struktura stranky:

```text
+------------------------------------------+
|          KRYPTA 1942                     |   <- font-typewriter, velky
|   Tento pribeh bude o nem...             |   <- motto, italika
+------------------------------------------+

+------------------------------------------+
|    paper-card: Karta postavy             |
|    +---------------------------------+   |
|    |      Josef Bublik               |   |   <- jmeno postavy
|    |      [BIOSCOP]                  |   |   <- badge skupiny
|    |                                 |   |
|    |   Popis medailonku...           |   |   <- obsah z dokumentu typu "medailonek"
|    +---------------------------------+   |
+------------------------------------------+

+------------------------------------------+
|    paper-card: MISSION BRIEFING          |
|    Operation: KRYPTA 1942                |
|    Run: Jarni beh 2026                   |
|    Date: 15. - 17. 5. 2026               |
|    Location: Hrad Bouzov                 |
|    Address: Bouzov 8...                  |
+------------------------------------------+

DOCUMENTS:
+------------------------------------------+
|  paper-card: ORGANIZACNI (6)             |   <- collapsible kategorie
|    > [PRIORITY] Harmonogram              |   <- jednotlive dokumenty - collapsible
|    > [PRIORITY] Platba                   |
|    > Kostymy                             |
|    v Zbrane ve hre                       |   <- otevreny dokument
|      | Obsah dokumentu...               |
|      | [SBALIT DOKUMENT]                |   <- tlacitko
|    > Prakticke                           |
+------------------------------------------+

+------------------------------------------+
|  paper-card: HERNI (5)                   |
|    > Dokument 1                          |
|    > Dokument 2                          |
+------------------------------------------+

+------------------------------------------+
|  paper-card: OSOBNI (6)                  |   <- postava + medailonek dokumenty
+------------------------------------------+

EXPORT DO PDF:
+------------------------------------------+
|  [Download All] [Download Org] ...       |
+------------------------------------------+
```

### 3. Interakce a chovani
- Kategorie jsou ve vychozim stavu sbalene
- Kliknutim na kategorii se rozbali seznam dokumentu
- Kliknutim na nazev dokumentu se rozbali jeho obsah
- Pod rozbalennym dokumentem je tlacitko "SBALIT DOKUMENT"
- Tlacitko "Sbalit vse" dole sbali vsechny dokumenty

### 4. Komponenty
- Pouziti `Collapsible` z Radix UI pro vnorene sbalovani dokumentu
- `Accordion` pro kategorie
- `PaperCard` pro vizualni styl
- Nove CSS styly pro vzhled jako v originalu (typografie, barvy)

### 5. Aktualizace LarpsPage.tsx
- Pridat pole pro motto do dialogu pro vytvareni/upravu LARPu

---

## Technicke detaily

### Migrace SQL
```sql
-- Pridat motto pole do larps
ALTER TABLE public.larps ADD COLUMN IF NOT EXISTS motto text;

-- Aktualizovat verify_person_by_slug pro vraceni motto a run info
CREATE OR REPLACE FUNCTION public.verify_person_by_slug(p_slug text, p_password text)
RETURNS TABLE(
    person_id uuid,
    person_name text,
    person_type person_type,
    larp_id uuid,
    larp_name text,
    larp_theme text,
    larp_motto text,
    group_name text,
    performer text,
    performance_times text,
    run_name text,
    run_date_from date,
    run_date_to date,
    run_location text,
    run_address text,
    mission_briefing text
)
...
```

### Struktura komponenty PortalViewPage
1. Header s nazvem LARPu a mottem (bez sticky header)
2. Karta postavy - jmeno, skupina badge, obsah medailonku
3. Mission Briefing karta (pokud existuji run data)
4. Dokumenty sekce - vnorene Accordion + Collapsible
5. Export sekce s tlacitky pro tisk/PDF

### Stylove zmeny
- Typewriter font pro nadpisy
- Paper-card vizual
- Badge pro skupinu (hnedy/olivovy styl)
- Tlacitko "SBALIT DOKUMENT" ve stylu btn-vintage

