/**
 * A böngészőben futó bemutató belépési pontja.
 *
 * Ez NEM külön implementáció: pontosan azokat a függvényeket teszi ki az oldalnak,
 * amiket a csomagok exportálnak és a tesztek mérnek. Ha a szabály itt máshogy
 * viselkedne, mint a CI-ben, az hiba lenne — ezért nincs benne egyetlen sor
 * demó-logika sem, csak újraexportálás.
 */

import { brandEgyezes, brandOr, keszultseget, uresProfil, type BrandProfil } from "@meggyozes/brand";
import { bizonyitekBlokkot, forrasokatSzur, hianyKartya, kerdestOsztalyoz, valasztEllenoriz } from "@meggyozes/kerdezz";
import { futastLezar, inditastEllenoriz } from "@meggyozes/folyamat";
import { brandKapukatErtekel, ketSzamosKapu, qaKapukatErtekel, tervKapukatErtekel } from "@meggyozes/kalibracio";
import { riportokatOsszehasonlit, top5Megvalosulas } from "@meggyozes/projekt";
import { ar, CSOMAGOK, fokonyvet, haviJovairas, jogosult, kiegeszitoVasarlas } from "@meggyozes/szervezet";
import { belepoCsomag, briefetGeneral, intentAllapot, intentKulonbseg, kovetkezoKerdes, tipustFelismer, ujVerzio, uresIntent } from "@meggyozes/tanacs";
import { anonimizal, jeloltetKepez, kuratoriCsomag } from "@meggyozes/tanulas";

export const api = {
  brand: { brandOr, brandEgyezes, keszultseget, uresProfil },
  szervezet: { ar, CSOMAGOK, fokonyvet, haviJovairas, kiegeszitoVasarlas, jogosult },
  folyamat: { inditastEllenoriz, futastLezar },
  tanacs: { tipustFelismer, uresIntent, ujVerzio, intentAllapot, intentKulonbseg, belepoCsomag, kovetkezoKerdes, briefetGeneral },
  kerdezz: { kerdestOsztalyoz, forrasokatSzur, valasztEllenoriz, hianyKartya, bizonyitekBlokkot },
  tanulas: { anonimizal, jeloltetKepez, kuratoriCsomag },
  projekt: { riportokatOsszehasonlit, top5Megvalosulas },
  kalibracio: { tervKapukatErtekel, qaKapukatErtekel, brandKapukatErtekel, ketSzamosKapu },
};

export type { BrandProfil };

declare global {
  interface Window {
    Meggyozes: typeof api;
  }
}

window.Meggyozes = api;
