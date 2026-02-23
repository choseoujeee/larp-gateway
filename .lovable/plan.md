
# Oprava editacniho dialogu na strance Dokumenty

## Problem

Stranka `/admin/dokumenty` (`DocumentsPage.tsx`) pouziva vlastni inline dialog pro editaci dokumentu (radky 768-1088), ktery je **kopie** logiky z `DocumentEditDialog.tsx`. Zmeny (fullscreen tlacitko, accordion metadata) byly provedeny jen v `DocumentEditDialog.tsx`, ale `DocumentsPage.tsx` stale pouziva starou inline verzi bez techto vylepseni.

## Reseni

Refaktorovat `DocumentsPage.tsx` tak, aby pouzivala sdileny komponent `DocumentEditDialog` (stejne jako to uz delaji `CpDetailPage`, `ProductionPage`, `GroupsPage`, `PersonsPage`).

### Co se zmeni

**Soubor: `src/pages/admin/DocumentsPage.tsx`**

1. Pridat import `DocumentEditDialog` z `@/components/admin/DocumentEditDialog`
2. Nahradit cely inline dialog (radky 768-1088) za `<DocumentEditDialog>` komponent s prislusnymi props
3. Odstranit nepotrebne importy (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`, `RichTextEditor`, `Checkbox`, `ScrollArea`) pokud se uz jinde nepouzivaji
4. Upravit state management - `formData`, `hiddenFromPersonIds`, `hiddenFromGroupNames`, `saving` logiku predat do `DocumentEditDialog` (ktera uz to vse resi)
5. Ponechat `AlertDialog` pro smazani (nebo vyuzit delete z `DocumentEditDialog`)

### Vysledek

- Dialog pro editaci/vytvareni dokumentu na `/admin/dokumenty` bude mit fullscreen tlacitko
- Metadata budou v accordeonu
- WYSIWYG editor bude mit vsechny nove funkce (fonty, velikosti v pt, vymazani formatovani, radkovani)
- Vsechny stranky budou pouzivat jediny sdileny komponent = konzistentni UX a snazsi udrzba
