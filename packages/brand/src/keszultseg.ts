/**
 * Brand-készültség 0–5 (brief v2.0 4.2 záró bekezdés).
 *
 * Nem dísz: a riport masthead-je ezt mutatja, és ez dönti el, hogy a rendszer
 * brand-kontextusú vagy általános javaslatot ad (Brand-elv, 2.4). Ezért a mérőnek
 * meg kell tudnia mondani azt is, MELYIK hiányzó blokk MELY javaslatot tenné
 * pontosabbá — a felhasználó különben nem tudja, miért érné meg tanítani.
 */

import type { BrandProfil } from "./profil";

export const BRAND_BLOKKOK = [
  "alapadatok",
  "pozicionalas",
  "celkozonseg",
  "hangnem",
  "vizualisJegyek",
  "ajanlatStruktura",
  "bizonyitekTar",
  "jogiKeret",
  "piac",
  "meres",
  "tanultMintazatok",
] as const;

export type BrandBlokk = (typeof BRAND_BLOKKOK)[number];

/**
 * Súlyok. A hangnem és a bizonyíték-tár azért a legnehezebb, mert a brand-őr
 * (DET 8.) kizárólag ezekből dolgozik: tiltólista nélkül nincs mit visszaküldeni,
 * proof point nélkül minden szám helyőrző marad. A vizuális jegyek és a tanult
 * mintázatok azért könnyűek, mert hiányuk csak pontosságot visz el, működést nem.
 */
export const BLOKK_SULYOK: Readonly<Record<BrandBlokk, number>> = {
  alapadatok: 3,
  pozicionalas: 3,
  celkozonseg: 2,
  hangnem: 3,
  vizualisJegyek: 1,
  ajanlatStruktura: 2,
  bizonyitekTar: 3,
  jogiKeret: 2,
  piac: 1,
  meres: 1,
  tanultMintazatok: 1,
};

/** Mit tesz pontosabbá az adott blokk — a felületen ez a „miért tanítsak" szöveg. */
export const BLOKK_HATASA: Readonly<Record<BrandBlokk, string>> = {
  alapadatok: "P0 kontextus-előtöltés és az ágazati szabály-szűrő (P7)",
  pozicionalas: "az ígéret-egyezés blokk és a „most ez van → helyette ez” javaslatok",
  celkozonseg: "a tölcsérpozíció szerinti szabályválasztás és a kifogáskezelés",
  hangnem: "minden bemásolható szövegminta és a tiltott kifejezések kiszűrése",
  vizualisJegyek: "a képi jelosztályok (Elrendezés, Vizuális minta) értelmezése",
  ajanlatStruktura: "az árazási és viszonyítási-ár szabályok, a garancia-közlés",
  bizonyitekTar: "a szuperlatívusz- és szám-őr: enélkül minden szám helyőrző marad",
  jogiKeret: "a 0-sáv (jogi KO) ágazati modulja és a kötelező jelölések",
  piac: "a kategória-normákhoz viszonyítás a javaslatokban",
  meres: "a „mit mérj” utasítások és az előtte/utána visszamérés",
  tanultMintazatok: "a brandre jellemző ismétlődő lyukak előrevétele a top-5-ben",
};

/** Egy blokk kitöltöttsége 0–1: hány érdemi mezője van kitöltve. */
function arany(kitoltott: number, osszes: number): number {
  return osszes === 0 ? 0 : kitoltott / osszes;
}

const vanSzoveg = (x: string | undefined): boolean => x !== undefined && x.trim() !== "";
const vanElem = (x: readonly unknown[]): boolean => x.length > 0;

export function blokkKitoltottseg(p: BrandProfil, blokk: BrandBlokk): number {
  switch (blokk) {
    case "alapadatok": {
      const a = p.alapadatok;
      const mezok = [
        vanSzoveg(a.nev),
        vanSzoveg(a.agazat),
        a.uzletiModell !== undefined,
        vanSzoveg(a.piacEsNyelv),
        vanSzoveg(a.joghatosag),
        vanElem(a.domainek),
      ];
      return arany(mezok.filter(Boolean).length, mezok.length);
    }
    case "pozicionalas": {
      const x = p.pozicionalas;
      const mezok = [
        vanSzoveg(x.foIgeret),
        x.ertekek.length >= 3,
        vanSzoveg(x.differencialas),
        vanElem(x.amitSosemMondunk),
      ];
      return arany(mezok.filter(Boolean).length, mezok.length);
    }
    case "celkozonseg": {
      // A séma 1–4 szegmenst kér; a második szegmenstől már teljesnek vesszük,
      // de csak akkor, ha a döntési szakasz is megvan — anélkül a szegmens név csak címke.
      const ertekes = p.szegmensek.filter((s) => vanSzoveg(s.megnevezes) && vanSzoveg(s.dontesiSzakasz));
      return Math.min(ertekes.length / 2, 1);
    }
    case "hangnem": {
      const h = p.hangnem;
      const mezok = [
        h.megszolitas !== undefined,
        h.kotelezoKifejezesek.length >= 3,
        h.tiltottKifejezesek.length >= 5,
        h.peldamondatok.length >= 3,
      ];
      return arany(mezok.filter(Boolean).length, mezok.length);
    }
    case "vizualisJegyek": {
      const v = p.vizualisJegyek;
      const mezok = [
        vanElem(v.szinek),
        vanSzoveg(v.tipografia),
        vanSzoveg(v.logoSzabalyok),
        vanSzoveg(v.kepiStilus),
      ];
      return arany(mezok.filter(Boolean).length, mezok.length);
    }
    case "ajanlatStruktura": {
      if (p.ajanlatok.length === 0) return 0;
      const teljes = p.ajanlatok.filter((a) => vanSzoveg(a.ar)).length;
      return Math.min(0.5 + 0.5 * arany(teljes, p.ajanlatok.length), 1);
    }
    case "bizonyitekTar":
      // Öt proof point az a mennyiség, ami körül a szuperlatívusz-őr már nem
      // mindent helyőrzőz — ez tapasztalati küszöb, nem mért érték.
      return Math.min(p.bizonyitekTar.length / 5, 1);
    case "jogiKeret": {
      const j = p.jogiKeret;
      const mezok = [vanElem(j.kotelezettsegek), vanElem(j.kotelezoJelolesek)];
      return arany(mezok.filter(Boolean).length, mezok.length);
    }
    case "piac":
      return Math.min(p.versenytarsak.length / 3, 1);
    case "meres": {
      const m = p.meres;
      const mezok = [vanElem(m.elerhetoForrasok), vanElem(m.kpik)];
      return arany(mezok.filter(Boolean).length, mezok.length);
    }
    case "tanultMintazatok":
      return Math.min(p.tanultMintazatok.length / 3, 1);
  }
}

export interface BlokkAllapot {
  readonly blokk: BrandBlokk;
  readonly kitoltottseg: number;
  readonly suly: number;
  readonly mitTennePontosabba: string;
}

export interface Keszultseg {
  /** 0–5, egy tizedesre kerekítve — ez látszik a brand-kártyán és a mastheaden. */
  readonly pont: number;
  readonly blokkok: readonly BlokkAllapot[];
  /** A leginkább hiányzó blokkok súly szerint — a „mit taníts most" ajánló. */
  readonly hianyzok: readonly BlokkAllapot[];
  /**
   * A Brand-elv kapuja: profil nélkül a rendszer általános javaslatot ad, és ezt
   * kimondja. A küszöb alatt a riport brand-blokkja a „taníts brandet" ágra megy.
   */
  readonly brandKontextusHasznalhato: boolean;
}

/** A küszöb, ami fölött a javaslatokat brand-kontextusúnak nevezzük. */
export const BRAND_KONTEXTUS_KUSZOB = 2;

export function keszultseget(p: BrandProfil): Keszultseg {
  const blokkok: BlokkAllapot[] = BRAND_BLOKKOK.map((blokk) => ({
    blokk,
    kitoltottseg: blokkKitoltottseg(p, blokk),
    suly: BLOKK_SULYOK[blokk],
    mitTennePontosabba: BLOKK_HATASA[blokk],
  }));

  const osszSuly = blokkok.reduce((s, b) => s + b.suly, 0);
  const elert = blokkok.reduce((s, b) => s + b.suly * b.kitoltottseg, 0);
  const pont = Math.round((elert / osszSuly) * 5 * 10) / 10;

  const hianyzok = blokkok
    .filter((b) => b.kitoltottseg < 1)
    .sort((a, b) => b.suly * (1 - b.kitoltottseg) - a.suly * (1 - a.kitoltottseg));

  return {
    pont,
    blokkok,
    hianyzok,
    brandKontextusHasznalhato: pont >= BRAND_KONTEXTUS_KUSZOB,
  };
}
