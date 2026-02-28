

# Automatické párování plateb z Fio transparentního účtu

## Jak to bude fungovat

Edge function stáhne veřejnou HTML stránku transparentního účtu, naparsuje tabulku transakcí a porovná je s hráči v databázi. Žádný API token není potřeba — transparentní účet je veřejný.

## Matching logika

Z HTML tabulky se vytáhnou sloupce: **Datum, Částka, Název protiúčtu, Zpráva pro příjemce, VS, Poznámka**. Pro každou příchozí platbu (kladná částka):

1. Filtruj platby, které odpovídají `payment_amount` daného běhu
2. V polích "Název protiúčtu" a "Zpráva pro příjemce" hledej shodu s `player_name` z `run_person_assignments` (normalize: lowercase, bez diakritiky, substring match obou směrů)
3. Pokud match → nastav `paid_at`
4. Pokud ne → zobraz v admin UI jako "nespárovaná platba"

## Implementace

### 1. Nová tabulka `payment_sync_log`

Eviduje zpracované transakce (deduplikace podle datum+částka+název):

```sql
CREATE TABLE payment_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES runs(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES run_person_assignments(id) ON DELETE SET NULL,
  transaction_date date NOT NULL,
  amount numeric NOT NULL,
  sender_name text,
  message text,
  vs text,
  matched boolean NOT NULL DEFAULT false,
  matched_player_name text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(run_id, transaction_date, amount, sender_name)
);
```

RLS: pouze vlastník běhu (`is_run_owner(run_id)`).

### 2. Edge function `sync-fio-payments`

- Přijme `run_id` jako parametr
- Načte z DB: `payment_amount` běhu, `run_person_assignments` kde `paid_at IS NULL`
- Fetch `https://ib.fio.cz/ib/transparent?a=2601234979` (account number uložený v `runs.payment_account`)
- Parse HTML tabulku, extrahuj řádky
- Pro každou příchozí platbu odpovídající částce: fuzzy match jména → pokud match, UPDATE `paid_at`
- Zapíše výsledky do `payment_sync_log`
- Vrátí JSON se statistikou (matched/unmatched)

### 3. Admin UI — tlačítko v detailu běhu

Žádná nová stránka, žádný cron. Jen **jedno tlačítko "Zkontrolovat platby"** v existující stránce detailu běhu (RunsPage), vedle sekce s hráči:

- Kliknutí zavolá edge function
- Zobrazí toast: "Spárováno 5 plateb, 2 nespárované"
- Nespárované platby se zobrazí v malém collapsible seznamu pod tlačítkem (datum, částka, jméno odesílatele) s možností ručně přiřadit ke hráči

### Soubory

| Soubor | Akce |
|--------|------|
| DB migrace | `payment_sync_log` tabulka + RLS |
| `supabase/functions/sync-fio-payments/index.ts` | Nová edge function |
| `src/pages/admin/RunsPage.tsx` | Tlačítko "Zkontrolovat platby" + seznam nespárovaných |

### Omezení

- Fio transparentní stránka zobrazuje jen **poslední měsíc** (default). Pro starší data by bylo potřeba scrapovat s parametry data, ale měsíc by měl stačit
- Fuzzy matching není 100% — hráči píšou přezdívky, zkratky. Nespárované platby se zobrazí k ručnímu přiřazení
- Účet je sdílený pro více LARPů — párování filtruje podle částky běhu, ale pokud dva běhy mají stejnou cenu, může dojít k nejednoznačnosti

