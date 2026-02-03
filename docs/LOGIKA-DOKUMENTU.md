# Logika zobrazování dokumentů

Kde se který dokument zobrazí podle **Cílení** (target_type), **Skupiny** (target_group) a **Zobrazit i CP** (visible_to_cp).

---

## 1. Cílení a viditelnost

| Cílení (target_type) | Skupina / osoba | visible_to_cp | Kdo dokument vidí |
|---------------------|------------------|---------------|--------------------|
| **Všichni**         | –                | **false**     | Jen hráči (postavy) na svém portálu. CP dokument **nevidí** (ani na portálu CP, ani v admin/cp). |
| **Všichni**         | –                | **true**      | Hráči + CP (na portálu všech CP a v admin/cp v sekci Dokumenty společné). |
| **Skupina**         | např. CP         | –             | Jen osoby v dané skupině. Skupina **CP** = dokument jen pro CP (portál všech CP, admin/cp společné). |
| **Konkrétní osoba** | vybraná osoba    | –             | Jen ta osoba (na jejím portálu a v admin u té postavy/CP). |

**Typ dokumentu** (Organizační, Herní, CP…) je jen kategorie – **neovlivňuje**, kde se dokument zobrazí. O zobrazení rozhoduje **Cílení** a u „Všichni“ i **Zobrazit i CP**.

---

## 2. Kde se dokumenty načítají

| Místo | Podmínka zobrazení |
|-------|----------------------|
| **Admin /admin/dokumenty** | Všechny dokumenty LARPu (bez filtru podle cílení). |
| **Admin /admin/cp/:slug – Dokumenty společné** | `(target_type = skupina AND target_group = CP)` NEBO `(target_type = vsichni AND visible_to_cp = true)`. |
| **Admin /admin/cp/:slug – Dokumenty individuální** | `target_type = osoba AND target_person_id = tato CP`. |
| **Portál všech CP (/cp/:larpSlug)** | Stejně jako „Dokumenty společné“ v admin/cp: skupina CP nebo vsichni s visible_to_cp = true. |
| **Portál konkrétní CP (/hrac/:slug/view)** | Jen dokumenty pro tuto osobu: `target_type = osoba AND target_person_id = tato CP` (životopis, vztahy). |
| **Portál hráče (postavy)** | Vsichni, nebo skupina = group_name postavy, nebo osoba = tato postava. |

---

## 3. Tvůj případ: „Praktické pro CP“ (Typ: CP, Cílení: Všichni)

- Dokument má **Cílení = Všichni** → zobrazuje se **hráčům** (postavám).
- Aby se zobrazoval **i CP** (na portálu všech CP a v admin/cp v sekci Dokumenty společné), musí mít **Zobrazit i CP = true**.
- Pokud je **Zobrazit i CP** nezaškrtnuté (výchozí), dokument **CP nevidí** – proto ho vidíš jen v admin/dokumenty.

**Řešení:** V admin/dokumenty otevři dokument „Praktické pro CP“, u položky **„Zobrazit i CP“** zaškrtni checkbox a ulož. Pak se dokument objeví na portálu všech CP i v admin/cp v sekci Dokumenty společné.

**Alternativa:** Chceš-li dokument **jen pro CP** (ne pro všechny hráče): nastav **Cílení = Skupina** a **Skupina = CP**. Takový dokument uvidí jen CP (na portálu všech CP a v admin/cp), hráči ho neuvidí.
