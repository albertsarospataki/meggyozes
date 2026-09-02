/**
 * Az audit-pipeline — P0-tól P11-ig (a P12 HUM-kaput a folyamat-réteg zárja le).
 *
 * A lépések sorrendje a fejlesztői specifikációé, és a sorrend maga is szabály:
 * jel ELŐBB, szabály UTÁNA. Ha a szabályt hívnánk elő először, és utána keresnénk
 * hozzá jelet, a rendszer megtalálná, amit keres — ez a kalibráció legdrágább
 * hibája, és pontosan az álpozitívok forrása.
 *
 * Amit a pipeline soha nem tesz: nem ír számot, amit nem az anyagból idéz, és nem
 * ad ki megállapítást idézet nélkül.
 */

import type { ArtefaktumObjektum } from "@meggyozes/bemenet";
import { brandEgyezes, brandOr, type BrandEgyezes, type BrandProfil } from "@meggyozes/brand";
import type { AuditKontextus, Sav } from "@meggyozes/core";
import type { Javaslat, Megallapitas } from "@meggyozes/projekt";
import type { MotorTudasbazis, Szabaly } from "./tudasbazis";

export interface DetektorVerzio {
  readonly tudasbazisVerzio: string;
  readonly promptVerzio: string;
  readonly detVerzio: string;
  readonly modell: string;
}

export interface SavAllapot {
  readonly nev: string;
  readonly allapot: "ok" | "reszleges" | "hibas" | "semleges";
  readonly ertek: string;
}

export interface PozitivVisszaigazolas {
  readonly kod: string;
  readonly cim: string;
  readonly idezet: string;
}

export interface AuditRiport {
  readonly osszefoglalo: string;
  readonly masthead: {
    readonly cim: string;
    readonly forras: string;
    readonly brandNev: string | undefined;
    readonly tudasbazisVerzio: string;
    readonly detektorVerzio: string;
  };
  readonly korlatok: readonly string[];
  readonly savok: readonly SavAllapot[];
  readonly pozitivak: readonly PozitivVisszaigazolas[];
  readonly megallapitasok: readonly Megallapitas[];
  readonly javaslatok: readonly Javaslat[];
  readonly brandEgyezes: BrandEgyezes;
  readonly kerdesek: readonly string[];
  /** A futás emberi nyelvű lépései — futás közben ez látszik a felületen. */
  readonly naplo: readonly string[];
}

export interface AuditBemenet {
  readonly objektum: ArtefaktumObjektum;
  readonly kontextus: AuditKontextus;
  readonly profil: BrandProfil | undefined;
  readonly brandNev: string | undefined;
  readonly tudasbazis: MotorTudasbazis;
  readonly verzio: DetektorVerzio;
  readonly mikor?: Date;
}

const SAV_SORREND: readonly Sav[] = ["0 Jogi KO", "1 Etikai KO", "2 Meresi KO", "3 Hatasossag es hiany"];

/** A rangsor két szorzója: a sáv súlya és a beavatkozás olcsósága (Constitution §5). */
const SAV_SULY: Readonly<Record<Sav, number>> = {
  "0 Jogi KO": 4,
  "1 Etikai KO": 3,
  "2 Meresi KO": 2,
  "3 Hatasossag es hiany": 1,
};

const BEAVATKOZAS_SULY: Readonly<Record<Szabaly["beavatkozasiSzint"], number>> = {
  Szövegcsere: 1.5,
  Felületátalakítás: 1,
  "Folyamat- vagy rendszerváltoztatás": 0.5,
};

export function auditotFuttat(b: AuditBemenet): AuditRiport {
  const mikor = b.mikor ?? new Date();
  const naplo: string[] = [];
  const { objektum, tudasbazis } = b;

  naplo.push(
    `Betöltöttem az anyagot (${objektum.ajto} ajtó), ${objektum.blokkok.length} szövegblokkot találtam.`,
  );

  // P2 — jel-detektálás. Csak azok a jelek futnak, amelyek ezen az ajtón értelmezhetők.
  const ertelmezheto = tudasbazis.jelek.filter((j) => j.ajtok.includes(objektum.ajto));
  const nemErtelmezheto = tudasbazis.jelek.filter((j) => !j.ajtok.includes(objektum.ajto));

  const talalatok = ertelmezheto.flatMap((jel) =>
    jel.megfigyel(objektum).map((t) => ({ jel, talalat: t })),
  );
  naplo.push(`${talalatok.length} jelet találtam ${ertelmezheto.length} futtatható jelosztályból.`);

  // P3 — elvárások: a pozitívan hiányzó detekció.
  const hianyok = tudasbazis.elvarasok
    .filter((e) => e.ajtok.includes(objektum.ajto))
    .filter((e) => !e.teljesul(objektum));
  naplo.push(`${hianyok.length} elvárás nem teljesült.`);

  // P7 — szabály-előhívás kódon. Szabad szöveges illesztés tilos.
  const megallapitasok: Megallapitas[] = [];
  let sorszam = 0;

  for (const szabaly of tudasbazis.szabalyok) {
    const sajat = talalatok.filter((x) => szabaly.kivaltoJelek.includes(x.jel.kod));
    for (const x of sajat) {
      sorszam += 1;
      megallapitasok.push({
        azonosito: `M-${sorszam}`,
        szabalyKod: szabaly.kod,
        jelKodok: [x.jel.kod],
        technikaKodok: [...szabaly.technikak],
        idezet: x.talalat.idezet,
        sav: szabaly.sav,
        // A site-chrome elem sosem a törzs hibája: a fokozat gyanúra esik.
        bizonyitekSzint: x.talalat.blokk.siteChrome ? "gyanu" : x.talalat.bizonyitekSzint,
        minosites: "problema",
        forras: szabaly.forras,
      });
    }
  }

  for (const hiany of hianyok) {
    const szabaly = tudasbazis.szabalyok.find((s) => s.kod === hiany.szabalyKod);
    if (szabaly === undefined) continue;
    sorszam += 1;
    megallapitasok.push({
      azonosito: `M-${sorszam}`,
      szabalyKod: szabaly.kod,
      jelKodok: [],
      technikaKodok: [...szabaly.technikak],
      idezet: objektum.arak[0] ?? objektum.cim ?? objektum.forras,
      sav: szabaly.sav,
      bizonyitekSzint: "teny",
      minosites: "problema",
      forras: szabaly.forras,
    });
  }

  // Pozitív visszaigazolás — kötelező blokk, és nem melléktermék: a jól működő
  // technika saját tétel, nem „nem találtunk hibát".
  const pozitivak: PozitivVisszaigazolas[] = tudasbazis.pozitivak.flatMap((p) => {
    const talalat = talalatok.find((x) => x.jel.kod === p.jelKod);
    return talalat === undefined ? [] : [{ kod: p.kod, cim: p.cim, idezet: talalat.talalat.idezet }];
  });

  // P10 — javaslatok, rangsorolva; a szövegminták átmennek a brand-őrön.
  const javaslatok: Javaslat[] = megallapitasok
    .map((m) => {
      const szabaly = tudasbazis.szabalyok.find((s) => s.kod === m.szabalyKod);
      if (szabaly === undefined) return undefined;
      const suly = SAV_SULY[m.sav] * BEAVATKOZAS_SULY[szabaly.beavatkozasiSzint];
      return { m, szabaly, suly };
    })
    .filter((x): x is NonNullable<typeof x> => x !== undefined)
    .sort((a, z) => z.suly - a.suly)
    .map((x, i): Javaslat => {
      const or = brandOr({ szoveg: x.szabaly.helyetteEz, profil: b.profil, mikor });
      return {
        azonosito: `J-${i + 1}`,
        megallapitasAzonosito: x.m.azonosito,
        mostEzVan: x.szabaly.mostEzVan,
        // A brand-őr helyőrzőzött szövege megy ki; visszaküldésnél a javaslat a
        // szabály semleges alakjában marad, és a riport jelzi a szerkesztendőt.
        helyetteEz: or.kiadhato ? or.helyorzosSzoveg : x.szabaly.helyetteEz,
        variansok: x.szabaly.variansok,
        beavatkozasiSzint: x.szabaly.beavatkozasiSzint,
        varhatoHatas: x.szabaly.varhatoHatas,
        jogiMegjegyzes: x.szabaly.jogiMegjegyzes,
        rangsor: i + 1,
      };
    });

  naplo.push(`${megallapitasok.length} megállapítás, ${javaslatok.length} javaslat készült.`);

  const savok = savokatSzamol(megallapitasok, javaslatok);
  const egyezes = brandEgyezes(objektum.szoveg, b.profil, mikor);

  const kerdesek = kerdesekEpit(b.kontextus, objektum, nemErtelmezheto.map((j) => j.megnevezes));

  return {
    osszefoglalo: osszefoglalotIr(megallapitasok, javaslatok, pozitivak, objektum),
    masthead: {
      cim: objektum.cim ?? objektum.forras,
      forras: objektum.forras,
      brandNev: b.brandNev,
      tudasbazisVerzio: b.verzio.tudasbazisVerzio,
      detektorVerzio: `${b.verzio.detVerzio} · prompt ${b.verzio.promptVerzio} · ${b.verzio.modell}`,
    },
    korlatok: [
      ...objektum.korlatok,
      ...(tudasbazis.demo
        ? ["Demó tudásbázis fut: a teljes szabálytár a Notion-szinkron után élesedik."]
        : []),
      ...(b.profil === undefined ? ["Nincs brand-profil: a javaslatok általánosak."] : []),
    ],
    savok,
    pozitivak,
    megallapitasok,
    javaslatok,
    brandEgyezes: egyezes,
    kerdesek,
    naplo,
  };
}

function savokatSzamol(
  megallapitasok: readonly Megallapitas[],
  javaslatok: readonly Javaslat[],
): SavAllapot[] {
  const nevek: Readonly<Record<Sav, string>> = {
    "0 Jogi KO": "Jogi KO",
    "1 Etikai KO": "Etikai KO",
    "2 Meresi KO": "Mérési",
    "3 Hatasossag es hiany": "Hatásosság",
  };

  return SAV_SORREND.map((sav) => {
    const darab = megallapitasok.filter((m) => m.sav === sav).length;
    if (sav === "3 Hatasossag es hiany") {
      // A hatásossági sáv a TELJES megállapítás-számhoz viszonyít: a „top 5 / 23"
      // azt mondja meg, hányból választottuk ki az ötöt (brandbook 8.3).
      const top = Math.min(5, javaslatok.length);
      return {
        nev: nevek[sav],
        allapot: darab === 0 ? "ok" : "reszleges",
        ertek: `top ${top} / ${megallapitasok.length}`,
      };
    }
    if (sav === "2 Meresi KO") {
      return { nev: nevek[sav], allapot: darab === 0 ? "semleges" : "reszleges", ertek: darab === 0 ? "nincs nyitott" : `${darab} nyitott` };
    }
    // A KO-sávban a talált tétel emberi ellenőrzésre megy (P12); a riport ezt jelzi.
    return { nev: nevek[sav], allapot: darab === 0 ? "ok" : "hibas", ertek: darab === 0 ? "0 · üres" : `${darab} · HUM` };
  });
}

/**
 * A 20–40 másodperces összefoglaló. Sablonból épül, nem modellből: köznyelvi, kód
 * nélküli, és csak olyat állít, ami a megállapításokból következik.
 */
function osszefoglalotIr(
  megallapitasok: readonly Megallapitas[],
  javaslatok: readonly Javaslat[],
  pozitivak: readonly PozitivVisszaigazolas[],
  objektum: ArtefaktumObjektum,
): string {
  const ko = megallapitasok.filter((m) => m.sav === "0 Jogi KO" || m.sav === "1 Etikai KO").length;
  const elso = javaslatok[0];
  const mi = objektum.cim ?? objektum.forras;

  const mondatok = [
    `Ez az anyag: ${mi}.`,
    pozitivak.length > 0
      ? `Ami már működik: ${pozitivak.map((p) => p.cim.toLowerCase()).join("; ")}.`
      : "Egyértelműen jól működő elemet nem találtam — ez nem hiba, csak nincs mire építeni a javaslatokat.",
    megallapitasok.length === 0
      ? "Technikai értelemben nem találtam megállapítást."
      : `${megallapitasok.length} megállapítás született${ko > 0 ? `, ebből ${ko} kizáró okot érint` : ""}.`,
    elso === undefined
      ? "Nincs elsőként javasolt lépés."
      : `Első lépésnek ezt javaslom: ${elso.helyetteEz}`,
  ];

  return mondatok.join(" ");
}

/** Tisztázó kérdések: a kontextus hiányaiból és az ajtó korlátaiból, 5–8 darab. */
function kerdesekEpit(
  kontextus: AuditKontextus,
  objektum: ArtefaktumObjektum,
  nemErtelmezhetoJelek: readonly string[],
): string[] {
  const kerdesek: string[] = [];
  if (kontextus.uzletiModell === undefined) kerdesek.push("B2B vagy B2C közönségnek szól ez az anyag?");
  if (kontextus.agazat === undefined) kerdesek.push("Melyik ágazatban dolgoztok? Ettől függ, mely szabályok relevánsak.");
  if (kontextus.artefaktumCel === undefined) kerdesek.push("Mi az anyag célja: vásárlás, foglalás, lead, feliratkozás vagy tájékoztatás?");
  if (kontextus.tolcserPozicio === undefined) kerdesek.push("Hol tart a látogató, amikor ideér: hideg, meleg vagy visszatérő?");
  if (objektum.arak.length > 0) kerdesek.push("A feltüntetett ár tartalmazza az áfát és a szállítást?");
  if (nemErtelmezhetoJelek.length > 0) {
    kerdesek.push(
      `Ezen az ajtón nem tudtam megítélni: ${nemErtelmezhetoJelek.slice(0, 3).join(", ")}. Fel tudsz tölteni képernyőképet?`,
    );
  }
  kerdesek.push("Van olyan része az anyagnak, amire külön figyeljek a következő futásnál?");
  return kerdesek.slice(0, 8);
}
