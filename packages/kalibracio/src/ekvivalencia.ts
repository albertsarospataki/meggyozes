import { kodotNormalizal } from "@meggyozes/core";

/**
 * A Kód-ekvivalencia térkép futásidejű alakja.
 *
 * Miért van rá szükség: a kalibrációs futások mérése szerint az LLM a jelenségeket
 * ~100% közeli recall-lal megtalálja, de gyakran a tárban lévő ROKON kóddal jelöli.
 * A térkép páronként rögzíti, mikor fogadható el eltérő kód találatként. A pontozó
 * ezt használja; a KÜLÖNBÖZŐ-elhatárolásokat a futtató és a DET-réteg használja.
 *
 * ALAPÉRTELMEZÉS: két kód KÜLÖNBÖZŐ. Csak az ebben a fájlban rögzített tételek
 * engednek helyettesítést — így egy hiányzó térkép-bejegyzés szigorúbb, nem lazább
 * pontozáshoz vezet.
 */

export interface EkvivalenciaTerkepAdat {
  readonly verzio: string;
  readonly forras: string;
  readonly ekvivalens: ReadonlyArray<{ tetel: number; parok: readonly string[]; korlat?: string }>;
  readonly tartalmazo: ReadonlyArray<{
    tetel: number;
    forras: string;
    cel: string;
    indoklas?: string;
  }>;
  readonly fedes: ReadonlyArray<{
    tetel: number;
    cel: string;
    egyuttesek: ReadonlyArray<readonly string[]>;
    indoklas?: string;
  }>;
  readonly kompozitKodok: { readonly kodok: readonly string[]; readonly szabaly: string };
  readonly governanceOrok: ReadonlyArray<{ azonosito: string; szabaly: string; dontes: string }>;
  readonly definiciosPontositasok: ReadonlyArray<{ tetel: string; kod: string; szabaly: string }>;
}

/** Miért fogadta el a pontozó a kiadott kódot — a riportban tételesen megjelenik. */
export type TeljesitesIndok =
  | { fajta: "pontos" }
  | { fajta: "ekvivalens"; tetel: number; kiadott: string }
  | { fajta: "tartalmazo"; tetel: number; kiadott: string }
  | { fajta: "fedes"; tetel: number; kiadottak: readonly string[] };

export class EkvivalenciaTerkep {
  readonly verzio: string;
  /** Uniózott ekvivalencia-osztályok: kód → osztályazonosító. */
  readonly #osztaly = new Map<string, number>();
  readonly #osztalyTetel = new Map<number, number>();
  /** cél → (forrás → tételszám) */
  readonly #tartalmazo = new Map<string, Map<string, number>>();
  /** cél → együttes fedések */
  readonly #fedes = new Map<string, Array<{ tetel: number; kodok: string[] }>>();
  readonly #kompozit: ReadonlySet<string>;

  private constructor(adat: EkvivalenciaTerkepAdat) {
    this.verzio = adat.verzio;
    this.#kompozit = new Set(adat.kompozitKodok.kodok.map(kodotNormalizal));

    let kovetkezoOsztaly = 0;
    for (const be of adat.ekvivalens) {
      const kodok = be.parok.map(kodotNormalizal);
      // Meglévő osztályba olvasztjuk, ha bármelyik tag már szerepel — így a
      // láncolt párokból (A↔B, B↔C) egyetlen osztály lesz.
      const meglevo = kodok.map((k) => this.#osztaly.get(k)).find((o) => o !== undefined);
      const osztaly = meglevo ?? kovetkezoOsztaly++;
      for (const k of kodok) this.#osztaly.set(k, osztaly);
      this.#osztalyTetel.set(osztaly, be.tetel);
    }

    for (const be of adat.tartalmazo) {
      const cel = kodotNormalizal(be.cel);
      const forras = kodotNormalizal(be.forras);
      const meglevo = this.#tartalmazo.get(cel) ?? new Map<string, number>();
      meglevo.set(forras, be.tetel);
      this.#tartalmazo.set(cel, meglevo);
    }

    for (const be of adat.fedes) {
      const cel = kodotNormalizal(be.cel);
      const lista = this.#fedes.get(cel) ?? [];
      for (const egyuttes of be.egyuttesek) {
        lista.push({ tetel: be.tetel, kodok: egyuttes.map(kodotNormalizal) });
      }
      this.#fedes.set(cel, lista);
    }
  }

  static betolt(adat: EkvivalenciaTerkepAdat): EkvivalenciaTerkep {
    return new EkvivalenciaTerkep(adat);
  }

  /** Pontozási szabály 4: a kompozit kódot csak maga a kompozit kód teljesíti. */
  kompozit(kod: string): boolean {
    return this.#kompozit.has(kodotNormalizal(kod));
  }

  /**
   * Teljesíti-e a kiadott kódkészlet az elvárt kódot?
   *
   * A sorrend szándékos: előbb a pontos egyezés (a leggyakoribb és legolcsóbb),
   * utána a térkép engedményei. Kompozit elvárásnál minden engedmény ki van zárva.
   */
  teljesiti(elvart: string, kiadottakNyers: ReadonlySet<string>): TeljesitesIndok | undefined {
    const cel = kodotNormalizal(elvart);
    // A kiadott halmazt is normalizáljuk: a hívó nem mindig teszi meg, és egy
    // el nem párnázott kód («j-215») némán FAIL-t okozna — a legrosszabb hibafajta.
    const kiadottak = new Set([...kiadottakNyers].map(kodotNormalizal));
    if (kiadottak.has(cel)) return { fajta: "pontos" };

    // Pontozási szabály 4: kompozit tételt elemi kód nem teljesít.
    if (this.kompozit(cel)) return undefined;

    const osztaly = this.#osztaly.get(cel);
    if (osztaly !== undefined) {
      for (const kiadott of kiadottak) {
        if (kiadott !== cel && this.#osztaly.get(kiadott) === osztaly) {
          return {
            fajta: "ekvivalens",
            tetel: this.#osztalyTetel.get(osztaly) ?? 0,
            kiadott,
          };
        }
      }
    }

    const forrasok = this.#tartalmazo.get(cel);
    if (forrasok) {
      for (const [forras, tetel] of forrasok) {
        if (kiadottak.has(forras)) return { fajta: "tartalmazo", tetel, kiadott: forras };
      }
    }

    for (const f of this.#fedes.get(cel) ?? []) {
      if (f.kodok.every((k) => kiadottak.has(k))) {
        return { fajta: "fedes", tetel: f.tetel, kiadottak: f.kodok };
      }
    }

    return undefined;
  }
}
