/**
 * §4/b kapu — a rendszer SAJÁT javaslatára (brief v2.0 2.4, Tervezői mód „egy döntés,
 * ami nem halasztható").
 *
 * Az aszimmetria a következmény oldalán van: egy audit, ami elnéz valamit, egy elmaradt
 * javítást ér; egy tanács, ami sötét mintát javasol, LÉTREHOZZA a kárt. Ezért az
 * auditban érvényes MELLETT-elv (a KO-sávos megállapítás kimegy, mellette
 * figyelmeztetéssel) a Tanács módban kemény kapuvá válik: a KO-sávot érintő saját
 * javaslat NEM adható ki, hanem alternatívát kell helyette adni.
 */

import type { Sav } from "@meggyozes/core";

export type KapuDontes = "kiadhato" | "visszakuldes" | "kiadhato_figyelmeztetessel";

export interface JavaslatJelolt {
  readonly azonosito: string;
  readonly szoveg: string;
  readonly sav: Sav;
  /** Igaz, ha a javaslat egy technika sötét változatát írja le. */
  readonly sotetValtozat: boolean;
  readonly technikaKod: string | undefined;
}

export interface KapuEredmeny {
  readonly dontes: KapuDontes;
  readonly indoklas: string;
  /** Mit tegyen a motor a visszaküldött javaslattal. */
  readonly teendo: string | undefined;
}

const KO_SAVOK: readonly Sav[] = ["0 Jogi KO", "1 Etikai KO"];

/**
 * Kemény kapu a saját javaslatra. A mérési KO-sáv (2) nem blokkol, de figyelmeztetést
 * kap: ott a javaslat nem árt, csak mérhetetlen — és a mérhetetlenség javítható a
 * „mit mérj" utasítással.
 */
export function sajatJavaslatKapu(javaslat: JavaslatJelolt): KapuEredmeny {
  if (javaslat.sotetValtozat) {
    return {
      dontes: "visszakuldes",
      indoklas: "A javaslat egy technika sötét változatát írja le; saját javaslatként ez nem adható ki.",
      teendo: "Adj helyette legitim változatot ugyanarra a mechanizmusra, és mondd ki, mi a különbség.",
    };
  }
  if (KO_SAVOK.includes(javaslat.sav)) {
    return {
      dontes: "visszakuldes",
      indoklas: `A javaslat a(z) „${javaslat.sav}" sávot érinti. Auditban ez megjegyzéssel kimenne, tanácsként nem: a tanács létrehozza a kárt.`,
      teendo: "Alternatíva kell, vagy a lebeszélés indoklással — a KO-sávos mechanika nem javasolható.",
    };
  }
  if (javaslat.sav === "2 Meresi KO") {
    return {
      dontes: "kiadhato_figyelmeztetessel",
      indoklas: "A javaslat hatása a jelenlegi méréssel nem igazolható vissza.",
      teendo: "Tedd mellé a mérési utasítást, és mondd ki, mit nem fogtok látni.",
    };
  }
  return { dontes: "kiadhato", indoklas: "A javaslat nem érint KO-sávot.", teendo: undefined };
}

export interface KapuOsszesites {
  readonly kiadhatok: readonly JavaslatJelolt[];
  readonly visszakuldottek: readonly { readonly javaslat: JavaslatJelolt; readonly eredmeny: KapuEredmeny }[];
  readonly figyelmeztetettek: readonly { readonly javaslat: JavaslatJelolt; readonly eredmeny: KapuEredmeny }[];
  /**
   * A 9. fejezet Tanács-kapuja: „saját javaslat KO-sértés = 0" a KIADOTT kimenetre.
   * Szerkezetileg nulla — a kapu épp ezt tartja fenn; a gold-futás azt méri, hogy a
   * kapu tényleg lefutott-e, nem azt, hogy a generátor sosem hibázik.
   */
  readonly kiadottKoSertes: number;
  /**
   * Hány javaslatot fogott meg a kapu. Ez a GENERÁTOR hibaaránya, nem a kimeneté:
   * ha nő, a P10′ építőelemekkel vagy a prompt-tal van baj, és a CI-nek látnia kell.
   */
  readonly elfogottKoSertes: number;
}

export function kapuzottJavaslatok(javaslatok: readonly JavaslatJelolt[]): KapuOsszesites {
  const kiadhatok: JavaslatJelolt[] = [];
  const visszakuldottek: { javaslat: JavaslatJelolt; eredmeny: KapuEredmeny }[] = [];
  const figyelmeztetettek: { javaslat: JavaslatJelolt; eredmeny: KapuEredmeny }[] = [];

  for (const javaslat of javaslatok) {
    const eredmeny = sajatJavaslatKapu(javaslat);
    if (eredmeny.dontes === "visszakuldes") visszakuldottek.push({ javaslat, eredmeny });
    else if (eredmeny.dontes === "kiadhato_figyelmeztetessel") {
      figyelmeztetettek.push({ javaslat, eredmeny });
      kiadhatok.push(javaslat);
    } else kiadhatok.push(javaslat);
  }

  return {
    kiadhatok,
    visszakuldottek,
    figyelmeztetettek,
    kiadottKoSertes: kiadhatok.filter((j) => j.sotetValtozat || KO_SAVOK.includes(j.sav)).length,
    elfogottKoSertes: visszakuldottek.length,
  };
}
