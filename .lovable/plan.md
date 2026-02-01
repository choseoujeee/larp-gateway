
# Plán: Vylepšení systému CP a propojení s harmonogramem

## Shrnutí požadavků z tvé zpětné vazby

Na základě tvých poznámek implementuji:

1. **Stránka se všemi CP** - přístupná na heslo (bez tokenu), zobrazení společných dokumentů + dlaždice jednotlivých CP
2. **Vylepšené dlaždice CP** - viditelný název, časy vstupů, performer, filtrování
3. **Detail CP** - stejný feel jako postava (medailonek, mission briefing, dokumenty, scény)
4. **Scény CP** - oddělené bloky s časem, lokací, rekvizitami, popisem
5. **Provázání harmonogramu a scén CP** - obousměrná vazba
6. **Přiřazování performerů k CP** s detekcí časových kolizí
7. **Portál CP** - zobrazení scén přímo v portálu hráče - pozor, v hráčském portálu (herní postavy) hráči nevidí s kým hrajou a kdy, tam vazba není. Naopak ale CP musí mít na svém společném portálu i dlaždice hráčských postav, aby se mohli podívat na stránky jednotlivých hráčů a nahlédnout do dokumentů hráčů (pro CP je lepší, když mají možnost přečíst si komplet životopis a další dokumenty postav)

---

## Databázové změny

### Nová tabulka: `cp_scenes` (scény CP)

```text
┌──────────────────────────────────────────────────────────────┐
│ cp_scenes                                                     │
├──────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                             │
│ cp_id           UUID FK -> persons(id)                       │
│ run_id          UUID FK -> runs(id)                          │
│ start_time      TIME NOT NULL                                │
│ duration_minutes INT DEFAULT 15                              │
│ day_number      INT DEFAULT 1                                │
│ location        TEXT                                         │
│ props           TEXT (rekvizity)                             │
│ description     TEXT (úkol/instrukce)                        │
│ sort_order      INT                                          │
│ schedule_event_id UUID FK -> schedule_events (auto-sync)     │
│ created_at/updated_at                                        │
└──────────────────────────────────────────────────────────────┘
```

### Nová tabulka: `cp_performers` (přiřazení performerů k běhu)

```text
┌──────────────────────────────────────────────────────────────┐
│ cp_performers                                                │
├──────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                             │
│ run_id          UUID FK -> runs(id)                          │
│ cp_id           UUID FK -> persons(id)                       │
│ performer_name  TEXT NOT NULL                                │
│ performer_email TEXT                                         │
│ performer_phone TEXT                                         │
│ created_at                                                   │
└──────────────────────────────────────────────────────────────┘
```

### Úprava existujících tabulek

- `persons`: přidat `mission_briefing` a `act_info` pro CP
- `schedule_events`: přidat `cp_scene_id` pro propojení se scénou

---

## Struktura souborů

```text
src/
├── pages/admin/
│   ├── CpPage.tsx              (přepracovat - seznam + detail)
│   └── CpDetailPage.tsx        (nový - detailní pohled na CP)
├── pages/portal/
│   └── PortalViewPage.tsx      (rozšířit o scény pro CP)
├── components/admin/
│   ├── CpCard.tsx              (nový - dlaždice CP)
│   ├── CpSceneDialog.tsx       (nový - editace scény)
│   └── CpSceneList.tsx         (nový - seznam scén CP)
└── lib/
    └── cpUtils.ts              (nový - detekce kolizí, sync)
```

---

## Detailní implementace

### 1. Seznam všech CP (CpPage.tsx)

**Vylepšení dlaždic:**
```text
┌─────────────────────────────────────────────────┐
│ TAJEMNÝ CIZINEC                       [✏️][🗑️] │
│ ⏰ 14:00, 16:30, 20:00 (3 vstupy)               │
│ 👤 Jan Novák                                    │
│ 📄 3 dok │ 🎭 3 scény                           │
└─────────────────────────────────────────────────┘
```

**Filtry:**
- Vyhledávání podle jména CP nebo performera
- Filtr podle času (od-do)
- Filtr "pouze nepřiřazené"

### 2. Detail CP (CpDetailPage.tsx)

**Struktura stránky:**
```text
┌─────────────────────────────────────────────────┐
│ ← Zpět                                          │
│ TAJEMNÝ CIZINEC                     [Upravit]   │
│ 👤 Performer: Jan Novák                         │
├─────────────────────────────────────────────────┤
│ MEDAILONEK                                      │
│ [rich text obsah]                               │
├─────────────────────────────────────────────────┤
│ MISSION BRIEFING                                │
│ [rich text - obecné instrukce]                  │
├─────────────────────────────────────────────────┤
│ ACT INFO                                        │
│ [rich text - informace pro vystoupení]          │
├─────────────────────────────────────────────────┤
│ SCÉNY                              [+ Nová]     │
│ ├── 14:00 | Kancelář | 📦 průkaz       [✏️]   │
│ ├── 16:30 | Náměstí  | 📦 kufr         [✏️]   │
│ └── 20:00 | Kostel   | -               [✏️]   │
├─────────────────────────────────────────────────┤
│ DOKUMENTY SPOLEČNÉ                              │
│ ├── Pravidla pro CP                             │
│ └── Mapa lokací                                 │
├─────────────────────────────────────────────────┤
│ DOKUMENTY INDIVIDUÁLNÍ                          │
│ └── Detailní popis role                         │
└─────────────────────────────────────────────────┘
```

### 3. Scény CP (CpSceneDialog.tsx)

**Dialog pro vytvoření/editaci scény:**
- Den (select)
- Čas zahájení (time picker)
- Délka (volitelné, default 15 min)
- Lokace (text)
- Rekvizity (text - co má vzít)
- Popis/úkol (wysiwyg)
- Checkbox "Automaticky přidat do harmonogramu"

### 4. Provázání s harmonogramem

**Obousměrná synchronizace:**

A) **Ze scény do harmonogramu:**
- Při vytvoření scény s checkem "přidat do harmonogramu":
  - Automaticky vytvoří `schedule_event` typu `vystoupeni_cp`
  - Uloží `schedule_event_id` do scény
  
B) **Z harmonogramu do scény:**
- Při vytvoření události typu `vystoupeni_cp`:
  - Nabídne výběr CP
  - Automaticky vytvoří odpovídající scénu
  - Propojí obě entity

**Vizuální indikace:**
- V harmonogramu u události `vystoupeni_cp` ikona 🔗 pokud má propojenou scénu
- Ve scéně badge "V harmonogramu" pokud je propojená

### 5. Detekce kolizí performerů

**Logika v `cpUtils.ts`:**
```typescript
function detectPerformerConflicts(runId: string): Conflict[] {
  // 1. Načti všechny scény pro běh
  // 2. Seskup podle performera
  // 3. Pro každého performera zkontroluj překryvy časů
  // 4. Vrať list konfliktů
}
```

**Zobrazení:**
- V přehledu CP: ⚠️ ikona u CP s konfliktem
- V přiřazování: Varování "Tento performer má kolizi s CP X v čase Y"
- Dialog s detaily konfliktů

### 6. Portál pro všechny CP

**Nová stránka `/cp/:larpSlug`:**
- Přístup na heslo (stejný systém jako pro hráče)
- Zobrazuje:
  - Dokumenty pro všechny CP (target_type = skupina, target_group = "CP")
  - Dlaždice jednotlivých CP s odkazy do jejich portálů

### 7. Rozšíření portálu CP (PortalViewPage.tsx)

**Nová sekce "Moje scény":**
```text
┌─────────────────────────────────────────────────┐
│ MOJE SCÉNY                                      │
├─────────────────────────────────────────────────┤
│ 🎬 Scéna 1 - 14:00                             │
│    Lokace: Kancelář Petříka                    │
│    Rekvizity: průkaz totožnosti, kufr          │
│    [Popis úkolu...]                            │
├─────────────────────────────────────────────────┤
│ 🎬 Scéna 2 - 16:30                             │
│    Lokace: Náměstí                             │
│    Navazuje na scénu 1                         │
│    [Popis úkolu...]                            │
└─────────────────────────────────────────────────┘
```

---

## Postup implementace

### Fáze 1: Databáze a základy
1. Vytvořit migraci pro nové tabulky (`cp_scenes`, `cp_performers`)
2. Upravit tabulku `persons` (přidat `mission_briefing`, `act_info`)
3. Přidat RLS policies
4. Vytvořit databázové funkce pro načítání scén

### Fáze 2: Admin rozhraní
5. Přepracovat `CpPage.tsx` - vylepšené dlaždice s piktogramy
6. Vytvořit `CpDetailPage.tsx` - plný detail CP
7. Implementovat editaci scén (`CpSceneDialog.tsx`)
8. Přidat drag-and-drop řazení scén
9. Implementovat přiřazování performerů

### Fáze 3: Propojení s harmonogramem
10. Upravit `SchedulePage.tsx` - lepší UX pro `vystoupeni_cp`
11. Implementovat obousměrnou synchronizaci
12. Přidat detekci kolizí

### Fáze 4: Portál
13. Vytvořit stránku pro všechny CP
14. Rozšířit `PortalViewPage.tsx` o sekci scén
15. Přidat zobrazení mission briefingu a act info pro CP

---

## Poznámky k implementaci

- **Zachování konzistence:** CP bude fungovat stejně jako postava - stejné UX pro dokumenty, tagy, rychlé info
- **Performance:** Scény budou načítány lazy při otevření detailu CP
- **Offline-first:** Při ztrátě spojení budou změny uloženy lokálně

---

## Stav implementace

### ✅ Fáze 1: Databáze (DOKONČENO)
- Vytvořena tabulka `cp_scenes` pro scény CP
- Vytvořena tabulka `cp_performers` pro přiřazení performerů k běhu
- Přidány sloupce `mission_briefing` a `act_info` do tabulky `persons`
- Přidán sloupec `cp_scene_id` do `schedule_events` pro obousměrnou vazbu
- Nastaveny RLS policies

### ✅ Fáze 2: Admin rozhraní (DOKONČENO)
- Vytvořena komponenta `CpCard.tsx` s vylepšenými dlaždicemi
- Vytvořena komponenta `CpSceneList.tsx` pro seznam scén
- Vytvořena komponenta `CpSceneDialog.tsx` pro editaci scén
- Vytvořena stránka `CpDetailPage.tsx` s plným detailem CP (medailonek, mission briefing, act info, scény, dokumenty)
- Přepracována stránka `CpPage.tsx` s kompaktními kartami a filtry

### 🔲 Fáze 3: Propojení s harmonogramem (TODO)
- Upravit `SchedulePage.tsx` - lepší UX pro `vystoupeni_cp`
- Implementovat obousměrnou synchronizaci
- Přidat detekci kolizí performerů

### ✅ Fáze 4: Portál (DOKONČENO)
- Vytvořena stránka `/cp/:larpSlug` pro rozcestník všech CP s přístupem na heslo
- Rozšířen `PortalViewPage.tsx` o sekci "Moje scény" pro CP
- Přidáno zobrazení mission briefingu a act info pro CP
- Přidány dlaždice hráčských postav (seskupené podle skupiny) do CP portálu
- Vytvořena RPC funkce `verify_cp_portal_access` pro ověření CP hesla
- Vytvořena RPC funkce `get_cp_scenes_for_portal` pro načítání scén
