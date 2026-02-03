# Zálohování a export databáze

Dokument popisuje, jak zálohovat databázi před nasazením organizátorů a jak si stáhnout export (např. po skončení LARPu).

---

## 1. Co nabízí Supabase podle plánu

| Plán | Automatické zálohy | Stahování zálohy |
|------|--------------------|------------------|
| **Free** | Žádné | Ruční export (SQL Editor nebo CLI) |
| **Pro / Team / Enterprise** | Denní zálohy (1× za 24 h) | Ano – Dashboard → Database → Backups → Scheduled backups, stáhneš `.sql.gz` |

- Na **Free** plánu nemáš automatické zálohy. Musíš exportovat ručně (viz níže).
- Na **Pro** máš denní zálohy a přístup k posledním **7 dnům**; každou můžeš stáhnout a obnovit projekt.

Zdroj: [Supabase – Database Backups](https://supabase.com/docs/guides/platform/backups)

---

## 2. Doporučená politika před nasazením organizátorů

1. **Před spuštěním pro organizátory**
   - Jednorázově: ruční export DB (viz sekce 3 nebo 4) a uložení souboru např. `larp-gateway-backup-pred-orgy-YYYY-MM-DD.sql` (nebo `.sql.gz`).
   - Pokud jsi na **Pro**: v Dashboardu ověř, že denní zálohy běží (Database → Backups → Scheduled backups).

2. **Během provozu**
   - **Pro plán:** Stačí spoléhat na denní zálohy. Případně si jednou za týden stáhni aktuální zálohu z „Scheduled backups“ a zálohuj ji mimo Supabase (disk, cloud).
   - **Free plán:** Jednou za týden (nebo před každým větším LARPem) udělej ruční export podle sekce 3 nebo 4.

3. **Po skončení LARPu**
   - Vždy si stáhni export DB do lokálu („pro jistotu“). Stejný postup jako v sekci 3 nebo 4, soubor pojmenuj např. `larp-gateway-po-LARPu-YYYY-MM-DD.sql`.

---

## 3. Stáhnutí zálohy z Supabase Dashboardu (Pro plán)

1. Přihlas se do [Supabase Dashboard](https://supabase.com/dashboard).
2. Zvol projekt (LARP Gateway).
3. V levém menu: **Database** → **Backups**.
4. Záložka **Scheduled backups**.
5. U požadovaného data klikni na **Download** u konkrétní zálohy – stáhne se soubor `.sql.gz`.
6. Soubor si ulož na bezpečné místo (lokální disk, záloha mimo Supabase).

Toto je **logická záloha** (SQL dump). Pokud máš zapnutý PITR nebo DB > 15 GB, můžeš mít jen fyzické zálohy – pak se „Download“ nezobrazí a musíš použít ruční export přes CLI (sekce 4).

---

## 4. Ruční export DB (všechny plány – „export na stažení“)

Vhodné na **Free** plánu nebo když chceš mít vlastní kopii v konkrétní chvíli (např. po LARPu).

### 4a. Connection string z Dashboardu

1. Supabase Dashboard → tvůj projekt → **Project Settings** (ikona ozubeného kolečka).
2. **Database** → sekce **Connection string** → **URI**. Zkopíruj connection string (obsahuje heslo).  
   Formát: `postgresql://postgres.[ref]:[HESLO]@aws-0-[region].pooler.supabase.com:6543/postgres`

### 4b. Export pomocí Supabase CLI (doporučeno)

1. Nainstaluj [Supabase CLI](https://supabase.com/docs/guides/cli) a [Docker Desktop](https://www.docker.com) (CLI je pro dump používá).
2. Z Dashboardu zkopíruj **connection string**: Project Settings → Database → **Connect** → Session pooler (URI). Formát: `postgresql://postgres.[PROJECT_REF]:[HESLO]@aws-0-[region].pooler.supabase.com:5432/postgres`
3. V terminálu (nahraď `[CONNECTION_STRING]` skutečným řetězcem):

```bash
# Export rolí (volitelné, pro kompletní zálohu)
supabase db dump --db-url "[CONNECTION_STRING]" -f roles.sql --role-only

# Export schématu (tabulky, funkce, RLS…)
supabase db dump --db-url "[CONNECTION_STRING]" -f schema.sql

# Export dat
supabase db dump --db-url "[CONNECTION_STRING]" -f data.sql --use-copy --data-only
```

Pro „export na jistotu“ po LARPu stačí obvykle `schema.sql` + `data.sql`. Soubory pojmenuj např. `larp-gateway-po-LARPu-2026-02-01-schema.sql` a `larp-gateway-po-LARPu-2026-02-01-data.sql`. Obnovení: viz [Backup and Restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

### 4c. Export pomocí pg_dump (máš-li nainstalovaný PostgreSQL klient)

```bash
pg_dump "postgresql://postgres.[PROJECT_REF]:[HESLO]@aws-0-[region].pooler.supabase.com:6543/postgres" -F c -f larp-gateway-backup.dump
```

Nebo čistý SQL (bez custom format):

```bash
pg_dump "postgresql://postgres.[PROJECT_REF]:[HESLO]@..." --no-owner --no-acl -f larp-gateway-backup.sql
```

Connection string opět vezmeš z Dashboardu (Project Settings → Database → URI).

---

## 5. Shrnutí – co dělat kdy

| Situace | Akce |
|---------|------|
| Před spuštěním pro organizátory | 1× ruční export (sekce 4) nebo stáhnout poslední Scheduled backup (Pro). |
| Jednou za týden (nebo před větším LARPem) | Stáhnout zálohu z Dashboardu (Pro) nebo ruční export (Free). |
| Po skončení LARPu | Stáhnout export do lokálu (sekce 3 nebo 4), soubor uschovat. |

Kdykoli změníš databázi (nové migrace, ruční úpravy), po změně zálohu znovu exportuj nebo ověř, že denní zálohy běží.
