/**
 * Seed skript: Mock data pro LARP "Stíny Mordoru" (Pán prstenů)
 *
 * Požadavky: .env s VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LARP_OWNER_ID.
 * LARP_OWNER_ID = UUID organizátora z Supabase Auth.
 *
 * Spuštění: npm run seed:lotr
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_PASSWORD = "stredozem2026";

// ============================================================================
// DATA DEFINITIONS
// ============================================================================

const LARP_DATA = {
  name: "Stíny Mordoru",
  slug: "stiny-mordoru",
  theme: "fantasy",
  description: `Je rok 3018 třetího věku. Prsten moci byl nalezen v Kraji a Společenstvo se vydává na cestu do Mordoru. Temný pán Sauron se probouzí a jeho stíny se šíří po celé zemi. Jste součástí Společenstva, které nese břemeno záchrany celého světa. Vaše rozhodnutí určí osud všech svobodných národů Středozemě.`,
};

const RUN_DATA = {
  name: "Jarní běh 2026",
  slug: "jarni-beh-2026",
  date_from: "2026-05-15",
  date_to: "2026-05-17",
  location: "Hrad Bouzov",
  address: "Bouzov 8, 783 25 Bouzov",
  payment_account: "123456789/0100",
  payment_amount: "1500 Kč",
  payment_due_date: "2026-04-30",
  mission_briefing: `<h2>Vítejte ve Středozemi</h2>
<p>Temný pán Sauron se probouzí a jeho stíny se šíří po celé zemi. Prsten moci, ztracený po tisíciletí, byl nalezen v Kraji malým hobitem jménem Bilbo Pytlík.</p>
<p>Nyní, po Radě Elronda v Roklince, bylo rozhodnuto. Prsten musí být zničen v ohních Orodruiny, jediném místě, kde může být jeho moc zlomena.</p>
<p><strong>Vy jste Společenstvo Prstenu.</strong></p>
<p>Devět bytostí reprezentujících svobodné národy Středozemě se vydává na nejnebezpečnější cestu v dějinách. Cesta povede přes Mlžné hory, temnou Morii, kouzelný Lothlórien, po Velké řece Anduině až k branám Mordoru.</p>
<p>Vaše pouto, vaše odvaha a vaše rozhodnutí určí osud všech.</p>`,
  contact: "Gandalf Šedý - gandalf@larportal.xx, tel: 777 123 456",
  footer_text: "Připravte si vhodné kostýmy a nezapomeňte na dobré boty! Cesta bude dlouhá.",
  is_active: true,
};

const CHARACTERS = [
  {
    slug: "frodo",
    name: "Frodo Pytlík",
    type: "postava",
    group_name: "Hobiti",
    description: "Nositel Prstenu, statečný hobit z Kraje. Frodův osud je nést břemeno, které by zlomilo většinu smrtelníků.",
    medallion: "Mladý hobit z Kraje, synovec slavného Bilba Pytlíka. Zdědil po svém strýci tajemný prsten, jehož pravá podstata byla dlouho skryta.",
    relationships: `<h3>Vztahy Froda Pytlíka</h3>
<p><strong>Sam (Samvěd Křepelka):</strong> Tvůj nejbližší přítel a věrný zahradník. Sam tě zná od dětství a jeho oddanost nezná mezí. Můžeš mu věřit ve všem.</p>
<p><strong>Merry (Smělmír Brandorád):</strong> Tvůj bratranec, vždy připravený k dobrodružství. Společně jste prožili mnoho veselých chvil v Kraji.</p>
<p><strong>Gandalf:</strong> Čaroděj, který tě uvedl do tohoto příběhu. Je tvým rádcem a ochráncem, ale má i jiné povinnosti.</p>
<p><strong>Aragorn:</strong> Záhadný hraničář, kterému Gandalf důvěřuje. Má v sobě královskou krev a je zkušeným válečníkem.</p>
<p><strong>Glum:</strong> Nebezpečná bytost, která kdysi vlastnila Prsten. Jeho touha po "pokladu" je nepotlačitelná.</p>`,
    player: { name: "Jan Novák", email: "jan.novak@larportal.xx", paid: true },
  },
  {
    slug: "sam",
    name: "Samvěd Křepelka",
    type: "postava",
    group_name: "Hobiti",
    description: "Frodův věrný zahradník a nejbližší přítel. Jeho oddanost a prostá moudrost jsou zdrojem síly pro celé Společenstvo.",
    medallion: "Prostý hobit, zahradník rodiny Pytlíků. Jeho láska k dobrému jídlu a zahradničení je překonána pouze jeho oddaností přátelům.",
    relationships: `<h3>Vztahy Samvěda Křepelky</h3>
<p><strong>Frodo:</strong> Tvůj pán a nejlepší přítel. Slíbil jsi Gandalfovi, že ho nikdy neopustíš, a tento slib hodláš dodržet za každou cenu.</p>
<p><strong>Merry:</strong> Další z hobitích přátel. Společně tvoříte nerozlučnou trojici s Frodou.</p>
<p><strong>Gandalf:</strong> Čaroděj, který ti dal úkol chránit Froda. Jeho slova berete vážně.</p>
<p><strong>Galadriel:</strong> Elfská paní, jejíž krása a moudrost tě hluboce zasáhnou.</p>`,
    player: { name: "Petr Svoboda", email: "petr.svoboda@larportal.xx", paid: true },
  },
  {
    slug: "gandalf",
    name: "Gandalf Šedý",
    type: "postava",
    group_name: "Istari",
    description: "Mocný čaroděj, vůdce Společenstva. Jeden z Istari, poslů Valar, vyslaných na pomoc svobodným národům Středozemě.",
    medallion: "Putující čaroděj známý po celé Středozemi. Jeho ohňostroje jsou legendární, ale jeho skutečná moc je mnohem větší.",
    relationships: `<h3>Vztahy Gandalfa Šedého</h3>
<p><strong>Frodo:</strong> Mladý hobit, kterému jsi svěřil nejtěžší úkol. Věříš v jeho sílu, i když on sám pochybuje.</p>
<p><strong>Aragorn:</strong> Dědic Isildura, kterého znáš od jeho mládí. Je připraven převzít svůj úděl.</p>
<p><strong>Saruman:</strong> Kdysi tvůj nadřízený a přítel, nyní zrádce. Jeho pád tě hluboce zranil.</p>
<p><strong>Elrond:</strong> Starý přítel a spojenec. Společně jste prožili mnoho věků.</p>
<p><strong>Galadriel:</strong> Nejmocnější z elfů Středozemě. Její moudrost je neocenitelná.</p>`,
    player: { name: "Martin Dvořák", email: "martin.dvorak@larportal.xx", paid: false },
  },
  {
    slug: "aragorn",
    name: "Aragorn",
    type: "postava",
    group_name: "Dunedain",
    description: "Dědic Isildura, budoucí král Gondoru. Hraničář ze Severu, který dlouho skrýval svůj původ.",
    medallion: "Záhadný hraničář ze Severu, známý také jako Chodec. Málomluvný muž s pronikavým pohledem a zkušenostmi válečníka.",
    relationships: `<h3>Vztahy Aragorna</h3>
<p><strong>Gandalf:</strong> Čaroděj, který tě vedl od mládí. Důvěřuješ mu bezmezně.</p>
<p><strong>Boromir:</strong> Syn správce Gondoru. Mezi vámi je napětí – on neví o tvém nároku na trůn.</p>
<p><strong>Legolas:</strong> Elfský princ, se kterým sdílíš respekt a přátelství.</p>
<p><strong>Elrond:</strong> Vychoval tě jako vlastního syna. Jeho dceru Arwen miluješ.</p>
<p><strong>Théoden:</strong> Král Rohanu, tvůj budoucí spojenec.</p>`,
    player: { name: "Tomáš Černý", email: "tomas.cerny@larportal.xx", paid: true },
  },
  {
    slug: "legolas",
    name: "Legolas",
    type: "postava",
    group_name: "Elfové",
    description: "Elfský princ z Temného hvozdu, mistr luku. Jeho elfí smysly a nesmrtelná zkušenost jsou neocenitelné.",
    medallion: "Elfský princ z Temného hvozdu, syn krále Thranduila. Jeho zrak a sluch předčí všechny smrtelníky.",
    relationships: `<h3>Vztahy Legolase</h3>
<p><strong>Gimli:</strong> Trpaslík! Mezi elfy a trpaslíky je odvěké nepřátelství. Ale možná se mýlíš...</p>
<p><strong>Aragorn:</strong> Hraničář, který byl vychován elfy. Cítíš k němu respekt.</p>
<p><strong>Gandalf:</strong> Čaroděj známý po celé Středozemi. Elfové ho ctí.</p>
<p><strong>Galadriel:</strong> Paní Lórienu, nejmocnější z tvého lidu. Její slova jsou zákonem.</p>`,
    player: { name: "Lukáš Veselý", email: "lukas.vesely@larportal.xx", paid: false },
  },
  {
    slug: "gimli",
    name: "Gimli",
    type: "postava",
    group_name: "Trpaslíci",
    description: "Syn Glóina, hrdý válečník ze Samotné hory. Jeho sekera a odvaha jsou legendární.",
    medallion: "Trpaslík ze Samotné hory, syn Glóina, který doprovázel Bilba Pytlíka na jeho dobrodružství.",
    relationships: `<h3>Vztahy Gimliho</h3>
<p><strong>Legolas:</strong> Elf! Tvůj lid má s elfy dlouhé spory. Nedůvěřuješ mu.</p>
<p><strong>Gandalf:</strong> Čaroděj, který pomohl tvému otci. Zaslouží si respekt.</p>
<p><strong>Frodo:</strong> Malý hobit nesoucí velké břemeno. Obdivuješ jeho odvahu.</p>
<p><strong>Galadriel:</strong> Elfská čarodějnice... ale její krása tě ohromí.</p>`,
    player: { name: "David Procházka", email: "david.prochazka@larportal.xx", paid: true },
  },
  {
    slug: "boromir",
    name: "Boromir",
    type: "postava",
    group_name: "Gondor",
    description: "Syn správce Gondoru, statečný voják. Jeho touha ochránit svůj lid ho může vést k nebezpečným rozhodnutím.",
    medallion: "Nejstarší syn Denethora, správce Gondoru. Hrdý válečník a kapitán Bílé věže.",
    relationships: `<h3>Vztahy Boromira</h3>
<p><strong>Aragorn:</strong> Kdo je tento hraničář, který si nárokuje trůn tvého otce? Nedůvěřuješ mu.</p>
<p><strong>Frodo:</strong> Nese zbraň, která by mohla zachránit Gondor. Proč ji zničit?</p>
<p><strong>Gandalf:</strong> Čaroděj, jehož rady tvůj otec odmítá. Ale možná má pravdu...</p>
<p><strong>Faramir (zmíněn):</strong> Tvůj mladší bratr, kterého otec přehlíží. Ty ho miluješ.</p>`,
    player: { name: "Jakub Kučera", email: "jakub.kucera@larportal.xx", paid: true },
  },
  {
    slug: "merry",
    name: "Smělmír Brandorád",
    type: "postava",
    group_name: "Hobiti",
    description: "Odvážný hobit, Frodův bratranec. Jeho zvědavost a odvaha ho vedou do nebezpečných situací.",
    medallion: "Hobit z Branové země, bratranec Froda Pytlíka. Známý svou zvědavostí a láskou k dobrodružství.",
    relationships: `<h3>Vztahy Smělmíra Brandoráda</h3>
<p><strong>Frodo:</strong> Tvůj bratranec a přítel. Následuješ ho kamkoli.</p>
<p><strong>Sam:</strong> Další z hobití party. Společně jste nerozluční.</p>
<p><strong>Gandalf:</strong> Čaroděj, jehož ohňostroje jsi vždy obdivoval.</p>
<p><strong>Théoden:</strong> Král Rohanu, kterému budeš sloužit.</p>`,
    player: { name: "Filip Pospíšil", email: "filip.pospisil@larportal.xx", paid: false },
  },
];

const CPS = [
  {
    slug: "galadriel",
    name: "Galadriel",
    type: "cp",
    performer: "Jana Králová",
    performance_times: "Sobota 10:00-12:00",
    description: "Paní Lórienu, nejmocnější elfka Středozemě. Nositelka Nenya, jednoho ze Tří elfských prstenů.",
    assignment: { email: "jana.kralova@larportal.xx" },
  },
  {
    slug: "elrond",
    name: "Elrond",
    type: "cp",
    performer: "Michal Horák",
    performance_times: "Pátek 20:30-22:00",
    description: "Pán Roklinky, pořadatel Rady. Nositel Vilya, nejmocnějšího z elfských prstenů.",
    assignment: { email: "michal.horak@larportal.xx" },
  },
  {
    slug: "nazgul",
    name: "Pán nazgůlů",
    type: "cp",
    performer: "Ondřej Marek",
    performance_times: "Sobota 20:00-22:00",
    description: "Hlavní služebník Saurona, vůdce Devíti. Král čarodějů z Angmaru.",
    assignment: { email: "ondrej.marek@larportal.xx" },
  },
  {
    slug: "gollum",
    name: "Glum",
    type: "cp",
    performer: "Štěpán Fiala",
    performance_times: "Průběžně celý víkend",
    description: "Bývalý nositel Prstenu, rozpolcená bytost. Jeho mysl je rozdělena mezi Sméagola a Gluma.",
    assignment: { email: "stepan.fiala@larportal.xx" },
  },
  {
    slug: "saruman",
    name: "Saruman",
    type: "cp",
    performer: "Pavel Novotný",
    performance_times: "Sobota 16:00-18:00",
    description: "Zrádný čaroděj z Orthanku. Kdysi vůdce Istari, nyní služebník vlastní touhy po moci.",
    assignment: null,
  },
  {
    slug: "theoden",
    name: "Théoden",
    type: "cp",
    performer: "Lukáš Procházka",
    performance_times: "Neděle 09:00-11:00",
    description: "Král Rohanu pod Sarumanovou kletbou. Potřebuje být osvobozen.",
    assignment: null,
  },
];

const GROUP_DOCUMENTS = [
  {
    group: "Hobiti",
    title: "Kraj a hobití lid",
    content: `<h2>Kraj - domov hobitů</h2>
<p>Kraj je poklidná země v severozápadní části Středozemě, domov hobitího lidu. Hobiti jsou malí, mírumilovní tvorové, kteří milují dobré jídlo, kouření dýmky a klidný život.</p>
<h3>Hobití kultura</h3>
<ul>
<li>Hobiti jedí šestkrát denně (snídaně, svačina, oběd, čaj, večeře, večerní svačina)</li>
<li>Nenosí boty - mají tuhé, chlupaté chodidla</li>
<li>Žijí v norách zvaných hobitiny</li>
<li>Milují zahrady, pivo a pipeweed (tabák)</li>
</ul>
<h3>Slavní hobiti</h3>
<p>Bilbo Pytlík, strýc Froda, je nejslavnějším cestovatelem v historii hobitů. Jeho dobrodružství s trpaslíky je legendární.</p>`,
  },
  {
    group: "Gondor",
    title: "Gondor - Jižní království",
    content: `<h2>Gondor - říše lidí</h2>
<p>Gondor je nejmocnější království lidí ve Středozemi. Založili ho Elendil a jeho synové po pádu Númenoru.</p>
<h3>Historie</h3>
<p>Království bylo založeno před více než 3000 lety. Po smrti posledního krále vládnou správci z rodu Denethorova.</p>
<h3>Města a pevnosti</h3>
<ul>
<li>Minas Tirith - Bílá věž, hlavní město</li>
<li>Osgiliath - stará metropole, nyní v troskách</li>
<li>Minas Morgul - bývalá Minas Ithil, nyní v rukou nepřítele</li>
</ul>
<h3>Vztah k Aragornovi</h3>
<p>Aragorn je dědicem Isildura a právoplatným králem Gondoru. Správci ale vládnou již generace...</p>`,
  },
  {
    group: "Dunedain",
    title: "Dúnedain - Hraničáři severu",
    content: `<h2>Dúnedain - potomci Númenoru</h2>
<p>Dúnedain jsou potomci lidí z potopené ostrovní říše Númenor. Jsou vyšší, moudřejší a žijí déle než běžní lidé.</p>
<h3>Hraničáři</h3>
<p>Severní Dúnedain se stali Hraničáři - tajnými strážci severních zemí. Chrání Kraj a okolní země před zlem, aniž by místní věděli o jejich existenci.</p>
<h3>Aragornův rod</h3>
<p>Aragorn je přímým potomkem Isildura, který porazil Saurona na konci Druhého věku, ale selhal, když si ponechal Prsten.</p>`,
  },
  {
    group: "Istari",
    title: "Istari - čarodějové Středozemě",
    content: `<h2>Istari - poslové Valar</h2>
<p>Istari jsou Maiar (duchové) vyslaní Valar na pomoc svobodným národům Středozemě v boji proti Sauronovi.</p>
<h3>Pět čarodějů</h3>
<ul>
<li>Saruman Bílý - vůdce řádu (nyní zrádce)</li>
<li>Gandalf Šedý - putující čaroděj</li>
<li>Radagast Hnědý - strážce přírody</li>
<li>Dva modří čarodějové - odešli na východ</li>
</ul>
<h3>Omezení</h3>
<p>Istari mají zakázáno používat plnou sílu a vládnout přímo. Mají pouze radit a inspirovat.</p>`,
  },
  {
    group: "Elfové",
    title: "Elfové - Prvorození",
    content: `<h2>Elfové - nesmrtelný lid</h2>
<p>Elfové jsou Prvorození, nejstarší z dětí Ilúvatara. Jsou nesmrtelní a jejich krása a moudrost předčí všechny smrtelníky.</p>
<h3>Elfské říše</h3>
<ul>
<li>Roklinkaí - Elrondova skrytá údolí</li>
<li>Lothlórien - Galadrielina zlatá říše</li>
<li>Temný hvozd - Thranduilovo království</li>
<li>Šedé přístavy - odkud elfové odplouvají na Západ</li>
</ul>
<h3>Tři prsteny</h3>
<p>Elfové vlastní Tři prsteny moci, které nebyly poskvrněny Sauronovou rukou: Vilya (vzduch), Nenya (voda), Narya (oheň).</p>`,
  },
  {
    group: "Trpaslíci",
    title: "Trpaslíci - Durinův lid",
    content: `<h2>Trpaslíci - děti Aulëho</h2>
<p>Trpaslíci byli stvořeni Vala Aulëm ještě před probuzením elfů. Jsou to zdatní řemeslníci a válečníci.</p>
<h3>Trpasličí říše</h3>
<ul>
<li>Samotná hora (Erebor) - obnovená po Šmakově pádu</li>
<li>Moria (Khazad-dûm) - kdysi největší říše, nyní ztracená</li>
<li>Železné vrchy - domov části trpaslíků</li>
</ul>
<h3>Vztah s elfy</h3>
<p>Mezi trpaslíky a elfy panuje odvěké nepřátelství, které sahá tisíce let do minulosti.</p>
<h3>Sedm prstenů</h3>
<p>Trpaslíci dostali Sedm prstenů moci. Většina byla ztracena drakům nebo Sauronovi.</p>`,
  },
];

const ORG_DOCUMENTS = [
  {
    title: "Pravidla hry",
    content: `<h2>Pravidla LARPu Stíny Mordoru</h2>
<h3>Bezpečnost</h3>
<ul>
<li><strong>Safeword "STOP"</strong> - okamžité přerušení akce</li>
<li><strong>Safeword "PAUZA"</strong> - potřebuji chvilku mimo hru</li>
<li>Respektujte fyzické limity ostatních hráčů</li>
<li>Zbraně musí být měkčené a schválené organizátory</li>
</ul>
<h3>Herní pravidla</h3>
<ul>
<li>Zásah do trupu = zranění</li>
<li>Druhý zásah = bezvědomí</li>
<li>Třetí zásah = smrt (konzultujte s orgy)</li>
<li>Léčení: obvaz + 10 minut klidu</li>
</ul>
<h3>Off-game zóny</h3>
<p>Zázemí organizátorů, kuchyně a sociální zařízení jsou mimo hru.</p>`,
  },
  {
    title: "Harmonogram víkendu",
    content: `<h2>Program LARPu</h2>
<h3>Pátek 15.5.</h3>
<ul>
<li>16:00 - Registrace a ubytování</li>
<li>18:00 - Večeře</li>
<li>19:30 - Úvodní briefing</li>
<li>20:30 - Rada Elronda (CP: Elrond)</li>
<li>22:00 - Noční hlídka</li>
</ul>
<h3>Sobota 16.5.</h3>
<ul>
<li>08:00 - Snídaně</li>
<li>09:00 - Přesun do Lórienu</li>
<li>10:00 - Setkání s Galadriel</li>
<li>12:00 - Oběd</li>
<li>14:00 - Útěk z Morie</li>
<li>16:00 - Konfrontace se Sarumanem</li>
<li>18:00 - Večeře</li>
<li>20:00 - Noční útok nazgůlů</li>
</ul>
<h3>Neděle 17.5.</h3>
<ul>
<li>08:00 - Snídaně</li>
<li>09:00 - Finální bitva</li>
<li>11:00 - Závěrečný ceremoniál</li>
<li>12:00 - Oběd a rozloučení</li>
</ul>`,
  },
  {
    title: "Praktické informace",
    content: `<h2>Praktické informace</h2>
<h3>Doprava</h3>
<p>Hrad Bouzov je dostupný autem i autobusem. Parkování je zajištěno u hradu.</p>
<h3>Ubytování</h3>
<p>Ubytování je v hradních komnatách. Vezměte si vlastní spacák a karimatku.</p>
<h3>Strava</h3>
<p>Strava je zajištěna (snídaně, oběd, večeře). Vegetariánská strava na vyžádání.</p>
<h3>Co si vzít</h3>
<ul>
<li>Kostým (viz Kostýmní požadavky)</li>
<li>Spacák a karimatku</li>
<li>Hygienické potřeby</li>
<li>Dobré boty na terén</li>
<li>Baterku</li>
<li>Osobní léky</li>
</ul>`,
  },
  {
    title: "Kostýmní požadavky",
    content: `<h2>Kostýmní požadavky</h2>
<h3>Obecné zásady</h3>
<ul>
<li>Žádné viditelné moderní oblečení</li>
<li>Přírodní materiály a barvy</li>
<li>Bez výrazných log a potisků</li>
</ul>
<h3>Hobiti</h3>
<p>Vesty, košile, krátké kalhoty. Žádné boty! Barefoot nebo speciální hobití nohy.</p>
<h3>Lidé (Gondor, Dunedain)</h3>
<p>Tuniky, pláště, kožené vybavení. Zbroj povolena.</p>
<h3>Elfové</h3>
<p>Elegantní róby, plášťe. Elfí uši k zapůjčení.</p>
<h3>Trpaslíci</h3>
<p>Těžké tuniky, zbroj, vousy. Helmy vítány.</p>
<h3>Istari</h3>
<p>Dlouhé róby, hůl, klobouk.</p>`,
  },
];

const GAME_DOCUMENTS = [
  {
    title: "Svět Středozemě",
    content: `<h2>Svět Středozemě</h2>
<p>Středozem je kontinent na světě Arda, stvořeném Ilúvatarem. Je domovem mnoha ras a kultur.</p>
<h3>Věky světa</h3>
<ul>
<li><strong>První věk</strong> - války s Morgothem</li>
<li><strong>Druhý věk</strong> - vzestup a pád Númenoru, první porážka Saurona</li>
<li><strong>Třetí věk</strong> - současnost, návrat Saurona</li>
</ul>
<h3>Svobodné národy</h3>
<p>Elfové, lidé, trpaslíci a hobiti jsou spojenci proti temnotě. Jejich jednota je klíčem k vítězství.</p>
<h3>Síly temnoty</h3>
<p>Sauron a jeho služebníci - orkové, nazgůlové, trollové a zrádci - ohrožují celou Středozem.</p>`,
  },
  {
    title: "Mapka lokací",
    content: `<h2>Herní lokace</h2>
<h3>Roklinka (Pátek večer)</h3>
<p>Elrondův dům - místo Rady. Bezpečná zóna na začátku hry.</p>
<h3>Moria (Sobota ráno-odpoledne)</h3>
<p>Temné chodby trpasličích dolů. Nebezpečí na každém kroku.</p>
<h3>Lothlórien (Sobota)</h3>
<p>Galadrielina říše - místo odpočinku a poznání.</p>
<h3>Amon Hen (Sobota večer)</h3>
<p>Místo rozhodnutí. Zde se Společenstvo rozdělí.</p>
<h3>Rohan (Neděle)</h3>
<p>Království koní - finální bitva.</p>`,
  },
  {
    title: "Jazyky Středozemě",
    content: `<h2>Základní fráze</h2>
<h3>Sindarština (elfština)</h3>
<ul>
<li><em>Mae govannen</em> - Buď zdráv / Dobrý den</li>
<li><em>Le hannon</em> - Děkuji ti</li>
<li><em>Namárië</em> - Sbohem</li>
<li><em>Mellon</em> - Přítel</li>
</ul>
<h3>Khuzdul (trpasličtina)</h3>
<ul>
<li><em>Khazâd ai-mênu!</em> - Trpaslíci jsou s vámi!</li>
<li><em>Baruk Khazâd!</em> - Sekery trpaslíků!</li>
</ul>
<h3>Černá řeč</h3>
<p><em>Ash nazg durbatulûk...</em> - Jeden prsten vládne všem...</p>
<p>(Používejte s opatrností!)</p>`,
  },
  {
    title: "Důležité předměty",
    content: `<h2>Klíčové artefakty</h2>
<h3>Jeden prsten</h3>
<p>Pán prstenů, nejnebezpečnější artefakt Středozemě. Může být zničen pouze v ohních Hory osudu.</p>
<h3>Anduril</h3>
<p>Plamen Západu - překovaný meč Narsil, který kdysi useknul Prsten ze Sauronovy ruky.</p>
<h3>Žihadlo</h3>
<p>Frodův elfský meč. Září modře v přítomnosti orků.</p>
<h3>Mithrilová košile</h3>
<p>Dar od Bilba - nejlehčí a nejpevnější zbroj Středozemě.</p>
<h3>Galadrielina zrcadlo</h3>
<p>Ukazuje věci, které byly, jsou a mohou být.</p>
<h3>Palantír</h3>
<p>Vidoucí kámen - nebezpečný, může být použit Sauronem.</p>`,
  },
];

const CP_DOCUMENTS = [
  {
    slug: "galadriel",
    title: "Scénář: Galadriel",
    content: `<h2>Vystoupení: Galadriel, Paní Lórienu</h2>
<h3>Čas: Sobota 10:00-12:00</h3>
<h3>Příprava</h3>
<p>Bílé nebo stříbrné šaty, elfí uši, éterický makeup. Nenya (prsten) na ruce.</p>
<h3>Scénář</h3>
<ol>
<li>Přivítání Společenstva v Lórienu</li>
<li>Osobní rozhovory s jednotlivými členy</li>
<li>Nabídka Zrcadla Frodovi a Samovi</li>
<li>Zkouška Prstenu - Frodo ti nabídne Prsten. ODMÍTNI.</li>
<li>Dary na rozloučenou</li>
</ol>
<h3>Klíčové repliky</h3>
<p><em>"Místo temného pána bys měl královnu! Krásnou a strašnou jako jitro a noc!"</em></p>
<p><em>"Prošla jsem zkouškou. Zůstanu Galadriel."</em></p>`,
  },
  {
    slug: "elrond",
    title: "Scénář: Elrond",
    content: `<h2>Vystoupení: Elrond, Pán Roklinky</h2>
<h3>Čas: Pátek 20:30-22:00</h3>
<h3>Příprava</h3>
<p>Elfí róby, čelenka, důstojné vystupování. Vilya (prsten) na ruce.</p>
<h3>Scénář - Rada Elronda</h3>
<ol>
<li>Přivítání hostů</li>
<li>Vyprávění historie Prstenu (Isildurova zkáza)</li>
<li>Debata o osudu Prstenu</li>
<li>Frodova nabídka nést Prsten</li>
<li>Ustanovení Společenstva</li>
</ol>
<h3>Klíčové repliky</h3>
<p><em>"Prsten musí být zničen."</em></p>
<p><em>"Vy budete Společenstvo Prstenu."</em></p>`,
  },
  {
    slug: "nazgul",
    name: "Pán nazgůlů",
    title: "Scénář: Pán nazgůlů",
    content: `<h2>Vystoupení: Pán nazgůlů</h2>
<h3>Čas: Sobota 20:00-22:00</h3>
<h3>Příprava</h3>
<p>Černá róba s kapucí, maska, černé rukavice. Morgulský meč (prop).</p>
<h3>Scénář - Noční útok</h3>
<ol>
<li>Tajný příchod s dalšími nazgůly (2-3 pomocníci)</li>
<li>Útok na tábor Společenstva</li>
<li>Cílení na Froda - chceš Prsten!</li>
<li>Boj s Aragornem/Gandalfem</li>
<li>Ústup před úsvitem/ohněm</li>
</ol>
<h3>Chování</h3>
<p>Syčivý hlas, pomalé pohyby, strašidelné. Reaguješ na oheň a světlo.</p>`,
  },
  {
    slug: "gollum",
    title: "Scénář: Glum",
    content: `<h2>Vystoupení: Glum/Sméagol</h2>
<h3>Čas: Průběžně celý víkend</h3>
<h3>Příprava</h3>
<p>Ošuntělé oblečení, bláto, rozcuchané vlasy. Shrbená postava.</p>
<h3>Dvojí osobnost</h3>
<ul>
<li><strong>Sméagol:</strong> Plačtivý, oddaný "pánovi", chce pomáhat</li>
<li><strong>Glum:</strong> Lstivý, zlý, chce Prsten, "poklad"</li>
</ul>
<h3>Klíčové momenty</h3>
<ol>
<li>Sledování Společenstva (nenápadně)</li>
<li>Chycení Frodem a Samem</li>
<li>Slib služby "pánovi"</li>
<li>Vnitřní boj mezi osobnostmi</li>
</ol>
<h3>Klíčové repliky</h3>
<p><em>"Můj poklad... gollum, gollum!"</em></p>
<p><em>"Sméagol slibuje. Sméagol slíbil."</em></p>`,
  },
  {
    slug: "saruman",
    title: "Scénář: Saruman",
    content: `<h2>Vystoupení: Saruman Bílý</h2>
<h3>Čas: Sobota 16:00-18:00</h3>
<h3>Příprava</h3>
<p>Bílá róba (nyní zašpiněná barevnými pruhy), hůl. Arogantní vystupování.</p>
<h3>Scénář - Konfrontace</h3>
<ol>
<li>Přivítání Gandalfa a Společenstva</li>
<li>Nabídka spojenectví ("Nový řád")</li>
<li>Odhalení zrady</li>
<li>Magický souboj s Gandalfem</li>
<li>Porážka a ústup</li>
</ol>
<h3>Klíčové repliky</h3>
<p><em>"Proti moci Mordoru nelze bojovat. Musíme se k ní připojit."</em></p>
<p><em>"Já jsem Saruman Mnohobarevný!"</em></p>`,
  },
  {
    slug: "theoden",
    title: "Scénář: Théoden",
    content: `<h2>Vystoupení: Théoden, Král Rohanu</h2>
<h3>Čas: Neděle 09:00-11:00</h3>
<h3>Příprava</h3>
<p>Zprvu: zchátralé šaty, šedé vlasy, shrbený. Poté: královské roucho, koruna.</p>
<h3>Scénář - Osvobození a bitva</h3>
<ol>
<li>Uvedení jako starý, zlomený král pod vlivem Grímy</li>
<li>Příchod Gandalfa</li>
<li>Exorcismus - osvobození od Sarumanova vlivu</li>
<li>Proměna v hrdého krále</li>
<li>Vedení vojska do bitvy</li>
</ol>
<h3>Klíčové repliky</h3>
<p><em>"Kde byl Gondor, když padl Westemnet?"</em></p>
<p><em>"Smrt! Smrt! SMRT!"</em> (bitevní pokřik)</p>`,
  },
];

const SCHEDULE = [
  // Den 1 - Pátek
  { day: 1, time: "16:00", duration: 90, type: "informace", title: "Registrace a ubytování", desc: "Příjezd, registrace, ubytování v hradních komnatách." },
  { day: 1, time: "18:00", duration: 60, type: "jidlo", title: "Večeře", desc: "Společná večeře před začátkem hry." },
  { day: 1, time: "19:30", duration: 60, type: "programovy_blok", title: "Úvodní briefing", desc: "Vysvětlení pravidel, rozdání materiálů, vstup do hry." },
  { day: 1, time: "20:30", duration: 90, type: "vystoupeni_cp", title: "Rada Elronda", desc: "Historické setkání, kde je rozhodnuto o osudu Prstenu.", cp: "elrond" },
  { day: 1, time: "22:00", duration: 120, type: "programovy_blok", title: "Noční hlídka", desc: "Společenstvo se připravuje na cestu. Noční roleplay." },
  // Den 2 - Sobota
  { day: 2, time: "08:00", duration: 60, type: "jidlo", title: "Snídaně", desc: "Ranní jídlo před pokračováním cesty." },
  { day: 2, time: "09:00", duration: 60, type: "presun", title: "Přesun do Lórienu", desc: "Putování do zlatého lesa." },
  { day: 2, time: "10:00", duration: 120, type: "vystoupeni_cp", title: "Setkání s Galadriel", desc: "Audience u Paní Lórienu. Zrcadlo a dary.", cp: "galadriel" },
  { day: 2, time: "12:00", duration: 60, type: "jidlo", title: "Oběd", desc: "Elfský oběd v Lórienu." },
  { day: 2, time: "14:00", duration: 120, type: "programovy_blok", title: "Útěk z Morie", desc: "Flashback - hrůzy trpasličích dolů." },
  { day: 2, time: "16:00", duration: 120, type: "vystoupeni_cp", title: "Konfrontace se Sarumanem", desc: "Odhalení zrádného čaroděje.", cp: "saruman" },
  { day: 2, time: "18:00", duration: 60, type: "jidlo", title: "Večeře", desc: "Večerní jídlo před nocí." },
  { day: 2, time: "20:00", duration: 120, type: "vystoupeni_cp", title: "Noční útok nazgůlů", desc: "Strašlivý útok Devíti.", cp: "nazgul" },
  // Den 3 - Neděle
  { day: 3, time: "08:00", duration: 60, type: "jidlo", title: "Snídaně", desc: "Poslední společná snídaně." },
  { day: 3, time: "09:00", duration: 120, type: "programovy_blok", title: "Finální bitva", desc: "Rohan přichází! Velká bitva.", location: "Hlavní nádvoří" },
  { day: 3, time: "11:00", duration: 60, type: "informace", title: "Závěrečný ceremoniál", desc: "Ukončení hry, debriefing, ceny." },
  { day: 3, time: "12:00", duration: 60, type: "jidlo", title: "Oběd a rozloučení", desc: "Závěrečný oběd a rozloučení." },
];

const PRODUCTION_LINKS = [
  { title: "Sdílené fotky", url: "https://drive.google.com/lotr-fotky", type: "cloud", desc: "Fotky z příprav a inspirace" },
  { title: "Kostýmní inspirace", url: "https://pinterest.com/lotr-cosplay", type: "reference", desc: "Nástěnka s kostýmy" },
  { title: "Podkladová hudba", url: "https://spotify.com/lotr-playlist", type: "audio", desc: "Playlist pro atmosféru" },
  { title: "Skupinový chat", url: "https://discord.gg/stiny-mordoru", type: "komunikace", desc: "Discord server organizátorů" },
];

const PRINTABLES = [
  { title: "Mapa Středozemě A2", url: "https://example.com/map.pdf", instructions: "Tisk na A2, laminovat" },
  { title: "Elfské nápisy", url: "https://example.com/elvish.pdf", instructions: "Tisk na pergamen, 10 kopií" },
  { title: "Herní peníze", url: "https://example.com/coins.pdf", instructions: "Tisk oboustranně, rozstříhat" },
  { title: "Dopis od Gandalfa", url: "https://example.com/letter.pdf", instructions: "Tisk na starý papír, 8 kopií" },
];

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ownerId = process.env.LARP_OWNER_ID;

  if (!url || !serviceKey) {
    console.error("Chybí VITE_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY v .env");
    process.exit(1);
  }
  if (!ownerId) {
    console.error("Chybí LARP_OWNER_ID v .env (UUID organizátora z Supabase Auth → Users)");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log("🧙 Seeduji LARP: Stíny Mordoru\n");

  // 1. LARP
  const { data: larp, error: larpErr } = await supabase
    .from("larps")
    .insert({ ...LARP_DATA, owner_id: ownerId })
    .select("id")
    .single();

  if (larpErr) {
    console.error("❌ Chyba při vytváření LARPu:", larpErr.message);
    process.exit(1);
  }
  const larpId = larp.id;
  console.log("✅ LARP vytvořen:", larpId);

  // 2. Run (Běh)
  const { data: run, error: runErr } = await supabase
    .from("runs")
    .insert({ ...RUN_DATA, larp_id: larpId })
    .select("id")
    .single();

  if (runErr) {
    console.error("❌ Chyba při vytváření běhu:", runErr.message);
    process.exit(1);
  }
  const runId = run.id;
  console.log("✅ Běh vytvořen:", runId);

  // 3. Postavy (Characters)
  const personIds = {};
  for (const char of CHARACTERS) {
    const { data: personId, error } = await supabase.rpc("create_person_with_password", {
      p_larp_id: larpId,
      p_name: char.name,
      p_slug: char.slug,
      p_type: char.type,
      p_password: DEFAULT_PASSWORD,
      p_group_name: char.group_name,
    });

    if (error) {
      console.error(`❌ Chyba postavy ${char.slug}:`, error.message);
      continue;
    }
    personIds[char.slug] = personId;
    console.log(`  👤 Postava: ${char.name}`);
  }
  console.log(`✅ Postavy vytvořeny: ${Object.keys(personIds).length}`);

  // 4. CP (Non-Player Characters)
  const cpIds = {};
  for (const cp of CPS) {
    const { data: personId, error } = await supabase.rpc("create_person_with_password", {
      p_larp_id: larpId,
      p_name: cp.name,
      p_slug: cp.slug,
      p_type: cp.type,
      p_password: DEFAULT_PASSWORD,
      p_performer: cp.performer,
      p_performance_times: cp.performance_times,
    });

    if (error) {
      console.error(`❌ Chyba CP ${cp.slug}:`, error.message);
      continue;
    }
    cpIds[cp.slug] = personId;
    console.log(`  🎭 CP: ${cp.name} (${cp.performer})`);
  }
  console.log(`✅ CP vytvořeny: ${Object.keys(cpIds).length}`);

  // 5. Player Assignments (run_person_assignments)
  let assignmentCount = 0;
  for (const char of CHARACTERS) {
    if (!char.player || !personIds[char.slug]) continue;

    const { error } = await supabase.rpc("create_person_assignment_with_password", {
      p_run_id: runId,
      p_person_id: personIds[char.slug],
      p_password: DEFAULT_PASSWORD,
      p_player_name: char.player.name,
      p_player_email: char.player.email,
    });

    if (error) {
      console.error(`❌ Chyba přiřazení ${char.slug}:`, error.message);
      continue;
    }

    // Update paid_at if paid
    if (char.player.paid) {
      await supabase
        .from("run_person_assignments")
        .update({ paid_at: new Date().toISOString() })
        .eq("run_id", runId)
        .eq("person_id", personIds[char.slug]);
    }
    assignmentCount++;
  }

  // CP Assignments
  for (const cp of CPS) {
    if (!cp.assignment || !cpIds[cp.slug]) continue;

    const { error } = await supabase.rpc("create_person_assignment_with_password", {
      p_run_id: runId,
      p_person_id: cpIds[cp.slug],
      p_password: DEFAULT_PASSWORD,
      p_player_name: cp.performer,
      p_player_email: cp.assignment.email,
    });

    if (error) {
      console.error(`❌ Chyba přiřazení CP ${cp.slug}:`, error.message);
      continue;
    }
    assignmentCount++;
  }
  console.log(`✅ Přiřazení vytvořena: ${assignmentCount}`);

  // 6. Documents
  let docOrder = 0;

  // 6a. Organizační dokumenty (pro všechny)
  for (const doc of ORG_DOCUMENTS) {
    const { error } = await supabase.from("documents").insert({
      larp_id: larpId,
      run_id: runId,
      title: doc.title,
      content: doc.content,
      doc_type: "organizacni",
      target_type: "vsichni",
      sort_order: docOrder++,
    });
    if (error) console.error(`❌ Org doc ${doc.title}:`, error.message);
  }
  console.log(`✅ Organizační dokumenty: ${ORG_DOCUMENTS.length}`);

  // 6b. Herní dokumenty (pro všechny)
  for (const doc of GAME_DOCUMENTS) {
    const { error } = await supabase.from("documents").insert({
      larp_id: larpId,
      run_id: runId,
      title: doc.title,
      content: doc.content,
      doc_type: "herni",
      target_type: "vsichni",
      sort_order: docOrder++,
    });
    if (error) console.error(`❌ Game doc ${doc.title}:`, error.message);
  }
  console.log(`✅ Herní dokumenty: ${GAME_DOCUMENTS.length}`);

  // 6c. Skupinové dokumenty (pro skupiny)
  for (const doc of GROUP_DOCUMENTS) {
    const { error } = await supabase.from("documents").insert({
      larp_id: larpId,
      run_id: runId,
      title: doc.title,
      content: doc.content,
      doc_type: "herni",
      target_type: "skupina",
      target_group: doc.group,
      sort_order: docOrder++,
    });
    if (error) console.error(`❌ Group doc ${doc.title}:`, error.message);
  }
  console.log(`✅ Skupinové dokumenty: ${GROUP_DOCUMENTS.length}`);

  // 6d. Osobní dokumenty - Charakteristiky
  for (const char of CHARACTERS) {
    if (!personIds[char.slug]) continue;

    // Charakteristika
    const { error: charErr } = await supabase.from("documents").insert({
      larp_id: larpId,
      run_id: runId,
      title: `Charakteristika: ${char.name}`,
      content: `<h2>${char.name}</h2><p>${char.description}</p>`,
      doc_type: "postava",
      target_type: "osoba",
      target_person_id: personIds[char.slug],
      sort_order: docOrder++,
    });
    if (charErr) console.error(`❌ Char doc ${char.name}:`, charErr.message);

    // Vztahy
    if (char.relationships) {
      const { error: relErr } = await supabase.from("documents").insert({
        larp_id: larpId,
        run_id: runId,
        title: `Vztahy: ${char.name}`,
        content: char.relationships,
        doc_type: "postava",
        target_type: "osoba",
        target_person_id: personIds[char.slug],
        sort_order: docOrder++,
      });
      if (relErr) console.error(`❌ Rel doc ${char.name}:`, relErr.message);
    }
  }
  console.log(`✅ Charakteristiky a vztahy: ${CHARACTERS.length * 2}`);

  // 6e. Medailonky
  for (const char of CHARACTERS) {
    if (!personIds[char.slug]) continue;

    const { error } = await supabase.from("documents").insert({
      larp_id: larpId,
      run_id: runId,
      title: `Medailonek: ${char.name}`,
      content: `<h2>${char.name}</h2><p><em>${char.group_name}</em></p><p>${char.medallion}</p>`,
      doc_type: "medailonek",
      target_type: "osoba",
      target_person_id: personIds[char.slug],
      sort_order: docOrder++,
    });
    if (error) console.error(`❌ Medallion ${char.name}:`, error.message);
  }
  console.log(`✅ Medailonky: ${CHARACTERS.length}`);

  // 6f. CP dokumenty
  for (const doc of CP_DOCUMENTS) {
    if (!cpIds[doc.slug]) continue;

    const { error } = await supabase.from("documents").insert({
      larp_id: larpId,
      run_id: runId,
      title: doc.title,
      content: doc.content,
      doc_type: "cp",
      target_type: "osoba",
      target_person_id: cpIds[doc.slug],
      sort_order: docOrder++,
    });
    if (error) console.error(`❌ CP doc ${doc.title}:`, error.message);
  }
  console.log(`✅ CP dokumenty: ${CP_DOCUMENTS.length}`);

  // 7. Schedule Events
  for (const event of SCHEDULE) {
    const cpId = event.cp ? cpIds[event.cp] : null;

    const { error } = await supabase.from("schedule_events").insert({
      run_id: runId,
      day_number: event.day,
      start_time: event.time,
      duration_minutes: event.duration,
      event_type: event.type,
      title: event.title,
      description: event.desc,
      location: event.location || null,
      cp_id: cpId,
    });
    if (error) console.error(`❌ Event ${event.title}:`, error.message);
  }
  console.log(`✅ Harmonogram: ${SCHEDULE.length} událostí`);

  // 8. Production Links
  for (const link of PRODUCTION_LINKS) {
    const { error } = await supabase.from("production_links").insert({
      larp_id: larpId,
      run_id: runId,
      title: link.title,
      url: link.url,
      link_type: link.type,
      description: link.desc,
    });
    if (error) console.error(`❌ Link ${link.title}:`, error.message);
  }
  console.log(`✅ Produkční linky: ${PRODUCTION_LINKS.length}`);

  // 9. Printables
  for (const item of PRINTABLES) {
    const { error } = await supabase.from("printables").insert({
      larp_id: larpId,
      run_id: runId,
      title: item.title,
      url: item.url,
      print_instructions: item.instructions,
    });
    if (error) console.error(`❌ Printable ${item.title}:`, error.message);
  }
  console.log(`✅ Tiskoviny: ${PRINTABLES.length}`);

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("🎉 HOTOVO! LARP Stíny Mordoru byl vytvořen.");
  console.log("=".repeat(50));
  console.log(`\n📋 Souhrn:`);
  console.log(`   • LARP ID: ${larpId}`);
  console.log(`   • Běh ID: ${runId}`);
  console.log(`   • Postavy: ${Object.keys(personIds).length}`);
  console.log(`   • CP: ${Object.keys(cpIds).length}`);
  console.log(`   • Dokumenty: ${docOrder}`);
  console.log(`   • Události: ${SCHEDULE.length}`);
  console.log(`\n🔑 Výchozí heslo: ${DEFAULT_PASSWORD}`);
  console.log(`📧 Emaily na doméně: @larportal.xx`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
