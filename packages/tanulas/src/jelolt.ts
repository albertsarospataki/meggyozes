/**
 * Visszajelzés és tanulási jelöltek (brief v2.0 W9, K komponens).
 *
 * A Constitution szerint a Notion a szerkesztőségi igazság, és a runtime SOHA nem ír
 * vissza. Ebből következik, hogy az „önjavítás" itt nem önmódosító modell, hanem:
 * jelöltek termelése → emberi jóváhagyás → CI. Ez a modul a jelöltek termelése, és
 * semmi több — a döntést nem ő hozza meg, csak előkészíti.
 */

import type { BizonyitekSzint } from "@meggyozes/core";
import { anonimizal, anonimizalhato } from "./anonimizalas.js";

export type VisszajelzesTipus = "helyes" | "nem-helyes" | "nem-ertem" | "megvalositottuk";

export interface Visszajelzes {
  readonly azonosito: string;
  readonly megallapitasAzonosito: string;
  readonly riportAzonosito: string;
  readonly tipus: VisszajelzesTipus;
  readonly szoveg: string | undefined;
  readonly ki: string;
  readonly mikor: string;
}

export type JeloltTipus =
  | "uj-gold-teszt"
  | "terkep-tetel"
  | "szabaly-jelolt"
  | "brand-mintazat"
  | "kutatastar-frissites"
  | "erthetoseg-jelolt";

export type JeloltStatusz = "uj" | "elfogadva" | "elutasitva" | "notionba-kuldve";

export interface TanulasiJelolt {
  readonly azonosito: string;
  readonly tipus: JeloltTipus;
  /** Anonimizált idézet — ügyfél-adat nélkül. */
  readonly anonimIdezet: string;
  readonly kodok: readonly string[];
  readonly bizonyitekSzint: BizonyitekSzint;
  readonly indoklas: string;
  readonly keletkezett: string;
  readonly statusz: JeloltStatusz;
  /** A futás azonosítója; a szervezet és a brand SOHA nem kerül ide. */
  readonly forrasFutas: string;
  /** Igaz, ha a forrás egy held-out gold-teszt futása. */
  readonly heldOutForras: boolean;
}

export interface MegallapitasHivatkozas {
  readonly azonosito: string;
  readonly szabalyKod: string;
  readonly jelKodok: readonly string[];
  readonly idezet: string;
  readonly bizonyitekSzint: BizonyitekSzint;
}

export interface JeloltKepzesBemenet {
  readonly visszajelzes: Visszajelzes;
  readonly megallapitas: MegallapitasHivatkozas;
  readonly futasAzonosito: string;
  /** A szervezet által megadott saját nevek — az anonimizálás ezekre is kiterjed. */
  readonly sajatNevek?: readonly string[];
  /** Az ügyfél a beállításokban letilthatja a részvételt (10. adatvédelem). */
  readonly tanulasiReszvetel: boolean;
  readonly heldOutForras?: boolean;
  readonly azonositoGyar?: () => string;
}

let sorszam = 0;
const alapAzonosito = (): string => `JEL-${(sorszam += 1).toString().padStart(5, "0")}`;

/**
 * Egy visszajelzésből jelölt.
 *
 * A 👍 nem termel jelöltet: a megerősítés nem tanulnivaló, és a kurátori sort
 * elárasztaná. A 👎 gold-teszt jelölt (a rendszer tévedett — ez a legértékesebb
 * teszt), a 🤔 érthetőségi jelölt (a megállapítás igaz lehet, csak olvashatatlan),
 * a ✅ pedig a megvalósítás-követésbe megy, nem ide.
 */
export function jeloltetKepez(b: JeloltKepzesBemenet): TanulasiJelolt | undefined {
  if (!b.tanulasiReszvetel) return undefined;
  if (b.visszajelzes.tipus === "helyes" || b.visszajelzes.tipus === "megvalositottuk") return undefined;

  const sajatNevek = b.sajatNevek ?? [];
  const nyers = b.megallapitas.idezet;
  if (!anonimizalhato(nyers, sajatNevek)) return undefined;

  const tipus: JeloltTipus = b.visszajelzes.tipus === "nem-helyes" ? "uj-gold-teszt" : "erthetoseg-jelolt";
  const gyar = b.azonositoGyar ?? alapAzonosito;

  return {
    azonosito: gyar(),
    tipus,
    anonimIdezet: anonimizal(nyers, sajatNevek).szoveg,
    kodok: [b.megallapitas.szabalyKod, ...b.megallapitas.jelKodok],
    bizonyitekSzint: b.megallapitas.bizonyitekSzint,
    indoklas:
      b.visszajelzes.tipus === "nem-helyes"
        ? `Az ügyfél szerint a megállapítás téves${b.visszajelzes.szoveg === undefined ? "" : `: ${b.visszajelzes.szoveg}`}`
        : `Az ügyfél nem értette a megállapítást${b.visszajelzes.szoveg === undefined ? "" : `: ${b.visszajelzes.szoveg}`}`,
    keletkezett: b.visszajelzes.mikor,
    statusz: "uj",
    forrasFutas: b.futasAzonosito,
    heldOutForras: b.heldOutForras ?? false,
  };
}

export type HeldOutDontes = "engedelyezett" | "tiltott";

export interface HeldOutVizsgalat {
  readonly dontes: HeldOutDontes;
  readonly indoklas: string;
}

/**
 * Held-out fegyelem: a held-out készletből SOHA nem lesz térkép-tétel vagy
 * szabály-jelölt. Ha az lehetne, a held-out készlet megszűnne vak mérce lenni — a
 * rendszer a saját vizsgájára tanulna, és a kapu attól kezdve önmagát dicsérné.
 *
 * Gold-teszt jelölt held-outból sem születik: az is a készlet szivárgása lenne.
 */
export function heldOutVizsgalat(jelolt: TanulasiJelolt): HeldOutVizsgalat {
  if (!jelolt.heldOutForras) {
    return { dontes: "engedelyezett", indoklas: "A forrás nem held-out futás." };
  }
  return {
    dontes: "tiltott",
    indoklas:
      "A jelölt held-out futásból származik. Held-out tesztből nem lesz szabály, térkép-tétel vagy új gold-teszt — különben a mérce a saját tanulóanyagává válna.",
  };
}

/** A kurátor elé csak az engedélyezett jelöltek kerülnek. */
export function heldOutSzures(jeloltek: readonly TanulasiJelolt[]): {
  readonly engedelyezett: readonly TanulasiJelolt[];
  readonly tiltott: readonly TanulasiJelolt[];
} {
  const engedelyezett: TanulasiJelolt[] = [];
  const tiltott: TanulasiJelolt[] = [];
  for (const jelolt of jeloltek) {
    if (heldOutVizsgalat(jelolt).dontes === "engedelyezett") engedelyezett.push(jelolt);
    else tiltott.push(jelolt);
  }
  return { engedelyezett, tiltott };
}
