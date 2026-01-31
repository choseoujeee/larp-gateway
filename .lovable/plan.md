

# Synchronizace databáze s UI rozhraním

## Situace
Máš funkční UI postavené v Cursoru, které očekává sloupce a data, která v databázi zatím neexistují. Je potřeba rozšířit databázové schéma a aktualizovat RPC funkce.

---

## Co je třeba přidat

### 1. Nové sloupce v tabulce `runs`
| Sloupec | Typ | Popis |
|---------|-----|-------|
| `payment_account` | text | Číslo transparentního účtu |
| `payment_amount` | text | Cena (text, např. "500 Kč") |
| `payment_due_date` | date | Datum splatnosti platby |

### 2. Nový sloupec v tabulce `persons`
| Sloupec | Typ | Popis |
|---------|-----|-------|
| `paid_at` | timestamptz | Kdy hráč zaplatil (null = neuhrazeno) |

### 3. Aktualizace RPC funkce `verify_person_access`
Současná verze vrací pouze základní údaje. UI ale potřebuje:
- `group_name` (skupina postavy)
- `performer`, `performance_times` (pro CP)
- `run_contact`, `run_footer_text` (zápatí portálu)
- `larp_theme` (téma pro styling)
- `run_payment_account`, `run_payment_amount`, `run_payment_due_date` (platba)
- `person_paid_at` (stav platby)

---

## Technický plán

### Krok 1: Databázová migrace

```text
-- Přidat sloupce do tabulky runs
ALTER TABLE runs ADD COLUMN IF NOT EXISTS payment_account text;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS payment_amount text;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS payment_due_date date;

-- Přidat sloupec do tabulky persons
ALTER TABLE persons ADD COLUMN IF NOT EXISTS paid_at timestamptz;
```

### Krok 2: Aktualizace RPC verify_person_access
Přepsat funkci tak, aby vracela všechna potřebná data pro portál hráče/CP včetně platebních údajů a kontaktů.

### Krok 3: Přidat RPC pro hashování hesel (create_person_with_password)
Aktuálně se heslo ukládá jako plain text. Je potřeba vytvořit RPC funkci, která heslo zahashuje pomocí pgcrypto.

### Krok 4: Trigger pro automatický hash hesla
Vytvořit trigger, který při INSERT/UPDATE do `persons` automaticky zahashuje `password_hash`, pokud přichází jako plain text.

---

## Výsledek
Po této migraci bude celé UI plně funkční:
- Správa plateb v admin rozhraní (běhy, postavy)
- QR kód pro platbu na portálu hráče
- Indikace zaplaceno/nezaplaceno
- Bezpečné hashování hesel
- Kompletní data v portálu (kontakt, zápatí, téma)

---

## Poznámky
- Všechny změny jsou zpětně kompatibilní (nové sloupce jsou nullable)
- Existující data zůstanou nedotčena
- RLS politiky není třeba měnit (sloupce patří do existujících tabulek)

