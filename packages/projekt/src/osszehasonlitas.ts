/**
 * Előtte/utána és riport-összehasonlítás (brief v2.0 W6).
 *
 * Ez a workflow tartja életben a Constitution elsődleges KPI-ját, a 30 napos
 * megvalósítási arányt: enélkül a termék soha nem tudja meg, hogy amit javasolt,
 * az megtörtént-e és használt-e.
 *
 * Egy elv köti meg a modult: MÉRT EREDMÉNYT SOSEM ÁLLÍTUNK ELŐ. A konverzió-változás
 * csak az ügyfél által beírt szám lehet. A rendszer annyit mond, mi tűnt el a
 * listáról és mi jött helyette — a hatás oksági állítása nem a mi dolgunk.
 */

import type { Megallapitas, Megvalositas, Riport } from "./modell";

export type ValtozasTipus = "megszunt" | "uj" | "valtozatlan" | "valtozott";

export interface ParositottMegallapitas {
  readonly elozo: Megallapitas;
  readonly mostani: Megallapitas;
  readonly miValtozott: readonly string[];
}

export interface RiportOsszehasonlitas {
  readonly elozoRiport: string;
  readonly mostaniRiport: string;
  readonly megszunt: readonly Megallapitas[];
  readonly uj: readonly Megallapitas[];
  readonly valtozatlan: readonly ParositottMegallapitas[];
  readonly valtozott: readonly ParositottMegallapitas[];
  readonly osszefoglalo: string;
}

/**
 * Az idézet összevetése szóközre és kis/nagybetűre érzéketlen. A párosítás és a
 * változás-észlelés UGYANEZT használja: ha a kulcs szerint ugyanaz az idézet, akkor
 * a riport sem mondhatja rá, hogy megváltozott.
 */
function idezetNormalizal(idezet: string): string {
  return idezet.replace(/\s+/g, " ").trim().toLowerCase();
}

function idezetKulcs(m: Megallapitas): string {
  return `${m.szabalyKod}::${idezetNormalizal(m.idezet)}`;
}

/**
 * Párosítás két lépésben: előbb szabálykód + idézet (biztos azonosság), utána a
 * maradékon szabálykód szerint, sorrendben. A második lépés azért kell, mert egy
 * javított szöveg ugyanazt a szabályt sértheti MÁS idézettel — az „eltűnt + új" pár
 * ilyenkor félrevezető lenne, hiszen a probléma nem szűnt meg, csak átfogalmazódott.
 */
export function riportokatOsszehasonlit(elozo: Riport, mostani: Riport): RiportOsszehasonlitas {
  const elozoMaradek = [...elozo.megallapitasok];
  const mostaniMaradek = [...mostani.megallapitasok];
  const valtozatlan: ParositottMegallapitas[] = [];
  const valtozott: ParositottMegallapitas[] = [];

  const parba = (e: Megallapitas, m: Megallapitas): void => {
    const miValtozott: string[] = [];
    if (idezetNormalizal(e.idezet) !== idezetNormalizal(m.idezet)) miValtozott.push("idézet");
    if (e.bizonyitekSzint !== m.bizonyitekSzint) miValtozott.push("bizonyíték-fokozat");
    if (e.minosites !== m.minosites) miValtozott.push("minősítés");
    if (e.sav !== m.sav) miValtozott.push("sáv");
    const par: ParositottMegallapitas = { elozo: e, mostani: m, miValtozott };
    if (miValtozott.length === 0) valtozatlan.push(par);
    else valtozott.push(par);
  };

  // 1. kör: azonos szabálykód ÉS azonos idézet.
  for (const e of [...elozoMaradek]) {
    const index = mostaniMaradek.findIndex((m) => idezetKulcs(m) === idezetKulcs(e));
    if (index === -1) continue;
    const m = mostaniMaradek[index];
    if (m === undefined) continue;
    mostaniMaradek.splice(index, 1);
    elozoMaradek.splice(elozoMaradek.indexOf(e), 1);
    parba(e, m);
  }

  // 2. kör: azonos szabálykód, más idézet.
  for (const e of [...elozoMaradek]) {
    const index = mostaniMaradek.findIndex((m) => m.szabalyKod === e.szabalyKod);
    if (index === -1) continue;
    const m = mostaniMaradek[index];
    if (m === undefined) continue;
    mostaniMaradek.splice(index, 1);
    elozoMaradek.splice(elozoMaradek.indexOf(e), 1);
    parba(e, m);
  }

  const osszefoglalo =
    `${elozoMaradek.length} megállapítás eltűnt, ${mostaniMaradek.length} új jelent meg, ` +
    `${valtozott.length} változott, ${valtozatlan.length} maradt változatlanul.`;

  return {
    elozoRiport: elozo.azonosito,
    mostaniRiport: mostani.azonosito,
    megszunt: elozoMaradek,
    uj: mostaniMaradek,
    valtozatlan,
    valtozott,
    osszefoglalo,
  };
}

export interface Top5Megvalosulas {
  readonly javaslatAzonosito: string;
  readonly rangsor: number;
  readonly megvalositasStatusz: Megvalositas["statusz"];
  /**
   * Igaz, ha a javaslathoz tartozó megállapítás eltűnt az új riportból. Ez GÉPI
   * megerősítés az ügyfél jelölése mellé: a kettő eltérése önmagában is jelzés
   * (megvalósítottnak jelölték, de a jel megmaradt — vagy fordítva).
   */
  readonly megallapitasEltunt: boolean;
}

export interface MegvalositasiArany {
  readonly top5Darab: number;
  readonly megvalositott: number;
  /** 0–1; a Constitution elsődleges KPI-ja. */
  readonly arany: number;
  readonly tetelek: readonly Top5Megvalosulas[];
  /** Az ügyfél által beírt mért változások — a rendszer sosem generál ilyet. */
  readonly mertValtozasok: readonly string[];
}

export function top5Megvalosulas(
  elozo: Riport,
  osszehasonlitas: RiportOsszehasonlitas,
  megvalositasok: readonly Megvalositas[],
): MegvalositasiArany {
  const eltunt = new Set(osszehasonlitas.megszunt.map((m) => m.azonosito));
  const statusz = new Map(megvalositasok.map((m) => [m.javaslatAzonosito, m]));

  const top5 = elozo.javaslatok.filter((j) => j.rangsor <= 5).sort((a, b) => a.rangsor - b.rangsor);
  const tetelek: Top5Megvalosulas[] = top5.map((j) => ({
    javaslatAzonosito: j.azonosito,
    rangsor: j.rangsor,
    megvalositasStatusz: statusz.get(j.azonosito)?.statusz ?? "nyitott",
    megallapitasEltunt: eltunt.has(j.megallapitasAzonosito),
  }));

  const megvalositott = tetelek.filter((t) => t.megvalositasStatusz === "megvalositva").length;

  return {
    top5Darab: tetelek.length,
    megvalositott,
    arany: tetelek.length === 0 ? 0 : megvalositott / tetelek.length,
    tetelek,
    mertValtozasok: top5
      .map((j) => statusz.get(j.azonosito)?.mertValtozas)
      .filter((x): x is string => x !== undefined),
  };
}

export interface Elteres {
  readonly javaslatAzonosito: string;
  readonly uzenet: string;
}

/**
 * Az ügyfél jelölése és a gépi megfigyelés eltérései. Ez nem hibalista, hanem
 * beszélgetés-indító: a „megvalósítottuk, de a jel megmaradt" eset a leggyakoribb
 * forrása a félrevalósított javaslatnak — és egyben tanulási jelölt (W9).
 */
export function jelolesElteresek(arany: MegvalositasiArany): readonly Elteres[] {
  return arany.tetelek
    .filter((t) => (t.megvalositasStatusz === "megvalositva") !== t.megallapitasEltunt)
    .map((t) => ({
      javaslatAzonosito: t.javaslatAzonosito,
      uzenet:
        t.megvalositasStatusz === "megvalositva"
          ? "Megvalósítottnak jelöltétek, de a megállapítás az új futásban is megjelenik — érdemes megnézni, ugyanazt javítottátok-e."
          : "A megállapítás eltűnt, pedig a javaslat nincs megvalósítottnak jelölve — ha ti javítottátok, jelöljétek, mert ez a mérés alapja.",
    }));
}
