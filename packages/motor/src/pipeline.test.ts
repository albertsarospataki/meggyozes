import { describe, expect, it } from "vitest";
import { szovegAjto } from "@meggyozes/bemenet";
import { uresProfil, type BrandProfil } from "@meggyozes/brand";
import type { AuditKontextus } from "@meggyozes/core";
import { DEMO_TUDASBAZIS } from "./demo-tudasbazis";
import { auditotFuttat } from "./pipeline";

const verzio = {
  tudasbazisVerzio: DEMO_TUDASBAZIS.verzio,
  promptVerzio: "p-1",
  detVerzio: "det-1",
  modell: "determinisztikus",
};

const teljesKontextus: AuditKontextus = {
  uzletiModell: "B2C",
  agazat: "e-kereskedelem",
  artefaktumCel: "vasarlas",
  tolcserPozicio: "meleg",
};

function fuss(szoveg: string, profil?: BrandProfil, kontextus: AuditKontextus = teljesKontextus) {
  return auditotFuttat({
    objektum: szovegAjto(szoveg, "próba", "2026-09-03T09:00:00Z"),
    kontextus,
    profil,
    brandNev: profil === undefined ? undefined : "Példa",
    tudasbazis: DEMO_TUDASBAZIS,
    verzio,
    mikor: new Date("2026-09-03T09:00:00Z"),
  });
}

describe("audit-pipeline", () => {
  it("technikamentes anyagon nem talál KO-t — a nulla találat helyes kimenet", () => {
    const r = fuss("Bemutatkozás\nA cégünk 2015 óta gyárt bútort.\nÍrj nekünk, ha kérdésed van.");
    expect(r.megallapitasok.filter((m) => m.sav === "0 Jogi KO" || m.sav === "1 Etikai KO")).toHaveLength(0);
    expect(r.savok.find((s) => s.nev === "Jogi KO")?.allapot).toBe("ok");
  });

  it("a szűkösség-állítást megtalálja, idézettel", () => {
    const r = fuss("Akció\nMár csak 2 db maradt a készletből!\nKosárba");
    const m = r.megallapitasok.find((x) => x.szabalyKod === "S-D02");
    expect(m).toBeDefined();
    expect(m?.idezet).toContain("Már csak 2 db");
    expect(m?.jelKodok).toEqual(["J-D02"]);
  });

  it("minden megállapításhoz van idézet — enélkül nem adható ki", () => {
    const r = fuss("A legjobb ajánlat\nMár csak 2 db!\nAz akció ma éjfélig tart.\nKüldés");
    expect(r.megallapitasok.every((m) => m.idezet.trim() !== "")).toBe(true);
  });

  it("a javaslatokat sáv és beavatkozás szerint rangsorolja", () => {
    const r = fuss("A legjobb ajánlat\nAz akció ma éjfélig tart.\n9 900 Ft\nKüldés");
    const elso = r.javaslatok[0];
    const elsoMegallapitas = r.megallapitasok.find((m) => m.azonosito === elso?.megallapitasAzonosito);
    expect(elsoMegallapitas?.sav).toBe("1 Etikai KO");
    expect(r.javaslatok.map((j) => j.rangsor)).toEqual(r.javaslatok.map((_, i) => i + 1));
  });

  it("minden javaslathoz három variáns tartozik", () => {
    const r = fuss("Már csak 2 db!\nA legjobb ár.\nKüldés");
    for (const j of r.javaslatok) {
      expect(j.variansok.konzervativ).not.toBe("");
      expect(j.variansok.batrabb).not.toBe("");
      expect(j.variansok.kiserleti).not.toBe("");
    }
  });

  it("a pozitív visszaigazolás önálló blokk, nem melléktermék", () => {
    const r = fuss("Csomagok\n9 900 Ft\n30 nap pénzvisszafizetési garancia.");
    expect(r.pozitivak.map((p) => p.kod)).toContain("POZ-D01");
    expect(r.osszefoglalo).toContain("Ami már működik");
  });

  it("az ár melletti kockázatcsökkentés hiánya elvárásból lesz megállapítás", () => {
    const r = fuss("Csomagok\nAlap: 9 900 Ft / hó\nKosárba");
    expect(r.megallapitasok.some((m) => m.szabalyKod === "S-D07")).toBe(true);
  });

  it("a demó tudásbázist a korlátok között kimondja", () => {
    expect(fuss("Semmi.").korlatok.some((k) => k.includes("Demó tudásbázis"))).toBe(true);
  });

  it("brand-profil nélkül kimondja, hogy általános a javaslat", () => {
    const r = fuss("Már csak 2 db!");
    expect(r.korlatok.some((k) => k.includes("Nincs brand-profil"))).toBe(true);
    expect(r.brandEgyezes.vanProfil).toBe(false);
  });

  it("brand-profillal a javaslat szövege átmegy a brand-őrön", () => {
    const alap = uresProfil("b", "sz", "Példa");
    const profil: BrandProfil = {
      ...alap,
      hangnem: { ...alap.hangnem, megszolitas: "tegezes", tiltottKifejezesek: [] },
    };
    const r = fuss("Már csak 2 db!", profil);
    expect(r.brandEgyezes.vanProfil).toBe(true);
    expect(r.javaslatok[0]?.helyetteEz).not.toBe("");
  });

  it("hiányzó kontextusnál kérdez, nem találgat", () => {
    const r = fuss("Már csak 2 db!", undefined, {
      uzletiModell: undefined,
      agazat: undefined,
      artefaktumCel: undefined,
      tolcserPozicio: undefined,
    });
    expect(r.kerdesek.length).toBeGreaterThanOrEqual(5);
    expect(r.kerdesek.some((k) => k.includes("B2B vagy B2C"))).toBe(true);
  });

  it("a futás naplója emberi nyelvű", () => {
    const r = fuss("Már csak 2 db!");
    expect(r.naplo[0]).toContain("Betöltöttem az anyagot");
  });
});
