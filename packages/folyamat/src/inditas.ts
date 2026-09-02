/**
 * Futás-indítás (brief v2.0 W2 1–3. lépés).
 *
 * Négy kapu, ebben a sorrendben — és a sorrend nem esztétika:
 *  1. jogosultság (ki vagy, mit láthatsz),
 *  2. csomagkorlát (mit enged a csomag),
 *  3. kredit-fedezet (van-e miből),
 *  4. terhelés (levonás a futás indításakor).
 *
 * A kredit MINDIG utolsó. Ha előbb vonnánk, egy jogosultsági vagy korlát-hiba
 * kreditbe kerülne az ügyfélnek — és a 7.4 szabály szerint a nem lefutott munkáért
 * nem fizet. Fordítva pedig azért nem jó: az ár-előnézetet („marad 274”) csak akkor
 * mutathatjuk, ha a másik három kapu már átengedte a kérést.
 */

import {
  ar,
  auditIndithato,
  fedezetet,
  felhasznalas,
  jogosult,
  type AuditKeres,
  type ArBontas,
  type Cel,
  type CsomagNev,
  type Fokonyv,
  type KorlatSertes,
  type KreditTranzakcio,
  type Muvelet,
  type Tagsag,
} from "@meggyozes/szervezet";
import type { Uzemmod } from "@meggyozes/projekt";

export type InditasDontes = "indulhat" | "jogosultsag-hiany" | "csomagkorlat" | "kredit-hiany";

export interface InditasKeres {
  readonly tag: Tagsag;
  readonly cel: Cel;
  readonly mod: Uzemmod;
  readonly csomag: CsomagNev;
  readonly muvelet: Muvelet;
  /** Csak audit módban: az ajtó és a mód-kapcsolók a csomagkorláthoz. */
  readonly auditKeres?: AuditKeres;
  readonly fokonyv: Fokonyv;
  readonly futasAzonosito: string;
  readonly mikor: string;
}

export interface InditasEredmeny {
  readonly dontes: InditasDontes;
  readonly uzenet: string;
  readonly ar: ArBontas;
  /** A levonás tranzakciója — csak `indulhat` esetén. A hívó rögzíti a főkönyvbe. */
  readonly terheles: KreditTranzakcio | undefined;
  readonly korlatSertes: KorlatSertes | undefined;
}

const MOD_KEPESSEG = {
  audit: "futas:audit",
  tanacs: "futas:tanacs",
  kerdezz: "futas:kerdezz",
} as const;

export function inditastEllenoriz(keres: InditasKeres): InditasEredmeny {
  const arBontas = ar(keres.muvelet);

  const dontes = jogosult(keres.tag, MOD_KEPESSEG[keres.mod], keres.cel);
  if (!dontes.engedelyezett) {
    return { dontes: "jogosultsag-hiany", uzenet: dontes.uzenet, ar: arBontas, terheles: undefined, korlatSertes: undefined };
  }

  if (keres.auditKeres !== undefined) {
    const sertes = auditIndithato(keres.csomag, keres.auditKeres);
    if (sertes !== undefined) {
      return { dontes: "csomagkorlat", uzenet: sertes.uzenet, ar: arBontas, terheles: undefined, korlatSertes: sertes };
    }
  }

  const fedezet = fedezetet(keres.fokonyv, arBontas.osszesen);
  if (!fedezet.fedezett) {
    return { dontes: "kredit-hiany", uzenet: fedezet.uzenet, ar: arBontas, terheles: undefined, korlatSertes: undefined };
  }

  return {
    dontes: "indulhat",
    uzenet: fedezet.uzenet,
    ar: arBontas,
    terheles: felhasznalas({
      szervezetAzonosito: keres.tag.szervezetAzonosito,
      koltseg: arBontas.osszesen,
      futasAzonosito: keres.futasAzonosito,
      muvelet: arBontas.tetelek.map((t) => t.megnevezes).join(" + "),
      mikor: keres.mikor,
    }),
    korlatSertes: undefined,
  };
}
