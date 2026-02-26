

# Dva problémy: Sbalitelná admin lišta + Prázdné PDF

## 1. Prázdné PDF – oprava v `src/lib/pdf-export.ts`

Problém: Na řádku 74 kontejner používá `clip:rect(0,0,0,0);overflow:hidden;` — toto CSS ořízne element na nulovou velikost, takže `html2canvas` nemá co vykreslit → prázdné stránky.

**Oprava:** Odstranit `clip` a `overflow:hidden`. Kontejner zůstane na `position:fixed; z-index:-1; pointer-events:none;` — je pod vším ostatním a neklikatelný, ale html2canvas ho vidí a vykreslí. Přidat `left:-9999px` aby nebyl vidět na obrazovce, ale ponechat ho v DOM s plnou velikostí.

Nový styl:
```
position:fixed;left:0;top:0;width:210mm;max-width:100%;
font-family:Georgia,serif;font-size:14px;line-height:1.6;
color:#000;background:#fff;padding:20px;
pointer-events:none;z-index:9999;
```
Klíčová změna: `z-index:9999` (aby byl nahoře, html2canvas to potřebuje), ale přidat `opacity:1` a po vygenerování PDF element odebrat. Kontejner bude chvilku viditelný — to je bohužel nutné pro html2canvas. Alternativně ho umístit přesně v body s visibility, ale nejspolehlivější je ho nechat renderovat normálně a po save() ihned smazat.

Vlastně nejlepší řešení: nechat kontejner viditelný (bez clip, bez opacity:0), ale na `position:fixed; left:0; top:0; z-index:-1` — html2canvas by ho měl vidět, protože je „v layoutu" i když pod ostatními elementy.

## 2. Sbalitelná boční lišta v administraci – `src/components/layout/AdminLayout.tsx`

Přidat stav `collapsed` řízený pomocí `useIsMobile()` hooku + toggle tlačítko.

**Chování:**
- Desktop (>768px): sidebar plně rozbalený (w-64), s možností sbalit na ikonový pruh (w-14)
- Tablet/mobil (≤768px): sidebar defaultně sbalený (w-14, jen ikony), po kliknutí na hamburger/toggle se rozbalí jako overlay přes obsah
- Toggle tlačítko (Menu/ChevronLeft ikona) vždy viditelné

**Změny v `AdminLayout.tsx`:**
- Import `useIsMobile` z `@/hooks/use-mobile`
- Import `Menu, PanelLeftClose` z lucide-react
- Přidat `const [collapsed, setCollapsed] = useState(false)` + auto-collapse na mobilním breakpointu
- `aside` dynamicky: `collapsed ? "w-14" : "w-64"`, na mobilu přidat overlay pozadí
- V collapsed stavu skrýt texty (názvy položek, section labels, email) a zobrazit jen ikony
- Přidat toggle tlačítko v horní části sidebaru
- Na mobilu: sidebar jako absolutní/fixed overlay přes hlavní obsah, s tmavým pozadím na kliknutí mimo

**Struktura:**
```
[aside]
  ├── toggle tlačítko (vždy viditelné)
  ├── logo (collapsed = jen ikona)
  ├── nav (collapsed = jen ikony, bez textů)
  └── user info (collapsed = jen logout ikona)
[/aside]
[overlay backdrop] (jen na mobilu, když rozbaleno)
[main content]
```

### Soubory ke změně:
1. **`src/lib/pdf-export.ts`** — řádek 74: odstranit `clip:rect(0,0,0,0);overflow:hidden;`
2. **`src/components/layout/AdminLayout.tsx`** — přidat collapsed stav, responsive sidebar

