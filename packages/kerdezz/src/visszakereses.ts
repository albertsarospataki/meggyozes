/**
 * Visszakeresés és szűrés a Kérdezz módhoz (brief v2.0 W4, J komponens).
 *
 * A Tanácsadó-oldal 3.1 tiltja a szabad LLM-chatet, ami megkerüli a DET-réteget és a
 * Szabálytárat. Ez a tilalom itt nem oldódik fel, hanem MEGFORDUL: a válasz nem attól
 * lesz legitim, hogy a modell okos, hanem attól, hogy csak megtalált, forrásolt
 * tételekből épülhet. Ezért a visszakeresés kimenete nem „kontextus a promptnak",
 * hanem a válasz megengedett szótára.
 *
 * Két kizárás abszolút:
 *  - karanténos forrás sosem idézhető (akkor sem, ha releváns);
 *  - a relevancia-küszöb alatti tétel nem hordoz bizonyítékot — küszöb alatti
 *    találatokból épített válasz a legveszélyesebb kimenet, mert magabiztosnak látszik.
 */

export type ForrasTipus = "kutatas" | "szabaly" | "technika" | "kombinacio" | "cikk" | "hasznalati-eset";

export interface ForrasTetel {
  /** KUT-118, S-330-1, TK-045, K-012, CIKK-339 — a válaszban ez a hivatkozás. */
  readonly azonosito: string;
  readonly tipus: ForrasTipus;
  readonly kulcsallitas: string;
  /** 1–5; ahol a tár nem tartja nyilván, undefined — és ez látszik a válaszban. */
  readonly bizonyitekero: number | undefined;
  readonly karantenos: boolean;
  /** A visszakereső relevancia-pontszáma, 0–1. */
  readonly relevancia: number;
  readonly agazat: string | undefined;
  readonly felulet: string | undefined;
  /** A tételben szereplő, IDÉZHETŐ számok. Ami nincs itt, az a válaszban sem lehet. */
  readonly szamok: readonly string[];
}

/**
 * A relevancia-küszöb. 0,55 tapasztalati érték: a Q&A-gold hangolja, és a kapu méri.
 * Nem konfigurálható futásidőben — a küszöb csökkentése a legolcsóbb módja annak,
 * hogy a rendszer magabiztosan hazudjon.
 */
export const RELEVANCIA_KUSZOB = 0.55;

/** Ennyi tételnél többet a válasz-összeállítás nem kap. */
export const TOP_K = 8;

export type KizarasOk = "karanten" | "relevancia-alatt" | "agazat-nem-egyezik";

export interface Kizart {
  readonly tetel: ForrasTetel;
  readonly ok: KizarasOk;
}

export interface Szuro {
  readonly agazat?: string;
  readonly felulet?: string;
  readonly kuszob?: number;
  readonly topK?: number;
}

export interface VisszakeresesEredmeny {
  readonly hasznalhato: readonly ForrasTetel[];
  readonly kizart: readonly Kizart[];
  /**
   * Igaz, ha nincs használható tétel: ilyenkor a válasz KÖTELEZŐEN a hiány-kimondás
   * ága, nem egy gyengébb válasz.
   */
  readonly hianyAg: boolean;
}

export function forrasokatSzur(tetelek: readonly ForrasTetel[], szuro: Szuro = {}): VisszakeresesEredmeny {
  const kuszob = szuro.kuszob ?? RELEVANCIA_KUSZOB;
  const kizart: Kizart[] = [];
  const hasznalhato: ForrasTetel[] = [];

  for (const tetel of tetelek) {
    if (tetel.karantenos) {
      kizart.push({ tetel, ok: "karanten" });
      continue;
    }
    if (tetel.relevancia < kuszob) {
      kizart.push({ tetel, ok: "relevancia-alatt" });
      continue;
    }
    // Az ágazati szűrő csak akkor zár ki, ha a tétel MÁS ágazatra van kötve.
    // Az ágazat-független tétel általános érvényű, nem hiányos.
    if (szuro.agazat !== undefined && tetel.agazat !== undefined && tetel.agazat !== szuro.agazat) {
      kizart.push({ tetel, ok: "agazat-nem-egyezik" });
      continue;
    }
    hasznalhato.push(tetel);
  }

  const rendezett = hasznalhato
    .sort((a, b) => b.relevancia - a.relevancia || (b.bizonyitekero ?? 0) - (a.bizonyitekero ?? 0))
    .slice(0, szuro.topK ?? TOP_K);

  return { hasznalhato: rendezett, kizart, hianyAg: rendezett.length === 0 };
}
