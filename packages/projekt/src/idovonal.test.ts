import { describe, expect, it } from "vitest";
import { idovonal, kovetkezoLepes, MEGVALOSITAS_EMLEKEZTETO_NAP } from "./idovonal.js";
import { aktivProjektek, archivaltProjektek, kotegetEllenoriz, type Artefaktum, type Javaslat, type Megvalositas, type Projekt, type Riport } from "./modell.js";

const artefaktum = (azonosito: string, rogzitve: string): Artefaktum => ({
  azonosito,
  projektAzonosito: "p-1",
  ajto: "url",
  megnevezes: `https://pelda.hu/${azonosito}`,
  rogzitve,
  masodikMegfigyeles: undefined,
});

const javaslat = (azonosito: string, rangsor: number): Javaslat => ({
  azonosito,
  megallapitasAzonosito: `m-${azonosito}`,
  mostEzVan: "…",
  helyetteEz: "…",
  variansok: { konzervativ: "a", batrabb: "b", kiserleti: "c" },
  beavatkozasiSzint: "Szövegcsere",
  varhatoHatas: undefined,
  jogiMegjegyzes: undefined,
  rangsor,
});

const riport = (keszult: string, javaslatok: Javaslat[]): Riport => ({
  azonosito: "r-1",
  futasAzonosito: "f-1",
  projektAzonosito: "p-1",
  verzio: 1,
  keszult,
  mod: "audit",
  statusz: "kesz",
  megallapitasok: [],
  javaslatok,
  tisztazoKerdesek: [],
});

describe("projekt-idővonal", () => {
  it("fordított időrendben adja vissza az elemeket", () => {
    const elemek = idovonal({
      artefaktumok: [artefaktum("a1", "2026-09-01T08:00:00Z"), artefaktum("a2", "2026-09-03T08:00:00Z")],
      riportok: [riport("2026-09-02T08:00:00Z", [])],
    });
    expect(elemek.map((e) => e.azonosito)).toEqual(["a2", "r-1", "a1"]);
  });

  it("a keltezetlen köteg a lista végére kerül, nem az elejére", () => {
    const elemek = idovonal({
      artefaktumok: [artefaktum("a1", "2026-09-01T08:00:00Z")],
      kotegek: [{ azonosito: "k1", projektAzonosito: "p-1", artefaktumAzonositok: ["a1", "a2"], leiras: "e-mail + landing" }],
    });
    expect(elemek[elemek.length - 1]?.tipus).toBe("koteg");
  });

  it("a nem jelölt megvalósítás nem kerül az idővonalra", () => {
    const megvalositasok: Megvalositas[] = [
      { javaslatAzonosito: "j1", statusz: "nyitott", jelolve: undefined, jelolte: undefined, mertValtozas: undefined },
    ];
    expect(idovonal({ megvalositasok })).toHaveLength(0);
  });
});

describe("következő lépés", () => {
  const mikor = new Date("2026-10-25T00:00:00Z");

  it("riport nélkül, gyenge brand mellett brand-tanítást ajánl", () => {
    expect(kovetkezoLepes({ riportok: [], megvalositasok: [], brandKeszultseg: 1, mikor }).muvelet).toBe("brand_tanitas");
  });

  it("riport nélkül, betanított brand mellett auditot ajánl", () => {
    expect(kovetkezoLepes({ riportok: [], megvalositasok: [], brandKeszultseg: 4, mikor }).muvelet).toBe("audit");
  });

  it("a nyitott top-5 javaslat jelölése előbbre való, mint új futás", () => {
    const l = kovetkezoLepes({
      riportok: [riport("2026-09-20T00:00:00Z", [javaslat("j1", 1), javaslat("j2", 2)])],
      megvalositasok: [],
      brandKeszultseg: 4,
      mikor,
    });
    expect(l.muvelet).toBe("megvalositas_jeloles");
  });

  it("harminc nap után visszamérést ajánl a megvalósított javaslatokra", () => {
    const l = kovetkezoLepes({
      riportok: [riport("2026-09-20T00:00:00Z", [javaslat("j1", 1)])],
      megvalositasok: [
        { javaslatAzonosito: "j1", statusz: "megvalositva", jelolve: "2026-09-20T00:00:00Z", jelolte: "u-1", mertValtozas: undefined },
      ],
      brandKeszultseg: 4,
      mikor,
    });
    expect(l.muvelet).toBe("ujra_audit");
    expect(l.indoklas).toContain(String(MEGVALOSITAS_EMLEKEZTETO_NAP));
  });

  it("harminc napon belül még nem sürgeti a visszamérést", () => {
    const l = kovetkezoLepes({
      riportok: [riport("2026-09-20T00:00:00Z", [javaslat("j1", 1)])],
      megvalositasok: [
        { javaslatAzonosito: "j1", statusz: "megvalositva", jelolve: "2026-10-20T00:00:00Z", jelolte: "u-1", mertValtozas: undefined },
      ],
      brandKeszultseg: 4,
      mikor,
    });
    expect(l.muvelet).toBe("tanacs");
  });
});

describe("projektlista és köteg", () => {
  const p = (azonosito: string, statusz: Projekt["statusz"], utolso: string): Projekt => ({
    azonosito,
    szervezetAzonosito: "szerv-1",
    brandAzonosito: "brand-1",
    nev: azonosito,
    tipus: "vegyes",
    statusz,
    letrehozva: "2026-08-01T00:00:00Z",
    utolsoAktivitas: utolso,
  });

  it("az alapnézet csak az aktív projekteket mutatja, legutóbbi aktivitás szerint", () => {
    const lista = [p("a", "aktiv", "2026-09-01T00:00:00Z"), p("b", "lezart", "2026-09-05T00:00:00Z"), p("c", "aktiv", "2026-09-04T00:00:00Z")];
    expect(aktivProjektek(lista).map((x) => x.azonosito)).toEqual(["c", "a"]);
    expect(archivaltProjektek(lista).map((x) => x.azonosito)).toEqual(["b"]);
  });

  it("a köteg legalább két, azonos projektbeli artefaktumot kíván", () => {
    const artefaktumok = [artefaktum("a1", "2026-09-01T00:00:00Z"), artefaktum("a2", "2026-09-01T00:00:00Z")];
    const alap = { azonosito: "k1", projektAzonosito: "p-1", leiras: "e-mail + landing" };
    expect(kotegetEllenoriz({ ...alap, artefaktumAzonositok: ["a1", "a2"] }, artefaktumok)).toBeUndefined();
    expect(kotegetEllenoriz({ ...alap, artefaktumAzonositok: ["a1"] }, artefaktumok)?.ok).toBe("keves-artefaktum");
    expect(kotegetEllenoriz({ ...alap, artefaktumAzonositok: ["a1", "a1"] }, artefaktumok)?.ok).toBe("ismetlodo-artefaktum");
    expect(kotegetEllenoriz({ ...alap, artefaktumAzonositok: ["a1", "idegen"] }, artefaktumok)?.ok).toBe("idegen-artefaktum");
  });
});
