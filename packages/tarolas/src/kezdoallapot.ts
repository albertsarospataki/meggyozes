/**
 * Kezdőállapot — az alfa első szervezete és brandje.
 *
 * A brief 7.2 szerint az alfa nem csomag, hanem állapot: meghívóval, kártya nélkül,
 * Pro-képességekkel, a havi kerettel környezeti változóból. Ez a függvény ezt az
 * állapotot állítja elő, és semmi mást — kitalált riportot, hamis mérést nem vet be,
 * mert a termék első elve, hogy nem talál ki adatot. Ami itt szerepel, az egy üres,
 * használatra kész fiók.
 */

import { uresProfil, type BrandProfil } from "@meggyozes/brand";
import { haviJovairas } from "@meggyozes/szervezet";
import type { Tar } from "./tar";

export interface KezdoallapotBeallitas {
  readonly szervezetNev: string;
  readonly email: string;
  readonly felhasznaloNev: string;
  readonly haviKredit: number;
  readonly mikor: string;
}

export const ALFA_ALAP: KezdoallapotBeallitas = {
  szervezetNev: "Alfa szervezet",
  email: "albert@convictly.com",
  felhasznaloNev: "Albert Sárospataki",
  haviKredit: 1200,
  mikor: new Date().toISOString(),
};

/** Egy hónapnyi ciklus a jóváíráshoz — a keret a ciklus végén lejár (7.4). */
function ciklus(mikor: string): { kezdet: string; vege: string } {
  const d = new Date(mikor);
  const kezdet = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const vege = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return { kezdet: kezdet.toISOString(), vege: vege.toISOString() };
}

export interface Kezdoallapot {
  readonly szervezetAzonosito: string;
  readonly felhasznaloAzonosito: string;
}

export function kezdoallapototLetrehoz(tar: Tar, b: KezdoallapotBeallitas = ALFA_ALAP): Kezdoallapot {
  const szervezetAzonosito = "szerv-alfa";
  const felhasznaloAzonosito = "u-tulajdonos";

  if (tar.szervezet(szervezetAzonosito) !== undefined) {
    return { szervezetAzonosito, felhasznaloAzonosito };
  }

  tar.szervezetetMent({ azonosito: szervezetAzonosito, nev: b.szervezetNev, csomag: "alfa", letrehozva: b.mikor });
  tar.felhasznalotMent({ azonosito: felhasznaloAzonosito, email: b.email, nev: b.felhasznaloNev });
  tar.tagsagotMent({
    felhasznaloAzonosito,
    szervezetAzonosito,
    szerep: "tulajdonos",
    brandHozzaferes: "mind",
  });

  const c = ciklus(b.mikor);
  tar.kreditetMent([
    haviJovairas({ szervezetAzonosito, haviKredit: b.haviKredit, ciklusKezdet: c.kezdet, ciklusVege: c.vege }),
  ]);

  return { szervezetAzonosito, felhasznaloAzonosito };
}

/** Új brand üres profillal — a tanítás a kérdőívvel kezdődik, nem előtöltéssel. */
export function ujBrandProfil(azonosito: string, szervezetAzonosito: string, nev: string): BrandProfil {
  return uresProfil(azonosito, szervezetAzonosito, nev);
}
