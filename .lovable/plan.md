
# Oprava vytváření LARPů a End-to-End testy

## ✅ IMPLEMENTOVÁNO

### Krok 1: Odstranit dev admin mode ✅
- [x] Smazán `DEV_ADMIN_USER` a `signInAsDevAdmin()` z `useAuth.tsx`
- [x] Odstraněno tlačítko "Admin (testování bez přihlášení)" z `LoginPage.tsx`

### Krok 2: Přidat session validaci ✅
- [x] `LarpsPage.tsx` - kontrola `session?.user?.id` před INSERT
- [x] `LarpPickerPage.tsx` - kontrola `session?.user?.id` před INSERT

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

## Další krok: Testování

Pro testování je nutné mít reálný Supabase účet. Možnosti:
1. Registrace přes /register s verifikací e-mailu
2. Seed script s Admin API (vyžaduje service role key)
