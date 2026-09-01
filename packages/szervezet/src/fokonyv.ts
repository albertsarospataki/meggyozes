/**
 * Kredit-főkönyv (brief v2.0 7.4).
 *
 * Miért tételes (lot-alapú) főkönyv, és nem egy egyenleg-mező: a kreditnek KÉT
 * eltérő viselkedésű fajtája van. A havi keret a ciklus végén elvész, a kiegészítő
 * csomag 12 hónapig él — egyetlen szám ezt nem tudja képviselni, és a fogyasztási
 * sorrendet („először a havi keret, aztán a kiegészítő”) sem lehet visszamenőleg
 * igazolni. A tételes főkönyv minden terhelést ahhoz a jóváíráshoz köt, amit
 * elfogyasztott, ezért a kredit-történet exportálható és vitatható.
 *
 * A másik ok a visszaírás: a HUM-kapun elakadt vagy hibával leállt futás NEM von le
 * kreditet. A visszaírásnak abba a keretbe kell mennie, ahonnan a levonás történt —
 * különben egy hibás futás havi keretet alakítana át 12 hónapig élő kreditté.
 */

export type KeretTipus = "havi" | "kiegeszito";

export type TranzakcioTipus =
  | "havi_jovairas"
  | "kiegeszito_vasarlas"
  | "felhasznalas"
  | "visszairas"
  | "lejarat"
  | "admin_korrekcio";

export interface KreditTranzakcio {
  readonly azonosito: string;
  readonly szervezetAzonosito: string;
  readonly tipus: TranzakcioTipus;
  /** Pozitív = jóváírás, negatív = terhelés. */
  readonly mennyiseg: number;
  readonly keret: KeretTipus;
  readonly letrejott: string;
  /** Jóváírásnál: meddig él. Terhelésnél mindig undefined. */
  readonly lejar: string | undefined;
  readonly hivatkozottFutas: string | undefined;
  readonly indoklas: string | undefined;
  /** Admin-korrekciónál kötelező — a naplózás enélkül nem visszakereshető. */
  readonly kiAllitotta: string | undefined;
}

export interface KreditTetel {
  readonly tranzakcioAzonosito: string;
  readonly keret: KeretTipus;
  readonly maradek: number;
  readonly lejar: string | undefined;
}

/** Egy terhelés felosztása: melyik jóváírásból mennyi fogyott. */
export interface TerhelesReszlet {
  readonly forrasTranzakcio: string;
  readonly keret: KeretTipus;
  readonly mennyiseg: number;
  readonly lejar: string | undefined;
}

export interface Terheles {
  readonly tranzakcioAzonosito: string;
  readonly reszletek: readonly TerhelesReszlet[];
}

export interface Fokonyv {
  readonly havi: number;
  readonly kiegeszito: number;
  readonly osszesen: number;
  readonly tetelek: readonly KreditTetel[];
  /** Minden terhelés felosztása a jóváírásokra — ebből épül a visszaírás és az export. */
  readonly terhelesek: readonly Terheles[];
  /**
   * Fedezet nélküli terhelések. Nem dobunk hibát: a főkönyv a megtörtént eseményeket
   * írja le, és ha egy futás mégis fedezet nélkül indult el (verseny, hibás előellenőrzés),
   * annak LÁTSZANIA kell, nem eltűnnie egy kivételben.
   */
  readonly fedezetlen: readonly { readonly tranzakcioAzonosito: string; readonly hiany: number }[];
}

const ido = (iso: string): number => Date.parse(iso);

/** A fogyasztási sorrend: előbb a havi keret, azon belül a korábban lejáró tétel. */
function fogyasztasiSorrend(a: KreditTetel, b: KreditTetel): number {
  if (a.keret !== b.keret) return a.keret === "havi" ? -1 : 1;
  const aLejar = a.lejar === undefined ? Number.POSITIVE_INFINITY : ido(a.lejar);
  const bLejar = b.lejar === undefined ? Number.POSITIVE_INFINITY : ido(b.lejar);
  return aLejar - bLejar;
}

/**
 * A tranzakciókat időrendben lejátszva adja vissza az állapotot `mikor` időpontban.
 * A lejárt tételek nem számítanak bele, de a korábbi terheléseiket nem írjuk vissza —
 * a lejárat a MARADÉKOT viszi el, nem a történetet.
 */
export function fokonyvet(tranzakciok: readonly KreditTranzakcio[], mikor: Date): Fokonyv {
  const rendezett = [...tranzakciok].sort((a, b) => ido(a.letrejott) - ido(b.letrejott));
  let tetelek: { tranzakcioAzonosito: string; keret: KeretTipus; maradek: number; lejar: string | undefined }[] = [];
  const fedezetlen: { tranzakcioAzonosito: string; hiany: number }[] = [];
  const terhelesek: Terheles[] = [];

  const lejartakatEldob = (idopont: number): void => {
    tetelek = tetelek.filter((t) => t.lejar === undefined || ido(t.lejar) > idopont);
  };

  for (const tr of rendezett) {
    const most = ido(tr.letrejott);
    lejartakatEldob(most);

    if (tr.mennyiseg >= 0) {
      tetelek.push({
        tranzakcioAzonosito: tr.azonosito,
        keret: tr.keret,
        maradek: tr.mennyiseg,
        lejar: tr.lejar,
      });
      continue;
    }

    let hiany = -tr.mennyiseg;
    const reszletek: TerhelesReszlet[] = [];
    for (const tetel of [...tetelek].sort(fogyasztasiSorrend)) {
      if (hiany === 0) break;
      // A terhelés csak abból a keretből fogyaszthat, amelyikre szól — a felhasználás
      // mindkettőből (keret: "havi" az alapértelmezés), az admin-korrekció célzottan.
      if (tr.tipus === "admin_korrekcio" && tetel.keret !== tr.keret) continue;
      const vont = Math.min(tetel.maradek, hiany);
      tetel.maradek -= vont;
      hiany -= vont;
      reszletek.push({
        forrasTranzakcio: tetel.tranzakcioAzonosito,
        keret: tetel.keret,
        mennyiseg: vont,
        lejar: tetel.lejar,
      });
    }
    tetelek = tetelek.filter((t) => t.maradek > 0);
    terhelesek.push({ tranzakcioAzonosito: tr.azonosito, reszletek });
    if (hiany > 0) fedezetlen.push({ tranzakcioAzonosito: tr.azonosito, hiany });
  }

  lejartakatEldob(mikor.getTime());

  const havi = tetelek.filter((t) => t.keret === "havi").reduce((s, t) => s + t.maradek, 0);
  const kiegeszito = tetelek.filter((t) => t.keret === "kiegeszito").reduce((s, t) => s + t.maradek, 0);

  return {
    havi,
    kiegeszito,
    osszesen: havi + kiegeszito,
    tetelek: tetelek.map((t) => ({ ...t })),
    terhelesek,
    fedezetlen,
  };
}

export interface FedezetEredmeny {
  readonly fedezett: boolean;
  readonly hiany: number;
  readonly egyenlegUtana: number;
  /** Emberi mondat: az indítás előtti ár-előnézet vagy a „nincs elég kredit" ajánlat. */
  readonly uzenet: string;
}

/**
 * Fedezet-ellenőrzés indítás előtt. A 7.4 szabály: ha nincs elég kredit, a rendszer
 * NEM indít, hanem felajánlja a kiegészítőt — a félig lefutó, majd elakadó futás a
 * legrosszabb kimenet, mert a kredit is fogy és eredmény sincs.
 */
export function fedezetet(fokonyv: Fokonyv, koltseg: number): FedezetEredmeny {
  const hiany = Math.max(0, koltseg - fokonyv.osszesen);
  return {
    fedezett: hiany === 0,
    hiany,
    egyenlegUtana: fokonyv.osszesen - koltseg,
    uzenet:
      hiany === 0
        ? `Ez a művelet ${koltseg} kreditbe kerül, marad ${fokonyv.osszesen - koltseg}.`
        : `${koltseg} kredit kellene, ${fokonyv.osszesen} van. Hiányzik ${hiany} — vegyél kiegészítő csomagot, vagy várd meg a következő havi keretet.`,
  };
}

let sorszam = 0;
const azonositot = (elotag: string, letrejott: string): string =>
  `${elotag}-${letrejott.slice(0, 10)}-${(sorszam += 1).toString().padStart(4, "0")}`;

export interface HaviJovairasBemenet {
  readonly szervezetAzonosito: string;
  readonly haviKredit: number;
  readonly ciklusKezdet: string;
  readonly ciklusVege: string;
}

/**
 * Havi keret jóváírása. A keret a ciklus végén LEJÁR (nem gördül át) — ezt a `lejar`
 * mező intézi, nem külön lejárati tranzakció: így egy elmaradt havi zárás sem hagy
 * bent élő keretet.
 */
export function haviJovairas(b: HaviJovairasBemenet): KreditTranzakcio {
  return {
    azonosito: azonositot("HAVI", b.ciklusKezdet),
    szervezetAzonosito: b.szervezetAzonosito,
    tipus: "havi_jovairas",
    mennyiseg: b.haviKredit,
    keret: "havi",
    letrejott: b.ciklusKezdet,
    lejar: b.ciklusVege,
    hivatkozottFutas: undefined,
    indoklas: "Havi keret a ciklus első napján.",
    kiAllitotta: undefined,
  };
}

export interface KiegeszitoBemenet {
  readonly szervezetAzonosito: string;
  readonly mennyiseg: number;
  readonly vasarolt: string;
  /** Alapból 12 hónap (7.4); a hívó felülírhatja, ha az ajánlat más. */
  readonly ervenyessegHonap?: number;
}

export function kiegeszitoVasarlas(b: KiegeszitoBemenet): KreditTranzakcio {
  const lejar = new Date(b.vasarolt);
  lejar.setMonth(lejar.getMonth() + (b.ervenyessegHonap ?? 12));
  return {
    azonosito: azonositot("KIEG", b.vasarolt),
    szervezetAzonosito: b.szervezetAzonosito,
    tipus: "kiegeszito_vasarlas",
    mennyiseg: b.mennyiseg,
    keret: "kiegeszito",
    letrejott: b.vasarolt,
    lejar: lejar.toISOString(),
    hivatkozottFutas: undefined,
    indoklas: "Kiegészítő kreditcsomag.",
    kiAllitotta: undefined,
  };
}

export interface FelhasznalasBemenet {
  readonly szervezetAzonosito: string;
  readonly koltseg: number;
  readonly futasAzonosito: string;
  readonly muvelet: string;
  readonly mikor: string;
}

export function felhasznalas(b: FelhasznalasBemenet): KreditTranzakcio {
  return {
    azonosito: azonositot("FELH", b.mikor),
    szervezetAzonosito: b.szervezetAzonosito,
    tipus: "felhasznalas",
    mennyiseg: -b.koltseg,
    keret: "havi",
    letrejott: b.mikor,
    lejar: undefined,
    hivatkozottFutas: b.futasAzonosito,
    indoklas: b.muvelet,
    kiAllitotta: undefined,
  };
}

/**
 * Visszaírás hibás vagy elakadt futásra (7.4: a HUM-kapun elakadt vagy hibával leállt
 * futás nem von le kreditet).
 *
 * A visszaírás ANNYI tranzakció, ahány jóváírásból a terhelés fogyasztott, mert
 * mindegyik a saját keretét és lejáratát viszi vissza. Egyetlen összevont visszaírás
 * havi keretből 12 hónapig élő kreditet csinálna — ez a bug csendben ajándékozna.
 */
export function visszairasok(
  fokonyv: Fokonyv,
  eredeti: KreditTranzakcio,
  mikor: string,
  indok: string,
): KreditTranzakcio[] {
  const terheles = fokonyv.terhelesek.find((t) => t.tranzakcioAzonosito === eredeti.azonosito);
  if (terheles === undefined) return [];

  return terheles.reszletek.map((r) => ({
    azonosito: azonositot("VISSZA", mikor),
    szervezetAzonosito: eredeti.szervezetAzonosito,
    tipus: "visszairas" as const,
    mennyiseg: r.mennyiseg,
    keret: r.keret,
    letrejott: mikor,
    lejar: r.lejar,
    hivatkozottFutas: eredeti.hivatkozottFutas,
    indoklas: indok,
    kiAllitotta: undefined,
  }));
}

/** Admin-korrekció. A kiállító kötelező: naplózatlan korrekció nem létezhet. */
export function adminKorrekcio(
  szervezetAzonosito: string,
  mennyiseg: number,
  keret: KeretTipus,
  mikor: string,
  kiAllitotta: string,
  indoklas: string,
): KreditTranzakcio {
  if (kiAllitotta.trim() === "") {
    throw new Error("Admin-korrekció kiállító nélkül nem rögzíthető (7.4 naplózási szabály).");
  }
  return {
    azonosito: azonositot("ADMIN", mikor),
    szervezetAzonosito,
    tipus: "admin_korrekcio",
    mennyiseg,
    keret,
    letrejott: mikor,
    lejar: undefined,
    hivatkozottFutas: undefined,
    indoklas,
    kiAllitotta,
  };
}
