/**
 * Artefaktum-objektum — az A és L komponens kimenete, a P1 lépés bemenete.
 *
 * Ez a réteg szerződése a motorral: bármelyik ajtón jön be az anyag (URL, szöveg,
 * kép, videó), ugyanez az alak kerül tovább. A motor soha nem tud arról, hogy volt-e
 * böngésző — így a detektorok tesztelhetők böngésző nélkül, és egy új ajtó nem
 * kényszerít változást a szabályokban.
 *
 * A mezők egy része szándékosan „amit nem tudunk" alakú: a katalógus H.1 elve szerint
 * a rendszer a korlátait a riport ELEJÉN mondja ki, tehát a korlátot adatként kell
 * hordoznia, nem lábjegyzetként.
 */

export type Ajto = "url" | "kep" | "szoveg" | "video";

export type BlokkSzerep =
  | "cim"
  | "alcim"
  | "bekezdes"
  | "gomb"
  | "link"
  | "ar"
  | "urlap"
  | "banner"
  | "lablec"
  | "lista"
  | "idezet"
  | "egyeb";

export interface Blokk {
  readonly azonosito: string;
  readonly szerep: BlokkSzerep;
  readonly szoveg: string;
  /** DOM-útvonal vagy oldal/időbélyeg — a megállapítás „hol" mezője. */
  readonly hely: string;
  /** Igaz, ha az elem a site-chrome-hoz tartozik (sáv, banner, menü, lábléc). */
  readonly siteChrome: boolean;
}

export interface ArtefaktumObjektum {
  readonly ajto: Ajto;
  readonly forras: string;
  readonly cim: string | undefined;
  /** A teljes látható szöveg, normalizálva. */
  readonly szoveg: string;
  readonly blokkok: readonly Blokk[];
  readonly gombok: readonly string[];
  readonly linkek: readonly { readonly szoveg: string; readonly cel: string }[];
  readonly arak: readonly string[];
  readonly urlapMezok: readonly string[];
  readonly consentBanner: string | undefined;
  /** Fájlútvonal a teljes oldal képéhez, ha készült. */
  readonly kepernyokep: string | undefined;
  readonly rogzitve: string;
  /**
   * Amit ezen az ajtón a rendszer nem lát. A riport ezt szó szerint kiírja az elejére.
   */
  readonly korlatok: readonly string[];
}

const SZOKOZ = /[\t\f\r ]+/g;

export function szovegetNormalizal(nyers: string): string {
  return nyers
    .replace(/ /g, " ")
    .split("\n")
    .map((sor) => sor.replace(SZOKOZ, " ").trim())
    .filter((sor) => sor !== "")
    .join("\n");
}
