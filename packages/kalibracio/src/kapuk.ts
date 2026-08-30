import type { FutasOsszesito, TesztPontszam } from "./pontozas.js";

/**
 * Release-blokkoló kapuk (Product Constitution v1.0 §6, kalibrált mércék 2026-08-29).
 * Ezeket minden detektor-változat élesítése előtt teljesíteni kell.
 */
export const KAPUK = {
  passArany: 0.85,
  kotelezoRecall: 0.92,
  /** Egyetlen kontroll-álpozitív azonnali blokk. Ez az alfa-KPI. */
  kontrollAlpozitivMax: 0,
  tiltottArany: 0.01,
} as const;

/** A #6 kalibrációs futás mért értékei — ehhez viszonyítunk minden későbbi futást. */
export const ALAPVONAL_FUTAS_6 = {
  passArany: 0.9,
  kotelezoRecall: 0.967,
  kontrollAlpozitiv: 0,
  tiltottArany: 0.007,
} as const;

export interface KapuErtekeles {
  readonly nev: string;
  readonly teljesult: boolean;
  readonly mert: number;
  readonly kuszob: number;
  readonly uzenet: string;
}

export interface KapuEredmeny {
  readonly kiadhato: boolean;
  readonly kapuk: readonly KapuErtekeles[];
}

const szazalek = (x: number): string => `${(x * 100).toFixed(1)}%`;

export function kapukatErtekel(o: FutasOsszesito): KapuEredmeny {
  const kapuk: KapuErtekeles[] = [
    {
      nev: "PASS-arány",
      teljesult: o.passArany >= KAPUK.passArany,
      mert: o.passArany,
      kuszob: KAPUK.passArany,
      uzenet: `${o.passDarab}/${o.tesztekSzama} teszt (${szazalek(o.passArany)}), küszöb ${szazalek(KAPUK.passArany)}`,
    },
    {
      nev: "Kötelező kód-recall",
      teljesult: o.kotelezoRecall >= KAPUK.kotelezoRecall,
      mert: o.kotelezoRecall,
      kuszob: KAPUK.kotelezoRecall,
      uzenet: `${o.kotelezoTeljesult}/${o.kotelezoTetelekSzama} tétel (${szazalek(o.kotelezoRecall)}), küszöb ${szazalek(KAPUK.kotelezoRecall)}`,
    },
    {
      nev: "Kontroll-álpozitív",
      teljesult: o.kontrollAlpozitiv <= KAPUK.kontrollAlpozitivMax,
      mert: o.kontrollAlpozitiv,
      kuszob: KAPUK.kontrollAlpozitivMax,
      uzenet:
        o.kontrollAlpozitiv === 0
          ? `0 álpozitív ${o.kontrollTesztek} kontroll-mintán`
          : `${o.kontrollAlpozitiv} álpozitív — AZONNALI BLOKK (alfa-KPI)`,
    },
    {
      nev: "Tiltott találat",
      teljesult: o.tiltottArany <= KAPUK.tiltottArany,
      mert: o.tiltottArany,
      kuszob: KAPUK.tiltottArany,
      uzenet: `${o.tiltottTesztek}/${o.tesztekSzama} teszt (${szazalek(o.tiltottArany)}), küszöb ${szazalek(KAPUK.tiltottArany)}`,
    },
  ];

  return { kiadhato: kapuk.every((k) => k.teljesult), kapuk };
}

export interface Regresszio {
  readonly azonosito: string;
  readonly nev: string;
  readonly hianyzoKotelezo: readonly string[];
}

/**
 * Regresszió-riasztás: egy korábban stabil PASS-teszt bukása KIEMELT jelzés, nem
 * átlagban elrejtett szórás. Az összesített PASS-arány javulhat úgy is, hogy közben
 * korábban működő tesztek elromlanak — ezt a futásátlag elfedi, ez a függvény nem.
 */
export function regressziokatKeres(
  elozo: readonly TesztPontszam[],
  mostani: readonly TesztPontszam[],
): Regresszio[] {
  const elozoPass = new Set(elozo.filter((p) => p.pass).map((p) => p.azonosito));
  return mostani
    .filter((p) => !p.pass && elozoPass.has(p.azonosito))
    .map((p) => ({
      azonosito: p.azonosito,
      nev: p.nev,
      hianyzoKotelezo: p.kotelezo
        .filter((t) => !t.teljesult)
        .flatMap((t) => t.tetel.kodok),
    }));
}
