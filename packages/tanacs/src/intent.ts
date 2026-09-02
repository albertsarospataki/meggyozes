/**
 * Intent — a verziózott szándék-objektum (brief v2.0 W3, adatmodell 4.1).
 *
 * Kilenc mező, és a verziózás nem kényelmi funkció: a „mi van, ha ajándék lenne, nem
 * százalék?” kérdésre nem új riport a válasz, hanem a KÜLÖNBSÉG. Ezért az Intent
 * megváltoztatása mindig új verziót szül, a régi pedig megmarad — összehasonlítható
 * marad, és a kredit is ehhez kötődik (validáció 8, iteráció 4).
 */

import type { KonstrukcioTipus } from "./konstrukcio";

export const INTENT_MEZOK = [
  "konstrukcioTipus",
  "cel",
  "kozonseg",
  "mechanika",
  "igeret",
  "csatornak",
  "idotartam",
  "korlatok",
  "meres",
] as const;

export type IntentMezo = (typeof INTENT_MEZOK)[number];

export interface Intent {
  readonly azonosito: string;
  readonly projektAzonosito: string;
  readonly verzio: number;
  readonly letrejott: string;
  /** Melyik verzióból származik — az iteráció-lánc ezen jár vissza. */
  readonly elozoVerzio: number | undefined;
  readonly konstrukcioTipus: KonstrukcioTipus | undefined;
  readonly cel: string | undefined;
  readonly kozonseg: string | undefined;
  readonly mechanika: string | undefined;
  readonly igeret: string | undefined;
  readonly csatornak: readonly string[];
  readonly idotartam: string | undefined;
  readonly korlatok: readonly string[];
  /** Mit mérünk, mihez képest — enélkül a „mit mérj” utasítás üres ígéret. */
  readonly meres: string | undefined;
}

/** A validációhoz kötelező mezők. A többi pontosít, de nem kapu. */
export const KOTELEZO_MEZOK: readonly IntentMezo[] = ["konstrukcioTipus", "cel", "kozonseg", "mechanika", "igeret"];

export function uresIntent(azonosito: string, projektAzonosito: string, letrejott: string): Intent {
  return {
    azonosito,
    projektAzonosito,
    verzio: 1,
    letrejott,
    elozoVerzio: undefined,
    konstrukcioTipus: undefined,
    cel: undefined,
    kozonseg: undefined,
    mechanika: undefined,
    igeret: undefined,
    csatornak: [],
    idotartam: undefined,
    korlatok: [],
    meres: undefined,
  };
}

function kitoltott(intent: Intent, mezo: IntentMezo): boolean {
  const ertek = intent[mezo];
  if (ertek === undefined) return false;
  if (Array.isArray(ertek)) return ertek.length > 0;
  return String(ertek).trim() !== "";
}

export interface IntentAllapot {
  readonly kitoltottMezok: readonly IntentMezo[];
  readonly hianyzoMezok: readonly IntentMezo[];
  readonly hianyzoKotelezoMezok: readonly IntentMezo[];
  /** 0–1; az Intent-panel kitöltöttség-jelzője. */
  readonly kitoltottseg: number;
  readonly validalhato: boolean;
}

export function intentAllapot(intent: Intent): IntentAllapot {
  const kitoltottMezok = INTENT_MEZOK.filter((m) => kitoltott(intent, m));
  const hianyzoMezok = INTENT_MEZOK.filter((m) => !kitoltott(intent, m));
  const hianyzoKotelezoMezok = KOTELEZO_MEZOK.filter((m) => !kitoltott(intent, m));
  return {
    kitoltottMezok,
    hianyzoMezok,
    hianyzoKotelezoMezok,
    kitoltottseg: kitoltottMezok.length / INTENT_MEZOK.length,
    validalhato: hianyzoKotelezoMezok.length === 0,
  };
}

export type IntentValtozas = Partial<Omit<Intent, "azonosito" | "projektAzonosito" | "verzio" | "letrejott" | "elozoVerzio">>;

/**
 * Új Intent-verzió. Az előző verzió NEM módosul: a beszélgetés során felvett adat és
 * a „mi van, ha” iteráció ugyanazon a láncon marad, és a különbség bármikor kimutatható.
 */
export function ujVerzio(elozo: Intent, valtozas: IntentValtozas, mikor: string): Intent {
  return { ...elozo, ...valtozas, verzio: elozo.verzio + 1, elozoVerzio: elozo.verzio, letrejott: mikor };
}

export interface MezoKulonbseg {
  readonly mezo: IntentMezo;
  readonly elotte: string;
  readonly utana: string;
}

const megjelenit = (ertek: unknown): string => {
  if (ertek === undefined) return "—";
  if (Array.isArray(ertek)) return ertek.length === 0 ? "—" : ertek.join(", ");
  return String(ertek);
};

export interface IntentKulonbseg {
  readonly elozoVerzio: number;
  readonly ujVerzio: number;
  readonly valtozasok: readonly MezoKulonbseg[];
  /** A 30 másodperces különbség-összefoglaló mondata (W3 iteráció). */
  readonly osszefoglalo: string;
}

export function intentKulonbseg(elozo: Intent, uj: Intent): IntentKulonbseg {
  const valtozasok = INTENT_MEZOK.map((mezo) => ({
    mezo,
    elotte: megjelenit(elozo[mezo]),
    utana: megjelenit(uj[mezo]),
  })).filter((v) => v.elotte !== v.utana);

  return {
    elozoVerzio: elozo.verzio,
    ujVerzio: uj.verzio,
    valtozasok,
    osszefoglalo:
      valtozasok.length === 0
        ? `A v${uj.verzio} nem tér el a v${elozo.verzio}-tól.`
        : `A v${elozo.verzio} → v${uj.verzio} között ${valtozasok.length} mező változott: ` +
          `${valtozasok.map((v) => `${MEZO_NEVEK[v.mezo]} (${v.elotte} → ${v.utana})`).join("; ")}.`,
  };
}

export const MEZO_NEVEK: Readonly<Record<IntentMezo, string>> = {
  konstrukcioTipus: "konstrukció-típus",
  cel: "cél",
  kozonseg: "közönség",
  mechanika: "mechanika",
  igeret: "ígéret",
  csatornak: "csatornák",
  idotartam: "időtartam",
  korlatok: "korlátok",
  meres: "mérés",
};
