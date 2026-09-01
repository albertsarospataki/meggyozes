/**
 * Szöveg-normalizálás a brand-őrhöz.
 *
 * Az ékezettelenítés HOSSZTARTÓ: minden ékezetes betű pontosan egy ékezettelenre
 * cserélődik, ezért a normalizált szövegben talált pozíció az EREDETI szövegben is
 * érvényes. Ez azért kell, mert a kifogás idézetét az eredeti szövegből vágjuk ki —
 * a felhasználó a saját mondatát kell lássa, nem a gépi alakot.
 */

const EKEZET_TERKEP: Readonly<Record<string, string>> = {
  á: "a", à: "a", â: "a", ä: "a",
  é: "e", è: "e", ê: "e", ë: "e",
  í: "i", ì: "i", î: "i", ï: "i",
  ó: "o", ò: "o", ô: "o", ö: "o", ő: "o",
  ú: "u", ù: "u", û: "u", ü: "u", ű: "u",
  Á: "A", É: "E", Í: "I", Ó: "O", Ö: "O", Ő: "O", Ú: "U", Ü: "U", Ű: "U",
};

/** Ékezettelenít úgy, hogy a karakterpozíciók változatlanok maradnak. */
export function ekezettelenit(szoveg: string): string {
  let eredmeny = "";
  for (const betu of szoveg) {
    eredmeny += EKEZET_TERKEP[betu] ?? betu;
  }
  return eredmeny;
}

/** Kereséshez: ékezettelen, kisbetűs alak, változatlan hosszal. */
export function keresesiAlak(szoveg: string): string {
  return ekezettelenit(szoveg).toLowerCase();
}

/**
 * Az idézet a találat körüli mondattöredék. Nem a teljes bekezdés: a kifogás
 * listában olvashatónak kell maradnia, de a felhasználónak fel kell ismernie,
 * hol van a szövegében.
 */
export function idezetKivag(szoveg: string, kezdet: number, hossz: number, kornyezet = 40): string {
  const eleje = Math.max(0, kezdet - kornyezet);
  const vege = Math.min(szoveg.length, kezdet + hossz + kornyezet);
  const toredek = szoveg.slice(eleje, vege).replace(/\s+/g, " ").trim();
  return `${eleje > 0 ? "…" : ""}${toredek}${vege < szoveg.length ? "…" : ""}`;
}

export interface Talalat {
  readonly kifejezes: string;
  readonly kezdet: number;
  readonly hossz: number;
}

/**
 * Kifejezés keresése szóhatáron.
 *
 * Szóhatár azért kell, mert a tiltólista rövid szavakat is tartalmaz („ingyen”), és a
 * részszó-találat álpozitív lenne a legrosszabb helyen: a saját kimenetünk blokkolásánál.
 *
 * Alapból a kifejezés UTÁN megengedjük a folytatást, ELŐTTE nem — a magyar toldalékolás
 * miatt („akciónk” → „akció” találat). A `teljesSzo` ezt kikapcsolja: a hangnem-jelölőknél
 * kötelező, különben az „Ön” az „online” szóban, a „te” a „termék” szóban ütne ki.
 */
export function kifejezestKeres(szoveg: string, kifejezes: string, teljesSzo = false): Talalat[] {
  const norm = keresesiAlak(szoveg);
  const minta = keresesiAlak(kifejezes.trim());
  if (minta === "") return [];

  const talalatok: Talalat[] = [];
  let honnan = 0;
  for (;;) {
    const index = norm.indexOf(minta, honnan);
    if (index === -1) break;
    const elotte = index === 0 ? "" : norm[index - 1];
    const utana = norm[index + minta.length];
    const balOk = elotte === undefined || !/[a-z0-9]/.test(elotte);
    const jobbOk = !teljesSzo || utana === undefined || !/[a-z0-9]/.test(utana);
    if (balOk && jobbOk) {
      talalatok.push({ kifejezes: szoveg.slice(index, index + minta.length), kezdet: index, hossz: minta.length });
    }
    honnan = index + minta.length;
  }
  return talalatok;
}
