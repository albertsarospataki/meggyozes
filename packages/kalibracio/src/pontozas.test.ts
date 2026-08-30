import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { Detekcio, FuttatasEredmeny, MintaTipus } from "@meggyozes/core";
import { EkvivalenciaTerkep, type EkvivalenciaTerkepAdat } from "./ekvivalencia.js";
import {
  elvarasokatElemez,
  futastOsszesit,
  kiadottKodok,
  tesztetPontoz,
  type TesztElvaras,
} from "./pontozas.js";

const terkep = EkvivalenciaTerkep.betolt(
  JSON.parse(
    readFileSync(new URL("../data/ekvivalencia-terkep.v4.json", import.meta.url), "utf8"),
  ) as EkvivalenciaTerkepAdat,
);

function det(kod: string, r: Partial<Detekcio> = {}): Detekcio {
  return {
    kod,
    idezet: "idézet az artefaktumból",
    minosites: "problema",
    bizonyitekSzint: "teny",
    ...r,
  };
}

function eredmeny(detekciok: Detekcio[], nyersKimenet = ""): FuttatasEredmeny {
  return { tesztAzonosito: "t01", detekciok, nyersKimenet };
}

function elvaras(r: Partial<TesztElvaras> & { mintaTipus?: MintaTipus }): TesztElvaras {
  return {
    azonosito: "t01",
    nev: "01 · teszt",
    mintaTipus: "Negativ",
    kotelezo: [],
    opcionalis: [],
    tiltott: [],
    kodNelkuliSorok: [],
    ...r,
  };
}

describe("elvarasokatElemez — a gold szabad szövegének értelmezése", () => {
  it("soronként bont, és a listajeleket levágja", () => {
    const { tetelek } = elvarasokatElemez("- J-011 visszainduló számláló\n- TK-001 hamis sürgetés");
    expect(tetelek.map((t) => t.kodok)).toEqual([["J-011"], ["TK-001"]]);
  });

  it("pontozási szabály 3: a VAGY egyetlen tétellé fogja a kódokat", () => {
    const { tetelek } = elvarasokatElemez("TK-071 VAGY TK-049 — egészség-halo");
    expect(tetelek).toHaveLength(1);
    expect(tetelek[0]?.kodok).toEqual(["TK-071", "TK-049"]);
  });

  it("VAGY nélkül egy soron belül minden kód külön kötelező tétel", () => {
    const { tetelek } = elvarasokatElemez("J-204 és J-403 együtt adandó ki");
    expect(tetelek).toHaveLength(2);
  });

  it("a «·» és a «;» is tételhatár", () => {
    const { tetelek } = elvarasokatElemez("J-011 · J-033; TK-001");
    expect(tetelek.map((t) => t.kodok.at(0))).toEqual(["J-011", "J-033", "TK-001"]);
  });

  it("a kód nélküli sort nem pontozza, de nyilvántartja", () => {
    const { tetelek, kodNelkuliSorok } = elvarasokatElemez(
      "J-011 számláló\nhiányzik a szimmetrikus lemondás lehetősége",
    );
    expect(tetelek).toHaveLength(1);
    expect(kodNelkuliSorok).toEqual(["hiányzik a szimmetrikus lemondás lehetősége"]);
  });

  it("üres mezőre üres eredmény", () => {
    expect(elvarasokatElemez(undefined).tetelek).toEqual([]);
    expect(elvarasokatElemez("   ").tetelek).toEqual([]);
  });
});

describe("kiadottKodok — a szándékos aszimmetria", () => {
  it("pontozási szabály 1: a prózában elejtett kód is a kötelező oldalon számít", () => {
    const { mind } = kiadottKodok(
      eredmeny([det("J-011")], "Pozitív visszaigazolás: az érvkészlet kiegyensúlyozott (J-448)."),
    );
    expect(mind).toContain("J-011");
    expect(mind).toContain("J-448");
  });

  it("a prózában elejtett kód a tiltott oldalon NEM számít — nem vádol", () => {
    const { tiltottraSzamit } = kiadottKodok(eredmeny([], "megfontoltuk a TK-001 lehetőségét"));
    expect(tiltottraSzamit.size).toBe(0);
  });

  it("pontozási szabály 2: a gyanú soha nem tiltott találat", () => {
    const e = eredmeny([det("TK-001", { bizonyitekSzint: "gyanu" })]);
    expect(kiadottKodok(e).mind).toContain("TK-001");
    expect(kiadottKodok(e).tiltottraSzamit.size).toBe(0);
  });

  it("a nem eldönthető státusz sem vádol", () => {
    const e = eredmeny([det("TK-062", { bizonyitekSzint: "nem-eldontheto" })]);
    expect(kiadottKodok(e).tiltottraSzamit.size).toBe(0);
  });

  it("a pozitív minősítés nem tiltott találat", () => {
    const e = eredmeny([det("J-215", { minosites: "pozitiv" })]);
    expect(kiadottKodok(e).tiltottraSzamit.size).toBe(0);
  });

  it("a site-chrome elem nem számít törzs-találatnak", () => {
    const e = eredmeny([det("J-337", { siteChrome: true })]);
    expect(kiadottKodok(e).tiltottraSzamit.size).toBe(0);
  });
});

describe("tesztetPontoz", () => {
  it("PASS, ha minden kötelező teljesül és nincs tiltott találat", () => {
    const p = tesztetPontoz(
      elvaras({ kotelezo: elvarasokatElemez("J-011\nTK-045").tetelek }),
      eredmeny([det("J-011"), det("J-215")]),
      terkep,
    );
    expect(p.pass).toBe(true);
    // A TK-045-öt a J-215 teljesítette az 1. térkép-tétel szerint.
    expect(p.kotelezo[1]?.indok?.fajta).toBe("ekvivalens");
  });

  it("FAIL, ha egyetlen kötelező tétel hiányzik", () => {
    const p = tesztetPontoz(
      elvaras({ kotelezo: elvarasokatElemez("J-011\nJ-033").tetelek }),
      eredmeny([det("J-011")]),
      terkep,
    );
    expect(p.pass).toBe(false);
    expect(p.kotelezo.filter((t) => !t.teljesult)).toHaveLength(1);
  });

  it("a gyanúként jelölt helyes kód TELJESÍTI a kötelező tételt (2. szabály)", () => {
    const p = tesztetPontoz(
      elvaras({ kotelezo: elvarasokatElemez("TK-001").tetelek }),
      eredmeny([det("TK-001", { bizonyitekSzint: "gyanu" })]),
      terkep,
    );
    expect(p.pass).toBe(true);
  });

  it("FAIL tiltott találatra", () => {
    const p = tesztetPontoz(
      elvaras({ tiltott: elvarasokatElemez("TK-026").tetelek }),
      eredmeny([det("TK-026")]),
      terkep,
    );
    expect(p.pass).toBe(false);
    expect(p.tiltottTalalatok).toEqual(["TK-026"]);
  });

  it("az ekvivalencia a tiltott oldalt NEM lazítja — rokon kód nem visz ki vádat", () => {
    // A J-215 ekvivalens a TK-045-tel, de ha a tiltott lista TK-045-öt mond,
    // a J-215 kiadása nem számít tiltott találatnak.
    const p = tesztetPontoz(
      elvaras({ tiltott: elvarasokatElemez("TK-045").tetelek }),
      eredmeny([det("J-215")]),
      terkep,
    );
    expect(p.tiltottTalalatok).toEqual([]);
    expect(p.pass).toBe(true);
  });

  it("kontroll-mintán MINDEN tényként állított probléma álpozitív", () => {
    const p = tesztetPontoz(
      elvaras({ mintaTipus: "Kontroll" }),
      eredmeny([det("J-337")]),
      terkep,
    );
    expect(p.alpozitivak).toEqual(["J-337"]);
    expect(p.pass).toBe(false);
  });

  it("a technikamentes kontroll üres kimenettel PASS — ez a helyes válasz", () => {
    const p = tesztetPontoz(elvaras({ mintaTipus: "Kontroll" }), eredmeny([]), terkep);
    expect(p.pass).toBe(true);
    expect(p.alpozitivak).toEqual([]);
  });

  it("kontroll-mintán a gyanú és a pozitív visszaigazolás nem álpozitív", () => {
    const p = tesztetPontoz(
      elvaras({ mintaTipus: "Kontroll" }),
      eredmeny([
        det("J-215", { minosites: "pozitiv" }),
        det("TK-001", { bizonyitekSzint: "gyanu" }),
      ]),
      terkep,
    );
    expect(p.alpozitivak).toEqual([]);
    expect(p.pass).toBe(true);
  });
});

describe("futastOsszesit", () => {
  it("a mutatókat a #1–#6 futás definíciói szerint számolja", () => {
    const pontszamok = [
      tesztetPontoz(
        elvaras({ azonosito: "t1", kotelezo: elvarasokatElemez("J-011\nJ-033").tetelek }),
        eredmeny([det("J-011"), det("J-033")]),
        terkep,
      ),
      tesztetPontoz(
        elvaras({ azonosito: "t2", kotelezo: elvarasokatElemez("J-011\nJ-033").tetelek }),
        eredmeny([det("J-011")]),
        terkep,
      ),
      tesztetPontoz(
        elvaras({ azonosito: "t3", mintaTipus: "Kontroll" }),
        eredmeny([det("J-337")]),
        terkep,
      ),
    ];
    const o = futastOsszesit(pontszamok);
    expect(o.tesztekSzama).toBe(3);
    expect(o.passDarab).toBe(1);
    expect(o.kotelezoTetelekSzama).toBe(4);
    expect(o.kotelezoTeljesult).toBe(3);
    expect(o.kotelezoRecall).toBeCloseTo(0.75);
    expect(o.kontrollTesztek).toBe(1);
    expect(o.kontrollAlpozitiv).toBe(1);
  });

  it("üres futásra nem oszt nullával", () => {
    const o = futastOsszesit([]);
    expect(o.passArany).toBe(1);
    expect(o.kotelezoRecall).toBe(1);
  });
});
