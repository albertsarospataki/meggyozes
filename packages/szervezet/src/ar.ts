/**
 * Kredit-árlista (brief v2.0 7.3).
 *
 * A kredit belső egység: minden futásnak FIX ára van, a csomag havi keretet ad.
 * A fix ár azért fontos, mert az indítás előtt látható árat ígérünk („Ez az audit
 * 10 kreditbe kerül, marad 274”) — ha az ár a futás közben derülne ki, az egész
 * modell hiteltelen. A valós LLM-költséget az admin-pult méri, és az árlista
 * negyedévente igazítható; ezért van itt egy helyen, konstansként.
 */

export type MuveletTipus =
  | "audit_url"
  | "audit_kep"
  | "audit_szoveg"
  | "audit_video"
  | "ketidopontos"
  | "reszleges_ujrafuttatas"
  | "osszehasonlitas"
  | "intent_validalas"
  | "intent_iteracio"
  | "kerdes_rovid"
  | "kerdes_mely"
  | "brand_mely_tanitas"
  | "brand_frissites"
  | "site_audit_oldal";

/** Alapárak. A pótdíjakat (további oldal, videó-perc) az `ar` függvény adja hozzá. */
export const ALAPARAK: Readonly<Record<MuveletTipus, number>> = {
  audit_url: 10,
  audit_kep: 6,
  audit_szoveg: 5,
  audit_video: 15,
  ketidopontos: 5,
  reszleges_ujrafuttatas: 2,
  osszehasonlitas: 4,
  intent_validalas: 8,
  intent_iteracio: 4,
  kerdes_rovid: 1,
  kerdes_mely: 2,
  brand_mely_tanitas: 20,
  brand_frissites: 5,
  site_audit_oldal: 6,
};

/** A kép-ajtó további oldalainak és a videó 5 perc feletti perceinek pótdíja. */
export const POTDIJAK = { kepTovabbiOldal: 2, videoPercFelett: 3, videoIngyenesPerc: 5 } as const;

export interface Muvelet {
  readonly tipus: MuveletTipus;
  /** Kép/PDF ajtónál az oldalak száma (1 = alapár). */
  readonly oldalak?: number;
  /** Videónál a hossz percben. */
  readonly percek?: number;
  /** Auditnál: kétidőpontos módban indul-e (a felár az alapárra jön). */
  readonly ketidopontos?: boolean;
}

export interface ArTetel {
  readonly megnevezes: string;
  readonly kredit: number;
}

export interface ArBontas {
  readonly osszesen: number;
  /** Tételes bontás — az indítás előtti előnézet és a kredit-történet ebből épül. */
  readonly tetelek: readonly ArTetel[];
}

/**
 * A művelet ára tételes bontással. Az `oldalak` és `percek` felfelé kerekítve
 * számítanak: a 6 perc 12 másodperces videó 7 percnyi feldolgozás.
 */
export function ar(muvelet: Muvelet): ArBontas {
  const tetelek: ArTetel[] = [{ megnevezes: MUVELET_NEVEK[muvelet.tipus], kredit: ALAPARAK[muvelet.tipus] }];

  if (muvelet.tipus === "audit_kep") {
    const tovabbi = Math.max(0, Math.ceil(muvelet.oldalak ?? 1) - 1);
    if (tovabbi > 0) {
      tetelek.push({
        megnevezes: `${tovabbi} további oldal`,
        kredit: tovabbi * POTDIJAK.kepTovabbiOldal,
      });
    }
  }

  if (muvelet.tipus === "audit_video") {
    const percek = Math.ceil(muvelet.percek ?? 0);
    const felette = Math.max(0, percek - POTDIJAK.videoIngyenesPerc);
    if (felette > 0) {
      tetelek.push({
        megnevezes: `${felette} perc az ${POTDIJAK.videoIngyenesPerc} perc felett`,
        kredit: felette * POTDIJAK.videoPercFelett,
      });
    }
  }

  if (muvelet.tipus === "site_audit_oldal") {
    const oldalak = Math.max(1, Math.ceil(muvelet.oldalak ?? 1));
    if (oldalak > 1) {
      tetelek.push({
        megnevezes: `${oldalak - 1} további oldal`,
        kredit: (oldalak - 1) * ALAPARAK.site_audit_oldal,
      });
    }
  }

  if (muvelet.ketidopontos === true && muvelet.tipus.startsWith("audit_")) {
    tetelek.push({ megnevezes: "kétidőpontos mód", kredit: ALAPARAK.ketidopontos });
  }

  return { osszesen: tetelek.reduce((s, t) => s + t.kredit, 0), tetelek };
}

export const MUVELET_NEVEK: Readonly<Record<MuveletTipus, string>> = {
  audit_url: "Audit — URL",
  audit_kep: "Audit — kép / PDF",
  audit_szoveg: "Audit — szöveg",
  audit_video: "Audit — videó",
  ketidopontos: "Kétidőpontos mód",
  reszleges_ujrafuttatas: "Részleges újrafuttatás",
  osszehasonlitas: "Előtte/utána összehasonlítás",
  intent_validalas: "Tanács — validáció",
  intent_iteracio: "Tanács — iteráció",
  kerdes_rovid: "Kérdezz — rövid válasz",
  kerdes_mely: "Kérdezz — mély válasz",
  brand_mely_tanitas: "Brand mély tanítás",
  brand_frissites: "Brand frissítés",
  site_audit_oldal: "Site-szintű audit",
};

/** Az indítás előtti mondat: „Ez az audit 10 kreditbe kerül, marad 274.” */
export function arElonezet(bontas: ArBontas, egyenleg: number): string {
  return `Ez a művelet ${bontas.osszesen} kreditbe kerül, marad ${egyenleg - bontas.osszesen}.`;
}
