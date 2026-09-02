/**
 * Anonimizálás a tanulási jelöltekhez (brief v2.0 W9, 10. adatvédelem).
 *
 * A tanulási hurok anyaga ügyfél-tartalom: idézet egy auditált oldalról. A jelölt
 * viszont a PLATFORM adata lesz, kurátor elé kerül, és a Notionba is átvezethető.
 * A kettő között kötelező az anonimizálás — és nem „best effort”: ha a törlés nem
 * biztos, a jelölt nem keletkezik meg (lásd `anonimizalhato`).
 *
 * Amit eltávolítunk: domain, e-mail, telefonszám, és a szervezet által megadott
 * saját nevek (márka, terméknév). Amit MEGTARTUNK: az idézet szerkezete, a kódok, a
 * bizonyíték-fokozat — ez a tanuláshoz elég, és ez a tanulás egyetlen jogalapja.
 */

export const HELYORZOK = {
  domain: "[domain]",
  email: "[e-mail]",
  telefon: "[telefonszám]",
  nev: "[márka]",
} as const;

const URL_MINTA = /\bhttps?:\/\/[^\s<>"]+/gi;
const DOMAIN_MINTA = /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:hu|com|net|org|io|eu|de|at|sk|ro)\b/gi;
const EMAIL_MINTA = /\b[^\s@]+@[^\s@]+\.[a-z]{2,}\b/gi;
const TELEFON_MINTA = /(?:\+36|06)[\s-]?\d{1,2}[\s-]?\d{3}[\s-]?\d{3,4}\b/g;

export interface AnonimizalasEredmeny {
  readonly szoveg: string;
  /** Mit cseréltünk — a kurátor látja, hogy a jelölt nem csonka, hanem tisztított. */
  readonly cserek: readonly { readonly mit: string; readonly mire: string }[];
}

/**
 * Anonimizálás. A saját nevek listáját a hívó adja (a brand-profil neve, domainjei,
 * terméknevek) — a rendszer nem találgatja ki, mi a márkanév egy szövegben.
 */
export function anonimizal(szoveg: string, sajatNevek: readonly string[] = []): AnonimizalasEredmeny {
  const cserek: { mit: string; mire: string }[] = [];
  let eredmeny = szoveg;

  const csereljen = (minta: RegExp, helyorzo: string): void => {
    eredmeny = eredmeny.replace(minta, (talalat) => {
      cserek.push({ mit: talalat, mire: helyorzo });
      return helyorzo;
    });
  };

  // Az e-mail előbb, mint a domain: különben a domain-minta megenné a cím végét.
  csereljen(EMAIL_MINTA, HELYORZOK.email);
  csereljen(URL_MINTA, HELYORZOK.domain);
  csereljen(DOMAIN_MINTA, HELYORZOK.domain);
  csereljen(TELEFON_MINTA, HELYORZOK.telefon);

  for (const nev of sajatNevek) {
    const tisztitott = nev.trim();
    if (tisztitott.length < 3) continue; // a két betűs „név" mindenre illeszkedne
    const minta = new RegExp(tisztitott.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    csereljen(minta, HELYORZOK.nev);
  }

  return { szoveg: eredmeny, cserek };
}

/**
 * Anonimizálható-e a szöveg biztonsággal. Ha a tisztítás után is maradt olyan minta,
 * ami azonosíthat (nagybetűs tulajdonnév-gyanú a megadott nevek nélkül), a jelölt
 * inkább NEM keletkezik meg: a tanulás értéke nem éri meg egy ügyfél-azonosítás
 * kockázatát.
 */
export function anonimizalhato(szoveg: string, sajatNevek: readonly string[] = []): boolean {
  const tisztitott = anonimizal(szoveg, sajatNevek).szoveg;
  // Friss mintákkal ellenőrzünk: a globális regex `lastIndex`-e ragadós, és egy
  // hordozott állapot itt csendben átengedne egy azonosítható jelöltet.
  return ![EMAIL_MINTA, URL_MINTA, TELEFON_MINTA].some((minta) =>
    new RegExp(minta.source, minta.flags.replace("g", "")).test(tisztitott),
  );
}
