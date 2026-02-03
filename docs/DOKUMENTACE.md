# LARP Gateway – dokumentace aplikace

**Účel:** Popis datového modelu, API/RLS a hlavních user flow pro předatelnost projektu (PRD kap. 8.1).

---

## 1. Datový model

Vztahy: **larp** → **run** → person, document, schedule_event, production_links, printables. Konfigurace běhu je v sloupcích run (contact, footer_text, mission_briefing).

| Tabulka | Popis hlavních sloupců |
|---------|------------------------|
| **larps** | id, name, slug, description, **theme** (např. wwii, fantasy), owner_id → auth.users |
| **runs** | id, larp_id, name, slug, date_from, date_to, location, address, **contact**, **footer_text**, **mission_briefing**, is_active |
| **persons** | id, run_id, **type** (postava \| cp), slug, name, **group_name**, **performer**, **performance_times**, password_hash, **access_token** (UUID, unikátní), UNIQUE(run_id, slug) |
| **documents** | id, run_id, title, **content** (HTML), **doc_type** (organizacni \| herni \| postava \| medailonek \| cp), **target_type** (vsichni \| skupina \| osoba), target_group, target_person_id, sort_order |
| **hidden_documents** | document_id, person_id – dokument se dané osobě nezobrazí; UNIQUE(document_id, person_id) |
| **schedule_events** | id, run_id, day_number, start_time, duration_minutes, **event_type**, title, description, location, **cp_id** (nullable, odkaz na persons pro CP) |
| **production_links** | id, run_id, title, url, description, link_type, sort_order |
| **printables** | id, run_id, title, url, print_instructions, sort_order |

Enums: **document_type**, **document_target**, **person_type**, **event_type** (definované v první migraci).

---

## 2. API a RLS

### 2.1 RPC funkce

- **verify_person_by_slug(p_slug TEXT, p_password TEXT)**  
  Volá se z portálu při zadání hesla. Kontroluje `persons.slug` a heslo (crypt). Vrací jeden řádek: person_id, person_name, person_type, run_id, larp_name, run_name, mission_briefing, group_name, performer, performance_times (Act Info pro CP), run_contact, run_footer_text (zápatí), larp_theme. **SECURITY DEFINER** – nevyžaduje auth, vystavuje jen data dané osoby. (Přístup přes slug; token v URL je slug.)

- **get_person_documents(p_person_id UUID)**  
  Vrací dokumenty pro danou osobu: pro **cp** všechny dokumenty běhu kromě těch v hidden_documents; pro **postava** jen dokumenty kde target_type = vsichni, nebo target_group = group_name osoby, nebo target_person_id = person_id, a zároveň dokument není v hidden_documents. Řazení: doc_type, sort_order, title. **SECURITY DEFINER**.

- **get_run_schedule(p_run_id UUID)**  
  Vrací události harmonogramu běhu včetně cp_name (join na persons). Používá se v adminu. Přístup přes RLS (organizátor musí mít běh).

### 2.2 RLS (Row Level Security)

- **Organizátor:** Přihlášení přes Supabase Auth. Všechny tabulky mají RLS zapnuté. Politiky jsou založené na **vlastníkovi LARPu**: helper funkce `is_larp_owner(larp_id)` a `is_run_owner(run_id)` (run → larp → owner_id = auth.uid()). Organizátor vidí/upravuje jen LARPy a běhy, které vlastní, a všechna data pod nimi (persons, documents, hidden_documents, schedule_events, production_links, printables).

- **Hráč/CP:** Nepřihlašují se do Supabase Auth. Přístup k datům pouze přes RPC **verify_person_by_slug** (slug + heslo) a **get_person_documents** po ověření. Žádné přímé čtení tabulek.

---

## 3. User flow

### 3.1 Organizátor

1. Přihlášení (e-mail + heslo) na `/login`.
2. Po přihlášení přesměrování na `/admin`. Výběr **aktuálního běhu** v layoutu (RunContext) – všechny stránky adminu pak pracují s tímto run_id.
3. **Dashboard** – přehled (LARPy, Běhy, Postavy, CP, Dokumenty, Harmonogram, Produkce, Tiskoviny).
4. **LARPy / Běhy** – CRUD LARPů a běhů; u běhu konfigurace (kontakt, zápatí, Mission Briefing), u LARPu výběr tématu (theme).
5. **Postavy / CP** – přidání osob, nastavení hesla, zobrazení/zkopírování linku (`/hrac/:slug`).
6. **Dokumenty** – CRUD, typ dokumentu, cílení (všichni / skupina / osoba), „Skrýt před“ (multi-select osob), WYSIWYG editor obsahu (HTML). Přehled po blocích: Společné, Po skupinách, Po postavách.
7. **Harmonogram** – CRUD událostí, vazba na CP (cp_id), režim „Spustit běh“ (den, reálný čas, zvýraznění bloku, odkaz na portál CP).
8. **Produkce / Tiskoviny** – CRUD položek s URL a popisem; tlačítka Otevřít/Stáhnout.

### 3.2 Hráč / CP

1. Otevření linku `/hrac/:slug` (alias `/portal/:token` přesměruje na `/hrac/:slug`).
2. Pokud není session: zobrazení formuláře s heslem. Odeslání → volání **verify_person_by_slug(slug, heslo)**. Při úspěchu uložení session (localStorage) a načtení dat.
3. Zobrazení portálu: Mission Briefing, (u CP) Informace o vystoupení (performer, časy), dokumenty v rozbalovacích sekcích (accordion) podle typu (organizační, herní, osobní, CP). Tlačítko „Otevřít vše pro tisk“, tlačítka tisk podle kategorie (org. / herní / osobní / vše). Zápatí z konfigurace běhu (kontakt, poznámka).
4. Odhlášení z portálu vymaže session; při příští návštěvě je znovu vyžadováno heslo.
