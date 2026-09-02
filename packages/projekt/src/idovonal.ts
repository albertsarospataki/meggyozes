/**
 * Projekt-idővonal (brief v2.0 3.2, 3.4 „semmi nem vész el").
 *
 * Az idővonal nem naplónézet, hanem a projekt egyetlen igaz állapota: minden futás,
 * verzió, beszélgetés és visszajelzés ide kerül. A rendezés fordított időrend, mert
 * a felhasználó kérdése mindig „mi történt legutóbb, és mi a következő lépés”.
 */

import type { Artefaktum, Futas, Koteg, Megvalositas, Riport } from "./modell";

export type IdovonalTipus =
  | "artefaktum"
  | "koteg"
  | "futas"
  | "riport"
  | "megvalositas";

export interface IdovonalElem {
  readonly tipus: IdovonalTipus;
  readonly azonosito: string;
  readonly mikor: string;
  readonly cim: string;
  readonly reszlet: string | undefined;
}

export interface IdovonalBemenet {
  readonly artefaktumok?: readonly Artefaktum[];
  readonly kotegek?: readonly Koteg[];
  readonly futasok?: readonly Futas[];
  readonly riportok?: readonly Riport[];
  readonly megvalositasok?: readonly Megvalositas[];
  /** A megvalósítás-elemhez a javaslat címe; enélkül csak azonosító látszana. */
  readonly javaslatCimek?: Readonly<Record<string, string>>;
}

const MOD_NEVEK = { audit: "Audit", tanacs: "Tanács", kerdezz: "Kérdezz" } as const;

export function idovonal(b: IdovonalBemenet): readonly IdovonalElem[] {
  const elemek: IdovonalElem[] = [];

  for (const a of b.artefaktumok ?? []) {
    elemek.push({
      tipus: "artefaktum",
      azonosito: a.azonosito,
      mikor: a.rogzitve,
      cim: `Artefaktum — ${a.megnevezes}`,
      reszlet: a.masodikMegfigyeles === undefined ? `${a.ajto} ajtó` : `${a.ajto} ajtó, kétidőpontos`,
    });
  }

  for (const k of b.kotegek ?? []) {
    elemek.push({
      tipus: "koteg",
      azonosito: k.azonosito,
      // A köteg maga nem hordoz időt: a benne foglalt artefaktumok kötik időhöz,
      // ezért a leírás melletti üres idő helyett a projekt-elem sorrendje dönt.
      mikor: "",
      cim: `Köteg — ${k.leiras}`,
      reszlet: `${k.artefaktumAzonositok.length} artefaktum együtt`,
    });
  }

  for (const f of b.futasok ?? []) {
    elemek.push({
      tipus: "futas",
      azonosito: f.azonosito,
      mikor: f.inditva,
      cim: `${MOD_NEVEK[f.mod]} futás`,
      reszlet: `${f.statusz} · ${f.kreditKoltseg} kredit · tudásbázis ${f.tudasbazisVerzio}`,
    });
  }

  for (const r of b.riportok ?? []) {
    elemek.push({
      tipus: "riport",
      azonosito: r.azonosito,
      mikor: r.keszult,
      cim: `Riport v${r.verzio} — ${MOD_NEVEK[r.mod]}`,
      reszlet: `${r.megallapitasok.length} megállapítás · ${r.javaslatok.length} javaslat · ${r.statusz}`,
    });
  }

  for (const m of b.megvalositasok ?? []) {
    if (m.jelolve === undefined) continue;
    const cim = b.javaslatCimek?.[m.javaslatAzonosito] ?? m.javaslatAzonosito;
    elemek.push({
      tipus: "megvalositas",
      azonosito: m.javaslatAzonosito,
      mikor: m.jelolve,
      cim: `Megvalósítás — ${cim}`,
      reszlet: m.mertValtozas === undefined ? m.statusz : `${m.statusz} · mért változás: ${m.mertValtozas}`,
    });
  }

  // Az idő nélküli elem (köteg) a lista végére kerül, nem az elejére: az „utoljára
  // történt" nézetben a keltezetlen tétel sosem előzheti meg a keltezettet.
  return elemek.sort((a, z) => {
    if (a.mikor === "" && z.mikor === "") return 0;
    if (a.mikor === "") return 1;
    if (z.mikor === "") return -1;
    return Date.parse(z.mikor) - Date.parse(a.mikor);
  });
}

export interface KovetkezoLepes {
  readonly cim: string;
  readonly indoklas: string;
  readonly muvelet: "audit" | "tanacs" | "kerdezz" | "megvalositas_jeloles" | "ujra_audit" | "brand_tanitas";
}

export interface KovetkezoLepesBemenet {
  readonly riportok: readonly Riport[];
  readonly megvalositasok: readonly Megvalositas[];
  readonly brandKeszultseg: number;
  readonly mikor: Date;
}

/** Hány nap után kérdezünk rá a megvalósításra (a Constitution elsődleges KPI-ja 30 napos). */
export const MEGVALOSITAS_EMLEKEZTETO_NAP = 30;

/**
 * „Mindig van következő lépés" (3.4). A sorrend szándékos: előbb a már elvégzett
 * munka behajtása (megvalósítás, visszamérés), csak utána új futás ajánlása — a
 * termék nem attól hasznos, hogy sokat futtat, hanem attól, hogy megvalósul valami.
 */
export function kovetkezoLepes(b: KovetkezoLepesBemenet): KovetkezoLepes {
  if (b.riportok.length === 0) {
    return b.brandKeszultseg < 2
      ? {
          cim: "Taníts be egy brandet (10 perc)",
          indoklas: "Brand-profil nélkül a rendszer csak általános javaslatot tud adni.",
          muvelet: "brand_tanitas",
        }
      : {
          cim: "Indíts egy auditot",
          indoklas: "A brand készen áll; egy meglévő landing auditja adja a leggyorsabb visszajelzést.",
          muvelet: "audit",
        };
  }

  const legfrissebb = [...b.riportok].sort((a, z) => Date.parse(z.keszult) - Date.parse(a.keszult))[0];
  if (legfrissebb === undefined) throw new Error("Nem üres riportlistából nem kaptunk elemet.");

  const top5 = legfrissebb.javaslatok.filter((j) => j.rangsor <= 5);
  const statusz = new Map(b.megvalositasok.map((m) => [m.javaslatAzonosito, m]));
  const nyitottTop = top5.filter((j) => (statusz.get(j.azonosito)?.statusz ?? "nyitott") === "nyitott");

  if (nyitottTop.length > 0) {
    return {
      cim: "Jelöld, mit valósítottatok meg a top-5-ből",
      indoklas: `${nyitottTop.length} javaslat még nyitott. A megvalósítási arány a termék elsődleges KPI-ja — enélkül nem mérhető.`,
      muvelet: "megvalositas_jeloles",
    };
  }

  const megvalositott = top5
    .map((j) => statusz.get(j.azonosito))
    .filter((m): m is NonNullable<typeof m> => m?.statusz === "megvalositva" && m.jelolve !== undefined);

  const visszameretlen = megvalositott.filter((m) => {
    const eltelt = (b.mikor.getTime() - Date.parse(m.jelolve as string)) / 86_400_000;
    return m.mertValtozas === undefined && eltelt >= MEGVALOSITAS_EMLEKEZTETO_NAP;
  });

  if (visszameretlen.length > 0) {
    return {
      cim: "Mérjük vissza a megvalósított javaslatokat",
      indoklas: `${MEGVALOSITAS_EMLEKEZTETO_NAP} napja megvalósítottátok, de nincs előtte/utána mérés — az újra-audit megmutatja, mi tűnt el a listáról.`,
      muvelet: "ujra_audit",
    };
  }

  return {
    cim: "Validáljunk egy készülő anyagot",
    indoklas: "A meglévő anyagok rendben; a következő kampány vagy oldal terve előzetes validációval olcsóbban javítható.",
    muvelet: "tanacs",
  };
}
