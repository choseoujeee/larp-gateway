
# Oprava vytváření LARPů a End-to-End testy

## Identifikovaný problém

Při vytváření LARPu dochází k chybě:
```
invalid input syntax for type uuid: "dev-admin"
```

### Příčina
1. Funkce `signInAsDevAdmin()` v `useAuth.tsx` nastavuje fake user s ID `"dev-admin"`
2. Sloupec `owner_id` v tabulce `larps` je typu **UUID** (NOT NULL)
3. Když se posílá `owner_id: user?.id` do Supabase, posílá se neplatný textový řetězec místo UUID
4. RLS politika `WITH CHECK (auth.uid() = owner_id)` navíc vyžaduje skutečnou Supabase session

### Důsledek
Dev admin mode nemůže fungovat s RLS politikami, protože:
- `auth.uid()` vrací `null` (není Supabase session)
- `owner_id` musí být validní UUID

---

## Řešení

### Krok 1: Odstranit dev admin mode
- Smazat `signInAsDevAdmin()` z `useAuth.tsx`
- Odstranit tlačítko "Admin (testování bez přihlášení)" z `LoginPage.tsx`
- Místo toho vytvořit testovacího uživatele v Supabase

### Krok 2: Vytvořit testovací data pomocí seed scriptu
Vytvořit script `scripts/seed-test-data.mjs`, který:
- Využije Supabase Admin API (service role key) pro vytvoření testovacího uživatele
- Vytvoří testovací LARP s validním `owner_id`
- Vytvoří testovací běh, postavy a CP

### Krok 3: Upravit INSERT logiku v LarpsPage a LarpPickerPage
Pokud `user?.id` není k dispozici nebo session neexistuje:
- Zobrazit hlášku "Pro vytvoření LARPu se musíte přihlásit"
- Přesměrovat na login

---

## Plán testů

### Test 1: Organizátor vytváří nový LARP
```text
Scénář:
1. Přihlásit se jako organizátor (reálný Supabase účet)
2. Přejít do /admin
3. Kliknout na "Nový LARP"
4. Vyplnit: Název, Slug, Téma
5. Kliknout "Vytvořit"

Očekávaný výsledek:
- LARP se vytvoří v databázi
- Zobrazí se v seznamu LARPů
- owner_id odpovídá přihlášenému uživateli
```

### Test 2: Organizátor spravuje běh a postavy
```text
Scénář:
1. Vytvořit běh pro existující LARP
2. Přidat postavy s různými skupinami
3. Přidat CP s performer/performance_times
4. Vytvořit dokumenty pro různé cíle (vsichni, skupina, osoba)

Očekávaný výsledek:
- Všechny entity se vytvoří s korektními vazbami
- Každá postava má vygenerovaný access_token
- Hesla se hashují při ukládání
```

### Test 3: Hráč čte své dokumenty
```text
Scénář:
1. Přejít na /portal/{access_token}
2. Zadat správné heslo
3. Ověřit zobrazení dokumentů

Očekávaný výsledek:
- Hráč vidí pouze dokumenty pro: vsichni, jeho skupinu, jeho osobu
- Nevidí dokumenty jiných skupin/osob
- Nevidí dokumenty v hidden_documents
```

### Test 4: CP čte všechno o LARPu
```text
Scénář:
1. Přejít na /portal/{cp_access_token}
2. Zadat správné heslo CP
3. Ověřit zobrazení

Očekávaný výsledek:
- CP vidí VŠECHNY dokumenty (organizační, herní, osobní všech postav)
- Vidí harmonogram
- Vidí své performance info
```

---

## Implementační kroky

### A. Opravy kódu (okamžité)
| Soubor | Změna |
|--------|-------|
| `src/hooks/useAuth.tsx` | Odstranit `DEV_ADMIN_USER` a `signInAsDevAdmin` |
| `src/pages/auth/LoginPage.tsx` | Odstranit dev admin tlačítko |
| `src/pages/admin/LarpsPage.tsx` | Přidat kontrolu `session` před INSERT |
| `src/pages/admin/LarpPickerPage.tsx` | Přidat kontrolu `session` před INSERT |

### B. Testovací infrastruktura
| Soubor | Popis |
|--------|-------|
| `scripts/seed-test-data.mjs` | Script pro vytvoření testovacích dat |
| `src/test/integration/larp-crud.test.tsx` | Test vytváření/editace LARP |
| `src/test/integration/portal-access.test.tsx` | Test portálu hráče a CP |

### C. Dokumentace výsledků
| Soubor | Popis |
|--------|-------|
| `docs/VYSLEDKY-TESTU.md` | Aktualizovat s novými výsledky |

---

## Technické detaily

### RLS politiky zůstávají beze změny
Stávající politiky jsou korektní:
```sql
-- INSERT vyžaduje auth.uid() = owner_id
CREATE POLICY "Vlastník vytváří LARPy" ON larps
FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
```

### Validace před INSERT
```typescript
// Před INSERT do larps
if (!session?.user?.id) {
  toast.error("Pro vytvoření LARPu se musíte přihlásit");
  navigate("/login");
  return;
}
```

### Testovací uživatel
Pro testování bude nutné mít reálný Supabase účet. Možnosti:
1. Registrace přes /register s verifikací e-mailu
2. Seed script s Admin API (vyžaduje service role key)
3. Ruční vytvoření v Lovable Cloud UI

---

## Očekávané výsledky po implementaci

- Vytváření LARPů bude fungovat pro přihlášené organizátory
- Dev admin mode bude odstraněn (bezpečnostní riziko)
- Automatizované testy ověří všechny uživatelské scénáře
- Dokumentace výsledků testů bude aktualizována
