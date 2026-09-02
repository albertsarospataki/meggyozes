/**
 * Terv-validáció (P0′–P11′) és tudástár-kérdezés forrásai.
 *
 * A KE-híd itt a legegyszerűbb alakjában dolgozik: a tervezett mechanikából
 * szöveges „artefaktumot" építünk, és ugyanazokat a jeleket futtatjuk rá, mint egy
 * kész anyagon — csak a bizonyíték-fokozat lesz „tervezett". Ez azért helyes, mert a
 * tervben ugyanaz a mechanika szerepel, amit a kész felületen detektálnánk; és azért
 * korlátozott, mert a terv szövege nem a felület: amit nem írtak le, azt nem látjuk.
 *
 * A §4/b kapu itt szigorúbb, mint auditban: a KO-sávot érintő SAJÁT javaslat nem megy
 * ki. Egy audit, ami elnéz valamit, egy elmaradt javítást ér; egy tanács, ami sötét
 * mintát javasol, létrehozza a kárt.
 */

import type { ArtefaktumObjektum, Blokk } from "@meggyozes/bemenet";
import type { Javaslat, Megallapitas } from "@meggyozes/projekt";
import type { MotorTudasbazis } from "./tudasbazis";

export interface TervBemenet {
  readonly konstrukcioTipus: string;
  readonly mezok: Readonly<Record<string, string>>;
  readonly tudasbazis: MotorTudasbazis;
}

export interface TervKockazat {
  readonly szabalyKod: string;
  readonly cim: string;
  readonly sav: string;
  readonly idezet: string;
  readonly miert: string;
}

export interface TervValidacio {
  readonly osszefoglalo: string;
  readonly kockazatok: readonly TervKockazat[];
  readonly megallapitasok: readonly Megallapitas[];
  readonly javaslatok: readonly Javaslat[];
  readonly jolTalaltatok: readonly string[];
  readonly epitesiSorrend: readonly { readonly sorszam: number; readonly cim: string; readonly miert: string }[];
  readonly visszakuldottJavaslatok: readonly string[];
}

/** A tervből épített, szöveges artefaktum-objektum: a jelek ezen futnak. */
export function tervbolObjektum(mezok: Readonly<Record<string, string>>): ArtefaktumObjektum {
  const parok = Object.entries(mezok).filter(([, ertek]) => ertek.trim() !== "");
  const blokkok: Blokk[] = parok.map(([kulcs, ertek], i) => ({
    azonosito: `t-${i + 1}`,
    szerep: "bekezdes",
    szoveg: ertek,
    hely: kulcs,
    siteChrome: false,
  }));

  return {
    ajto: "szoveg",
    forras: "tervezett konstrukció",
    cim: mezok.mechanika ?? undefined,
    szoveg: parok.map(([, ertek]) => ertek).join("\n"),
    blokkok,
    gombok: [],
    linkek: [],
    arak: [],
    urlapMezok: [],
    consentBanner: undefined,
    kepernyokep: undefined,
    rogzitve: new Date().toISOString(),
    korlatok: [
      "Terv-validáció: a rendszer csak azt látja, amit leírtatok — a megvalósult felület mást is hozhat.",
    ],
  };
}

export function tervetValidal(b: TervBemenet): TervValidacio {
  const objektum = tervbolObjektum(b.mezok);
  const talalatok = b.tudasbazis.jelek
    .filter((j) => j.ajtok.includes("szoveg"))
    .flatMap((jel) => jel.megfigyel(objektum).map((t) => ({ jel, t })));

  const megallapitasok: Megallapitas[] = [];
  const kockazatok: TervKockazat[] = [];
  let sorszam = 0;

  for (const szabaly of b.tudasbazis.szabalyok) {
    for (const x of talalatok.filter((y) => szabaly.kivaltoJelek.includes(y.jel.kod))) {
      sorszam += 1;
      megallapitasok.push({
        azonosito: `MT-${sorszam}`,
        szabalyKod: szabaly.kod,
        jelKodok: [x.jel.kod],
        technikaKodok: [...szabaly.technikak],
        idezet: x.t.idezet,
        sav: szabaly.sav,
        // A tervezett jel soha nem bizonyított probléma: egy tervről nem állítható,
        // hogy már árt (core: „tervezett" fokozat).
        bizonyitekSzint: "tervezett",
        minosites: "problema",
        forras: szabaly.forras,
      });
      kockazatok.push({
        szabalyKod: szabaly.kod,
        cim: szabaly.cim,
        sav: szabaly.sav,
        idezet: x.t.idezet,
        miert: szabaly.miert,
      });
    }
  }

  // §4/b: a KO-sávot érintő saját javaslat nem adható ki — helyette lebeszélés.
  const visszakuldott: string[] = [];
  const javaslatok: Javaslat[] = megallapitasok.map((m, i): Javaslat => {
    const szabaly = b.tudasbazis.szabalyok.find((s) => s.kod === m.szabalyKod);
    const koSav = m.sav === "0 Jogi KO" || m.sav === "1 Etikai KO";
    if (koSav) visszakuldott.push(`J-${i + 1}`);
    return {
      azonosito: `J-${i + 1}`,
      megallapitasAzonosito: m.azonosito,
      mostEzVan: szabaly?.mostEzVan ?? "A tervezett mechanika ebben a formában kockázatos.",
      helyetteEz: koSav
        ? `Ezt így ne építsétek meg. ${szabaly?.helyetteEz ?? ""}`.trim()
        : (szabaly?.helyetteEz ?? ""),
      variansok: szabaly?.variansok ?? { konzervativ: "", batrabb: "", kiserleti: "" },
      beavatkozasiSzint: szabaly?.beavatkozasiSzint ?? "Szövegcsere",
      varhatoHatas: szabaly?.varhatoHatas,
      jogiMegjegyzes: szabaly?.jogiMegjegyzes,
      rangsor: i + 1,
    };
  });

  const jolTalaltatok: string[] = [];
  if ((b.mezok.meres ?? "").trim() !== "") {
    jolTalaltatok.push("A mérés már a tervben szerepel — enélkül az előtte/utána visszamérés lehetetlen lenne.");
  }
  if ((b.mezok.korlatok ?? "").trim() !== "") {
    jolTalaltatok.push("A korlátokat előre kimondtátok, így a javaslatok nem futnak vakvágányra.");
  }
  if (jolTalaltatok.length === 0) {
    jolTalaltatok.push("A szándék egyértelmű, a konstrukció-típus felismerhető volt.");
  }

  const epitesiSorrend = [
    { sorszam: 1, cim: "Döntsd el a mechanika egyetlen szabályát", miert: "Egy mechanika, egy szabály — a kettős feltétel a leggyakoribb bukás." },
    { sorszam: 2, cim: "Írd meg az ígéretet és a korlátot egy mondatban", miert: "A korlát elöl hitelesít, a végén mentegetőzik." },
    { sorszam: 3, cim: "Állítsd be a mérést, mielőtt elindul", miert: "Utólag nincs mihez viszonyítani." },
    ...(kockazatok.length > 0
      ? [{ sorszam: 4, cim: "Vedd ki a kockázatos elemeket", miert: "A KO-sávot érintő mechanika a teljes kampányt viszi." }]
      : []),
  ];

  const osszefoglalo =
    kockazatok.length === 0
      ? `A tervben (${b.konstrukcioTipus}) nem találtam kizáró okot. ${jolTalaltatok[0] ?? ""}`
      : `A tervben (${b.konstrukcioTipus}) ${kockazatok.length} kockázatot találtam. ${
          visszakuldott.length > 0
            ? "Ebből legalább egy olyan, amit így nem érdemes megépíteni."
            : "Mindegyikre van alternatíva."
        }`;

  return {
    osszefoglalo,
    kockazatok,
    megallapitasok,
    javaslatok,
    jolTalaltatok,
    epitesiSorrend,
    visszakuldottJavaslatok: visszakuldott,
  };
}

/* ---------- Kérdezz: forrás-tételek a tudásbázisból ---------- */

export interface KeresesiTetel {
  readonly azonosito: string;
  readonly tipus: "szabaly" | "technika";
  readonly kulcsallitas: string;
  readonly bizonyitekero: number | undefined;
  readonly karantenos: boolean;
  readonly relevancia: number;
  readonly agazat: string | undefined;
  readonly felulet: string | undefined;
  readonly szamok: readonly string[];
  readonly technikaKodok: readonly string[];
}

const TOLTELEK = new Set(["hogy", "mi", "mit", "az", "egy", "van", "lesz", "kell", "nem", "igen", "vagy", "ami", "amit"]);

function szavak(szoveg: string): string[] {
  return szoveg
    .toLowerCase()
    .split(/[^a-záéíóöőúüű0-9]+/)
    .filter((sz) => sz.length >= 4 && !TOLTELEK.has(sz));
}

/**
 * Lexikai visszakeresés a demó bázison.
 *
 * Ez NEM a J komponens: az embedding-index a Notion-pillanatképen fut majd. Amíg az
 * nincs, a relevancia szó-átfedésen áll — a küszöb viszont ugyanaz marad, mert a
 * küszöb csökkentése a legolcsóbb módja annak, hogy a rendszer magabiztosan hazudjon.
 *
 * Két dolog teszi a pontozást tisztességessé egy ragozó nyelven:
 *  - a toldalék nem számít: két szó egyezik, ha legalább öt karakteres közös előtagjuk
 *    van („szűkösség" ~ „szűkösséget");
 *  - a korpuszban egyáltalán elő nem forduló kérdés-szó nem ront a pontszámon. Az ilyen
 *    szó („mikor", „szerintetek") semmit nem különböztet meg, tehát nem is hordoz
 *    információt arról, mennyire illik egy tétel a kérdéshez. Ha viszont EGYETLEN
 *    kérdés-szó sincs a korpuszban, a relevancia nulla — és a válasz a hiány-ág.
 */
export function tudasbazisbolKeres(kerdes: string, tudasbazis: MotorTudasbazis): KeresesiTetel[] {
  const kerdesSzavak = szavak(kerdes);
  if (kerdesSzavak.length === 0) return [];

  const korpusz = new Set(
    [
      ...tudasbazis.szabalyok.flatMap((s) => szavak(`${s.cim} ${s.miert} ${s.mostEzVan} ${s.helyetteEz}`)),
      ...tudasbazis.technikak.flatMap((t) =>
        szavak(`${t.nev} ${t.meghatarozas} ${t.sotetValtozat ?? ""} ${t.valasztovonal ?? ""}`),
      ),
    ],
  );

  const rokon = (a: string, b: string): boolean => {
    const hossz = Math.min(a.length, b.length, 5);
    return hossz >= 5 && a.slice(0, hossz) === b.slice(0, hossz);
  };

  const korpuszban = (szo: string): boolean => [...korpusz].some((k) => rokon(k, szo));
  const kulcsok = kerdesSzavak.filter(korpuszban);
  if (kulcsok.length === 0) return [];

  const pontoz = (szoveg: string): number => {
    const cel = szavak(szoveg);
    let egyezes = 0;
    for (const k of kulcsok) if (cel.some((c) => rokon(c, k))) egyezes += 1;
    return egyezes / kulcsok.length;
  };

  const szabalyok: KeresesiTetel[] = tudasbazis.szabalyok.map((s) => ({
    azonosito: s.kod,
    tipus: "szabaly" as const,
    kulcsallitas: `${s.cim}. ${s.miert}`,
    bizonyitekero: s.bizonyitekero,
    karantenos: false,
    relevancia: Math.max(pontoz(`${s.cim} ${s.miert} ${s.mostEzVan} ${s.helyetteEz}`), 0),
    agazat: undefined,
    felulet: undefined,
    szamok: [],
    technikaKodok: s.technikak,
  }));

  const technikak: KeresesiTetel[] = tudasbazis.technikak.map((t) => ({
    azonosito: t.kod,
    tipus: "technika" as const,
    kulcsallitas: `${t.nev}: ${t.meghatarozas}${t.valasztovonal === undefined ? "" : ` A választóvonal: ${t.valasztovonal}`}`,
    bizonyitekero: undefined,
    karantenos: t.allapot === "Kerulendo",
    relevancia: pontoz(`${t.nev} ${t.meghatarozas} ${t.sotetValtozat ?? ""} ${t.valasztovonal ?? ""}`),
    agazat: undefined,
    felulet: undefined,
    szamok: [],
    technikaKodok: [t.kod],
  }));

  return [...szabalyok, ...technikak].sort((a, b) => b.relevancia - a.relevancia);
}
