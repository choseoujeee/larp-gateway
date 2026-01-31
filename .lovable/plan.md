

# LARP Portál – Plán implementace

## 🎯 Co budujeme
Komplexní standalone aplikace pro organizátory LARPů, jejich hráče a CP (cizí postavy). Organizátoři zakládají hry, píší dokumenty a spravují postavy, spravují organizační (lokace, termíny - larpy se opakují a každý má několik uvedení s různámi hráči, ale stejnými dokumenty) a herní informace. Hráči a CP dostávají unikátní link + heslo a vidí jen své materiály.

---

## 🏗️ Fáze 1: Základy a backend

### 1.1 Databáze a struktura
- **Tabulky:** larpy, běhy, osoby (postavy + CP), dokumenty, příjemci dokumentů, skryté dokumenty, harmonogram, tiskoviny, produkce
- **Vztahy:** LARP → běhy → všechny ostatní entity
- **Bezpečnost:** RLS politiky pro organizátory, RPC funkce pro přístup hráčů/CP

### 1.2 Autentizace organizátorů
- Přihlášení/registrace přes Supabase Auth (login + heslo) - žádné maily, přístupy vytvoří admin
- Ochrana admin sekcí – pouze přihlášení organizátoři
- Vlastník LARPu = ten kdo ho vytvořil

### 1.3 Systém přístupu pro hráče/CP
- Generování unikátních access tokenů
- Ověření hesla přes RPC funkci
- Session ukládání do localStorage
- Hráči vidí jen dokumenty pro své postavy (dokumenty všech, jeho skupiny, jeho osoby)
- CP vidí vše - všechny hráčské dokumenty, všechny CP, harmonogram atd)

---

## 🎨 Fáze 2: Vizuální stránka

### 2.1 Historické téma (WWII styl)
- Odstíny hnědé, krémová, papírový dojem
- Typewriter fonty
- Barevné kódy pro typy dokumentů (organizační, herní, osobní)
- "Classified documents" vizuální styl
- NEPOUŽÍVAT MODERNÍ EMOTIKONY!!!! Místo toho je možné použít emotikony nebarevné, jen design black/white simple (dokument, postava, maska, amplion, ...)

### 2.2 Responzivní design
- Mobile-first přístup pro portály hráčů/CP
- Desktop optimalizace pro admin rozhraní

---

## 👔 Fáze 3: Admin rozhraní

### 3.1 Dashboard
- Přehled statistik (počet postav, CP, dokumentů, událostí)
- Mission Briefing aktuálního běhu
- Navigační kachlíky do jednotlivých sekcí
- Výběr LARPu a běhu

### 3.2 Správa LARPů a běhů
- Vytvoření/úprava/smazání LARPu
- Konfigurace běhu (datum, místo, adresa, kontakt, zápatí)
- Výběr vizuálního tématu

### 3.3 Správa postav
- Seznam postav s filtry (skupina, fulltext)
- CRUD postavy (slug, jméno, skupina, heslo)
- Generování a kopírování přístupového linku
- Indikace: má/nemá medailonek, počet dokumentů

### 3.4 Správa CP (cizích postav)
- Seznam CP s filtry (performer, fulltext)
- CRUD CP (slug, jméno, performer, časy vystoupení, heslo)
- Generování přístupového linku

### 3.5 Správa dokumentů
- **WYSIWYG editor** (TipTap) pro psaní obsahu
- Typy: organizační, herní, postava, medailonek, cp
- Cílení: všichni / skupina / konkrétní osoba
- Skrytí před vybranými osobami
- Přehled: společné / po skupinách / po postavách

### 3.6 Harmonogram
- CRUD událostí (den, čas, délka, typ, akce, místo)
- Vazba na CP pro propojení s portálem
- Timeline zobrazení po dnech a časech
- **Live běh** – reálný čas, zvýraznění aktuálního bloku
- Filtry podle postav/CP

### 3.7 Produkce a tiskoviny
- Seznam odkazů s popisem a typem
- Instrukce k tisku u tiskovin
- (Upload souborů doplníme později)

---

## 🎭 Fáze 4: Portály pro hráče a CP

### 4.1 Portál hráče
- Přístup přes unikátní link
- Formulář pro zadání hesla (žádné emaily, jen url+heslo)
- Po ověření: Mission Briefing, medailonek, dokumenty v sekcích
- Sekce: ORGANIZAČNÍ, HERNÍ, OSOBNÍ
- Tlačítka pro tisk/PDF (vše / organizační / herní / osobní)
- Tlačítko odhlášení

### 4.2 Portál CP
- Stejný princip přístupu (link + heslo)
- Mission Briefing, Act Info (performer, časy)
- Dokument "charakter"
- Společné CP dokumenty + dokumenty pro tuto CP
- Tisk/PDF celé stránky

---

## 🖨️ Fáze 5: Tisk a export

### 5.1 Tiskové funkce
- Print dialog prohlížeče s optimalizovaným CSS
- Možnost tisku různých kategorií dokumentů
- Pro organizátora: náhled "jako hráč/CP"
- všechny dokumenty půjde stáhnout jako pdf (tisk -> uložit jako pdf)

---

## 🔒 Bezpečnostní prvky
- Hesla ukládána pouze jako hash (bcrypt)
- RLS politiky pro oddělení dat organizátorů
- Validace duplicitních slugů v rámci běhu
- Session management pro portály

---

## 📋 Výsledné obrazovky
1. **Landing page** – úvodní stránka s WWII tématem
2. **Přihlášení organizátora** – e-mail + heslo
3. **Admin Dashboard** – přehled + navigace
4. **Admin: LARPy** – seznam a správa LARPů
5. **Admin: Běhy** – konfigurace běhu
6. **Admin: Postavy** – seznam + CRUD + linky
7. **Admin: CP** – seznam + CRUD + linky  
8. **Admin: Dokumenty** – editor + přehledy
9. **Admin: Harmonogram** – timeline + live běh
10. **Admin: Produkce** – odkazy a materiály
11. **Admin: Tiskoviny** – instrukce k tisku
12. **Portál hráče** – přístup + dokumenty + tisk
13. **Portál CP** – přístup + dokumenty + tisk

CP vidí vše jako admin, jen nemůže editovat. Tzn. admin rozhraní bude přistupné všem od url+heslo, ale jen ti, kteří ještě budou přihlášení loginem a heslem budou mít možnost editace.

---

## 🇨🇿 Jazyk
Celé UI kompletně v češtině (tlačítka, texty, chybové hlášky, navigace).

