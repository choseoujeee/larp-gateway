## Cíl
Per-sekce role pro každého organizátora s úrovní `view` / `edit` / `none`. Vlastník LARPu (`larps.owner_id`) má vždy plný přístup a v UI se mu nic nedá omezit. Super-admin zůstává nadřazený všemu.

## Sekce (s českými názvy v UI)
| Klíč          | UI label        | Pokrývá tabulky / stránky |
|---------------|-----------------|---------------------------|
| `documents`   | Dokumenty       | `documents`, hidden_*     |
| `characters`  | Postavy         | `persons` type='postava', `printables` |
| `groups`      | Skupiny         | group editor              |
| `cp`          | CP              | `persons` type='cp', `cp_scenes`, `cp_performers` |
| `players`     | Hráči           | `run_person_assignments` (LARP přehled) |
| `production`  | Produkce        | `production_materials`, `production_links`, `production_portal_access` |
| `design`      | Design          | `larp_design_settings`, `larps.theme/motto/footer_text` |
| `schedule`    | Harmonogram     | `schedule_events`, `schedule_portal_access` |
| `communication` | Komunikace    | `email_log_v2`, `email_templates`, `larp_email_config`, `magic_links` |
| `runs`        | Správa běhů     | `runs`, `run_checklist`     |
| `organizers`  | Organizátoři    | jen super-admin (nevolitelné) |

## Datový model
Přidat na `larp_organizers` sloupec `permissions JSONB NOT NULL DEFAULT '{}'::jsonb`.
Tvar:
```json
{ "documents": "edit", "characters": "view", "production": "none", ... }
```
Chybějící klíč = `none`. Při zakládání nového organizátora default = všechny sekce `edit` (zpětně kompatibilní).

## Backend
1. **Migrace**: přidat sloupec, naplnit existující řádky `'{"documents":"edit",...}'` (vše edit).
2. **Helper funkce** (security definer, stable, `set search_path=public`):
   - `public.larp_section_level(p_larp_id uuid, p_section text)` → `text` (`'edit'|'view'|'none'`). Vrací `edit`, pokud je uživatel vlastník LARPu, super-admin (`chousef@gmail.com`) nebo má v `permissions` `edit`/`view`.
   - `public.can_edit_larp_section(p_larp_id, p_section)` → `bool`.
   - `public.can_view_larp_section(p_larp_id, p_section)` → `bool`.
3. **RLS update** na všech zasažených tabulkách: stávající `can_access_larp(larp_id)` v INSERT/UPDATE/DELETE policy nahradit `can_edit_larp_section(larp_id, '<section>')`; v SELECT policy `can_view_larp_section(...)`. (Super-admin a vlastník zůstanou plně přístupní díky logice helperu.) Tabulky bez `larp_id` (např. `cp_scenes`, `schedule_events`) napojím přes `run_id → runs.larp_id`, `run_person_assignments` přes run, atd.
4. **`larp_organizers` policies**: vlastník LARPu (nejen super-admin) smí číst seznam a měnit permissions svých organizátorů → přidám policy `is_larp_owner_or_super(larp_id)` pro INSERT/UPDATE/DELETE/SELECT. Super-admin pravidla zůstávají.

## Frontend
1. **Hook `useLarpPermissions(larpSlug)`** (`src/v2/hooks/useLarpPermissions.ts`): načte `larps.owner_id`, super-admin flag a `larp_organizers.permissions` pro aktuálního usera. Vrací `{ isOwner, isSuperAdmin, canView(section), canEdit(section), loading }`.
2. **`V2Shell` navigace**: filtrovat `larpNav` a `runNav` podle `canView`. Položku „Organizátoři“ zpřístupnit i vlastníkovi (nejen super-adminovi).
3. **Stránky** (Dokumenty, Postavy, Skupiny, CP, Hráči, Produkce, Design, Harmonogram, Komunikace, Produkce-run, Hráči-run):
   - Pokud `!canView` → redirect na `/larp/:slug` + toast „Nemáš přístup“.
   - Pokud `canView && !canEdit` → schovat tlačítka „Nový/Smazat/Uložit“, vypnout inline edit (`InlineEditField`/`InlineEditRich` dostanou prop `readOnly`).
4. **`V2OrganizersPage`** přístupná vlastníkovi LARPu i super-adminovi. Přidat sekci „Oprávnění“ v edit dialogu: tabulka sekce × radio (`Žádný` / `Zobrazit` / `Editovat`) + tlačítka „Vše editovat“ / „Jen čtení“ / „Nic“ pro hromadné nastavení. Uložit do `permissions`. U vlastníka místo formuláře zobrazit badge „Vlastník — plný přístup“.

## Pořadí prací
1. Migrace (sloupec + helper funkce + RLS update + policies na `larp_organizers`).
2. Hook `useLarpPermissions` + úprava `V2Shell` (skrytí nav položek).
3. UI v `V2OrganizersPage` — matrix oprávnění.
4. Stránky: redirect při `!canView` + skrytí akcí při `!canEdit`.
5. Test (vlastník vidí vše, organizátor s `documents=view, characters=edit` se chová správně, super-admin vidí vše).

## Poznámky / kompromisy
- Sekce `players` na LARP úrovni a `players` na Run úrovni používají stejný klíč — kdo nemůže `players`, neuvidí ani jednu.
- `runs` sekce řídí mazání/zakládání běhů; samotný obsah běhu (harmonogram/produkce/komunikace) má vlastní klíče.
- Granularita per-LARP, ne per-Run.
- Pokud někdo bude potřebovat „smí editovat jen jednu sekci“, stačí nastavit ostatní na `none`.
