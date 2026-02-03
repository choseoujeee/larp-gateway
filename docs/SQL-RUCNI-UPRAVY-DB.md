# SQL pro ruční úpravy databáze (Supabase)

Když aplikace hlásí chybu typu *Could not find the 'X' column of 'Y' in the schema cache*, znamená to, že v Supabase projektu chybí sloupec nebo migrace nebyla spuštěna. Níže jsou příkazy, které můžeš zkopírovat do **Supabase Dashboard → SQL Editor** a spustit (Run).

---

## 1. Sloupec `visible_to_cp` v tabulce `documents`

**Chyba:** `Could not find the 'visible_to_cp' column of 'documents' in the schema cache`

**Příčina:** V tabulce `documents` chybí sloupec pro „Zobrazit i CP“ u dokumentů „pro všechny“.

**SQL (zkopíruj a spusť v SQL Editoru):**

```sql
-- Dokumenty "pro všechny" mohou být zobrazeny i CP, pokud visible_to_cp = true
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS visible_to_cp BOOLEAN NOT NULL DEFAULT false;
```

Po spuštění:
- Ukládání nových/upravených dokumentů (včetně CP) bude fungovat.
- Na admin stránce CP (CpDetailPage) a na portálu CP (CpPortalPage) budou dotazy na `visible_to_cp` fungovat.

---

## 2. Další časté úpravy

*(Zde lze doplňovat další SQL příkazy, když narazíš na chybějící sloupec nebo funkci.)*
