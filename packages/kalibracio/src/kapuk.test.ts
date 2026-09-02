import { describe, expect, it } from "vitest";
import { ALAPVONAL_FUTAS_6, kapukatErtekel, regressziokatKeres } from "./kapuk";
import type { FutasOsszesito, TesztPontszam } from "./pontozas";

function osszesito(r: Partial<FutasOsszesito> = {}): FutasOsszesito {
  return {
    tesztekSzama: 150,
    passDarab: 135,
    passArany: 0.9,
    kotelezoTetelekSzama: 900,
    kotelezoTeljesult: 870,
    kotelezoRecall: 0.967,
    kontrollTesztek: 27,
    kontrollAlpozitiv: 0,
    tiltottTesztek: 1,
    tiltottArany: 0.007,
    kodNelkuliGoldSorok: 0,
    ...r,
  };
}

const kapu = (o: FutasOsszesito, nev: string) =>
  kapukatErtekel(o).kapuk.find((k) => k.nev === nev);

describe("kapukatErtekel — a release-blokkolók", () => {
  it("a #6 futás mért értékei minden kaput teljesítenek", () => {
    const e = kapukatErtekel(
      osszesito({
        passArany: ALAPVONAL_FUTAS_6.passArany,
        kotelezoRecall: ALAPVONAL_FUTAS_6.kotelezoRecall,
        kontrollAlpozitiv: ALAPVONAL_FUTAS_6.kontrollAlpozitiv,
        tiltottArany: ALAPVONAL_FUTAS_6.tiltottArany,
      }),
    );
    expect(e.kiadhato).toBe(true);
    expect(e.kapuk.every((k) => k.teljesult)).toBe(true);
  });

  it("a #1 futás alapszámai három kapun elbuknak, a kontrollon nem", () => {
    // #1: PASS 93/149 (62,4%) · kötelező recall ~84% · álpozitív 0/36 · tiltott 3/149 (2%)
    const o = osszesito({
      tesztekSzama: 149,
      passDarab: 93,
      passArany: 93 / 149,
      kotelezoRecall: 0.84,
      kontrollTesztek: 36,
      kontrollAlpozitiv: 0,
      tiltottTesztek: 3,
      tiltottArany: 3 / 149,
    });
    expect(kapukatErtekel(o).kiadhato).toBe(false);
    expect(kapu(o, "PASS-arány")?.teljesult).toBe(false);
    expect(kapu(o, "Kötelező kód-recall")?.teljesult).toBe(false);
    expect(kapu(o, "Tiltott találat")?.teljesult).toBe(false);
    expect(kapu(o, "Kontroll-álpozitív")?.teljesult).toBe(true);
  });

  it("EGYETLEN kontroll-álpozitív blokkol, minden más mutató hibátlansága mellett is", () => {
    const o = osszesito({ passArany: 1, kotelezoRecall: 1, tiltottTesztek: 0, tiltottArany: 0, kontrollAlpozitiv: 1 });
    expect(kapukatErtekel(o).kiadhato).toBe(false);
    expect(kapu(o, "Kontroll-álpozitív")?.teljesult).toBe(false);
    expect(kapu(o, "Kontroll-álpozitív")?.uzenet).toContain("AZONNALI BLOKK");
  });

  it("a küszöbön álló érték még teljesít (≥, nem >)", () => {
    expect(kapu(osszesito({ passArany: 0.85 }), "PASS-arány")?.teljesult).toBe(true);
    expect(kapu(osszesito({ kotelezoRecall: 0.92 }), "Kötelező kód-recall")?.teljesult).toBe(true);
    expect(kapu(osszesito({ tiltottArany: 0.01 }), "Tiltott találat")?.teljesult).toBe(true);
  });

  it("a küszöb alatti PASS-arány blokkol", () => {
    expect(kapukatErtekel(osszesito({ passArany: 0.849 })).kiadhato).toBe(false);
  });
});

describe("regressziokatKeres — a futásátlag által elfedett romlás", () => {
  const p = (azonosito: string, pass: boolean, hianyzo: string[] = []): TesztPontszam => ({
    azonosito,
    nev: azonosito,
    mintaTipus: "Negativ",
    pass,
    kotelezo: hianyzo.map((kod) => ({
      tetel: { kodok: [kod], nyers: kod },
      teljesult: false,
      indok: undefined,
    })),
    opcionalis: [],
    tiltottTalalatok: [],
    alpozitivak: [],
  });

  it("kiemeli a korábban PASS, most FAIL teszteket", () => {
    const r = regressziokatKeres(
      [p("t1", true), p("t2", true), p("t3", false)],
      [p("t1", true), p("t2", false, ["J-448"]), p("t3", true)],
    );
    expect(r.map((x) => x.azonosito)).toEqual(["t2"]);
    expect(r[0]?.hianyzoKotelezo).toEqual(["J-448"]);
  });

  it("a korábban is bukó teszt nem regresszió", () => {
    expect(regressziokatKeres([p("t1", false)], [p("t1", false)])).toEqual([]);
  });

  it("akkor is jelez, ha az összesített PASS-arány közben JAVULT", () => {
    // Az átlag elfedné: 1/3 → 2/3, közben a t1 elromlott.
    const elozo = [p("t1", true), p("t2", false), p("t3", false)];
    const mostani = [p("t1", false, ["J-011"]), p("t2", true), p("t3", true)];
    expect(regressziokatKeres(elozo, mostani).map((x) => x.azonosito)).toEqual(["t1"]);
  });
});
