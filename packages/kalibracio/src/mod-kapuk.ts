/**
 * A három üzemmód release-kapui (brief v2.0 9. fejezet).
 *
 * Az audit-kapu (Constitution §6) eddig is megvolt: PASS ≥ 85%, kötelező recall ≥ 92%,
 * kontroll-álpozitív = 0, tiltott ≤ 1%. A v2.0 két új üzemmódot és egy új őrt hoz,
 * és mindegyiknek SAJÁT bázisa és saját mércéje van — közös átlag helyett. Egy
 * összevont szám elrejtené, hogy a Kérdezz mód forrás nélküli állítást enged ki,
 * miközben az audit szépen teljesít.
 *
 * Ami mindhárom kapunál közös: a jelentés MINDIG két számot mutat, tanuló és held-out
 * bontásban. A held-out készlet vak mérce; ha az összevont szám mögé bújna, a
 * romlása észrevétlen maradna.
 */

import type { KapuEredmeny, KapuErtekeles } from "./kapuk";

/** A bázisok elvárt mérete a 9. fejezet szerint. */
export const BAZIS_MERETEK = { audit: 150, terv: 30, qa: 40, brand: 20 } as const;

/** A held-out arány a Q&A-bázison: 30 tanuló / 10 held-out. */
export const QA_HELD_OUT = 10;

export const MOD_KAPUK = {
  tervPassArany: 0.85,
  /** A fordított kontrollokon a helyes válasz a lebeszélés + alternatíva. */
  tervForditottKontrollArany: 1,
  tervKoSertesMax: 0,
  qaForrasNelkuliMax: 0,
  qaHianyKimondasArany: 1,
  qaRelevanciaKuszob: 0.55,
  brandTiltottMax: 0,
  brandNemIgazoltSzamMax: 0,
} as const;

const szazalek = (x: number): string => `${(x * 100).toFixed(1)}%`;

const ertekeles = (
  nev: string,
  teljesult: boolean,
  mert: number,
  kuszob: number,
  uzenet: string,
): KapuErtekeles => ({ nev, teljesult, mert, kuszob, uzenet });

function eredmeny(kapuk: readonly KapuErtekeles[]): KapuEredmeny {
  return { kiadhato: kapuk.every((k) => k.teljesult), kapuk };
}

export interface TervFutasOsszesito {
  readonly tesztekSzama: number;
  readonly passDarab: number;
  /**
   * Fordított kontrollok: a brief szerint 4–5 olyan terv, ahol a HELYES válasz az,
   * hogy „ezt ne építsd meg". Ez a Tanács mód kontroll-mintája — az álpozitív párja.
   */
  readonly forditottKontrollok: number;
  readonly forditottKontrollHelyes: number;
  /** A §4/b kapun átcsúszott saját javaslatok száma. Nullának kell lennie. */
  readonly sajatJavaslatKoSertes: number;
}

export function tervKapukatErtekel(o: TervFutasOsszesito): KapuEredmeny {
  const passArany = o.tesztekSzama === 0 ? 0 : o.passDarab / o.tesztekSzama;
  const kontrollArany = o.forditottKontrollok === 0 ? 0 : o.forditottKontrollHelyes / o.forditottKontrollok;

  return eredmeny([
    ertekeles(
      "Terv PASS-arány",
      passArany >= MOD_KAPUK.tervPassArany,
      passArany,
      MOD_KAPUK.tervPassArany,
      `${o.passDarab}/${o.tesztekSzama} teszt (${szazalek(passArany)}), küszöb ${szazalek(MOD_KAPUK.tervPassArany)}`,
    ),
    ertekeles(
      "Fordított kontroll (lebeszélés + alternatíva)",
      o.forditottKontrollok > 0 && kontrollArany >= MOD_KAPUK.tervForditottKontrollArany,
      kontrollArany,
      MOD_KAPUK.tervForditottKontrollArany,
      o.forditottKontrollok === 0
        ? "Nincs fordított kontroll a bázisban — a mód kontroll-minta nélkül nem élesíthető."
        : `${o.forditottKontrollHelyes}/${o.forditottKontrollok} kontrollon helyes a lebeszélés`,
    ),
    ertekeles(
      "Saját javaslat KO-sértés",
      o.sajatJavaslatKoSertes <= MOD_KAPUK.tervKoSertesMax,
      o.sajatJavaslatKoSertes,
      MOD_KAPUK.tervKoSertesMax,
      o.sajatJavaslatKoSertes === 0
        ? "A kiadott javaslatok egyike sem érint KO-sávot."
        : `${o.sajatJavaslatKoSertes} KO-sávos saját javaslat — AZONNALI BLOKK: a tanács létrehozza a kárt.`,
    ),
  ]);
}

export interface QaFutasOsszesito {
  readonly tesztekSzama: number;
  readonly forrasNelkuliAllitasok: number;
  /** „Erre nincs mért eredmény" kontrollok (a bázisban 8 ilyen van). */
  readonly nincsBizonyitekKontrollok: number;
  readonly helyesHianyKimondas: number;
  /** Hány válasz épült küszöb alatti relevanciájú forrásból. */
  readonly kuszobAlattiValaszok: number;
}

export function qaKapukatErtekel(o: QaFutasOsszesito): KapuEredmeny {
  const hianyArany = o.nincsBizonyitekKontrollok === 0 ? 0 : o.helyesHianyKimondas / o.nincsBizonyitekKontrollok;

  return eredmeny([
    ertekeles(
      "Forrás nélküli állítás",
      o.forrasNelkuliAllitasok <= MOD_KAPUK.qaForrasNelkuliMax,
      o.forrasNelkuliAllitasok,
      MOD_KAPUK.qaForrasNelkuliMax,
      o.forrasNelkuliAllitasok === 0
        ? `0 forrás nélküli állítás ${o.tesztekSzama} válaszban`
        : `${o.forrasNelkuliAllitasok} állítás forrás nélkül — a Kérdezz mód alapszerződését sérti.`,
    ),
    ertekeles(
      "Hiány-kimondás a „nincs bizonyíték” kontrollokon",
      o.nincsBizonyitekKontrollok > 0 && hianyArany >= MOD_KAPUK.qaHianyKimondasArany,
      hianyArany,
      MOD_KAPUK.qaHianyKimondasArany,
      o.nincsBizonyitekKontrollok === 0
        ? "Nincs „nincs bizonyíték” kontroll a bázisban — enélkül a hiány-ág mérhetetlen."
        : `${o.helyesHianyKimondas}/${o.nincsBizonyitekKontrollok} kontrollon mondta ki a hiányt`,
    ),
    ertekeles(
      "Küszöb alatti forrásból épült válasz",
      o.kuszobAlattiValaszok === 0,
      o.kuszobAlattiValaszok,
      0,
      o.kuszobAlattiValaszok === 0
        ? `Minden válasz ${MOD_KAPUK.qaRelevanciaKuszob} feletti relevanciájú forrásból épült`
        : `${o.kuszobAlattiValaszok} válasz küszöb alatti forrásból — magabiztosnak látszik, de nem bizonyít.`,
    ),
  ]);
}

export interface BrandFutasOsszesito {
  readonly tesztekSzama: number;
  /** Két mintabranden mérve (9. fejezet). */
  readonly tiltottKifejezesKimenetben: number;
  readonly nemIgazoltSzamKimenetben: number;
}

export function brandKapukatErtekel(o: BrandFutasOsszesito): KapuEredmeny {
  return eredmeny([
    ertekeles(
      "Tiltott kifejezés a kimenetben",
      o.tiltottKifejezesKimenetben <= MOD_KAPUK.brandTiltottMax,
      o.tiltottKifejezesKimenetben,
      MOD_KAPUK.brandTiltottMax,
      o.tiltottKifejezesKimenetben === 0
        ? `0 tiltott kifejezés ${o.tesztekSzama} brand-teszten`
        : `${o.tiltottKifejezesKimenetben} tiltott kifejezés — a brand-őr nem futott vagy megkerülhető.`,
    ),
    ertekeles(
      "Nem igazolt szám a kimenetben",
      o.nemIgazoltSzamKimenetben <= MOD_KAPUK.brandNemIgazoltSzamMax,
      o.nemIgazoltSzamKimenetben,
      MOD_KAPUK.brandNemIgazoltSzamMax,
      o.nemIgazoltSzamKimenetben === 0
        ? "Minden szám idézetből vagy proof pointból származik"
        : `${o.nemIgazoltSzamKimenetben} igazolatlan szám — a helyőrzőzés nem futott le.`,
    ),
  ]);
}

export interface KeszletBontas<T> {
  readonly tanulo: T;
  readonly heldOut: T;
}

export interface KetSzamosKapu {
  readonly tanulo: KapuEredmeny;
  readonly heldOut: KapuEredmeny;
  /** Csak akkor élesíthető, ha MINDKÉT készleten zöld. */
  readonly kiadhato: boolean;
  readonly uzenet: string;
}

/**
 * Kapuértékelés készletenként. A governance szabálya: a kapu mindig két számot mutat.
 * Ha csak az összevont szám látszana, egy held-out romlást elfedhetne a tanuló
 * készlet javulása — pontosan az a hiba, ami ellen a held-out készlet létezik.
 */
export function ketSzamosKapu<T>(bontas: KeszletBontas<T>, ertekelo: (o: T) => KapuEredmeny): KetSzamosKapu {
  const tanulo = ertekelo(bontas.tanulo);
  const heldOut = ertekelo(bontas.heldOut);
  const kiadhato = tanulo.kiadhato && heldOut.kiadhato;
  return {
    tanulo,
    heldOut,
    kiadhato,
    uzenet: kiadhato
      ? "Mindkét készleten zöld."
      : `Blokk: ${!tanulo.kiadhato ? "tanuló" : ""}${!tanulo.kiadhato && !heldOut.kiadhato ? " és " : ""}${!heldOut.kiadhato ? "held-out" : ""} készleten bukott kapu.`,
  };
}

export interface BazisLelet {
  readonly bazis: keyof typeof BAZIS_MERETEK;
  readonly elvart: number;
  readonly mert: number;
  readonly uzenet: string;
}

/**
 * Alulméretezett bázis. Nem kapu, hanem lelet: a 30 terv-gold és a 40 Q&A-gold a
 * KIADÁS feltétele, de amíg épül, a mérésnek futnia kell — csak látszania kell, hogy
 * a szám még nem a teljes bázison áll.
 */
export function bazisLelet(bazis: keyof typeof BAZIS_MERETEK, tesztekSzama: number): BazisLelet | undefined {
  const elvart = BAZIS_MERETEK[bazis];
  if (tesztekSzama >= elvart) return undefined;
  return {
    bazis,
    elvart,
    mert: tesztekSzama,
    uzenet: `A ${bazis} bázis ${tesztekSzama} teszt, az elvárt ${elvart}. A kapu fut, de a szám még nem a teljes bázison áll.`,
  };
}
