// LARP Portál - Konstanty

export const APP_NAME = "LARP Portál";

export const DOCUMENT_TYPES = {
  organizacni: { label: "Organizační", color: "doc-organizacni" },
  herni: { label: "Herní", color: "doc-herni" },
  postava: { label: "Postava", color: "doc-osobni" },
  medailonek: { label: "Medailonek", color: "doc-medailonek" },
  cp: { label: "CP", color: "doc-cp" },
} as const;

export const EVENT_TYPES = {
  programovy_blok: { label: "Programový blok", icon: "📋" },
  jidlo: { label: "Jídlo", icon: "🍽" },
  presun: { label: "Přesun", icon: "🚶" },
  informace: { label: "Informace", icon: "📢" },
  vystoupeni_cp: { label: "Vystoupení CP", icon: "🎭" },
} as const;

export const PERSON_TYPES = {
  postava: { label: "Postava", labelPlural: "Postavy" },
  cp: { label: "Cizí postava", labelPlural: "Cizí postavy" },
} as const;

export const TARGET_TYPES = {
  vsichni: { label: "Všichni" },
  skupina: { label: "Skupina" },
  osoba: { label: "Konkrétní osoba" },
} as const;

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  admin: {
    dashboard: "/admin",
    larps: "/admin/larpy",
    runs: "/admin/behy",
    persons: "/admin/osoby",
    documents: "/admin/dokumenty",
    schedule: "/admin/harmonogram",
    production: "/admin/produkce",
    printables: "/admin/tiskoviny",
  },
  portal: {
    access: "/portal/:token",
    player: "/portal/hrac/:token",
    cp: "/portal/cp/:token",
  },
} as const;
