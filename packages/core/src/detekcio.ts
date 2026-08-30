/**
 * A detekció és a megállapítás típusai — az elemző mag (B) és a pontozó (E) közös nyelve.
 */

/**
 * Bizonyíték-szint. A Constitution 5. alapelve: kétidőpontos/kattintás-függő jelet
 * pillanatképből NEM állítunk tényként. A gyanú és a N.E. a riportban külön vizuális
 * jelölést kap, és SOHA nem számít bizonyított problémának (DET-réteg 6. szabálycsoport).
 */
export type BizonyitekSzint = "teny" | "gyanu" | "nem-eldontheto";

/**
 * A detekció minősítése. A „pozitív" pólus külön érték, mert a kalibráció szerint
 * ez a leggyengébb LLM-izom: a legitim technikahasználat POZITÍV visszaigazolást kap,
 * nem kifogást.
 */
export type Minosites = "pozitiv" | "problema" | "semleges";

export interface Detekcio {
  /** Jel- vagy technikakód, normalizált alakban. */
  readonly kod: string;
  /** Szó szerinti idézet az artefaktumból. Nélküle a találat nem adható ki. */
  readonly idezet: string;
  readonly minosites: Minosites;
  readonly bizonyitekSzint: BizonyitekSzint;
  /** Igaz, ha az elem a site-chrome-hoz tartozik (sáv, banner, menü) — soha nem a törzs hibája. */
  readonly siteChrome?: boolean;
  readonly indoklas?: string;
}

/** Egy futtatás nyers, még nem összevont kimenete. */
export interface FuttatasEredmeny {
  readonly tesztAzonosito: string;
  readonly detekciok: readonly Detekcio[];
  /**
   * A futtató teljes szöveges kimenete. A pontozás 1. szabálya szerint a kódemlítés
   * BÁRHOL találat, ezért a pontozó ezt is átvizsgálja, nem csak a strukturált listát.
   */
  readonly nyersKimenet: string;
}
