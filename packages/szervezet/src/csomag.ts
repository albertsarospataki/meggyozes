/**
 * Csomagok és korlátok (brief v2.0 7.2).
 *
 * Két csomag, kredit-alapú felhasználással. A korlát és a kredit KÉT KÜLÖN kapu:
 * a korlát azt mondja meg, mit szabad (hány brand, milyen ajtó, milyen hosszú videó),
 * a kredit azt, hogy mennyit — egy Starter felhasználó vehet még kreditet, de a
 * harmadik brandet attól még nem nyitja meg.
 *
 * Az Alfa nem harmadik csomag, hanem ÁLLAPOT: Pro-képességek kártya nélkül, a havi
 * keret környezeti változóból. A fizetős nyitáskor Starterré vagy Próvá alakul, ezért
 * itt is a Pro korlátait örökli — így nem kell külön kódágat kivezetni.
 */

export type CsomagNev = "starter" | "pro" | "alfa";

export type AuditAjto = "url" | "kep" | "szoveg" | "video";

export interface CsomagKorlatok {
  readonly nev: CsomagNev;
  readonly brandekMax: number;
  readonly ulesekMax: number;
  /** A projekt korlátlan mindkét csomagban — a szám itt a szándék rögzítése. */
  readonly projektekMax: number;
  readonly haviKredit: number;
  readonly ajtok: readonly AuditAjto[];
  readonly videoPercMax: number;
  readonly ketidopontosMod: boolean;
  readonly koteg: boolean;
  readonly briefDocxExport: boolean;
  readonly beJarasOldalMax: number;
  readonly elsobbsegiSor: boolean;
}

export const CSOMAGOK: Readonly<Record<CsomagNev, CsomagKorlatok>> = {
  starter: {
    nev: "starter",
    brandekMax: 2,
    ulesekMax: 3,
    projektekMax: Number.POSITIVE_INFINITY,
    haviKredit: 300,
    ajtok: ["url", "kep", "szoveg", "video"],
    videoPercMax: 5,
    ketidopontosMod: false,
    koteg: false,
    briefDocxExport: false,
    beJarasOldalMax: 20,
    elsobbsegiSor: false,
  },
  pro: {
    nev: "pro",
    brandekMax: 10,
    ulesekMax: 15,
    projektekMax: Number.POSITIVE_INFINITY,
    haviKredit: 1200,
    ajtok: ["url", "kep", "szoveg", "video"],
    videoPercMax: 20,
    ketidopontosMod: true,
    koteg: true,
    briefDocxExport: true,
    beJarasOldalMax: 60,
    elsobbsegiSor: true,
  },
  alfa: {
    nev: "alfa",
    brandekMax: 10,
    ulesekMax: 15,
    projektekMax: Number.POSITIVE_INFINITY,
    haviKredit: 1200,
    ajtok: ["url", "kep", "szoveg", "video"],
    videoPercMax: 20,
    ketidopontosMod: true,
    koteg: true,
    briefDocxExport: true,
    beJarasOldalMax: 60,
    elsobbsegiSor: true,
  },
};

export interface KorlatSertes {
  readonly korlat: keyof CsomagKorlatok;
  readonly uzenet: string;
  /** Melyik csomag oldaná fel — a felület ebből építi a „válts Pro-ra" ajánlatot. */
  readonly feloldja: CsomagNev | undefined;
}

export interface HasznalatiAllapot {
  readonly brandekSzama: number;
  readonly ulesekSzama: number;
}

/** Új brand nyitható-e. A korlát fölött nem hiba dobódik, hanem magyarázható sértés. */
export function brandNyithato(csomag: CsomagNev, allapot: HasznalatiAllapot): KorlatSertes | undefined {
  const k = CSOMAGOK[csomag];
  if (allapot.brandekSzama < k.brandekMax) return undefined;
  return {
    korlat: "brandekMax",
    uzenet: `A ${k.nev} csomag ${k.brandekMax} brandet enged, és ennyi már be van tanítva.`,
    feloldja: k.brandekMax < CSOMAGOK.pro.brandekMax ? "pro" : undefined,
  };
}

export function ulesNyithato(csomag: CsomagNev, allapot: HasznalatiAllapot): KorlatSertes | undefined {
  const k = CSOMAGOK[csomag];
  if (allapot.ulesekSzama < k.ulesekMax) return undefined;
  return {
    korlat: "ulesekMax",
    uzenet: `A ${k.nev} csomagban ${k.ulesekMax} ülés van, mind foglalt.`,
    feloldja: k.ulesekMax < CSOMAGOK.pro.ulesekMax ? "pro" : undefined,
  };
}

export interface AuditKeres {
  readonly ajto: AuditAjto;
  readonly videoPerc?: number;
  readonly ketidopontos?: boolean;
  readonly koteg?: boolean;
}

/** Az ajtó- és mód-korlátok egy helyen: az indító űrlap ezt hívja, mielőtt kreditet néz. */
export function auditIndithato(csomag: CsomagNev, keres: AuditKeres): KorlatSertes | undefined {
  const k = CSOMAGOK[csomag];
  if (!k.ajtok.includes(keres.ajto)) {
    return { korlat: "ajtok", uzenet: `A ${keres.ajto} ajtó nem érhető el a ${k.nev} csomagban.`, feloldja: "pro" };
  }
  if (keres.ajto === "video" && (keres.videoPerc ?? 0) > k.videoPercMax) {
    return {
      korlat: "videoPercMax",
      uzenet: `A ${k.nev} csomag ${k.videoPercMax} perces videót fogad, a beadott ${keres.videoPerc} perc.`,
      feloldja: k.videoPercMax < CSOMAGOK.pro.videoPercMax ? "pro" : undefined,
    };
  }
  if (keres.ketidopontos === true && !k.ketidopontosMod) {
    return { korlat: "ketidopontosMod", uzenet: "A kétidőpontos mód Pro-képesség.", feloldja: "pro" };
  }
  if (keres.koteg === true && !k.koteg) {
    return { korlat: "koteg", uzenet: "A köteg-audit (több artefaktum együtt) Pro-képesség.", feloldja: "pro" };
  }
  return undefined;
}
