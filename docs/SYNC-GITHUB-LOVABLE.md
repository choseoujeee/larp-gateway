# Sync do GitHubu a Lovable

Krátký checklist před a po pushi do GitHubu, aby se projekt v Lovable správně srovnal.

---

## 1. Co je v .gitignore (nepůjde do GitHubu)

V repozitáři **není** (a nemá být):

- **`.env`** – lokální proměnné (Supabase URL, klíče, `VITE_SUPER_ADMIN_EMAIL`). Do GitHubu se neposílá kvůli bezpečnosti.

Zbytek (zdrojáky, `supabase/migrations/`, `src/`, `docs/`, `.env.example` atd.) se pushuje normálně.

---

## 2. Databáze – je potřeba ji upravit?

**Struktura DB** je v kódu jako **migrace** v `supabase/migrations/*.sql`. Ty soubory jdou do GitHubu a Lovable je uvidí.

**Důležité:** Push sám o sobě **neprovádí** migrace na Supabase. Databáze se mění až když se migrace na daném projektu **spustí**.

- **Používáš stejný Supabase projekt v Cursoru i v Lovable** (stejná URL v `.env`):  
  Migrace, které jsi už v Supabase spustil (ručně v SQL Editoru nebo přes CLI), tam zůstávají. Po pushi do GitHubu **databázi znovu upravovat nemusíš**. Jen ověř, že v Supabase jsou všechny migrace z `supabase/migrations/` aplikované (např. že existuje tabulka `larp_organizers` a RPC jako `get_my_organizer_larp_ids`).

- **Lovable používá jiný Supabase projekt** než Cursor:  
  Na tom druhém projektu musíš migrace taky spustit (SQL Editor – zkopírovat/Spustit obsah migrací v pořadí, nebo `supabase link` + `supabase db push` na ten projekt). Jinak tam nebude správné schéma (tabulky, RLS, RPC).

Shrnutí: **databázi „upravit“ musíš jen tehdy, když Lovable běží na jiném Supabase projektu a tam migrace ještě neběžely.** Na „svém“ projektu, kde už migrace máš, nic měnit nemusíš.

---

## 3. Co nastavit v Lovable po syncu z GitHubu

Protože **`.env`** neposíláš do GitHubu, Lovable **nevidí** tvoje lokální proměnné. Nastav je v Lovable v jeho UI (projekt → Environment Variables / Settings):

| Proměnná | Kde vzít | Povinné |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API | ano |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | tamtéž (anon/public key) | ano |
| `VITE_SUPER_ADMIN_EMAIL` | např. `chousef@gmail.com` (super admin pro správu rolí) | ano pro role |

Bez těchto hodnot bude build v Lovable padat nebo aplikace nebude mít přístup k DB / super adminovi.

---

### Jak zobrazit stránku **Organizátoři** v Lovable (návod tučně)

Stránka **Organizátoři** v sekci **Správa** se zobrazí jen účtu **super administrátora**. Super admin se určuje podle e-mailu v env proměnné.

**Kroky:**

1. V Lovable otevři **svůj projekt** (larp-gateway).
2. Přejdi do **nastavení projektu** (Settings / Project settings / Environment variables – podle toho, jak to Lovable pojmenovává).
3. Najdi sekci **Environment Variables** (nebo **Build env** / **Env vars**).
4. **Přidej** (nebo uprav) proměnnou:
   - **Name:** `VITE_SUPER_ADMIN_EMAIL`
   - **Value:** **e-mail, kterým se do adminu přihlašuješ** (např. `chousef@gmail.com`).
5. **Ulož** nastavení a **znovu nasaď** aplikaci (Redeploy / Deploy), aby build vzal novou proměnnou.
6. Po přihlášení tímto e-mailem se v postranním menu v sekci **Správa** zobrazí položka **Organizátoři**.

**Shrnutí:** Bez `VITE_SUPER_ADMIN_EMAIL` v Lovable se položka Organizátoři v menu **nezobrazí**. Nastav ji na svůj přihlašovací e-mail a redeploy.

---

## 4. Musíš něco přepisovat ručně?

- **Ne** – pokud jen pushuješ kód a v Lovable nastavíš env (bod 3). Žádný soubor z `.gitignore` (jako `.env`) nemusíš do Lovable „přepisovat“; jen doplníš env v nastavení projektu.
- **Ano** – pokud Lovable při syncu **přepíše** nějaké soubory (např. vlastní úpravy z Lovable) a ty chceš zachovat verzi z Cursoru. Pak po syncu v Lovable zkontroluj změny a případně znovu nahraj/uprav konkrétní soubory z Cursoru (nebo merge ručně). To záleží na tom, jestli Lovable při „pull from GitHub“ přepisuje celý projekt nebo merguje.

Doporučení: před prvním velkým pushem do GitHubu si v Lovable udělej export / zálohu projektu (pokud to Lovable umí), abys měl jistotu, že nic důležitého nepřepíšeš bez kontroly.

---

## 5. Rychlý checklist před push do GitHubu

1. [ ] V Supabase (projekt, který používáš) jsou aplikované všechny migrace z `supabase/migrations/`.
2. [ ] V `.env` máš nastavené `VITE_SUPER_ADMIN_EMAIL` (lokálně); do repa jde jen `.env.example` s placeholderem.
3. [ ] Push do GitHubu (`.env` se neposílá – to je v pořádku).
4. [ ] V Lovable po syncu nastavit Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPER_ADMIN_EMAIL`.
5. [ ] Pokud Lovable používá jiný Supabase projekt než Cursor, na tom projektu spustit migrace (bod 2).
