import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  hatokorTagsagbol,
  kezdoallapototLetrehoz,
  Tar,
  type Hatokor,
} from "@meggyozes/tarolas";
import { CSOMAGOK, fokonyvet, type CsomagNev, type Fokonyv, type Tagsag } from "@meggyozes/szervezet";

/**
 * A tár egyetlen példánya folyamatonként.
 *
 * A Next fejlesztői módban újratölti a modulokat; ha minden újratöltés új
 * adatbázis-kapcsolatot nyitna, a WAL-fájl és a nyitott leírók elszaladnának.
 * A globális gyorsítótár ezt köti meg — éles alatt egy példány fut úgyis.
 */
declare global {
  // eslint-disable-next-line no-var
  var __convictlyTar: Tar | undefined;
}

const ADATBAZIS = process.env.ADATBAZIS_UTVONAL ?? ".adat/convictly.sqlite";

export function tar(): Tar {
  if (globalThis.__convictlyTar === undefined) {
    const peldany = new Tar(ADATBAZIS);
    kezdoallapototLetrehoz(peldany, {
      szervezetNev: process.env.SZERVEZET_NEV ?? "Alfa szervezet",
      email: process.env.TULAJDONOS_EMAIL ?? "albert@convictly.com",
      felhasznaloNev: process.env.TULAJDONOS_NEV ?? "Albert Sárospataki",
      haviKredit: Number(process.env.ALFA_HAVI_KREDIT ?? 1200),
      mikor: new Date().toISOString(),
    });
    globalThis.__convictlyTar = peldany;
  }
  return globalThis.__convictlyTar;
}

export const MENESZT_SUTI = "convictly_meneszt";

export interface Meneszt {
  readonly tagsag: Tagsag;
  readonly hatokor: Hatokor;
  readonly csomag: CsomagNev;
  readonly szervezetNev: string;
  readonly felhasznaloNev: string;
}

/**
 * Az aktuális munkamenet. Alfában meghívó-kóddal lépünk be (7.2: kártya nélkül),
 * ezért nincs jelszó-kezelés — de a szerep és a brand-hozzáférés már valódi, mert
 * a szigetelést nem lehet később ráhúzni egy működő felületre.
 */
export async function meneszt(): Promise<Meneszt | undefined> {
  const suti = (await cookies()).get(MENESZT_SUTI)?.value;
  if (suti === undefined) return undefined;

  const t = tar();
  const tagsagok = t.tagsagok(suti);
  const tagsag = tagsagok[0];
  if (tagsag === undefined) return undefined;

  const szervezet = t.szervezet(tagsag.szervezetAzonosito);
  const csapat = t.csapat(hatokorTagsagbol(tagsag));
  const en = csapat.find((x) => x.felhasznalo.azonosito === suti);

  return {
    tagsag,
    hatokor: hatokorTagsagbol(tagsag),
    csomag: (szervezet?.csomag ?? "alfa") as CsomagNev,
    szervezetNev: szervezet?.nev ?? "Szervezet",
    felhasznaloNev: en?.felhasznalo.nev ?? "Felhasználó",
  };
}

/** Oldalak védelme: bejelentkezés nélkül a belépőre irányítunk. */
export async function menesztVagyBelepes(): Promise<Meneszt> {
  const m = await meneszt();
  if (m === undefined) redirect("/belepes");
  return m;
}

export function fokonyv(hatokor: Hatokor, mikor = new Date()): Fokonyv {
  return fokonyvet(tar().kreditTranzakciok(hatokor), mikor);
}

export function csomagKorlatok(csomag: CsomagNev) {
  return CSOMAGOK[csomag];
}

/** Az aktív brand a sütiből; ha nincs, az első elérhető. */
export async function aktivBrandAzonosito(hatokor: Hatokor): Promise<string | undefined> {
  const valasztott = (await cookies()).get("convictly_brand")?.value;
  const brandek = tar().brandek(hatokor);
  if (valasztott !== undefined && brandek.some((b) => b.azonosito === valasztott)) return valasztott;
  return brandek[0]?.azonosito;
}
