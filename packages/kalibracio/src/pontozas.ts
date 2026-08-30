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
 * Formátum-szabály (a gold-sorok tényleges alakjából):
 *  - a sorok/pontok külön tételek (újsor, «;», «·», «•», «—» listajel);
 *  - ha egy soron belül a «VAGY» szó szerepel, a sor egyetlen VAGY-tétel;
 *  - egyébként a soron belüli minden kód külön kötelező tétel;
 *  - kód nélküli sor nem pontozható, de nyilván van tartva.
 */
export function elvarasokatElemez(szoveg: string | undefined): {
  tetelek: ElvarasTetel[];
  kodNelkuliSorok: string[];
} {
  const tetelek: ElvarasTetel[] = [];
  const kodNelkuliSorok: string[] = [];
  if (!szoveg?.trim()) return { tetelek, kodNelkuliSorok };

  const sorok = szoveg
    .split(/\r?\n|;|·|•/u)
    .map((s) => s.replace(/^\s*[-–—*]\s*/u, "").trim())
    .filter((s) => s.length > 0);

  for (const sor of sorok) {
    const kodok = kodErtekeketKinyer(sor);
    if (kodok.length === 0) {
      kodNelkuliSorok.push(sor);
      continue;
    }
    if (/\bVAGY\b/iu.test(sor) && kodok.length > 1) {
      tetelek.push({ kodok, nyers: sor });
    } else {
      for (const kod of kodok) tetelek.push({ kodok: [kod], nyers: sor });
    }
  }
  return { tetelek, kodNelkuliSorok };
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
        const indok = terkep.teljesiti(kod, mind);
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
