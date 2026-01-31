

# Reorganizace navigační lišty

## Cíl

Přeorganizovat sidebar tak, aby nejdřív byla sekce **Organizace běhů** (to, co organizátoři řeší nejvíc), a pak až **Obsah LARPu** (statická data).

---

## Plánovaná struktura

```text
┌─────────────────────────────────┐
│  [Logo] LARP Název              │
│  ← Změnit LARP                  │
├─────────────────────────────────┤
│  Přehled                        │
├─────────────────────────────────┤
│  ORGANIZACE BĚHŮ                │
│  Běhy                           │
│  Přiřazení hráčů                │
│  Harmonogram                    │
├─────────────────────────────────┤
│  OBSAH LARPU                    │
│  Dokumenty                      │
│  Postavy                        │
│  Cizí postavy                   │
│  Produkce                       │
│  Tiskoviny                      │
├─────────────────────────────────┤
│  SPRÁVA                         │
│  LARPy                          │
├─────────────────────────────────┤
│  user@email.com                 │
│  [Odhlásit se]                  │
└─────────────────────────────────┘
```

---

## Technické změny

### Soubor: `src/components/layout/AdminLayout.tsx`

1. **Rozdělit navigační položky do samostatných polí**:

```typescript
// Dashboard - samostatně nahoře
const dashboardItem = { name: "Přehled", href: "/admin", icon: LayoutDashboard };

// Sekce 1: Organizace běhů (dynamická data)
const runOrganizationNavigation = [
  { name: "Běhy", href: "/admin/behy", icon: Calendar },
  { name: "Přiřazení hráčů", href: "/admin/prirazeni", icon: UserPlus },
  { name: "Harmonogram", href: "/admin/harmonogram", icon: Clock },
];

// Sekce 2: Obsah LARPu (statická data)
const larpContentNavigation = [
  { name: "Dokumenty", href: "/admin/dokumenty", icon: FileText },
  { name: "Postavy", href: "/admin/osoby", icon: Users },
  { name: "Cizí postavy", href: "/admin/cp", icon: UserCog },
  { name: "Produkce", href: "/admin/produkce", icon: LinkIcon },
  { name: "Tiskoviny", href: "/admin/tiskoviny", icon: Printer },
];

// Sekce 3: Správa (beze změny)
const larpManagement = [
  { name: "LARPy", href: "/admin/larpy", icon: Gamepad2 },
];
```

2. **Upravit renderování navigace** s vizuálními sekčními labely:

```tsx
<nav>
  {/* Přehled - samostatně */}
  <Link to="/admin">Přehled</Link>

  {/* Organizace běhů */}
  <div className="section-label">Organizace běhů</div>
  {runOrganizationNavigation.map(...)}

  {/* Obsah LARPu */}
  <div className="section-label">Obsah LARPu</div>
  {larpContentNavigation.map(...)}

  {/* Správa */}
  <div className="section-label">Správa</div>
  {larpManagement.map(...)}
</nav>
```

---

## Výsledek

Navigace bude logicky rozdělena s jasnou prioritou:
- **Organizace běhů** nahoře (90% práce organizátora)
- **Obsah LARPu** uprostřed (občasné úpravy)
- **Správa** dole (globální nastavení)

