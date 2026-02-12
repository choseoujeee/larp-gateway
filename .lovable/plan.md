

# Konsolidace projektu podle LOVABLE-UPGRADE-SPEC.md

## Stav po kontrole

Velka cast spec je jiz implementovana (blank page fix, organizator edit dialog, production portal accordion, theme toggle na portalech, ARIA sekce, PaperCardTitle s id). Hlavni problem je **nefunkcni Edge Function `create-organizer`**.

---

## Co je potreba opravit

### 1. Edge Function `create-organizer` – build error (KRITICKE)

**Problem:** Import `"jsr:@supabase/functions-js/edge_runtime.d.ts"` pouziva podtrzitko, ale balicek exportuje cestu s pomlckou: `./edge-runtime.d.ts`.

**Oprava:** Na radku 5 v `supabase/functions/create-organizer/index.ts` zmenit:
```
import "jsr:@supabase/functions-js/edge_runtime.d.ts";
```
na:
```
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
```

Pote se funkce automaticky nasadi a tlacitko "Novy organizator" zacne fungovat.

### 2. Drobne chybejici zmeny ze spec (nizka priorita)

Vetsina UX zmen ze spec (Blok 1-6) je jiz v kodu. Zbyva zkontrolovat a pripadne doplnit:

- **PersonsPage.tsx** – overit, ze tlacitko portal ma text "Otevrit hracsky portal" s title atributem (Blok 6I)
- **ProductionPage.tsx** – overit text u odkazu na produkcni portal (Blok 6J): "Sdilejte tento odkaz a heslo s cleny tymu produkce. Heslo nastavite tlacitkem Zmenit heslo."

---

## Technicke detaily

| Soubor | Zmena |
|--------|-------|
| `supabase/functions/create-organizer/index.ts` | Oprava importu: `edge_runtime` -> `edge-runtime` |
| `src/pages/admin/PersonsPage.tsx` | Overit/upravit text tlacitka portalu |
| `src/pages/admin/ProductionPage.tsx` | Overit/upravit text u odkazu |

Zadne nove migrace ani zmeny DB schematu nejsou potreba.

