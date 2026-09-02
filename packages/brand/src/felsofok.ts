/**
 * Felsőfok-felismerés.
 *
 * Két helyen kell ugyanaz a lista: a brand-őr a saját kimenetünkben keresi (ott
 * helyőrzőt tesz), a brand-egyezés blokk az ügyfél anyagában (ott megállapítás lesz
 * belőle). Egy definíció, hogy a két oldal soha ne mondjon mást ugyanarra a szóra.
 */

import { keresesiAlak, kifejezestKeres, type Talalat } from "./szoveg";

/**
 * Rögzített felsőfokú kifejezések. A szabályos magyar alak (leg… + -bb) mintával
 * fogható, ezek viszont nem: külön listát kívánnak.
 */
export const SZUPERLATIVUSZ_KIFEJEZESEK: readonly string[] = [
  "piacvezeto",
  "verhetetlen",
  "egyedulallo",
  "utolerhetetlen",
  "paratlan",
  "vilagszinvonalu",
  "elso szamu",
  "#1",
  "no. 1",
];

/** A magyar felsőfok szabályos alakja: leg… + -bb (legjobb, legolcsóbb, legnagyobb). */
const FELSOFOK_MINTA = /\bleg[a-z]{2,}bb\b/g;

/** Minden felsőfokú találat pozícióval — a hívó dönti el, mit kezd vele. */
export function FELSOFOK_TALALATOK(szoveg: string): Talalat[] {
  const norm = keresesiAlak(szoveg);
  const talalatok: Talalat[] = [];

  for (const talalat of norm.matchAll(FELSOFOK_MINTA)) {
    if (talalat.index === undefined) continue;
    talalatok.push({
      kifejezes: szoveg.slice(talalat.index, talalat.index + talalat[0].length),
      kezdet: talalat.index,
      hossz: talalat[0].length,
    });
  }
  for (const kifejezes of SZUPERLATIVUSZ_KIFEJEZESEK) {
    talalatok.push(...kifejezestKeres(szoveg, kifejezes));
  }

  return talalatok.sort((a, b) => a.kezdet - b.kezdet);
}
