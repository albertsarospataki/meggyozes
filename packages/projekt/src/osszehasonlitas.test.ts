import { describe, expect, it } from "vitest";
import type { Javaslat, Megallapitas, Megvalositas, Riport } from "./modell";
import { jelolesElteresek, riportokatOsszehasonlit, top5Megvalosulas } from "./osszehasonlitas";

function megallapitas(x: Partial<Megallapitas> & { azonosito: string; szabalyKod: string; idezet: string }): Megallapitas {
  return {
    jelKodok: [],
    technikaKodok: [],
    sav: "3 Hatasossag es hiany",
    bizonyitekSzint: "teny",
    minosites: "problema",
    forras: undefined,
    ...x,
  };
}

function javaslat(azonosito: string, megallapitasAzonosito: string, rangsor: number): Javaslat {
  return {
    azonosito,
    megallapitasAzonosito,
    mostEzVan: "…",
    helyetteEz: "…",
    variansok: { konzervativ: "a", batrabb: "b", kiserleti: "c" },
    beavatkozasiSzint: "Szövegcsere",
    varhatoHatas: undefined,
    jogiMegjegyzes: undefined,
    rangsor,
  };
}

function riport(azonosito: string, megallapitasok: Megallapitas[], javaslatok: Javaslat[] = []): Riport {
  return {
    azonosito,
    futasAzonosito: `f-${azonosito}`,
    projektAzonosito: "p-1",
    verzio: 1,
    keszult: "2026-09-02T10:00:00Z",
    mod: "audit",
    statusz: "kesz",
    megallapitasok,
    javaslatok,
    tisztazoKerdesek: [],
  };
}

describe("riport-összehasonlítás", () => {
  it("az azonos kód és idézet változatlan megállapítás", () => {
    const m = megallapitas({ azonosito: "m1", szabalyKod: "S-330-1", idezet: "Már csak 2 db!" });
    const o = riportokatOsszehasonlit(riport("r1", [m]), riport("r2", [{ ...m, azonosito: "m2" }]));
    expect(o.valtozatlan).toHaveLength(1);
    expect(o.megszunt).toHaveLength(0);
    expect(o.uj).toHaveLength(0);
  });

  it("a szóköz- és kisbetű-eltérés nem számít változásnak", () => {
    const elozo = megallapitas({ azonosito: "m1", szabalyKod: "S-1", idezet: "Már  csak 2 db!" });
    const mostani = megallapitas({ azonosito: "m2", szabalyKod: "S-1", idezet: "már csak 2 db!" });
    expect(riportokatOsszehasonlit(riport("r1", [elozo]), riport("r2", [mostani])).valtozatlan).toHaveLength(1);
  });

  it("az eltűnt megállapítás megszűntként, az új újként jelenik meg", () => {
    const elozo = riport("r1", [megallapitas({ azonosito: "m1", szabalyKod: "S-1", idezet: "A" })]);
    const mostani = riport("r2", [megallapitas({ azonosito: "m2", szabalyKod: "S-9", idezet: "B" })]);
    const o = riportokatOsszehasonlit(elozo, mostani);
    expect(o.megszunt.map((m) => m.azonosito)).toEqual(["m1"]);
    expect(o.uj.map((m) => m.azonosito)).toEqual(["m2"]);
  });

  it("az átfogalmazott, de megmaradt szabálysértést változásként párosítja, nem eltűnés+új párként", () => {
    const elozo = riport("r1", [megallapitas({ azonosito: "m1", szabalyKod: "S-330-1", idezet: "Már csak 2 db!" })]);
    const mostani = riport("r2", [megallapitas({ azonosito: "m2", szabalyKod: "S-330-1", idezet: "Utolsó darabok!" })]);
    const o = riportokatOsszehasonlit(elozo, mostani);
    expect(o.megszunt).toHaveLength(0);
    expect(o.uj).toHaveLength(0);
    expect(o.valtozott).toHaveLength(1);
    expect(o.valtozott[0]?.miValtozott).toContain("idézet");
  });

  it("a bizonyíték-fokozat változását kimutatja", () => {
    const elozo = riport("r1", [megallapitas({ azonosito: "m1", szabalyKod: "S-1", idezet: "A", bizonyitekSzint: "gyanu" })]);
    const mostani = riport("r2", [megallapitas({ azonosito: "m2", szabalyKod: "S-1", idezet: "A", bizonyitekSzint: "teny" })]);
    expect(riportokatOsszehasonlit(elozo, mostani).valtozott[0]?.miValtozott).toContain("bizonyíték-fokozat");
  });

  it("az összefoglaló emberi mondat", () => {
    const o = riportokatOsszehasonlit(
      riport("r1", [megallapitas({ azonosito: "m1", szabalyKod: "S-1", idezet: "A" })]),
      riport("r2", []),
    );
    expect(o.osszefoglalo).toContain("1 megállapítás eltűnt");
  });
});

describe("megvalósítási arány", () => {
  const megallapitasok = [1, 2, 3, 4, 5].map((n) =>
    megallapitas({ azonosito: `m${n}`, szabalyKod: `S-${n}`, idezet: `idezet ${n}` }),
  );
  const javaslatok = [1, 2, 3, 4, 5].map((n) => javaslat(`j${n}`, `m${n}`, n));
  const elozo = riport("r1", megallapitasok, javaslatok);

  it("a top-5-ből megvalósítottak arányát adja", () => {
    const mostani = riport("r2", megallapitasok.slice(2));
    const o = riportokatOsszehasonlit(elozo, mostani);
    const megvalositasok: Megvalositas[] = [
      { javaslatAzonosito: "j1", statusz: "megvalositva", jelolve: "2026-09-20T00:00:00Z", jelolte: "u-1", mertValtozas: "+8% konverzió" },
      { javaslatAzonosito: "j2", statusz: "megvalositva", jelolve: "2026-09-20T00:00:00Z", jelolte: "u-1", mertValtozas: undefined },
    ];
    const arany = top5Megvalosulas(elozo, o, megvalositasok);
    expect(arany.top5Darab).toBe(5);
    expect(arany.megvalositott).toBe(2);
    expect(arany.arany).toBeCloseTo(0.4);
    expect(arany.mertValtozasok).toEqual(["+8% konverzió"]);
  });

  it("a jelölés és a gépi megfigyelés eltérését beszélgetés-indítóként hozza", () => {
    // m1 eltűnt, de nincs megvalósítottnak jelölve; j3 jelölve van, de a jel megmaradt.
    const mostani = riport("r2", megallapitasok.slice(1));
    const o = riportokatOsszehasonlit(elozo, mostani);
    const megvalositasok: Megvalositas[] = [
      { javaslatAzonosito: "j3", statusz: "megvalositva", jelolve: "2026-09-20T00:00:00Z", jelolte: "u-1", mertValtozas: undefined },
    ];
    const elteresek = jelolesElteresek(top5Megvalosulas(elozo, o, megvalositasok));
    expect(elteresek.map((e) => e.javaslatAzonosito).sort()).toEqual(["j1", "j3"]);
  });

  it("mért változást csak akkor mutat, ha az ügyfél beírta", () => {
    const o = riportokatOsszehasonlit(elozo, riport("r2", megallapitasok));
    const arany = top5Megvalosulas(elozo, o, []);
    expect(arany.mertValtozasok).toEqual([]);
    expect(arany.arany).toBe(0);
  });
});
