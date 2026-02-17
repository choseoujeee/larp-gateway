
# 5 UX vylepseni portalu a adminu

## 1. ThemeToggle: jednoduche prepnuti na klik (bez dropdown)

Nahradim dropdown menu jednim tlacitkem. Klik prepne svetle na tmave a naopak. Pouziji `resolvedTheme` z `useTheme()` pro detekci aktualniho rezimu.

**Soubor:** `src/components/ThemeToggle.tsx`

---

## 2. Admin/osoby – heslo v editacnim dialogu: zobrazeni + moznost vymazat

V editacnim dialogu osoby:
- Nactu aktualni `password_hash` z DB pri otevreni editace a zobrazim ho v textovem poli (type="text", ne "password")
- Pridam tlacitko "Vymazat heslo" ktere nastavi `password_hash` na prazdny retezec
- Kdyz je heslo prazdne, portal pusti hrace bez hesla

**Soubory:**
- `src/pages/admin/PersonsPage.tsx` – uprava `openEditDialog` (nacist password_hash), zmena type="text", tlacitko vymazat
- `src/hooks/usePortalSession.tsx` – overit, ze prazdny password_hash = pristup bez hesla (uz je implementovano v `verify_person_by_slug` RPC? - overim a pripadne upravim)

### Technicke detaily
- Pri otevreni editace nactu `password_hash` z tabulky `persons` a predvyplnim do pole
- Pole bude `type="text"` aby bylo heslo viditelne
- Tlacitko "Vymazat heslo" nastavi formData.password na "" a prida flag pro ulozeni prazdneho hesla
- V `handleSave` kdyz je flag "vymazat heslo", poslat `password_hash: ""` do DB
- V portalu (`PortalAccessPage` nebo hook) – overit ze prazdny hash = pristup bez hesla

---

## 3. Admin/produkce – odkaz na portal primo jako link (bez kopirovani)

Nahradim Input + tlacitko "Zkopirovat" jednoduchym odkazem `<a>` na portal. Uzivatel klikne a otevre se mu portal, odkud si muze URL zkopirovat z listy prohlizece.

**Soubor:** `src/pages/admin/ProductionPage.tsx` – radky 662-668

---

## 4. Produkcni portal – design dokumentu jako na hracskem portalu + odkaz na CP portal

a) Dokumenty budou pouzivat stejny Collapsible styl jako hracsky portal (PaperCard, kategorie, zebra striping) misto Accordion.
b) Nahoře v headeru pridam odkaz "CP portal" ktery povede na `/cp/{larpSlug}`.

**Soubor:** `src/pages/portal/ProductionPortalPage.tsx`

### Technicke detaily
- Potrebuji znat `larp_slug` – pridam ho do session (z RPC `get_production_portal_data` nebo z `check_production_portal_passwordless` / `verify_production_portal_access`)
- Migrace: upravit RPC aby vracelo i `larp_slug` (z tabulky `larps`)
- Dokumenty: nahradim Accordion za Collapsible se stejnym stylem jako `DocumentItem` v `PortalViewPage.tsx`

---

## 5. Hracsky portal – sticky hlavicka dokumentu, ThemeToggle dole, bez odhlasit nahore

a) **Sticky hlavicky dokumentu:** Kdyz uzivatel scrolluje v otevrenem dokumentu, nazev dokumentu zustane prilepeny nahoře. Dalsi sticky hlavicka predchozi "vytlaci" (CSS `position: sticky` s `top: 0` a `z-index`).
b) **"Sbalit" tlacitko:** Oddeli vodorovnou carou, zarovnani na stred, vyraznejsi.
c) **Odebrat odhlasit z headeru:** Presunout jen do paticky.
d) **ThemeToggle floatuje vpravo dole:** Vedle tlacitka "Zpetna vazba". Odebrat z headeru.

**Soubory:**
- `src/pages/portal/PortalViewPage.tsx` – sticky hlavicky, odebrat ThemeToggle a Odhlasit z headeru
- `src/components/FeedbackButton.tsx` – neni treba menit, ThemeToggle bude vedle nej primo v PortalViewPage (floating div)
- `src/pages/portal/PortalViewPage.tsx` – DocumentItem: pridat `sticky top-0 z-10 bg-background` na CollapsibleTrigger

### Technicke detaily
- CollapsibleTrigger v DocumentItem dostane `className` s `sticky top-0 z-10 bg-background border-b`
- Tlacitko "Sbalit" v obsahu dokumentu: `<div className="border-t border-border mt-4 pt-3 text-center">` + vyraznejsi button
- Z headeru (radky 217-232) odebrat ThemeToggle a Odhlasit
- Pridat fixed div vpravo dole: `<div className="fixed bottom-4 right-40 z-50 no-print"><ThemeToggle /></div>` (vedle FeedbackButton ktery je na right-4)

---

## Poradi implementace

1. ThemeToggle (nejjednodussi, ovlivni vsechny stranky)
2. Hracsky portal UX (sticky headers, floating toggle)
3. Admin/osoby – heslo
4. Admin/produkce – odkaz
5. Produkcni portal – design + CP link
