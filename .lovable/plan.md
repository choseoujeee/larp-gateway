

# Plán: Drag-and-drop řazení dokumentů a vylepšené zobrazení

## Přehled

Implementace drag-and-drop funkcionality pro přeřazování dokumentů a vylepšení zobrazení dokumentů podle cílení (společné → skupiny → individuální). Tím se významně zrychlí práce s pořadím dokumentů.

## Co se změní pro uživatele

1. **Dokumenty seřazeny podle pořadí** - všude uvidíte dokumenty ve správném pořadí (jako je vidí hráč)
2. **Drag-and-drop** - přetáhnutím dokumentu myší změníte jeho pořadí
3. **Logické zobrazení podle cíle** - nejdřív společné, pak po skupinách (včetně "CP" jako speciální skupiny), nakonec individuální

---

## Technický plán

### 1. Instalace knihovny @dnd-kit

Přidám `@dnd-kit/core`, `@dnd-kit/sortable` a `@dnd-kit/utilities` pro drag-and-drop funkcionalitu.

### 2. Komponenta SortableDocumentItem

Vytvořím novou komponentu `src/components/admin/SortableDocumentItem.tsx`:
- Wrapper kolem `DocumentListItem` s podporou drag-and-drop
- Přidá "drag handle" ikonu (⣿ grip)
- Při přetahování vizuálně indikuje stav

### 3. Úprava DocumentsPage.tsx

**Změny v řazení:**
- Primární řazení podle `priority`, sekundární podle `sort_order`
- V režimu "Podle cíle": sekce v pořadí Společné → Skupiny (včetně CP) → Individuální

**Drag-and-drop implementace:**
- Každá sekce (typ dokumentu / cíl) bude samostatný `SortableContext`
- Po přetažení se přepočítá `sort_order` všech dokumentů v sekci
- Batch update do databáze

**Zobrazení skupin:**
- Osoby typu "cp" se zobrazí jako zvláštní skupina "CP" v sekci skupin
- Pořadí skupin: abecedně, "CP" na konci

### 4. Úprava PersonsPage.tsx

**Změny v detailu postavy:**
- Dokumenty seřazeny podle `priority` → `sort_order`
- Drag-and-drop v každé sekci (Všech, Skupiny, Individuální)
- Po přetažení aktualizace `sort_order` v DB

### 5. Úprava CpPage.tsx (pokud je detail CP)

- Podobná logika jako u PersonsPage - drag-and-drop pro dokumenty CP

### 6. Funkce pro update sort_order

```typescript
async function updateDocumentOrder(documents: Document[]) {
  // Batch update - každý dokument dostane nový sort_order podle pozice
  const updates = documents.map((doc, index) => ({
    id: doc.id,
    sort_order: index
  }));
  
  for (const update of updates) {
    await supabase
      .from('documents')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id);
  }
}
```

---

## Struktura souborů

```text
src/
├── components/admin/
│   ├── SortableDocumentItem.tsx   (nový)
│   ├── DocumentListItem.tsx       (přidání drag handle prop)
│   └── DocumentEditDialog.tsx     (beze změn)
└── pages/admin/
    ├── DocumentsPage.tsx          (drag-and-drop + lepší řazení)
    ├── PersonsPage.tsx            (drag-and-drop v detailu)
    └── CpPage.tsx                 (možná v budoucnu)
```

---

## Detaily implementace

### Řazení dokumentů všude

```typescript
// Primární: priority (1=prioritní, 2=normální, 3=volitelné)
// Sekundární: sort_order
// Terciární: created_at
documents.sort((a, b) => {
  if (a.priority !== b.priority) return a.priority - b.priority;
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
});
```

### Zobrazení "Podle cíle" na DocumentsPage

```text
┌─────────────────────────────────────┐
│ Společné dokumenty (pro všechny)    │
│ ├── Dokument 1 [drag]               │
│ └── Dokument 2 [drag]               │
├─────────────────────────────────────┤
│ Skupina: Fronta                     │
│ └── Dokument 3 [drag]               │
├─────────────────────────────────────┤
│ Skupina: Zázemí                     │
│ └── Dokument 4 [drag]               │
├─────────────────────────────────────┤
│ Skupina: CP                         │
│ └── Dokument pro všechny CP [drag]  │
├─────────────────────────────────────┤
│ Individuální dokumenty              │
│ ├── Pro: Jan Novák [drag]           │
│ └── Pro: Eva Malá [drag]            │
└─────────────────────────────────────┘
```

### Drag-and-drop flow

1. Uživatel uchopí dokument za "grip" ikonu
2. Přetáhne na novou pozici ve stejné sekci
3. Po puštění:
   - Lokální stav se okamžitě aktualizuje (optimistic UI)
   - Odešle se batch update do DB
   - Toast "Pořadí uloženo"

---

## Omezení

- Drag-and-drop funguje pouze v rámci jedné sekce (nelze přetáhnout z "Společných" do "Skupinových")
- Změna cílení dokumentu se stále dělá přes editační dialog

