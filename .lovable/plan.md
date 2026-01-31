
# Refaktoring databáze a navigace - LARP hierarchie

## Aktuální problém

Současná databáze má strukturu:
```
LARP → Běh → Postavy/Dokumenty/Produkce/Tiskoviny
```

Ale tvoje požadovaná logika je:
```
LARP → Postavy/CP/Dokumenty/Produkce/Tiskoviny → Běhy → Přiřazení hráčů
```

To znamená, že:
- Postavy, dokumenty, produkce a tiskoviny patří k **LARPu** (neměnné mezi běhy)
- Běhy obsahují pouze organizační data: lokaci, cenu, harmonogram, **přiřazení konkrétních hráčů** k postavám

---

## Navrhované změny databáze

### 1. Změna vazby tabulek z `run_id` na `larp_id`

Tyto tabulky přesuneme z vazby na běh na vazbu na LARP:

| Tabulka | Současná vazba | Nová vazba |
|---------|----------------|------------|
| `persons` | run_id | larp_id |
| `documents` | run_id | larp_id |
| `production_links` | run_id | larp_id |
| `printables` | run_id | larp_id |

### 2. Nová tabulka: `run_person_assignments` (přiřazení hráčů k běhu)

Protože hráč může hrát různé postavy v různých bězích:

```sql
CREATE TABLE run_person_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  player_name text,           -- Jméno hráče/performera pro tento běh
  player_email text,          -- Kontakt
  paid_at timestamptz,        -- Kdy zaplatil (pro tento běh)
  access_token uuid NOT NULL DEFAULT gen_random_uuid(),  -- Unikátní link pro tento běh
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(run_id, person_id)
);
```

### 3. Harmonogram zůstává na běhu

`schedule_events.run_id` zůstává - to je správně, protože harmonogram je specifický pro konkrétní běh.

### 4. Aktualizace RPC funkcí

- `verify_person_access` - bude pracovat s `run_person_assignments`
- `get_person_documents` - bude načítat dokumenty podle `larp_id` (z běhu)

---

## Změny v navigaci

Po vybrání LARPu bude sidebar obsahovat:

**Hlavní sekce (data LARPu):**
- Postavy
- Cizí postavy (CP)
- Dokumenty
- Produkce
- Tiskoviny

**Sekce běhů:**
- Běhy (seznam běhů)
  - Po vybrání běhu:
    - Přiřazení hráčů
    - Harmonogram
    - Nastavení běhu (lokace, platby)

---

## Technický plán implementace

### Krok 1: Migrace databáze

```sql
-- 1. Přidat larp_id do tabulek
ALTER TABLE persons ADD COLUMN larp_id uuid REFERENCES larps(id);
ALTER TABLE documents ADD COLUMN larp_id uuid REFERENCES larps(id);
ALTER TABLE production_links ADD COLUMN larp_id uuid REFERENCES larps(id);
ALTER TABLE printables ADD COLUMN larp_id uuid REFERENCES larps(id);

-- 2. Naplnit larp_id z existujících dat (přes run_id → runs → larp_id)
UPDATE persons SET larp_id = (SELECT larp_id FROM runs WHERE runs.id = persons.run_id);
UPDATE documents SET larp_id = (SELECT larp_id FROM runs WHERE runs.id = documents.run_id);
-- ... atd.

-- 3. Vytvořit tabulku run_person_assignments
CREATE TABLE run_person_assignments (...);

-- 4. Migrovat existující data z persons do run_person_assignments
INSERT INTO run_person_assignments (run_id, person_id, paid_at, access_token, password_hash)
SELECT run_id, id, paid_at, access_token, password_hash FROM persons;

-- 5. Odstranit run_id, paid_at, access_token, password_hash z persons
-- (až po ověření migrace)

-- 6. Aktualizovat RLS politiky
```

### Krok 2: Aktualizace kontextů a hooků

| Soubor | Změna |
|--------|-------|
| `useLarpContext` | Zůstává - správa vybraného LARPu |
| `useRunContext` | Přejmenovat na běhy, přidat přiřazení hráčů |
| Nový `useLarpDataContext` | Pro načítání postav/dokumentů vázaných na LARP |

### Krok 3: Aktualizace stránek

| Stránka | Změna |
|---------|-------|
| `PersonsPage` | Filtrovat podle `larp_id` místo `run_id` |
| `CpPage` | Filtrovat podle `larp_id` |
| `DocumentsPage` | Filtrovat podle `larp_id` |
| `ProductionPage` | Filtrovat podle `larp_id` |
| `PrintablesPage` | Filtrovat podle `larp_id` |
| `SchedulePage` | Zůstává filtrovat podle `run_id` |
| Nová `RunAssignmentsPage` | Přiřazení hráčů k postavám v běhu |

### Krok 4: Nová navigace v AdminLayout

```typescript
// Struktura navigace po vybrání LARPu
const larpNavigation = [
  { name: "Přehled", href: "/admin" },
  { name: "Běhy", href: "/admin/behy" },
  { name: "Postavy", href: "/admin/osoby" },
  { name: "Cizí postavy", href: "/admin/cp" },
  { name: "Dokumenty", href: "/admin/dokumenty" },
  { name: "Produkce", href: "/admin/produkce" },
  { name: "Tiskoviny", href: "/admin/tiskoviny" },
];

// Sekce pro vybraný běh (když je vybrán)
const runNavigation = [
  { name: "Hráči", href: "/admin/hraci" },  // run_person_assignments
  { name: "Harmonogram", href: "/admin/harmonogram" },
];
```

---

## Výsledek po implementaci

1. **Organizátor vytvoří LARP** → automaticky má přístup k postavám, dokumentům atd.
2. **Postavy a dokumenty jsou definovány na úrovni LARPu** → nemusí se kopírovat mezi běhy
3. **Běhy obsahují pouze organizační data** → lokace, platby, harmonogram, přiřazení hráčů
4. **Hráč je přiřazen k postavě v rámci běhu** → může hrát různé postavy v různých bězích
5. **Portál hráče** → pracuje s `run_person_assignments.access_token`

---

## Poznámky ke zpětné kompatibilitě

- Migrace zachová existující data
- Stávající přístupové tokeny budou přesunuty do `run_person_assignments`
- Portálové odkazy budou nadále fungovat

---

## Odhadovaný rozsah práce

1. Databázová migrace: 1 krok
2. Aktualizace RPC funkcí: 2 funkce
3. Aktualizace 7+ stránek v adminu
4. Nová stránka pro přiřazení hráčů
5. Úprava navigace
