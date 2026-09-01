/**
 * Heti kurátori csomag (brief v2.0 W9 harmadik szint).
 *
 * A csomag nem lista, hanem MUNKARENDBE tett döntéssor: Albert (vagy a kurátor) heti
 * egy ülésben végigmegy rajta, és típusonként dönt. Ezért három dolgot kell tudnia:
 *  - összevonni az ismétlődő jelölteket (ugyanaz a téves megállapítás húsz ügyfélnél
 *    egy döntés, nem húsz);
 *  - gyakoriság szerint rendezni (ami sokszor jön elő, az sokat is ér);
 *  - a Notionba átvezetést ELŐKÉSZÍTENI, nem elvégezni — a runtime nem ír a Notionba.
 */

import type { JeloltTipus, TanulasiJelolt } from "./jelolt.js";
import { heldOutSzures } from "./jelolt.js";

export interface OsszevontJelolt {
  readonly tipus: JeloltTipus;
  readonly anonimIdezet: string;
  readonly kodok: readonly string[];
  /** Hány külön futásból jött ugyanez. A kurátor rangsora ezen áll. */
  readonly eloforduasok: number;
  readonly jeloltAzonositok: readonly string[];
  readonly indoklasok: readonly string[];
  /**
   * A Notionba előkészített sor szövege. A rendszer LINKET és előkészített sort ad,
   * az átvezetést emberi kéz végzi (Constitution: a runtime nem ír vissza).
   */
  readonly notionSor: string;
}

export interface KuratoriCsomag {
  readonly hetKezdet: string;
  readonly tipusok: readonly { readonly tipus: JeloltTipus; readonly jeloltek: readonly OsszevontJelolt[] }[];
  readonly osszesen: number;
  /** Held-out fegyelem miatt kizárt jelöltek — láthatóan, nem csendben. */
  readonly heldOutMiattKizart: number;
}

const TIPUS_SORREND: readonly JeloltTipus[] = [
  "uj-gold-teszt",
  "terkep-tetel",
  "szabaly-jelolt",
  "brand-mintazat",
  "kutatastar-frissites",
  "erthetoseg-jelolt",
];

const kulcs = (j: TanulasiJelolt): string =>
  `${j.tipus}::${j.anonimIdezet.replace(/\s+/g, " ").trim().toLowerCase()}::${[...j.kodok].sort().join(",")}`;

export function kuratoriCsomag(jeloltek: readonly TanulasiJelolt[], hetKezdet: string): KuratoriCsomag {
  const { engedelyezett, tiltott } = heldOutSzures(jeloltek.filter((j) => j.statusz === "uj"));

  const csoportok = new Map<string, TanulasiJelolt[]>();
  for (const jelolt of engedelyezett) {
    const k = kulcs(jelolt);
    const meglevo = csoportok.get(k);
    if (meglevo === undefined) csoportok.set(k, [jelolt]);
    else meglevo.push(jelolt);
  }

  const osszevontak: OsszevontJelolt[] = [...csoportok.values()].map((csoport) => {
    const elso = csoport[0];
    if (elso === undefined) throw new Error("Üres csoport nem keletkezhet.");
    // Az előfordulás külön FUTÁSOKAT számol: ugyanabban a riportban két visszajelzés
    // nem tesz egy jelöltet kétszer olyan fontossá.
    const futasok = new Set(csoport.map((j) => j.forrasFutas));
    return {
      tipus: elso.tipus,
      anonimIdezet: elso.anonimIdezet,
      kodok: elso.kodok,
      eloforduasok: futasok.size,
      jeloltAzonositok: csoport.map((j) => j.azonosito),
      indoklasok: [...new Set(csoport.map((j) => j.indoklas))],
      notionSor: `${elso.tipus} | ${elso.kodok.join(" ")} | „${elso.anonimIdezet}” | ${futasok.size} futás | fokozat: ${elso.bizonyitekSzint}`,
    };
  });

  const tipusok = TIPUS_SORREND.map((tipus) => ({
    tipus,
    jeloltek: osszevontak
      .filter((o) => o.tipus === tipus)
      .sort((a, b) => b.eloforduasok - a.eloforduasok || a.anonimIdezet.localeCompare(b.anonimIdezet)),
  })).filter((cs) => cs.jeloltek.length > 0);

  return {
    hetKezdet,
    tipusok,
    osszesen: osszevontak.length,
    heldOutMiattKizart: tiltott.length,
  };
}

export type KuratorDontes = "elfogad" | "elutasit" | "notionba-kuld";

export interface DontesEredmeny {
  readonly jelolt: TanulasiJelolt;
  readonly ujStatusz: TanulasiJelolt["statusz"];
  /** Notionba küldésnél az előkészített sor; egyébként undefined. */
  readonly notionSor: string | undefined;
}

/**
 * Kurátori döntés egy jelöltre. A „notionba-kuld" nem ír semmit: előkészített sort ad,
 * amit ember visz át. Ez a különbség az öntanuló és az önmódosító rendszer között.
 */
export function kuratorDont(
  jelolt: TanulasiJelolt,
  dontes: KuratorDontes,
  notionSor?: string,
): DontesEredmeny {
  if (dontes === "elutasit") return { jelolt, ujStatusz: "elutasitva", notionSor: undefined };
  if (dontes === "elfogad") return { jelolt, ujStatusz: "elfogadva", notionSor: undefined };
  return {
    jelolt,
    ujStatusz: "notionba-kuldve",
    notionSor: notionSor ?? `${jelolt.tipus} | ${jelolt.kodok.join(" ")} | „${jelolt.anonimIdezet}”`,
  };
}
