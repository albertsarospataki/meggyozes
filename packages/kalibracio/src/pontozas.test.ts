import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { Detekcio, FuttatasEredmeny, MintaTipus } from "@meggyozes/core";
import { EkvivalenciaTerkep, type EkvivalenciaTerkepAdat } from "./ekvivalencia.js";
import {
  elvarasokatElemez,
  goldLint,
  futastOsszesit,
  kiadottKodok,
  tesztetPontoz,
  type TesztElvaras,
} from "./pontozas.js";

const terkep = EkvivalenciaTerkep.betolt(
  JSON.parse(
    readFileSync(new URL("../data/ekvivalencia-terkep.v7.json", import.meta.url), "utf8"),
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

describe("elvarasokatElemez — valódi gold-sorokon (aranystandard, 2026-08-29)", () => {
  it("a sorszámozott tételeket soronként bontja, a leíró szöveget elhagyja", () => {
    const gold = [
      "1. J-001 Visszaszámláló a felületen — a szövegben: »AZ AJÁNLAT LEJÁR: 02 : 14 : 36«",
      "4. J-034 Hiányzik a lejárat utáni állapot megnevezése a határidő mellett",
    ].join("\n");
    const { tetelek } = elvarasokatElemez(gold);
    expect(tetelek.map((t) => t.kodok)).toEqual([["J-001"], ["J-034"]]);
  });

  it("a zárójeles kód KONTEXTUS, nem külön kötelező tétel", () => {
    // Ha a TK-010 kötelező tételnek számítana, a pontozó a kötelezők számát
    // felfújná, és a recall rendszeresen alulmérne.
    const { tetelek } = elvarasokatElemez(
      "5. J-003 Kedvezmény-állítás áthúzott árral vagy százalékkal — »Korábbi ár: 129 990 Ft« (TK-010)",
    );
    expect(tetelek).toHaveLength(1);
    expect(tetelek[0]?.kodok).toEqual(["J-003"]);
    expect(tetelek[0]?.kontextusKodok).toEqual(["TK-010"]);
    // A v7 11. pontozási szabálya kimondja: a zárójeles gold-tag NEM feltétele a
    // tétel teljesítésének. Kontextus marad, de már nem bizonytalanság.
    expect(tetelek[0]?.bizonytalan).toBeUndefined();
  });

  it("a per-jeles kódfutam VAGY-alternatíva, nem konjunkció", () => {
    // Konjunkcióként olvasva a teszt indokolatlan FAIL-t kapna.
    const { tetelek } = elvarasokatElemez(
      "1. J-450/J-338 — névvel ellátott vásárlói vélemény-blokk társas bizonyítékként",
    );
    expect(tetelek).toHaveLength(1);
    expect(tetelek[0]?.kodok).toEqual(["J-450", "J-338"]);
  });

  it("a vegyes jel/technika per-futamot is alternatívaként kezeli", () => {
    const { tetelek } = elvarasokatElemez("2. J-049/TK-042-irány: legalább »forrásolás hiánya«");
    expect(tetelek).toHaveLength(1);
    expect(tetelek[0]?.kodok).toEqual(["J-049", "TK-042"]);
  });

  it("a per-jeles alternatíva bármelyik ága teljesíti a tételt", () => {
    const p = tesztetPontoz(
      elvaras({ kotelezo: elvarasokatElemez("1. J-450/J-338 — vélemény-blokk").tetelek }),
      eredmeny([det("J-338")]),
      terkep,
    );
    expect(p.pass).toBe(true);
  });

  it("a «(levezetett — …)» fejlécsor kód nélküliként kerül nyilvántartásba", () => {
    const { tetelek, kodNelkuliSorok } = elvarasokatElemez(
      "(levezetett — kalibrációs futással megerősítendő)\n1. J-450 vélemény-blokk",
    );
    expect(tetelek).toHaveLength(1);
    expect(kodNelkuliSorok).toHaveLength(1);
  });

  it("ha a soron CSAK zárójeles kód áll, az mégis a tétel hordozója", () => {
    const { tetelek } = elvarasokatElemez("3. Promóciós banner-keretezés akció-jelekkel (J-003)");
    expect(tetelek[0]?.kodok).toEqual(["J-003"]);
  });
});

describe("goldLint — mit kell strukturálni a goldban a CI előtt", () => {
  it("felsorolja a feltételezésre szoruló sorokat és a kód nélküli elvárásokat", () => {
    const kotelezoSzoveg = [
      "(levezetett — kalibrációs futással megerősítendő)",
      "1. J-450/J-338 — vélemény-blokk",
      "2. J-003 kedvezmény-állítás (TK-010)",
      "3. J-036 sürgető felszólítás",
    ].join("\n");
    const elemzes = elvarasokatElemez(kotelezoSzoveg);
    const leletek = goldLint([
      elvaras({ kotelezo: elemzes.tetelek, kodNelkuliSorok: elemzes.kodNelkuliSorok }),
    ]);

    // A zárójeles sor a 11. szabály óta nem szorul feltételezésre — csak a
    // per-jeles futam és a kód nélküli sor marad a listán.
    expect(leletek).toHaveLength(2);
    expect(leletek.map((l) => l.ok)).toEqual([
      expect.stringContaining("per-jeles"),
      expect.stringContaining("gépileg nem pontozható"),
    ]);
    // A tiszta sor (3.) nem kerül a listára.
    expect(leletek.some((l) => l.sor.includes("J-036"))).toBe(false);
  });

  it("hibátlanul strukturált goldra üres a lista", () => {
    const elemzes = elvarasokatElemez("1. J-011\n2. J-033");
    expect(goldLint([elvaras({ kotelezo: elemzes.tetelek })])).toEqual([]);
  });
});
