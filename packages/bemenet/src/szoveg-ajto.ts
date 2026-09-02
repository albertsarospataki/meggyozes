/**
 * Szöveg-ajtó — beillesztett szöveg normalizálása.
 *
 * A blokkolás heurisztikus, és ezt a riport ki is mondja: beillesztett szövegnél a
 * rendszer nem látja az elrendezést, ezért az „Elrendezés" és „Vizuális minta"
 * jelosztályok itt nem eldönthetők. Ez nem hiányosság, hanem a bemenet határa.
 */

import { szovegetNormalizal, type ArtefaktumObjektum, type Blokk, type BlokkSzerep } from "./artefaktum-objektum";

const AR_MINTA = /(\d[\d  .,]*)\s?(Ft|HUF|EUR|€|\$|USD)/gi;
const GOMB_MINTA = /^(?:\[?)(vásárlás|kosárba|megveszem|kipróbálom|regisztrálok|feliratkozom|érdekel|kérem|tovább|ingyen|indítsd|próbáld)\b.*$/i;

function szerepetBecsul(sor: string, index: number): BlokkSzerep {
  if (index === 0) return "cim";
  if (GOMB_MINTA.test(sor)) return "gomb";
  if (AR_MINTA.test(sor)) return "ar";
  if (sor.length < 60 && !sor.endsWith(".")) return "alcim";
  return "bekezdes";
}

export function szovegAjto(nyers: string, megnevezes: string, rogzitve: string): ArtefaktumObjektum {
  const szoveg = szovegetNormalizal(nyers);
  const sorok = szoveg.split("\n");

  const blokkok: Blokk[] = sorok.map((sor, i) => ({
    azonosito: `b-${i + 1}`,
    szerep: szerepetBecsul(sor, i),
    szoveg: sor,
    hely: `${i + 1}. sor`,
    siteChrome: false,
  }));

  const arak = [...szoveg.matchAll(AR_MINTA)].map((m) => m[0].trim());

  return {
    ajto: "szoveg",
    forras: megnevezes,
    cim: sorok[0],
    szoveg,
    blokkok,
    gombok: blokkok.filter((b) => b.szerep === "gomb").map((b) => b.szoveg),
    linkek: [],
    arak,
    urlapMezok: [],
    consentBanner: undefined,
    kepernyokep: undefined,
    rogzitve,
    korlatok: [
      "Beillesztett szöveg: a rendszer nem látja az elrendezést, a színeket és a képeket.",
      "Az elrendezés- és vizuálisminta-jelek ezen az ajtón nem eldönthetők.",
    ],
  };
}
