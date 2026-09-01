import {
  kodErtekeketKinyer,
  kodotNormalizal,
  type FuttatasEredmeny,
  type MintaTipus,
} from "@meggyozes/core";
import type { EkvivalenciaTerkep, TeljesitesIndok } from "./ekvivalencia.js";

/**
 * A 150 tesztes aranystandard gépi pontozója.
 *
 * A protokoll pontosan a kalibrációs futásoké: a futtató a teszt elvárás-mezőit nem
 * látja (vak futás), a pontozó pedig a Kód-ekvivalencia térkép 8 pontozási szabályával
 * számol. Minden detektor-változat (prompt, modellváltás, tudásbázis-frissítés,
 * DET-szabály) ugyanezen a bázison mérendő, élesítés ELŐTT.
 */

/**
 * Egy elvárás-tétel. A `kodok` VAGY-kapcsolatban állnak (pontozási szabály 3):
 * bármelyik egyezése teljesíti a tételt.
 */
export interface ElvarasTetel {
  readonly kodok: readonly string[];
  /** Az eredeti sor a gold-ból — a riportban ezt mutatjuk, nem a kódlistát. */
  readonly nyers: string;
  /** Igaz, ha a sor értelmezése feltételezésen áll (zárójeles vagy per-jeles kód). */
  readonly bizonytalan?: boolean;
  /** Zárójelben álló kódok: a tétel kontextusa, nem külön kötelező találat. */
  readonly kontextusKodok?: readonly string[];
}

export interface TesztElvaras {
  readonly azonosito: string;
  readonly nev: string;
  readonly mintaTipus: MintaTipus | undefined;
  readonly kotelezo: readonly ElvarasTetel[];
  readonly opcionalis: readonly ElvarasTetel[];
  readonly tiltott: readonly ElvarasTetel[];
  /**
   * Azok a gold-sorok, amelyekben nincs kód — ezeket gépileg nem lehet pontozni.
   * Nem hiba, hanem a gold minőségének mérőszáma: ha ez nő, a bázis romlik.
   */
  readonly kodNelkuliSorok: readonly string[];
}

/**
 * Szabad szövegű gold-mezőt tételekre bont.
 *
 * A gold elvárás-mezői EMBERI PRÓZÁK, nem kódlisták — a #1–#6 kalibrációs futást
 * LLM-pontozók értékelték, akik értik a szövegkörnyezetet. Egy determinisztikus
 * pontozónak ez három konstrukciót jelent, amit külön kell kezelni:
 *
 *  1. SORSZÁMOZOTT TÉTELEK — «1. J-001 Visszaszámláló a felületen — …». Ez a
 *     törzseset: soronként egy kötelező tétel.
 *  2. PER-JELES VAGY — «J-450/J-338 — névvel ellátott vélemény-blokk». A per
 *     alternatívát jelent, nem konjunkciót; a «VAGY» szó nem mindig van kiírva.
 *     Konjunkcióként olvasva a pontozó indokolatlan FAIL-t adna.
 *  3. ZÁRÓJELES HIVATKOZÁS — «J-003 Kedvezmény-állítás … (TK-010)». A zárójeles
 *     kód a tétel KONTEXTUSA (melyik technikához tartozik), nem külön kötelező
 *     találat. Kötelezőként olvasva a pontozó a kötelező tételek számát felfújná,
 *     és a recall rendszeresen alulmérne.
 *
 * A feldolgozás ezért konzervatív: a zárójeles kód nem lesz kötelező tétel, a
 * per-jeles futam pedig egyetlen VAGY-tétel. A két konstrukciót érintő sorok
 * `bizonytalan` jelölést kapnak — a `goldLint()` ezekből állítja elő azt a listát,
 * amit a gold strukturálásakor kézzel kell rendezni.
 */

interface KodTalalat {
  readonly kod: string;
  readonly kezdet: number;
  readonly veg: number;
}

const KOD_KERESO = /(?<![\p{L}\p{N}_-])(TK|EL|J|S|D|K)-(\d{1,4})(?:-(\d{1,3}|\*))?/giu;

function zarojelTartomanyok(sor: string): Array<[number, number]> {
  const tartomanyok: Array<[number, number]> = [];
  for (const m of sor.matchAll(/\(([^)]*)\)/gu)) {
    if (m.index !== undefined) tartomanyok.push([m.index, m.index + m[0].length]);
  }
  return tartomanyok;
}

function kodTalalatok(sor: string): KodTalalat[] {
  const talalatok: KodTalalat[] = [];
  for (const m of sor.matchAll(KOD_KERESO)) {
    if (m.index === undefined) continue;
    const kod = kodErtekeketKinyer(m[0])[0];
    if (kod) talalatok.push({ kod, kezdet: m.index, veg: m.index + m[0].length });
  }
  return talalatok;
}

export function elvarasokatElemez(szoveg: string | undefined): {
  tetelek: ElvarasTetel[];
  kodNelkuliSorok: string[];
} {
  const tetelek: ElvarasTetel[] = [];
  const kodNelkuliSorok: string[] = [];
  if (!szoveg?.trim()) return { tetelek, kodNelkuliSorok };

  const sorok = szoveg
    .split(/\r?\n|;|·|•/u)
    // Listajel és sorszámozás levágása: «- », «— », «1. », «2) »
    .map((s) => s.replace(/^\s*(?:[-–—*]|\d{1,2}[.)])\s*/u, "").trim())
    .filter((s) => s.length > 0);

  for (const sor of sorok) {
    const osszes = kodTalalatok(sor);
    if (osszes.length === 0) {
      kodNelkuliSorok.push(sor);
      continue;
    }

    const zarojelek = zarojelTartomanyok(sor);
    const zarojelben = (t: KodTalalat) =>
      zarojelek.some(([kezd, veg]) => t.kezdet >= kezd && t.veg <= veg);

    const kontextusKodok = osszes.filter(zarojelben).map((t) => t.kod);
    const fotelek = osszes.filter((t) => !zarojelben(t));

    // Ha a soron CSAK zárójeles kód van, az mégis a tétel hordozója — ilyenkor
    // kötelezőnek vesszük, különben a sor némán kiesne a pontozásból.
    const alap = fotelek.length > 0 ? fotelek : osszes;

    // Per-jellel összekötött szomszédos kódok egyetlen VAGY-csoportot alkotnak.
    const csoportok: string[][] = [];
    let perJelesVolt = false;
    for (const talalat of alap) {
      const elozo = csoportok.at(-1);
      const elozoTalalat = alap[alap.indexOf(talalat) - 1];
      const kozotte =
        elozoTalalat === undefined ? undefined : sor.slice(elozoTalalat.veg, talalat.kezdet);
      if (elozo && kozotte !== undefined && /^\s*\/\s*$/u.test(kozotte)) {
        elozo.push(talalat.kod);
        perJelesVolt = true;
      } else {
        csoportok.push([talalat.kod]);
      }
    }

    // Kiírt «VAGY» esetén az egész sor egyetlen alternatíva-halmaz.
    const vagySzoval = /\bVAGY\b/u.test(sor);
    const veglegesek = vagySzoval && csoportok.length > 1 ? [csoportok.flat()] : csoportok;

    // A 11. pontozási szabály (v7) hivatalosan kimondja: a zárójeles gold-tag NEM
    // feltétele a tétel teljesítésének. Ezért a zárójeles kód már nem bizonytalanság,
    // csak kontextus — bizonytalan kizárólag a per-jeles kódfutam marad, amelynek
    // olvasata (alternatíva vagy két tétel) továbbra sincs szabályban rögzítve.
    const bizonytalan = perJelesVolt;
    for (const kodok of veglegesek) {
      // A kontextus-kódokat akkor is megtartjuk, ha a sor nem bizonytalan: a
      // riportban meg kell tudni mutatni, mihez tartozik a tétel.
      const alap = { kodok, nyers: sor };
      const kontextussal = kontextusKodok.length > 0 ? { ...alap, kontextusKodok } : alap;
      tetelek.push(bizonytalan ? { ...kontextussal, bizonytalan: true } : kontextussal);
    }
  }
  return { tetelek, kodNelkuliSorok };
}

/**
 * Gold-lint: azok a sorok, amelyeket egy determinisztikus pontozó csak feltételezéssel
 * tud értelmezni. Nem hiba — a gold emberi pontozásra készült. A lista azt mondja meg,
 * mely sorokat kell strukturált mezőbe emelni, mielőtt a CI-re bízzuk a kaput.
 */
export interface GoldLintLelet {
  readonly azonosito: string;
  readonly mezo: "kotelezo" | "tiltott";
  readonly sor: string;
  readonly ok: string;
}

export function goldLint(elvarasok: readonly TesztElvaras[]): GoldLintLelet[] {
  const leletek: GoldLintLelet[] = [];
  for (const e of elvarasok) {
    for (const t of e.kotelezo) {
      if (t.bizonytalan === true) {
        leletek.push({
          azonosito: e.azonosito,
          mezo: "kotelezo",
          sor: t.nyers,
          ok: "per-jeles kódfutam — VAGY-alternatíva vagy két külön tétel?",
        });
      }
    }
    for (const sor of e.kodNelkuliSorok) {
      leletek.push({
        azonosito: e.azonosito,
        mezo: "kotelezo",
        sor,
        ok: "kód nélküli elvárás — gépileg nem pontozható",
      });
    }
  }
  return leletek;
}

export interface TetelErtekeles {
  readonly tetel: ElvarasTetel;
  readonly teljesult: boolean;
  readonly indok: TeljesitesIndok | undefined;
}

export interface TesztPontszam {
  readonly azonosito: string;
  readonly nev: string;
  readonly mintaTipus: MintaTipus | undefined;
  readonly pass: boolean;
  readonly kotelezo: readonly TetelErtekeles[];
  readonly opcionalis: readonly TetelErtekeles[];
  /** Kiadott tiltott kódok — ezek buktatják a tesztet. */
  readonly tiltottTalalatok: readonly string[];
  /**
   * Kontroll-mintán kiadott, tényként állított problémás kód. Egyetlen darab is
   * azonnali release-blokk (alfa-KPI: kontroll-álpozitív = 0).
   */
  readonly alpozitivak: readonly string[];
}

/**
 * A kiadott kódok két készlete — az aszimmetria szándékos, a pontozási szabályokból ered.
 *
 * `mind`: a strukturált detekciók ÉS a nyers kimenet szövegéből kinyert kódok uniója.
 *   Ezt használjuk a KÖTELEZŐ tételekhez (1. szabály: kódemlítés bárhol találat).
 *
 * `tiltottraSzamit`: csak a strukturált detekciók közül azok, amelyeket a futtató
 *   TÉNYKÉNT állított PROBLÉMAKÉNT. A 2. szabály szerint a gyanúként jelölt detekció
 *   tiltott találatnak SOHA nem számít; a prózában elejtett kódemlítés sem vádol.
 */
export function kiadottKodok(eredmeny: FuttatasEredmeny): {
  mind: Set<string>;
  tiltottraSzamit: Set<string>;
} {
  const mind = new Set<string>();
  const tiltottraSzamit = new Set<string>();

  for (const d of eredmeny.detekciok) {
    const kod = kodotNormalizal(d.kod);
    mind.add(kod);
    if (d.minosites === "problema" && d.bizonyitekSzint === "teny" && d.siteChrome !== true) {
      tiltottraSzamit.add(kod);
    }
  }
  for (const kod of kodErtekeketKinyer(eredmeny.nyersKimenet)) mind.add(kod);

  return { mind, tiltottraSzamit };
}

export function tesztetPontoz(
  elvaras: TesztElvaras,
  eredmeny: FuttatasEredmeny,
  terkep: EkvivalenciaTerkep,
): TesztPontszam {
  const { mind, tiltottraSzamit } = kiadottKodok(eredmeny);

  const ertekel = (tetelek: readonly ElvarasTetel[]): TetelErtekeles[] =>
    tetelek.map((tetel) => {
      for (const kod of tetel.kodok) {
        const indok = terkep.teljesiti(kod, mind, elvaras.mintaTipus);
        if (indok) return { tetel, teljesult: true, indok };
      }
      return { tetel, teljesult: false, indok: undefined };
    });

  const kotelezo = ertekel(elvaras.kotelezo);
  const opcionalis = ertekel(elvaras.opcionalis);

  // A tiltott listán a pontos kód számít: az ekvivalencia-engedmények a KÖTELEZŐ
  // oldalt lazítják, a tiltott oldalt nem — különben egy rokon kód vádat vinne ki.
  const tiltottTalalatok = elvaras.tiltott
    .flatMap((t) => t.kodok)
    .map(kodotNormalizal)
    .filter((kod) => tiltottraSzamit.has(kod));

  // Kontroll-mintán MINDEN tényként állított probléma álpozitív: technikamentes
  // oldalon a nulla találat az elvárt, helyes kimenet.
  const alpozitivak =
    elvaras.mintaTipus === "Kontroll" ? [...tiltottraSzamit] : [];

  const pass =
    kotelezo.every((t) => t.teljesult) &&
    tiltottTalalatok.length === 0 &&
    alpozitivak.length === 0;

  return {
    azonosito: elvaras.azonosito,
    nev: elvaras.nev,
    mintaTipus: elvaras.mintaTipus,
    pass,
    kotelezo,
    opcionalis,
    tiltottTalalatok: [...new Set(tiltottTalalatok)],
    alpozitivak,
  };
}

export interface FutasOsszesito {
  readonly tesztekSzama: number;
  readonly passDarab: number;
  readonly passArany: number;
  readonly kotelezoTetelekSzama: number;
  readonly kotelezoTeljesult: number;
  readonly kotelezoRecall: number;
  readonly kontrollTesztek: number;
  readonly kontrollAlpozitiv: number;
  /** Ahány TESZTEN volt tiltott találat, osztva az összes teszttel (a #1–#6 futás így mérte). */
  readonly tiltottTesztek: number;
  readonly tiltottArany: number;
  readonly kodNelkuliGoldSorok: number;
}

export function futastOsszesit(
  pontszamok: readonly TesztPontszam[],
  elvarasok: readonly TesztElvaras[] = [],
): FutasOsszesito {
  const tesztekSzama = pontszamok.length;
  const passDarab = pontszamok.filter((p) => p.pass).length;
  const kotelezoTetelek = pontszamok.flatMap((p) => p.kotelezo);
  const kontroll = pontszamok.filter((p) => p.mintaTipus === "Kontroll");
  const tiltottTesztek = pontszamok.filter((p) => p.tiltottTalalatok.length > 0).length;

  const arany = (szamlalo: number, nevezo: number): number =>
    nevezo === 0 ? 1 : szamlalo / nevezo;

  return {
    tesztekSzama,
    passDarab,
    passArany: arany(passDarab, tesztekSzama),
    kotelezoTetelekSzama: kotelezoTetelek.length,
    kotelezoTeljesult: kotelezoTetelek.filter((t) => t.teljesult).length,
    kotelezoRecall: arany(kotelezoTetelek.filter((t) => t.teljesult).length, kotelezoTetelek.length),
    kontrollTesztek: kontroll.length,
    kontrollAlpozitiv: kontroll.reduce((ossz, p) => ossz + p.alpozitivak.length, 0),
    tiltottTesztek,
    tiltottArany: arany(tiltottTesztek, tesztekSzama),
    kodNelkuliGoldSorok: elvarasok.reduce((ossz, e) => ossz + e.kodNelkuliSorok.length, 0),
  };
}
