/**
 * A kódnyelvtan — a tudásbázis minden hivatkozása ezen a szűrőn megy át.
 *
 * Miért kell ez külön modul: a kalibrációs futások fő tanulsága szerint az LLM a
 * jelenségeket megtalálja, de a KÓDKIADÁSA ingadozik. Minden pontozás, dedup és
 * determinisztikus ellenőrzés kódösszehasonlításon áll, tehát a kódok normalizálása
 * az egész rendszer legalsó rétege. Ha itt hibázunk, minden mérés hazudik.
 */

export const KOD_TIPUSOK = [
  "jel",
  "technika",
  "szabaly",
  "diszkriminans",
  "elvaras",
  "kombinacio",
] as const;

export type KodTipus = (typeof KOD_TIPUSOK)[number];

/** Előtag → típus. A sorrend számít: a hosszabb előtagot előbb kell próbálni (EL a E előtt). */
const ELOTAG_TIPUS: ReadonlyArray<readonly [string, KodTipus]> = [
  ["TK", "technika"],
  ["EL", "elvaras"],
  ["J", "jel"],
  ["S", "szabaly"],
  ["D", "diszkriminans"],
  ["K", "kombinacio"],
];

const TIPUS_ELOTAG: Record<KodTipus, string> = {
  jel: "J",
  technika: "TK",
  szabaly: "S",
  diszkriminans: "D",
  elvaras: "EL",
  kombinacio: "K",
};

/**
 * Hány számjegyre párnázzuk a fő sorszámot típusonként.
 * A tárakban J-001 és TK-045 alakot használunk, a szabálykód viszont a jegyzet
 * sorszámát hordozza (S-330-1), amit NEM szabad párnázni — az S-047 és az S-0047
 * két különböző jegyzetre mutatna.
 */
const PARNAZAS: Record<KodTipus, number> = {
  jel: 3,
  technika: 3,
  szabaly: 0,
  diszkriminans: 3,
  elvaras: 3,
  kombinacio: 3,
};

export interface Kod {
  /** Normalizált alak, pl. "J-011", "TK-045", "S-330-1". */
  readonly ertek: string;
  readonly tipus: KodTipus;
  /** A fő sorszám számként — rendezéshez és tartomány-ellenőrzéshez. */
  readonly sorszam: number;
  /**
   * Szabálykódnál a jegyzeten belüli alsorszám ("S-330-1" → 1), vagy "*" a
   * "minden szabály ebből a jegyzetből" alakra (S-047-*). Más típusnál nincs.
   */
  readonly alsorszam?: number | "*";
}

/**
 * A szövegből kódot kinyerő minta.
 *
 * A szóhatár elöl kötelező, hogy a "SJ-011" vagy egy azonosító közepe ne találjon.
 * Hátul szándékosan NINCS szóhatár: a magyar szöveg toldalékol ("a J-011-et",
 * "TK-105-ellenpróba"), és a pontozás 1. szabálya szerint a kódemlítés bárhol találat.
 * Az alsorszám csak szabálykódnál nyelhető el, ezért az ágakat külön kezeljük.
 */
const KOD_MINTA = /(?<![\p{L}\p{N}_-])(TK|EL|J|S|D|K)-(\d{1,4})(?:-(\d{1,3}|\*))?/giu;

function tipusElotagbol(elotag: string): KodTipus | undefined {
  const nagy = elotag.toUpperCase();
  return ELOTAG_TIPUS.find(([e]) => e === nagy)?.[1];
}

function parnaz(sorszam: number, tipus: KodTipus): string {
  const szelesseg = PARNAZAS[tipus];
  return szelesseg > 0 ? String(sorszam).padStart(szelesseg, "0") : String(sorszam);
}

/**
 * Egyetlen kódszöveget normalizál. Elfogadja a laza alakokat is (kisbetű, hiányzó
 * párnázás, körülvevő szóköz), mert a tárakban és az LLM-kimenetben egyaránt előfordulnak.
 * Nem-kód bemenetre undefined-et ad — soha nem találgat.
 */
export function kodotElemez(nyers: string): Kod | undefined {
  const minta = new RegExp(KOD_MINTA.source, "iu");
  const talalat = minta.exec(nyers.trim());
  if (!talalat) return undefined;

  // Csak akkor fogadjuk el, ha a bemenet MAGA a kód (nem egy mondat) — a szövegből
  // való kinyerésre a kodokatKinyer() való.
  if (talalat.index !== 0) return undefined;

  const [egesz, elotag, fo, alsoNyers] = talalat;
  if (!elotag || !fo) return undefined;
  if (egesz.length !== nyers.trim().length) return undefined;

  const tipus = tipusElotagbol(elotag);
  if (!tipus) return undefined;

  const sorszam = Number.parseInt(fo, 10);
  if (!Number.isFinite(sorszam)) return undefined;

  return epitKod(tipus, sorszam, alsoNyers);
}

function epitKod(tipus: KodTipus, sorszam: number, alsoNyers: string | undefined): Kod {
  // Az alsorszám csak a szabálykódnál része a kódnak. Ha más típusnál jön szám a
  // második pozícióban, az már nem ehhez a kódhoz tartozik (pl. dátum vagy tartomány).
  if (tipus !== "szabaly" || alsoNyers === undefined) {
    return { ertek: `${TIPUS_ELOTAG[tipus]}-${parnaz(sorszam, tipus)}`, tipus, sorszam };
  }
  const alsorszam = alsoNyers === "*" ? ("*" as const) : Number.parseInt(alsoNyers, 10);
  return {
    ertek: `S-${sorszam}-${alsoNyers === "*" ? "*" : alsorszam}`,
    tipus,
    sorszam,
    alsorszam,
  };
}

/**
 * Szabad szövegből kinyeri az összes kódhivatkozást, megjelenési sorrendben,
 * duplikátumok nélkül.
 *
 * Ez a pontozás 1. szabályának végrehajtója: "ha a futtató a kódot BÁRHOL kiadta
 * (detekció, hiány-lelet, kompozit, legitim szekció, zárójeles megjegyzés),
 * a kötelező tétel teljesül".
 */
export function kodokatKinyer(szoveg: string): Kod[] {
  const talaltak = new Map<string, Kod>();
  for (const t of szoveg.matchAll(KOD_MINTA)) {
    const [, elotag, fo, also] = t;
    if (!elotag || !fo) continue;
    const tipus = tipusElotagbol(elotag);
    if (!tipus) continue;
    const sorszam = Number.parseInt(fo, 10);
    if (!Number.isFinite(sorszam)) continue;
    const kod = epitKod(tipus, sorszam, also);
    if (!talaltak.has(kod.ertek)) talaltak.set(kod.ertek, kod);
  }
  return [...talaltak.values()];
}

/** Csak a normalizált szöveges alakokat adja vissza — a leggyakoribb hívási forma. */
export function kodErtekeketKinyer(szoveg: string): string[] {
  return kodokatKinyer(szoveg).map((k) => k.ertek);
}

/** Egyetlen kód normalizált alakja, vagy a bemenet trimmelve, ha nem kód. */
export function kodotNormalizal(nyers: string): string {
  return kodotElemez(nyers)?.ertek ?? nyers.trim();
}

export function kodTipusa(nyers: string): KodTipus | undefined {
  return kodotElemez(nyers)?.tipus;
}

/**
 * "S-330-*" lefedi az S-330-1, S-330-2, ... kódokat. Minden más esetben az
 * egyezés szigorú. Ezt a szabálytár csillagos hivatkozásai teszik szükségessé.
 */
export function kodFedi(minta: string, jelolt: string): boolean {
  const m = kodotElemez(minta);
  const j = kodotElemez(jelolt);
  if (!m || !j) return kodotNormalizal(minta) === kodotNormalizal(jelolt);
  if (m.tipus !== j.tipus || m.sorszam !== j.sorszam) return false;
  if (m.alsorszam === "*") return true;
  return m.alsorszam === j.alsorszam;
}

/** Rendezés: típus szerint, azon belül sorszám és alsorszám szerint. */
export function kodokatRendez(kodok: readonly Kod[]): Kod[] {
  return [...kodok].sort((a, b) => {
    if (a.tipus !== b.tipus) return KOD_TIPUSOK.indexOf(a.tipus) - KOD_TIPUSOK.indexOf(b.tipus);
    if (a.sorszam !== b.sorszam) return a.sorszam - b.sorszam;
    const aa = a.alsorszam === "*" ? Infinity : (a.alsorszam ?? -1);
    const bb = b.alsorszam === "*" ? Infinity : (b.alsorszam ?? -1);
    return aa - bb;
  });
}
