# Vytuneni editace dokumentu - fullscreen, accordion metadata, pokrocily WYSIWYG

## 1. Fullscreen tlacitko v dialogu

Pridam stav `isFullscreen` do `DocumentEditDialog`. Tlacitko v headeru (ikona Maximize2/Minimize2) prepne dialog mezi `max-w-3xl max-h-[90vh]` a `w-screen h-screen max-w-none max-h-none rounded-none`. Editor se roztahne pres celou obrazovku.

**Soubor:** `src/components/admin/DocumentEditDialog.tsx`

---

## 2. Metadata v Accordion

Vsechna pole krome "Nazev" a "Obsah (WYSIWYG)" zabalim do `Accordion` (defaultne zavreny). Accordion bude mit titulek "Metadata a cileni" a uvnitr budou vsechna stavajici pole: typ dokumentu, cileni, skupina/osoba, priorita, poradi, beh, viditelnost, skryt pred.

Pri otevreni dialogu pro novy dokument bude accordion zavreny. Pri editaci existujiciho take zavreny (metadata uz jsou nastavena).

**Soubor:** `src/components/admin/DocumentEditDialog.tsx`

---

## 3. Vylepseny WYSIWYG editor

### a) Velikost pisma v bodech (pt)

Nahradim popisne nazvy ("Male", "Normalni"...) za konkretni velikosti v bodech: 8pt, 9pt, 10pt, 11pt, 12pt, 14pt, 16pt, 18pt, 20pt, 24pt, 28pt, 36pt, 48pt. Dropdown bude zobrazovat cislo s "pt".

### b) Font family

Pridam novy TipTap extension `FontFamily` (custom, analogie k FontSize). Dropdown s fonty: Arial, Times New Roman, Courier New, Georgia, Verdana, Trebuchet MS, Comic Sans MS. Kazda polozka bude zobrazena v danem fontu.

### c) Tlacitko "Vymazat formatovani"

Pridam tlacitko (ikona RemoveFormatting) ktere zavola `editor.chain().focus().clearNodes().unsetAllMarks().run()` - odstrani vsechny formaty z vyberu.

### d) Tlačítko řádkování a mezery mezi odstavci

Přidat tlačítko řádkování (volba z: jednoduché, 1,15, 1,5, dvojité)

Přidat tlačítko mezery za odstavcem (přidat nebo odebrat mezeru před odstavcem a za odstavcem).

### e) Zachovani formatu pri paste z Google Docs

TipTap uz defaultne zachovava HTML formatovani pri paste. Diky tomu, ze pridam FontFamily extension s `parseHTML` ktere cte `element.style.fontFamily`, bude paste z Google Docs zachovavat fonty. Stejne tak FontSize uz parsuje `font-size` ze stylu. Potrebuji zajistit, ze sanitizer (`sanitize.ts`) povoluje `font-family` ve style atributu - to uz je pokryto, protoze povolujeme cely `style` atribut.

### Technicke detaily

**Soubor:** `src/components/ui/rich-text-editor.tsx`

- Novy `FontFamily` extension (analogie k `FontSize`):
  - `parseHTML`: cte `element.style.fontFamily`
  - `renderHTML`: generuje `style: font-family: ...`
  - Prikaz `setFontFamily(family)` a `unsetFontFamily()`
- `FONT_SIZES` zmena:

```text
[
  { label: "8", value: "8pt" },
  { label: "9", value: "9pt" },
  { label: "10", value: "10pt" },
  { label: "11", value: "11pt" },
  { label: "12", value: "12pt" },
  { label: "14", value: "14pt" },
  { label: "16", value: "16pt" },
  { label: "18", value: "18pt" },
  { label: "20", value: "20pt" },
  { label: "24", value: "24pt" },
  { label: "28", value: "28pt" },
  { label: "36", value: "36pt" },
  { label: "48", value: "48pt" },
]
```

- Novy dropdown "Font" v toolbaru (pred velikosti pisma)
- Nove tlacitko "Vymazat formatovani" (za strikethrough, pred highlight)

---

## 4. Soubory ke zmene


| Soubor                                        | Zmeny                                                               |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `src/components/admin/DocumentEditDialog.tsx` | Fullscreen toggle, accordion pro metadata                           |
| `src/components/ui/rich-text-editor.tsx`      | FontFamily extension, pt velikosti, clear formatting, font dropdown |


Zadne DB zmeny nejsou potreba.