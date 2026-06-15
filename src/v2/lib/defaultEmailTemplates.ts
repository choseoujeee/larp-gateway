// Přednastavené HTML šablony e-mailů.
// Jednoduchý a čistý vizuál, který funguje v běžných e-mailových klientech.
// Proměnné: {{jmeno}}, {{postava}}, {{skupina}}, {{larp}}, {{beh}}, {{odkaz_na_portal}}, {{heslo}}

const wrap = (inner: string) => `<div style="font-family:Georgia,'Times New Roman',serif;max-width:560px;margin:0 auto;padding:24px;color:#2a1d12;line-height:1.6;">
  <div style="border-top:3px solid #6b4423;padding-top:18px;">
    ${inner}
    <hr style="border:none;border-top:1px solid #e7dccd;margin:28px 0 14px;" />
    <p style="font-size:12px;color:#8a7a66;margin:0;">{{larp}} · {{beh}}</p>
  </div>
</div>`;

const btn = (label: string, href = "{{odkaz_na_portal}}") =>
  `<p style="text-align:center;margin:24px 0;"><a href="${href}" style="background:#6b4423;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:bold;display:inline-block;">${label}</a></p>`;

export interface DefaultTemplate {
  kind: string;
  label: string;
  subject: string;
  body_html: string;
}

export const DEFAULT_EMAIL_TEMPLATES: DefaultTemplate[] = [
  {
    kind: "uvitani-hraci",
    label: "Uvítání hráčů",
    subject: "Vítej v {{larp}} — tvůj přístup do portálu",
    body_html: wrap(`
      <h1 style="font-size:22px;margin:0 0 16px;color:#3a2614;">Vítej, {{jmeno}}!</h1>
      <p>Máme obrovskou radost, že jsi se přihlásil/a do <strong>{{larp}}</strong> a budeš s námi hrát postavu <strong>{{postava}}</strong>${"{{skupina}}" ? " (skupina <strong>{{skupina}}</strong>)" : ""}.</p>
      <p>Děkujeme za důvěru — připravujeme pro tebe zážitek, na který se sami strašně těšíme.</p>
      <p>Tvůj osobní vstup do portálu, kde najdeš materiály k postavě, harmonogram a další informace, je tady:</p>
      ${btn("Otevřít portál hráče")}
      <p style="background:#f5ede0;padding:12px 16px;border-radius:6px;font-size:14px;">
        <strong>Heslo:</strong> <code style="font-family:monospace;font-size:15px;">{{heslo}}</code>
      </p>
      <p>Ozvi se nám, kdykoli budeš mít dotaz. Těšíme se!</p>
    `),
  },
  {
    kind: "uvitani-cp",
    label: "Uvítání CP",
    subject: "Vítej v CP týmu {{larp}}",
    body_html: wrap(`
      <h1 style="font-size:22px;margin:0 0 16px;color:#3a2614;">Ahoj {{jmeno}},</h1>
      <p>moc děkujeme, že budeš jako <strong>{{postava}}</strong> součástí cizí postavy v <strong>{{larp}}</strong>. Bez vás by to nešlo.</p>
      <p>Všechno potřebné — rozpis výstupů, scénky, kontakt na koordinátora — najdeš ve svém CP HUBu:</p>
      ${btn("Otevřít CP HUB")}
      <p>Prosíme, projdi si materiály v klidu předem a ozvi se, kdyby cokoli nebylo jasné.</p>
      <p>Díky a brzy na place!</p>
    `),
  },
  {
    kind: "uvitani-produkce",
    label: "Uvítání produkce",
    subject: "Produkční přístup k {{larp}}",
    body_html: wrap(`
      <h1 style="font-size:22px;margin:0 0 16px;color:#3a2614;">Ahoj {{jmeno}},</h1>
      <p>vítej v produkčním týmu <strong>{{larp}} — {{beh}}</strong>. Bez vás by se larp nepostavil.</p>
      <p>Aktuální checklisty, tiskoviny, rozpis a kontakty najdeš v produkčním HUBu:</p>
      ${btn("Otevřít produkční HUB")}
      <p>Pokud něco nesedí nebo budeš potřebovat doplnit, dej vědět.</p>
      <p>Díky moc!</p>
    `),
  },
  {
    kind: "info-pred-hrou",
    label: "Info před hrou",
    subject: "{{larp}} se blíží — důležité info",
    body_html: wrap(`
      <h1 style="font-size:22px;margin:0 0 16px;color:#3a2614;">Ahoj {{jmeno}},</h1>
      <p>už za chvíli se potkáme na <strong>{{larp}}</strong> ({{beh}}). Posíláme poslední praktické info, ať máš všechno po ruce.</p>
      <ul style="padding-left:18px;">
        <li><strong>Kdy:</strong> <em>doplň datum a čas srazu</em></li>
        <li><strong>Kde:</strong> <em>doplň místo + odkaz na mapu</em></li>
        <li><strong>Co s sebou:</strong> <em>kostým, jídlo, spacák…</em></li>
      </ul>
      <p>Všechny materiály k postavě <strong>{{postava}}</strong> najdeš ve svém portálu:</p>
      ${btn("Otevřít portál")}
      <p>Strašně se těšíme — bude to bomba.</p>
    `),
  },
  {
    kind: "zmena-info",
    label: "Změna / důležité oznámení",
    subject: "Důležitá změna — {{larp}}",
    body_html: wrap(`
      <h1 style="font-size:22px;margin:0 0 16px;color:#3a2614;">Ahoj {{jmeno}},</h1>
      <p>posíláme krátké, ale důležité oznámení k <strong>{{larp}} — {{beh}}</strong>:</p>
      <div style="background:#f5ede0;border-left:3px solid #6b4423;padding:14px 18px;margin:18px 0;">
        <em>doplň, co se mění (čas, místo, organizační detail)…</em>
      </div>
      <p>Aktuální verzi materiálů a harmonogramu najdeš vždy v portálu:</p>
      ${btn("Otevřít portál")}
      <p>Díky za pochopení!</p>
    `),
  },
  {
    kind: "podekovani-po-hre",
    label: "Poděkování po hře",
    subject: "Díky za {{larp}}!",
    body_html: wrap(`
      <h1 style="font-size:22px;margin:0 0 16px;color:#3a2614;">{{jmeno}}, díky.</h1>
      <p>Bez tebe — a tvé postavy <strong>{{postava}}</strong> — by <strong>{{larp}} ({{beh}})</strong> nebyl tím, čím byl. Děkujeme za energii, kterou jsi do hry vložil/a.</p>
      <p>Budeme moc rádi, když nám napíšeš pár řádků zpětné vazby — pomáhá nám to dělat věci líp:</p>
      ${btn("Vyplnit zpětnou vazbu")}
      <p>Snad se brzy potkáme zase!</p>
    `),
  },
];
