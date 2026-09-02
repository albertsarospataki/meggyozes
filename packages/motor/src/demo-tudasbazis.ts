/**
 * Demó tudásbázis — `tudasbazis-demo-v1`.
 *
 * MI EZ, ÉS MI NEM. Ez nem a Szabálytár. A valódi tudás (4 456 szabály, 282 jel,
 * 150 technika, 2 558 evidencia) a Notionben él, és a `pnpm kb:sync` hozza le
 * verziózott pillanatképként. Amíg az nem futott le, a motornak akkor is dolgoznia
 * kell valamin — ez az a valami: tíz általánosan ismert meggyőzés-technikai mintázat,
 * futtatható alakban.
 *
 * Két fegyelmi szabály tartja ezt őszintén:
 *  - a kódok `-D` jelölést kapnak (J-D01, S-D01, TK-D01), hogy soha ne lehessen
 *    összetéveszteni őket a tudástár valódi kódjaival;
 *  - egyetlen tétel sem hivatkozik kutatási forrásra vagy hatásmértékre, mert azok a
 *    Kutatástárból jönnek. Ahol a valódi bázis számot adna, itt `undefined` áll, és a
 *    riport ezt „forrás: demó tétel"-ként írja ki.
 *
 * A mintázatok maguk nem találmányok: szűkösség, határidő, társadalmi bizonyíték,
 * felsőfok bizonyíték nélkül, garancia, CTA-konkrétság, consent-egyensúly. A demó
 * annyit állít, hogy ezek JELEN VANNAK-e — hatásmértéket nem állít.
 */

import type { ArtefaktumObjektum, Blokk } from "@meggyozes/bemenet";
import type { Elvaras, Jel, JelTalalat, MotorTudasbazis, PozitivTetel, Szabaly, Technika } from "./tudasbazis";

const ekezet: Readonly<Record<string, string>> = {
  á: "a", é: "e", í: "i", ó: "o", ö: "o", ő: "o", ú: "u", ü: "u", ű: "u",
};

function alak(szoveg: string): string {
  let ki = "";
  for (const b of szoveg.toLowerCase()) ki += ekezet[b] ?? b;
  return ki;
}

/** Blokkonkénti mintaillesztés — a találat mindig egy konkrét blokk konkrét mondata. */
function mintaJel(
  minta: RegExp,
  bizonyitekSzint: JelTalalat["bizonyitekSzint"] = "teny",
  szuro: (b: Blokk) => boolean = () => true,
): (o: ArtefaktumObjektum) => JelTalalat[] {
  return (o) =>
    o.blokkok
      .filter((b) => szuro(b) && minta.test(alak(b.szoveg)))
      .map((b) => ({ blokk: b, idezet: b.szoveg, bizonyitekSzint }));
}

const JELEK: readonly Jel[] = [
  {
    kod: "J-D01",
    megnevezes: "Időbeli szűkösség — határidő",
    jelosztaly: "Szűkösség",
    ajtok: ["url", "szoveg", "kep"],
    // Pillanatképből a határidő valódisága nem dönthető el: a jel TÉNY, a lejárat GYANÚ.
    megfigyel: mintaJel(/\b(ma ejfelig|csak ma|lejar|hatarido|utolso nap|az akcio veget er|meg \d+ ora)\b/),
  },
  {
    kod: "J-D02",
    megnevezes: "Készlet-szűkösség — darabszám",
    jelosztaly: "Szűkösség",
    ajtok: ["url", "szoveg", "kep"],
    megfigyel: mintaJel(/\b(mar csak \d+|utolso \d+|utolso darabok|keszlet erejeig|fogyoban)\b/),
  },
  {
    kod: "J-D03",
    megnevezes: "Társadalmi bizonyíték — szám vagy arány",
    jelosztaly: "Társas bizonyíték",
    ajtok: ["url", "szoveg", "kep"],
    megfigyel: mintaJel(/\b(\d+\s?%|\d[\d ]{2,}\+?\s?(ugyfel|vasarlo|csapat|felhasznalo))\b/),
  },
  {
    kod: "J-D04",
    megnevezes: "Felsőfokú állítás",
    jelosztaly: "Nyelvi minta",
    ajtok: ["url", "szoveg", "kep"],
    megfigyel: mintaJel(/\b(leg[a-z]+bb|piacvezeto|verhetetlen|egyedulallo|paratlan)\b/),
  },
  {
    kod: "J-D05",
    megnevezes: "Kockázatcsökkentés — garancia, elállás, visszatérítés",
    jelosztaly: "Kockázat",
    ajtok: ["url", "szoveg"],
    megfigyel: mintaJel(/\b(garancia|penzvisszafizetes|elallas|kockazatmentes|ingyenes visszakuldes)\b/),
  },
  {
    kod: "J-D06",
    megnevezes: "Általános cselekvésre hívás",
    jelosztaly: "Cselekvés",
    ajtok: ["url", "szoveg"],
    megfigyel: mintaJel(
      /^(kuldes|tovabb|kattints ide|mehet|ok|elfogadom|submit)$/,
      "teny",
      (b) => b.szerep === "gomb",
    ),
  },
  {
    kod: "J-D07",
    megnevezes: "Consent-banner egyensúlytalansága",
    jelosztaly: "Folyamat",
    ajtok: ["url"],
    megfigyel: (o) => {
      const banner = o.consentBanner;
      if (banner === undefined) return [];
      const b = alak(banner);
      const elfogad = /(elfogadom|osszes elfogadasa|accept)/.test(b);
      const elutasit = /(elutasitom|osszes elutasitasa|reject|csak a szukseges)/.test(b);
      if (!elfogad || elutasit) return [];
      const blokk: Blokk = {
        azonosito: "consent",
        szerep: "banner",
        szoveg: banner,
        hely: "consent-banner",
        siteChrome: true,
      };
      return [{ blokk, idezet: banner.slice(0, 220), bizonyitekSzint: "teny" }];
    },
  },
  {
    kod: "J-D08",
    megnevezes: "Ár megjelenítése",
    jelosztaly: "Ár",
    ajtok: ["url", "szoveg"],
    megfigyel: (o) =>
      o.arak.slice(0, 3).map((ar) => ({
        blokk: { azonosito: "ar", szerep: "ar" as const, szoveg: ar, hely: "ár", siteChrome: false },
        idezet: ar,
        bizonyitekSzint: "teny" as const,
      })),
  },
];

const SZABALYOK: readonly Szabaly[] = [
  {
    kod: "S-D01",
    cim: "A határidő ott van, a következménye nincs",
    sav: "1 Etikai KO",
    kivaltoJelek: ["J-D01"],
    technikak: ["TK-D01"],
    mostEzVan: "Az oldal határidőt közöl, de nem derül ki, mi történik a határidő után.",
    helyetteEz: "Írd oda, mi változik a határidő után (ár, elérhetőség, feltétel) — vagy vedd ki a határidőt.",
    variansok: {
      konzervativ: "A határidő mellé egy mondat: mi lesz utána.",
      batrabb: "Dátum és következmény a gomb mellett, egy sorban.",
      kiserleti: "A határidő helyett a valódi korlát: „a mai rendeléseket még holnap postázzuk”.",
    },
    miert:
      "A határidő akkor hat, ha valódi és van látható következménye. Ha lejár és nem történik semmi, a következő határidő már nem hat — és a hamis sürgetés kizáró ok.",
    beavatkozasiSzint: "Szövegcsere",
    varhatoHatas: undefined,
    jogiMegjegyzes: "Ha a határidő nem valódi, az tisztességtelen kereskedelmi gyakorlat lehet. Nem jogi tanácsadás.",
    forras: undefined,
    bizonyitekero: undefined,
  },
  {
    kod: "S-D02",
    cim: "A készlet-állítás mellett nincs, ami igazolja",
    sav: "1 Etikai KO",
    kivaltoJelek: ["J-D02"],
    technikak: ["TK-D02"],
    mostEzVan: "Darabszámra hivatkozó szűkösség-állítás, igazolás nélkül.",
    helyetteEz: "Mutasd a valódi készletet a rendszerből, vagy cseréld a szűkösséget konkrét szállítási ígéretre.",
    variansok: {
      konzervativ: "A készlet-szám a raktárkészletből, automatikusan frissülve.",
      batrabb: "Készlet helyett szállítási ablak: „ma 16:00-ig rendelve holnap ott van”.",
      kiserleti: "Semmilyen szűkösség; helyette a döntést segítő összehasonlítás.",
    },
    miert:
      "Az igazolatlan szűkösség rövid távon hat, de az első ellentmondásnál (holnap is „már csak 2 db”) a teljes oldal hitelét viszi.",
    beavatkozasiSzint: "Folyamat- vagy rendszerváltoztatás",
    varhatoHatas: undefined,
    jogiMegjegyzes: "A valótlan készlet-állítás megtévesztő lehet. Nem jogi tanácsadás.",
    forras: undefined,
    bizonyitekero: undefined,
  },
  {
    kod: "S-D03",
    cim: "A szám ott van, a forrása nincs",
    sav: "3 Hatasossag es hiany",
    kivaltoJelek: ["J-D03"],
    technikak: ["TK-D03"],
    mostEzVan: "Arány vagy ügyfélszám szerepel az oldalon, a mérés forrása nélkül.",
    helyetteEz: "Tedd a szám mellé, hogy mikor és min mérted — vagy cseréld névvel vállalt idézetre.",
    variansok: {
      konzervativ: "A szám mellé egy zárójeles forrás-sor (mikor, hány válaszból).",
      batrabb: "A szám helyett egy névvel és céggel vállalt ügyfélidézet.",
      kiserleti: "Egy konkrét ügyféltörténet számokkal, a hero alatt.",
    },
    miert:
      "A forrás nélküli szám olyan állítás, amit az olvasó nem tud ellenőrizni; a névvel vállalt idézet ellenőrizhető, ezért erősebb.",
    beavatkozasiSzint: "Szövegcsere",
    varhatoHatas: undefined,
    jogiMegjegyzes: undefined,
    forras: undefined,
    bizonyitekero: undefined,
  },
  {
    kod: "S-D04",
    cim: "Felsőfok bizonyíték nélkül",
    sav: "3 Hatasossag es hiany",
    kivaltoJelek: ["J-D04"],
    technikak: ["TK-D04"],
    mostEzVan: "Felsőfokú állítás („a legjobb”), ami mellett nincs mérés vagy összehasonlítás.",
    helyetteEz: "Cseréld konkrét, ellenőrizhető előnyre — amit egy versenytárssal összevetve is ki mersz mondani.",
    variansok: {
      konzervativ: "„A legjobb” helyett a konkrét különbség egy mondatban.",
      batrabb: "Összehasonlító táblázat két versenytárssal, forrással.",
      kiserleti: "A korlátaid kimondása is: mire NEM jó a termék.",
    },
    miert:
      "A felsőfok bizonyíték nélkül nem növeli a hitelt, viszont felhívja rá a figyelmet, hogy nincs mögötte adat.",
    beavatkozasiSzint: "Szövegcsere",
    varhatoHatas: undefined,
    jogiMegjegyzes: undefined,
    forras: undefined,
    bizonyitekero: undefined,
  },
  {
    kod: "S-D05",
    cim: "A gomb nem mondja meg, mi történik",
    sav: "3 Hatasossag es hiany",
    kivaltoJelek: ["J-D06"],
    technikak: ["TK-D05"],
    mostEzVan: "A cselekvésre hívás általános szó („Küldés”, „Tovább”).",
    helyetteEz: "Írd a gombra, mi történik a kattintás után.",
    variansok: {
      konzervativ: "„Küldés” helyett „Kérem az ajánlatot”.",
      batrabb: "A gomb alatt egy sor: mi jön ezután és mikor.",
      kiserleti: "Két gomb: „Ajánlatot kérek” és „Előbb kérdezek” — a döntés lépcsőzve.",
    },
    miert:
      "A kattintás előtti bizonytalanság fékez. Ha a gomb megmondja a következményt, a döntés kisebb kockázatnak tűnik.",
    beavatkozasiSzint: "Szövegcsere",
    varhatoHatas: undefined,
    jogiMegjegyzes: undefined,
    forras: undefined,
    bizonyitekero: undefined,
  },
  {
    kod: "S-D06",
    cim: "A sütikérdésben az elfogadás könnyebb, mint az elutasítás",
    sav: "0 Jogi KO",
    kivaltoJelek: ["J-D07"],
    technikak: ["TK-D06"],
    mostEzVan: "A banner elfogadást kínál, azonos szinten elérhető elutasítás nélkül.",
    helyetteEz: "Tedd az elutasítást ugyanolyan könnyen elérhetővé, mint az elfogadást.",
    variansok: {
      konzervativ: "„Összes elutasítása” gomb az elfogadás mellé, azonos súllyal.",
      batrabb: "Alapértelmezés: csak a szükséges sütik; a többi külön kérésre.",
      kiserleti: "Egy mondat arról, mit nyer a látogató, ha elfogadja.",
    },
    miert:
      "Az egyensúlytalan választás nem szabad hozzájárulás; a jogi kockázaton túl az első benyomás is manipulációt jelez.",
    beavatkozasiSzint: "Felületátalakítás",
    varhatoHatas: undefined,
    jogiMegjegyzes: "A hozzájárulásnak önkéntesnek és egyenrangúan visszavonhatónak kell lennie. Nem jogi tanácsadás.",
    forras: undefined,
    bizonyitekero: undefined,
  },
  {
    kod: "S-D07",
    cim: "Az ár mellett nincs kockázatcsökkentés",
    sav: "3 Hatasossag es hiany",
    kivaltoJelek: [],
    technikak: ["TK-D07"],
    mostEzVan: "Az oldal árat közöl, de nem mondja ki a garanciát, az elállást vagy a visszatérítést.",
    helyetteEz: "Tedd az ár közelébe azt az egy mondatot, ami a vásárlás kockázatát csökkenti.",
    variansok: {
      konzervativ: "Az ár alá: „30 nap, kérdés nélküli visszavétel.”",
      batrabb: "A garancia a gomb feliratának része.",
      kiserleti: "A garancia mint önálló blokk, a feltételekkel együtt.",
    },
    miert:
      "Az ár a döntés pillanata; ha ott nincs kockázatcsökkentő állítás, a látogató a bizonytalanságot viszi magával.",
    beavatkozasiSzint: "Szövegcsere",
    varhatoHatas: undefined,
    jogiMegjegyzes: undefined,
    forras: undefined,
    bizonyitekero: undefined,
  },
];

const ELVARASOK: readonly Elvaras[] = [
  {
    kod: "EL-D01",
    cim: "Ár mellett kockázatcsökkentés",
    sav: "3 Hatasossag es hiany",
    ajtok: ["url", "szoveg"],
    szabalyKod: "S-D07",
    teljesul: (o) =>
      o.arak.length === 0 ||
      /\b(garancia|penzvisszafizetes|elallas|kockazatmentes)\b/.test(alak(o.szoveg)),
  },
];

const TECHNIKAK: readonly Technika[] = [
  {
    kod: "TK-D01",
    nev: "Időbeli szűkösség",
    meghatarozas: "Határidő, ami után a feltétel megváltozik.",
    sotetValtozat: "A határidő nem valódi: lejár, és minden marad.",
    valasztovonal: "Van-e a határidőnek látható, valóban bekövetkező következménye.",
    allapot: "Vitatott",
  },
  {
    kod: "TK-D02",
    nev: "Készlet-szűkösség",
    meghatarozas: "A kínálat végességének közlése.",
    sotetValtozat: "A darabszám nem a készletből jön.",
    valasztovonal: "A szám a raktárkészlethez kötött-e.",
    allapot: "Vitatott",
  },
  {
    kod: "TK-D03",
    nev: "Társadalmi bizonyíték",
    meghatarozas: "Mások döntése mint fogódzó.",
    sotetValtozat: "Kitalált vagy ellenőrizhetetlen szám, névtelen vélemény.",
    valasztovonal: "Ellenőrizhető-e a forrás.",
    allapot: "Aktiv",
  },
  {
    kod: "TK-D04",
    nev: "Tekintély-állítás",
    meghatarozas: "Kiemelkedő pozíció állítása.",
    sotetValtozat: "Felsőfok bizonyíték nélkül.",
    valasztovonal: "Van-e mérés vagy összehasonlítás mögötte.",
    allapot: "Aktiv",
  },
  {
    kod: "TK-D05",
    nev: "Következmény-keretezés",
    meghatarozas: "A cselekvés utáni állapot kimondása.",
    sotetValtozat: undefined,
    valasztovonal: undefined,
    allapot: "Aktiv",
  },
  {
    kod: "TK-D06",
    nev: "Választás-egyensúly",
    meghatarozas: "Az alternatívák azonos súlyú elérhetősége.",
    sotetValtozat: "Az egyik választás vizuálisan vagy lépésszámban nehezebb.",
    valasztovonal: "Egyforma erőfeszítéssel elérhető-e mindkét út.",
    allapot: "Aktiv",
  },
  {
    kod: "TK-D07",
    nev: "Kockázatcsökkentés",
    meghatarozas: "Garancia, elállás, visszatérítés a döntés pillanatában.",
    sotetValtozat: "Feltételekbe rejtett garancia.",
    valasztovonal: "Az ígéret és a feltétel ugyanott olvasható-e.",
    allapot: "Aktiv",
  },
];

const POZITIVAK: readonly PozitivTetel[] = [
  {
    kod: "POZ-D01",
    cim: "A kockázatcsökkentés ki van mondva",
    jelKod: "J-D05",
    technikak: ["TK-D07"],
  },
  {
    kod: "POZ-D02",
    cim: "Az ár látható, nem kell érte kérdezni",
    jelKod: "J-D08",
    technikak: [],
  },
];

export const DEMO_TUDASBAZIS: MotorTudasbazis = {
  verzio: "tudasbazis-demo-v1",
  demo: true,
  jelek: JELEK,
  szabalyok: SZABALYOK,
  elvarasok: ELVARASOK,
  technikak: TECHNIKAK,
  pozitivak: POZITIVAK,
};
