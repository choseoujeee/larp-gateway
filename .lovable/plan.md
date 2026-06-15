## Cíl
Předělat cílení dokumentů tak, aby šlo jasně rozlišit „pro hráče", „pro CP" a „pro oba". CP portál pak hráčské dokumenty neuvidí, sdílené ano — ve vlastní sekci.

## Datový model

Nový sloupec `documents.audience text[]` s kontrolovanou sadou tagů:

```
players:all                  -- všichni hráči
players:group:<jméno>        -- jedna hráčská skupina
players:person:<uuid>        -- konkrétní postava
cp:all                       -- všechny CP
cp:person:<uuid>             -- konkrétní CP
```

Pole je multiselect — dokument může mít např. `['players:all','cp:all']` (sdílený manuál ke kostýmu) nebo `['players:group:Strážci','cp:person:abc']`.

Staré sloupce (`target_type`, `target_group`, `target_person_id`, `visible_to_cp`, `extra_target_*`) zůstanou zatím v DB pro bezpečnost, ale nový kód je číst nebude. Migrace je vyplní do `audience` a označí jako deprecated (smazat v dalším kroku, až ověříme produkční chod).

## Migrace existujících dat
Podle volby uživatele („jen hráči"):
- `target_type='vsichni'` → `['players:all']` (bez ohledu na `visible_to_cp`, kromě 1 dokumentu kde je explicitně true → tam `['players:all','cp:all']`)
- `target_type='skupina' target_group='CP'` → `['cp:all']`
- `target_type='skupina' target_group=X` → `['players:group:X']`
- `target_type='osoba'` → podle typu osoby `players:person:<id>` nebo `cp:person:<id>`
- Připojit `extra_target_person_ids` a `extra_target_group_names` (rozlišit typ podle persons.type).

## RPC úpravy
- `get_person_documents(p_person_id)` — místo dnešní podmínky filtrovat přes `audience`:
  - vždy: `'players:person:'||p_id` nebo `'cp:person:'||p_id` v `audience`
  - hráč (postava): `'players:all'` nebo `'players:group:'||group_name`
  - CP: `'cp:all'`
  - doplnit vrácený sloupec `is_shared_with_other_side` (bool) — pro portál: „je v audience i opačná strana?"
- `get_cp_portal_full_data` — vrátit dvě skupiny:
  - `cp_documents_only` — audience obsahuje `cp:*` a NEobsahuje `players:*`
  - `cp_documents_shared` — audience obsahuje aspoň jedno `cp:*` i jedno `players:*`

## Frontend
- **Edit dialog dokumentu** (`DocumentEditDialog`): nahradit dnešní target_type radio + visible_to_cp checkbox jedním multi-select polem „Publikum" s chip-style hodnotami. Volby:
  - „Všichni hráči", „Všechny CP"
  - skupiny hráčů (dynamicky z `persons.group_name where type=postava`)
  - konkrétní hráči (autocomplete)
  - konkrétní CP (autocomplete)
  Badge vedle nadpisu dokumentu v adminu: „Hráči", „CP", „Sdílené".
- **CP portál** (`CpPortalDocuments` / `V2CpPortal*`): dvě sekce s nadpisy „Pro CP" a „Společné s hráči". Prázdná sekce se neukáže.
- **Hráčský portál**: beze změny logiky, jen čerpá z nového RPC.
- **Admin seznam dokumentů**: filtr „Komu: Hráči / CP / Sdílené".

## Pořadí kroků
1. Migrace: přidat `audience text[]`, GIN index, naplnit z legacy polí.
2. Upravit RPC `get_person_documents` a `get_cp_portal_full_data`.
3. Upravit edit dialog + admin list.
4. Upravit CP portál (sekce „Pro CP" / „Společné").
5. Ověřit hráčský portál.
6. Smoke test: 1 hráčský dokument, 1 CP dokument, 1 sdílený — ověřit v obou portálech.

## Mimo rozsah
- Smazání legacy sloupců (až po ověření).
- Bulk přepínání publika u více dokumentů najednou.
