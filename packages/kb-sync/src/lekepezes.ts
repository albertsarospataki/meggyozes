import {
  ALLAPOT_LEKEPEZES,
  AUTOMATIZALHATOSAG_LEKEPEZES,
  BEAVATKOZASI_ARANY,
  MINTA_TIPUS_LEKEPEZES,
  SAV_LEKEPEZES,
  kodotNormalizal,
  type Allapot,
  type AranystandardTeszt,
  type Diszkriminans,
  type Elvaras,
  type Jel,
  type Kombinacio,
  type Szabaly,
  type Technika,
} from "@meggyozes/core";
import type { NotionOldal } from "./notion-kliens.js";
import { TAR_FORRASOK, type TarNev } from "./forrasok.js";

/**
 * Notion-oldal → domain sor.
 *
 * A relációk a Notionben oldal-ID-kre mutatnak, nem kódokra. A leképezés ezért
 * KÉTMENETES: előbb minden tárból kigyűjtjük az ID→kód térképet, utána képezünk le.
 * Enélkül a jel→szabály előhívás (P7) ID-kkel dolgozna, ami a riportban
 * visszavezethetetlen hivatkozásokat adna.
 */

type Property = Record<string, unknown> & { type?: string };

function prop(oldal: NotionOldal, nev: string): Property | undefined {
  const p = oldal.properties[nev];
  return typeof p === "object" && p !== null ? (p as Property) : undefined;
}

function gazdagSzoveg(ertek: unknown): string | undefined {
  if (!Array.isArray(ertek)) return undefined;
  const szoveg = ertek
    .map((r) => (typeof r === "object" && r !== null ? String((r as { plain_text?: string }).plain_text ?? "") : ""))
    .join("")
    .trim();
  return szoveg.length > 0 ? szoveg : undefined;
}

export function szoveg(oldal: NotionOldal, nev: string): string | undefined {
  const p = prop(oldal, nev);
  if (!p) return undefined;
  return gazdagSzoveg(p["rich_text"]) ?? gazdagSzoveg(p["title"]);
}

export function szam(oldal: NotionOldal, nev: string): number | undefined {
  const ertek = prop(oldal, nev)?.["number"];
  return typeof ertek === "number" ? ertek : undefined;
}

export function pipa(oldal: NotionOldal, nev: string): boolean {
  return prop(oldal, nev)?.["checkbox"] === true;
}

export function url(oldal: NotionOldal, nev: string): string | undefined {
  const ertek = prop(oldal, nev)?.["url"];
  return typeof ertek === "string" && ertek.length > 0 ? ertek : undefined;
}

export function valasztas(oldal: NotionOldal, nev: string): string | undefined {
  const s = prop(oldal, nev)?.["select"];
  if (typeof s !== "object" || s === null) return undefined;
  const nevErtek = (s as { name?: unknown }).name;
  return typeof nevErtek === "string" ? nevErtek : undefined;
}

export function tobbValasztas(oldal: NotionOldal, nev: string): string[] {
  const lista = prop(oldal, nev)?.["multi_select"];
  if (!Array.isArray(lista)) return [];
  return lista
    .map((e) => (typeof e === "object" && e !== null ? (e as { name?: unknown }).name : undefined))
    .filter((n): n is string => typeof n === "string");
}

export function relacioIdk(oldal: NotionOldal, nev: string): string[] {
  const lista = prop(oldal, nev)?.["relation"];
  if (!Array.isArray(lista)) return [];
  return lista
    .map((e) => (typeof e === "object" && e !== null ? (e as { id?: unknown }).id : undefined))
    .filter((id): id is string => typeof id === "string");
}

/** Notion oldal-ID → az adott sor kódja. A relációfeloldás szótára. */
export type KodTerkep = ReadonlyMap<string, string>;

/**
 * Feloldja a reláció ID-ket kódokra. Az ismeretlen ID-t KIHAGYJA, de a hívó a
 * konzisztencia-ellenőrzésben árva relációként jelzi — némán soha nem tűnhet el.
 */
function relaciok(oldal: NotionOldal, nev: string, terkep: KodTerkep): string[] {
  return relacioIdk(oldal, nev)
    .map((id) => terkep.get(id))
    .filter((kod): kod is string => kod !== undefined);
}

function allapot(oldal: NotionOldal, nev = "Állapot"): Allapot {
  const nyers = valasztas(oldal, nev);
  // Alapértelmezés: Aktív. Ez szándékos — a Notionben az üres Állapot élő sort jelent,
  // a karanténos és visszavont sorokat kifejezetten megjelölik.
  return (nyers !== undefined ? ALLAPOT_LEKEPEZES[nyers] : undefined) ?? "Aktiv";
}

/** Egy tár összes sorából felépíti az ID→kód térképet. */
export function kodTerkepetEpit(
  oldalankent: ReadonlyMap<TarNev, readonly NotionOldal[]>,
): KodTerkep {
  const terkep = new Map<string, string>();
  for (const [tar, oldalak] of oldalankent) {
    const kodMezo = TAR_FORRASOK[tar].kodMezo;
    for (const oldal of oldalak) {
      const nyersKod = szoveg(oldal, kodMezo);
      if (nyersKod) terkep.set(oldal.id, kodotNormalizal(nyersKod));
    }
  }
  return terkep;
}

export function szabalytLekepez(oldal: NotionOldal, terkep: KodTerkep): Szabaly | undefined {
  const kod = szoveg(oldal, "Szabálykód");
  if (!kod) return undefined;
  const savNyers = valasztas(oldal, "Sáv");
  const beavatkozasNyers = valasztas(oldal, "Beavatkozási arány");
  const automatizalasNyers = valasztas(oldal, "Automatizálhatóság");

  return {
    kod: kodotNormalizal(kod),
    cim: szoveg(oldal, "Cím") ?? "",
    szabaly: szoveg(oldal, "Szabály (HA→AKKOR→MERT)") ?? "",
    rosszJo: szoveg(oldal, "Rossz → jó"),
    sav: savNyers ? SAV_LEKEPEZES[savNyers] : undefined,
    allapot: allapot(oldal),
    hatokor: valasztas(oldal, "Hatókör"),
    artefaktumOsztaly: tobbValasztas(oldal, "Artefaktum-osztály"),
    felulet: tobbValasztas(oldal, "Felület") as Szabaly["felulet"],
    tolcser: tobbValasztas(oldal, "Tölcsér") as Szabaly["tolcser"],
    mechanizmus: tobbValasztas(oldal, "Mechanizmus") as Szabaly["mechanizmus"],
    automatizalhatosag: automatizalasNyers ? AUTOMATIZALHATOSAG_LEKEPEZES[automatizalasNyers] : undefined,
    mvpStatusz: valasztas(oldal, "MVP-státusz"),
    bizonyitekero: szam(oldal, "Bizonyítékerő"),
    beavatkozasiArany: beavatkozasNyers ? BEAVATKOZASI_ARANY[beavatkozasNyers] : undefined,
    hatasmeret: szoveg(oldal, "Hatásméret"),
    hatasmeretErteke: szam(oldal, "Hatásméret értéke"),
    kivaltoJelek: relaciok(oldal, "Kiváltó jelek", terkep),
    technikak: relaciok(oldal, "Technika", terkep),
    kotelezoKontextus: tobbValasztas(oldal, "Kötelező kontextus"),
    jogiHivatkozas: szoveg(oldal, "Jogi hivatkozás"),
    ellenjavallat: szoveg(oldal, "Ellenjavallat"),
    forrasjegyzet: szoveg(oldal, "Forrásjegyzet"),
    notionUrl: oldal.url,
  };
}

export function jeletLekepez(oldal: NotionOldal, terkep: KodTerkep): Jel | undefined {
  const kod = szoveg(oldal, "Jelkód");
  if (!kod) return undefined;
  return {
    kod: kodotNormalizal(kod),
    megnevezes: szoveg(oldal, "Megnevezés") ?? "",
    megfigyelesiModszer: szoveg(oldal, "Megfigyelési módszer"),
    jelosztaly: valasztas(oldal, "Jelosztály"),
    jelreteg: tobbValasztas(oldal, "Jelréteg"),
    kinyerhetoseg: valasztas(oldal, "Kinyerhetőség"),
    megfigyelesIdobelisege: valasztas(oldal, "Megfigyelés időbelisége"),
    ketertelmu: pipa(oldal, "Kétértelmű"),
    elhatarolas: szoveg(oldal, "Rokon / elhatárolandó jelek"),
    alpozitivKockazat: szoveg(oldal, "Álpozitív kockázat"),
    kivaltottSzabalyok: relaciok(oldal, "Kiváltott szabályok", terkep),
    technikak: relaciok(oldal, "Technika", terkep),
    diszkriminansTesztek: relaciok(oldal, "Diszkrimináns tesztek", terkep),
    notionUrl: oldal.url,
  };
}

const TECHNIKA_ALLAPOT: Readonly<Record<string, Technika["allapot"]>> = {
  Aktív: "Aktiv",
  Vitatott: "Vitatott",
  Kerülendő: "Kerulendo",
};

export function technikatLekepez(oldal: NotionOldal, terkep: KodTerkep): Technika | undefined {
  const kod = szoveg(oldal, "Technikakód");
  if (!kod) return undefined;
  const allapotNyers = valasztas(oldal, "Állapot");
  return {
    kod: kodotNormalizal(kod),
    nev: szoveg(oldal, "Technika neve") ?? "",
    meghatarozas: szoveg(oldal, "Egymondatos meghatározás"),
    sotetValtozat: szoveg(oldal, "Sötét változat"),
    legitimValtozat: szoveg(oldal, "Legitim változat"),
    valasztovonal: szoveg(oldal, "A kettő közti választóvonal"),
    allapot: allapotNyers ? TECHNIKA_ALLAPOT[allapotNyers] : undefined,
    jogiTet: pipa(oldal, "Jogi tét"),
    jelek: relaciok(oldal, "Jelek", terkep),
    szabalyok: relaciok(oldal, "Szabályok", terkep),
    notionUrl: oldal.url,
  };
}

export function diszkriminanstLekepez(oldal: NotionOldal, terkep: KodTerkep): Diszkriminans | undefined {
  const kod = szoveg(oldal, "D-kód");
  if (!kod) return undefined;
  return {
    kod: kodotNormalizal(kod),
    kerdes: szoveg(oldal, "A kérdés") ?? "",
    igenAg: szoveg(oldal, "IGEN ág"),
    nemAg: szoveg(oldal, "NEM ág"),
    haNemEldontheto: szoveg(oldal, "Ha nem eldönthető"),
    elvegzesModja: szoveg(oldal, "Az elvégzés módja"),
    kiTudjaElvegezni: valasztas(oldal, "Ki tudja elvégezni"),
    melyikJelhez: relaciok(oldal, "Melyik jelhez", terkep),
    notionUrl: oldal.url,
  };
}

const VISZONY: Readonly<Record<string, Kombinacio["viszony"]>> = {
  Erősítés: "Erosites",
  Kioltás: "Kioltas",
  Telítődés: "Telitodes",
  "Jogi súlyosbítás": "Jogi sulyosbitas",
};

export function kombinaciotLekepez(oldal: NotionOldal, terkep: KodTerkep): Kombinacio | undefined {
  const kod = szoveg(oldal, "K-kód");
  if (!kod) return undefined;
  const viszonyNyers = valasztas(oldal, "Viszony");
  return {
    kod: kodotNormalizal(kod),
    megnevezes: szoveg(oldal, "Megnevezés") ?? "",
    viszony: viszonyNyers ? VISZONY[viszonyNyers] : undefined,
    hatasIranya: szoveg(oldal, "Hatás iránya"),
    egyutallJelek: relaciok(oldal, "Együttálló jelek", terkep),
    bizonyitekero: szam(oldal, "Bizonyítékerő"),
    notionUrl: oldal.url,
  };
}

export function elvarastLekepez(oldal: NotionOldal, terkep: KodTerkep): Elvaras | undefined {
  const kod = szoveg(oldal, "Elváráskód");
  if (!kod) return undefined;
  const savNyers = valasztas(oldal, "Hiány sávja");
  const kotelezettsegNyers = valasztas(oldal, "Kötelezettség");
  return {
    kod: kodotNormalizal(kod),
    megnevezes: szoveg(oldal, "Megnevezés") ?? "",
    mitKellTartalmaznia: szoveg(oldal, "Mit kell tartalmaznia"),
    hogyanEllenorizheto: szoveg(oldal, "Hogyan ellenőrizhető"),
    mikorNemElvaras: szoveg(oldal, "Mikor NEM elvárás"),
    kotelezettseg:
      kotelezettsegNyers === "Kötelező" ? "Kotelezo" : kotelezettsegNyers === "Ajánlott" ? "Ajanlott" : undefined,
    hianySavja: savNyers ? SAV_LEKEPEZES[savNyers] : undefined,
    artefaktumOsztaly: tobbValasztas(oldal, "Artefaktum-osztály"),
    artefaktumCelja: tobbValasztas(oldal, "Az artefaktum célja"),
    felulet: tobbValasztas(oldal, "Felület") as Elvaras["felulet"],
    hianyJel: relaciok(oldal, "Hiány-jel", terkep),
    allapot: allapot(oldal),
    notionUrl: oldal.url,
  };
}

export function aranystandardotLekepez(oldal: NotionOldal): AranystandardTeszt | undefined {
  const nev = szoveg(oldal, "Teszt neve");
  if (!nev) return undefined;
  const mintaNyers = valasztas(oldal, "Minta típusa");
  return {
    nev,
    mintaTipus: mintaNyers ? MINTA_TIPUS_LEKEPEZES[mintaNyers] : undefined,
    artefaktumOsztaly: valasztas(oldal, "Artefaktum-osztály"),
    forrasTipus: valasztas(oldal, "Forrás-típus"),
    befagyasztottTartalom: szoveg(oldal, "Befagyasztott tartalom"),
    kontextus: szoveg(oldal, "Kontextus"),
    elvartKotelezo: szoveg(oldal, "Elvárt megállapítások (kötelező)"),
    elvartOpcionalis: szoveg(oldal, "Elvárt megállapítások (opcionális)"),
    tiltottTalalatok: szoveg(oldal, "Tiltott találatok"),
    sikerkriterium: szoveg(oldal, "Sikerkritérium"),
    statusz: valasztas(oldal, "Státusz"),
    nehezsegiSzint: valasztas(oldal, "Nehézségi szint"),
    url: url(oldal, "userDefined:URL"),
    notionUrl: oldal.url,
  };
}
