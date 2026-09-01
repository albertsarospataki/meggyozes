import { describe, expect, it } from "vitest";
import { anonimizal, anonimizalhato, HELYORZOK } from "./anonimizalas.js";
import { heldOutSzures, heldOutVizsgalat, jeloltetKepez, type MegallapitasHivatkozas, type TanulasiJelolt, type Visszajelzes } from "./jelolt.js";
import { kuratorDont, kuratoriCsomag } from "./kuratori-csomag.js";

const megallapitas: MegallapitasHivatkozas = {
  azonosito: "m-1",
  szabalyKod: "S-330-1",
  jelKodok: ["J-011"],
  idezet: "Már csak 2 db maradt raktáron!",
  bizonyitekSzint: "teny",
};

const visszajelzes = (tipus: Visszajelzes["tipus"], szoveg?: string): Visszajelzes => ({
  azonosito: `v-${tipus}`,
  megallapitasAzonosito: "m-1",
  riportAzonosito: "r-1",
  tipus,
  szoveg,
  ki: "u-1",
  mikor: "2026-09-02T10:00:00Z",
});

describe("anonimizálás", () => {
  it("domaint, e-mailt és telefonszámot cserél", () => {
    const e = anonimizal("Írj a bolt@pelda.hu címre vagy hívj: +36 1 234 5678 — pelda.hu");
    expect(e.szoveg).toContain(HELYORZOK.email);
    expect(e.szoveg).toContain(HELYORZOK.telefon);
    expect(e.szoveg).toContain(HELYORZOK.domain);
    expect(e.szoveg).not.toContain("pelda.hu");
  });

  it("a saját neveket a hívó adja meg, a rendszer nem találgat márkanevet", () => {
    expect(anonimizal("A Zenon Clinic ajánlata").szoveg).toContain("Zenon");
    expect(anonimizal("A Zenon Clinic ajánlata", ["Zenon Clinic"]).szoveg).toBe(`A ${HELYORZOK.nev} ajánlata`);
  });

  it("a két betűs nevet nem cseréli, mert mindenre illeszkedne", () => {
    expect(anonimizal("Az ár rendben van", ["ár"]).szoveg).toBe("Az ár rendben van");
  });

  it("az anonimizálhatóság ellenőrzése ismételten is ugyanazt adja", () => {
    const szoveg = "Nézd meg: https://pelda.hu/akcio";
    expect(anonimizalhato(szoveg)).toBe(true);
    expect(anonimizalhato(szoveg)).toBe(true);
  });

  it("megőrzi az idézet szerkezetét — ez a tanulás anyaga", () => {
    expect(anonimizal("Már csak 2 db maradt!").szoveg).toBe("Már csak 2 db maradt!");
  });
});

describe("tanulási jelölt képzése", () => {
  const alap = { megallapitas, futasAzonosito: "f-1", tanulasiReszvetel: true };

  it("a 👎 új gold-teszt jelöltet szül", () => {
    const j = jeloltetKepez({ ...alap, visszajelzes: visszajelzes("nem-helyes", "ez nem szűkösség") });
    expect(j?.tipus).toBe("uj-gold-teszt");
    expect(j?.kodok).toEqual(["S-330-1", "J-011"]);
    expect(j?.indoklas).toContain("ez nem szűkösség");
  });

  it("a 🤔 érthetőségi jelöltet szül, mert a megállapítás igaz lehet, csak olvashatatlan", () => {
    expect(jeloltetKepez({ ...alap, visszajelzes: visszajelzes("nem-ertem") })?.tipus).toBe("erthetoseg-jelolt");
  });

  it("a 👍 és a ✅ nem termel jelöltet", () => {
    expect(jeloltetKepez({ ...alap, visszajelzes: visszajelzes("helyes") })).toBeUndefined();
    expect(jeloltetKepez({ ...alap, visszajelzes: visszajelzes("megvalositottuk") })).toBeUndefined();
  });

  it("kikapcsolt tanulási részvételnél nem keletkezik jelölt", () => {
    expect(
      jeloltetKepez({ ...alap, tanulasiReszvetel: false, visszajelzes: visszajelzes("nem-helyes") }),
    ).toBeUndefined();
  });

  it("a jelölt csak anonimizált idézetet visz, ügyfél-azonosító nélkül", () => {
    const j = jeloltetKepez({
      ...alap,
      megallapitas: { ...megallapitas, idezet: "A pelda.hu oldalon: Már csak 2 db!" },
      visszajelzes: visszajelzes("nem-helyes"),
    });
    expect(j?.anonimIdezet).toContain(HELYORZOK.domain);
    expect(j?.anonimIdezet).not.toContain("pelda.hu");
    expect(Object.keys(j ?? {})).not.toContain("szervezetAzonosito");
  });
});

describe("held-out fegyelem", () => {
  const jelolt = (heldOut: boolean, azonosito = "j-1"): TanulasiJelolt => ({
    azonosito,
    tipus: "uj-gold-teszt",
    anonimIdezet: "Már csak 2 db!",
    kodok: ["S-330-1"],
    bizonyitekSzint: "teny",
    indoklas: "…",
    keletkezett: "2026-09-02T10:00:00Z",
    statusz: "uj",
    forrasFutas: "f-1",
    heldOutForras: heldOut,
  });

  it("a held-out futásból származó jelölt tiltott", () => {
    expect(heldOutVizsgalat(jelolt(true)).dontes).toBe("tiltott");
    expect(heldOutVizsgalat(jelolt(false)).dontes).toBe("engedelyezett");
  });

  it("a szűrés a kizártakat nem tünteti el, hanem külön hozza", () => {
    const e = heldOutSzures([jelolt(false, "a"), jelolt(true, "b")]);
    expect(e.engedelyezett.map((j) => j.azonosito)).toEqual(["a"]);
    expect(e.tiltott.map((j) => j.azonosito)).toEqual(["b"]);
  });
});

describe("kurátori csomag", () => {
  const jelolt = (azonosito: string, futas: string, idezet = "Már csak 2 db!"): TanulasiJelolt => ({
    azonosito,
    tipus: "uj-gold-teszt",
    anonimIdezet: idezet,
    kodok: ["S-330-1"],
    bizonyitekSzint: "teny",
    indoklas: "Az ügyfél szerint téves.",
    keletkezett: "2026-09-02T10:00:00Z",
    statusz: "uj",
    forrasFutas: futas,
    heldOutForras: false,
  });

  it("az azonos jelölteket összevonja, és külön futásokat számol", () => {
    const cs = kuratoriCsomag([jelolt("a", "f-1"), jelolt("b", "f-2"), jelolt("c", "f-2")], "2026-09-07");
    expect(cs.osszesen).toBe(1);
    const elso = cs.tipusok[0]?.jeloltek[0];
    expect(elso?.eloforduasok).toBe(2);
    expect(elso?.jeloltAzonositok).toHaveLength(3);
  });

  it("gyakoriság szerint rendez", () => {
    const cs = kuratoriCsomag(
      [jelolt("a", "f-1", "Ritka"), jelolt("b", "f-2", "Gyakori"), jelolt("c", "f-3", "Gyakori")],
      "2026-09-07",
    );
    expect(cs.tipusok[0]?.jeloltek.map((j) => j.anonimIdezet)).toEqual(["Gyakori", "Ritka"]);
  });

  it("a held-out miatt kizártakat láthatóan jelzi", () => {
    const heldOut = { ...jelolt("h", "f-9"), heldOutForras: true };
    const cs = kuratoriCsomag([jelolt("a", "f-1"), heldOut], "2026-09-07");
    expect(cs.heldOutMiattKizart).toBe(1);
    expect(cs.osszesen).toBe(1);
  });

  it("már eldöntött jelölt nem kerül újra a csomagba", () => {
    const eldontott: TanulasiJelolt = { ...jelolt("a", "f-1"), statusz: "elfogadva" };
    expect(kuratoriCsomag([eldontott], "2026-09-07").osszesen).toBe(0);
  });

  it("a Notionba küldés előkészített sort ad, nem ír a Notionba", () => {
    const e = kuratorDont(jelolt("a", "f-1"), "notionba-kuld");
    expect(e.ujStatusz).toBe("notionba-kuldve");
    expect(e.notionSor).toContain("S-330-1");
  });

  it("az elutasítás nem hagy hátra átvezetendő sort", () => {
    expect(kuratorDont(jelolt("a", "f-1"), "elutasit").notionSor).toBeUndefined();
  });
});
