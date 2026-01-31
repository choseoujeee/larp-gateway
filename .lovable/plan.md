

# Mock data: LARP Pán prstenů - Stíny Mordoru

## Přehled

Vytvořím kompletní seed skript `scripts/seed-lotr.mjs`, který naplní databázi testovacími daty pro LARP zasazený do světa Pána prstenů.

---

## Data k vytvoření

### 1. LARP

| Pole | Hodnota |
|------|---------|
| name | Stíny Mordoru |
| slug | stiny-mordoru |
| theme | fantasy |
| description | Je rok 3018 třetího věku. Prsten moci byl nalezen v Kraji a Společenstvo se vydává na cestu do Mordoru... |

### 2. Běh

| Pole | Hodnota |
|------|---------|
| name | Jarní běh 2026 |
| slug | jarni-beh-2026 |
| date_from | 2026-05-15 |
| date_to | 2026-05-17 |
| location | Hrad Bouzov |
| address | Bouzov 8, 783 25 Bouzov |
| payment_account | 123456789/0100 |
| payment_amount | 1500 Kc |
| payment_due_date | 2026-04-30 |
| mission_briefing | Vitejte ve Stredozemi. Temny pan Sauron se probouzi... |
| contact | Gandalf Sedy - gandalf@larportal.xx, tel: 777 123 456 |
| footer_text | Pripravte si vhodne kostymi a nezapomente na dobre boty! |

### 3. Postavy (8)

| Slug | Jmeno | Skupina | Popis |
|------|-------|---------|-------|
| frodo | Frodo Pytlik | Hobiti | Nositel Prstenu, statecny hobit z Kraje |
| sam | Samved Krepelka | Hobiti | Froduv verny zahradnik a nejblizsi pritel |
| gandalf | Gandalf Sedy | Istari | Mocny carodej, vudce Spolecenstva |
| aragorn | Aragorn | Dunedain | Dedic Isildura, budouci kral Gondoru |
| legolas | Legolas | Elfove | Elfsky princ z Temneho hvozdu, mistr luku |
| gimli | Gimli | Trpaslici | Syn Gloina, hrdy valecnik ze Samotne hory |
| boromir | Boromir | Gondor | Syn spravce Gondoru, statecny vojak |
| merry | Smelmír Brandorad | Hobiti | Odvazny hobit, Froduv bratranec |

### 4. Cizi postavy - CP (6)

| Slug | Jmeno | Performer | Performance times |
|------|-------|-----------|-------------------|
| galadriel | Galadriel | Jana Kralova | Sobota 10:00-12:00 |
| elrond | Elrond | Michal Horak | Patek 20:30-22:00 |
| nazgul | Pan nazgulu | Ondrej Marek | Sobota 20:00-22:00 |
| gollum | Glum | Stepan Fiala | Prubezne cely vikend |
| saruman | Saruman | Pavel Novotny | Sobota 16:00-18:00 |
| theoden | Theoden | Lukas Prochazka | Nedele 09:00-11:00 |

### 5. Dokumenty

**Organizacni (pro vsechny):**
- Pravidla hry
- Harmonogram vikendu
- Prakticke informace
- Kostymni pozadavky

**Herni (pro vsechny):**
- Svet Stredozeme
- Mapka lokaci
- Jazyky Stredozeme
- Dulezite predmety

**Osobni dokumenty (postava - pro kazdou postavu):**
- 8x Charakteristika postavy
- pro každou postavu zvlášt dokument s popsanými vztahy k ostatním postavám a CP

**Týmové dokumenty (rasové - pro kazdou skupinu k popisu rasy a jejího zázemí):**
- dokument pro hobity
- dokument pro lidi Gondor + Dunedain
- dokument pro istari
- dokument pro elfy
- dokument pro trpaslíky

**Medailonky (medailonek - pro kazdou postavu):**
- 8x Medailonek s verejnymi informacemi

**CP dokumenty:**
- 6x Scenar vystoupeni pro kazdou CP

### 6. Prirazeni hracu (run_person_assignments)

| Postava | Hrac | Email | Zaplaceno |
|---------|------|-------|-----------|
| Frodo | Jan Novak | jan.novak@larportal.xx | Ano |
| Sam | Petr Svoboda | petr.svoboda@larportal.xx | Ano |
| Gandalf | Martin Dvorak | martin.dvorak@larportal.xx | Ne |
| Aragorn | Tomas Cerny | tomas.cerny@larportal.xx | Ano |
| Legolas | Lukas Vesely | lukas.vesely@larportal.xx | Ne |
| Gimli | David Prochazka | david.prochazka@larportal.xx | Ano |
| Boromir | Jakub Kucera | jakub.kucera@larportal.xx | Ano |
| Merry | Filip Pospisil | filip.pospisil@larportal.xx | Ne |

CP prirazeni:
| CP | Performer | Email |
|----|-----------|-------|
| Galadriel | Jana Kralova | jana.kralova@larportal.xx |
| Elrond | Michal Horak | michal.horak@larportal.xx |
| Nazgul | Ondrej Marek | ondrej.marek@larportal.xx |
| Glum | Stepan Fiala | stepan.fiala@larportal.xx |

### 7. Harmonogram (schedule_events)

**Den 1 (patek):**
- 16:00 - Registrace a ubytovani (informace, 90 min)
- 18:00 - Vecere (jidlo, 60 min)
- 19:30 - Uvodni briefing (programovy_blok, 60 min)
- 20:30 - Rada Elronda (vystoupeni_cp, 90 min, cp: Elrond)
- 22:00 - Nocni hlidka (programovy_blok, 120 min)

**Den 2 (sobota):**
- 08:00 - Snidane (jidlo, 60 min)
- 09:00 - Presun do Lorienu (presun, 60 min)
- 10:00 - Setkani s Galadriel (vystoupeni_cp, 120 min, cp: Galadriel)
- 12:00 - Obed (jidlo, 60 min)
- 14:00 - Utek z Morie (programovy_blok, 120 min)
- 16:00 - Konfrontace se Sarumanem (vystoupeni_cp, 120 min, cp: Saruman)
- 18:00 - Vecere (jidlo, 60 min)
- 20:00 - Nocni utok nazgulu (vystoupeni_cp, 120 min, cp: Nazgul)

**Den 3 (nedele):**
- 08:00 - Snidane (jidlo, 60 min)
- 09:00 - Finalni bitva (programovy_blok, 120 min)
- 11:00 - Zaverecny ceremonial (informace, 60 min)
- 12:00 - Obed a rozlouceni (jidlo, 60 min)

### 8. Produkce (production_links)

| Nazev | URL | Typ |
|-------|-----|-----|
| Sdilene fotky | https://drive.google.com/lotr-fotky | cloud |
| Kostymni inspirace | https://pinterest.com/lotr-cosplay | reference |
| Podkladova hudba | https://spotify.com/lotr-playlist | audio |
| Skupinovy chat | https://discord.gg/stiny-mordoru | komunikace |

### 9. Tiskoviny (printables)

| Nazev | URL | Instrukce |
|-------|-----|-----------|
| Mapa Stredozeme A2 | https://example.com/map.pdf | Tisk na A2, laminovat |
| Elfske napisy | https://example.com/elvish.pdf | Tisk na pergamen, 10 kopii |
| Herni penize | https://example.com/coins.pdf | Tisk oboustranne, rozstrihat |
| Dopis od Gandalfa | https://example.com/letter.pdf | Tisk na stary papir, 8 kopii |

---

## Soubory k vytvoreni/uprave

| Soubor | Akce |
|--------|------|
| `scripts/seed-lotr.mjs` | Vytvorit - kompletni seed skript |
| `package.json` | Upravit - pridat `"seed:lotr": "node scripts/seed-lotr.mjs"` |

---

## Technicke poznamky

1. **Struktura dat:** Osoby (`persons`) jsou na urovni LARPu (`larp_id`), ne behu
2. **Prirazeni hracu:** Pouziva tabulku `run_person_assignments` s vlastnim heslem a access_token
3. **Hesla:** Pouziji RPC funkci `create_person_with_password` a `create_person_assignment_with_password` pro spravne hashovani
4. **Vychozi heslo:** `stredozem2026` pro vsechny postavy i CP
5. **Emaily:** Vsechny na domene `@larportal.xx` pro bezpecnost

---

## Postup implementace

1. Vytvorit LARP "Stiny Mordoru" s fantasy tematem
2. Vytvorit beh "Jarni beh 2026" s kompletni konfiguraci
3. Vytvorit 8 postav pres RPC `create_person_with_password`
4. Vytvorit 6 CP pres RPC `create_person_with_password`
5. Vytvorit prirazeni hracu pres RPC `create_person_assignment_with_password`
6. Vytvorit dokumenty - organizacni, herni, osobni, medailonky, CP
7. Vytvorit harmonogram pro 3 dny
8. Vytvorit produkcni linky
9. Vytvorit tiskoviny

