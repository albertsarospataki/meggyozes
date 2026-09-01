/**
 * Brand-profil — az I komponens adatalakja (brief v2.0 4.2).
 *
 * Miért külön entitás: az előfizető SZERVEZET nem azonos a márkával. Egy ügynökség
 * több márkát visz, egy cégnek több sub-brandje van, és a meggyőzés-technikai
 * ítélet márkánként más (más ígéret, más tiltólista, más igazolható állítás).
 * A v1.0 adatmodellje Szervezet → Auditok volt; a brand-réteg ezért új.
 *
 * Két elv köti meg a szerkezetet:
 *  - a profil az ÜGYFÉL adata, a tudásbázisba soha nem kerül (W1 kapu);
 *  - egyetlen mezőt sem tölthet generált tartalom emberi jóváhagyás nélkül,
 *    ezért minden blokk mezői opcionálisak, és a hiány LÁTHATÓ (készültség).
 */

import type { UzletiModell } from "@meggyozes/core";

/** Ágazati modul — a P7 szűrő és a jogi keret kapcsolója. */
export type AgazatiModul = "penzugy" | "egeszseg-kozmetikum" | "gyerek";

export type Megszolitas = "tegezes" | "magazas";

export interface Szegmens {
  readonly megnevezes: string;
  /** Hol tart a döntésben: probléma-tudatlan … vásárlásra kész. */
  readonly dontesiSzakasz: string | undefined;
  readonly tolcserPozicio: string | undefined;
  readonly foKifogas: string | undefined;
}

/**
 * Egy állítás, amit a cég IGAZOLNI tud. A szuperlatívusz-őr és a szám-őr ezen áll:
 * ami nincs a bizonyíték-tárban, az a kimenetben helyőrző lesz, nem állítás.
 */
export interface ProofPoint {
  readonly azonosito: string;
  readonly allitas: string;
  readonly forras: string;
  /** ISO dátum, ameddig érvényes; lejárt proof point nem igazol. */
  readonly ervenyesseg: string | undefined;
  readonly igazolta: string | undefined;
  /** A számadat, ha az állítás számot hordoz — a szám-őr csak ezeket engedi ki. */
  readonly szamertek: string | undefined;
}

export interface Alapadatok {
  readonly nev: string;
  readonly agazat: string | undefined;
  readonly agazatiModulok: readonly AgazatiModul[];
  readonly uzletiModell: UzletiModell | undefined;
  readonly piacEsNyelv: string | undefined;
  readonly joghatosag: string | undefined;
  readonly domainek: readonly string[];
}

export interface Pozicionalas {
  readonly foIgeret: string | undefined;
  readonly ertekek: readonly string[];
  readonly differencialas: string | undefined;
  /** „Amit sosem mondunk” — a tiltólista elvi párja, szabad szöveggel. */
  readonly amitSosemMondunk: readonly string[];
}

export interface Hangnem {
  readonly megszolitas: Megszolitas | undefined;
  readonly kotelezoKifejezesek: readonly string[];
  readonly tiltottKifejezesek: readonly string[];
  readonly peldamondatok: readonly string[];
  readonly cimkek: readonly string[];
}

export interface VizualisJegyek {
  readonly szinek: readonly string[];
  readonly tipografia: string | undefined;
  readonly logoSzabalyok: string | undefined;
  readonly kepiStilus: string | undefined;
}

export interface Ajanlat {
  readonly megnevezes: string;
  readonly ar: string | undefined;
  readonly viszonyitasiAr: string | undefined;
  readonly garancia: string | undefined;
}

export interface JogiKeret {
  readonly kotelezettsegek: readonly string[];
  readonly kotelezoJelolesek: readonly string[];
  /** Tételek, amiket a rendszer soha nem minősít — jogász jóváhagyása kell. */
  readonly jogaszJovahagyasaKell: readonly string[];
}

export interface Versenytars {
  readonly nev: string;
  readonly url: string | undefined;
}

export interface MeresiAdatok {
  readonly elerhetoForrasok: readonly string[];
  readonly kpik: readonly string[];
}

/**
 * Tanult mintázat: a saját riportokból jóváhagyott tipikus erősség vagy lyuk.
 * Jóváhagyás nélkül csak JELÖLT — a profilban csak elfogadott mintázat él
 * (12. nyitott döntés: „mehet, jóváhagyással”).
 */
export interface TanultMintazat {
  readonly azonosito: string;
  readonly leiras: string;
  readonly tipus: "erosseg" | "lyuk";
  /** Hány riport támasztja alá; a rendszer 3-nál javasolja a profilba emelést. */
  readonly eloforduasok: number;
  readonly jovahagyta: string;
  readonly jovahagyva: string;
}

export interface BrandProfil {
  readonly azonosito: string;
  readonly szervezetAzonosito: string;
  readonly verzio: number;
  readonly alapadatok: Alapadatok;
  readonly pozicionalas: Pozicionalas;
  readonly szegmensek: readonly Szegmens[];
  readonly hangnem: Hangnem;
  readonly vizualisJegyek: VizualisJegyek;
  readonly ajanlatok: readonly Ajanlat[];
  readonly bizonyitekTar: readonly ProofPoint[];
  readonly jogiKeret: JogiKeret;
  readonly versenytarsak: readonly Versenytars[];
  readonly meres: MeresiAdatok;
  readonly tanultMintazatok: readonly TanultMintazat[];
}

/** Üres profil — a kérdőív (1D csomag) ebből indul, nem kitalált alapértelmezésekből. */
export function uresProfil(azonosito: string, szervezetAzonosito: string, nev: string): BrandProfil {
  return {
    azonosito,
    szervezetAzonosito,
    verzio: 1,
    alapadatok: {
      nev,
      agazat: undefined,
      agazatiModulok: [],
      uzletiModell: undefined,
      piacEsNyelv: undefined,
      joghatosag: undefined,
      domainek: [],
    },
    pozicionalas: {
      foIgeret: undefined,
      ertekek: [],
      differencialas: undefined,
      amitSosemMondunk: [],
    },
    szegmensek: [],
    hangnem: {
      megszolitas: undefined,
      kotelezoKifejezesek: [],
      tiltottKifejezesek: [],
      peldamondatok: [],
      cimkek: [],
    },
    vizualisJegyek: {
      szinek: [],
      tipografia: undefined,
      logoSzabalyok: undefined,
      kepiStilus: undefined,
    },
    ajanlatok: [],
    bizonyitekTar: [],
    jogiKeret: { kotelezettsegek: [], kotelezoJelolesek: [], jogaszJovahagyasaKell: [] },
    versenytarsak: [],
    meres: { elerhetoForrasok: [], kpik: [] },
    tanultMintazatok: [],
  };
}

/**
 * Érvényes-e a proof point a hivatkozás időpontjában. Lejárt bizonyíték nem igazol
 * — különben a „tavaly mért 32%” idén tényként menne ki.
 */
export function ervenyesProofPoint(p: ProofPoint, mikor: Date): boolean {
  if (p.ervenyesseg === undefined) return true;
  const hatarido = Date.parse(p.ervenyesseg);
  return Number.isNaN(hatarido) ? false : hatarido >= mikor.getTime();
}
