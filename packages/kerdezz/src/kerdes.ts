/**
 * Kérdés-osztályozás (brief v2.0 W4, Q0 lépés).
 *
 * Az osztály nem statisztika, hanem irányítás: más forrástípust kell előhívni egy
 * fogalmi kérdésre („mi az a zero-click”), mint egy döntési kérdésre („százalék vagy
 * ajándék”), és a válasz-kártya alternatíva-blokkja is máshogy néz ki. Ha nem
 * ismerjük fel, nem találgatunk: az „egyéb" osztály a legáltalánosabb előhívást kapja,
 * és a válasz ezt nem titkolja el.
 */

export type KerdesOsztaly = "fogalom" | "mukodik-e" | "x-vagy-y" | "mit-csinaljak" | "brand-specifikus" | "egyeb";

export interface KerdesKontextus {
  readonly brandAzonosito?: string;
  readonly projektAzonosito?: string;
  readonly riportAzonosito?: string;
}

export interface Osztalyozas {
  readonly osztaly: KerdesOsztaly;
  readonly indoklas: string;
  /** Mely forrástípusokat érdemes előhívni ehhez az osztályhoz. */
  readonly forrasSuly: readonly string[];
}

const FOGALOM = [/^mi az a\b/i, /^mit jelent\b/i, /^mi a különbség\b/i, /^hogyan (?:működik|hat)\b/i];
const MUKODIK = [/\bműködik-e\b/i, /\bműködik\b.*\?/i, /\bhasznál-e\b/i, /\bérdemes-e\b/i, /\bhat-e\b/i];
const VAGY = [/\bvagy\b.*\?/i, /\bmelyik\b/i, /\binkább\b/i];
const MIT_CSINALJAK = [/^mit (?:csináljak|tegyek|változtassunk|javítsunk)\b/i, /^hogyan (?:javítsuk|növeljük)\b/i, /^mit érdemes\b/i];

const illeszkedik = (mintak: readonly RegExp[], kerdes: string): boolean => mintak.some((m) => m.test(kerdes));

export function kerdestOsztalyoz(kerdes: string, kontextus: KerdesKontextus = {}): Osztalyozas {
  const tisztitott = kerdes.trim();

  // A brand-specifikus felismerés a kontextuson múlik, nem a szövegen: ha a kérdés egy
  // konkrét riportra vagy a saját anyagra vonatkozik, a válasznak a brand-profillal kell
  // dolgoznia, különben általános tanácsot adna a saját adata helyett.
  const sajatra = /\b(?:nálunk|a mi\b|az oldalunkon|a riportban|ez az oldal)\b/i.test(tisztitott);
  if (sajatra && (kontextus.brandAzonosito !== undefined || kontextus.riportAzonosito !== undefined)) {
    return {
      osztaly: "brand-specifikus",
      indoklas: "A kérdés a saját anyagra vonatkozik, és van brand- vagy riport-kontextus.",
      forrasSuly: ["szabaly", "kutatas", "technika"],
    };
  }

  if (illeszkedik(MIT_CSINALJAK, tisztitott)) {
    return { osztaly: "mit-csinaljak", indoklas: "Cselekvést kérő kérdés.", forrasSuly: ["szabaly", "technika", "kutatas"] };
  }
  if (illeszkedik(FOGALOM, tisztitott)) {
    return { osztaly: "fogalom", indoklas: "Fogalmi kérdés.", forrasSuly: ["technika", "cikk", "kutatas"] };
  }
  if (illeszkedik(VAGY, tisztitott)) {
    return { osztaly: "x-vagy-y", indoklas: "Két lehetőség közti döntés.", forrasSuly: ["kutatas", "kombinacio", "technika"] };
  }
  if (illeszkedik(MUKODIK, tisztitott)) {
    return { osztaly: "mukodik-e", indoklas: "Hatásosságra kérdez.", forrasSuly: ["kutatas", "technika"] };
  }

  return {
    osztaly: "egyeb",
    indoklas: "A kérdés típusa nem ismerhető fel biztosan; általános előhívás fut.",
    forrasSuly: ["kutatas", "szabaly", "technika", "cikk"],
  };
}
