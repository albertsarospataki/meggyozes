import { describe, expect, it } from "vitest";
import {
  BAZIS_MERETEK,
  bazisLelet,
  brandKapukatErtekel,
  ketSzamosKapu,
  qaKapukatErtekel,
  tervKapukatErtekel,
  type QaFutasOsszesito,
  type TervFutasOsszesito,
} from "./mod-kapuk.js";

const tervZold: TervFutasOsszesito = {
  tesztekSzama: 30,
  passDarab: 27,
  forditottKontrollok: 5,
  forditottKontrollHelyes: 5,
  sajatJavaslatKoSertes: 0,
};

const qaZold: QaFutasOsszesito = {
  tesztekSzama: 40,
  forrasNelkuliAllitasok: 0,
  nincsBizonyitekKontrollok: 8,
  helyesHianyKimondas: 8,
  kuszobAlattiValaszok: 0,
};

describe("Tanács-kapu", () => {
  it("zöld a 85%-os PASS-aránnyal, hibátlan kontrollal és nulla KO-sértéssel", () => {
    expect(tervKapukatErtekel(tervZold).kiadhato).toBe(true);
  });

  it("egyetlen KO-sávos saját javaslat blokkol", () => {
    const e = tervKapukatErtekel({ ...tervZold, sajatJavaslatKoSertes: 1 });
    expect(e.kiadhato).toBe(false);
    expect(e.kapuk.find((k) => k.nev.includes("KO-sértés"))?.uzenet).toContain("AZONNALI BLOKK");
  });

  it("egyetlen bukott fordított kontroll blokkol — ott a lebeszélés a helyes válasz", () => {
    expect(tervKapukatErtekel({ ...tervZold, forditottKontrollHelyes: 4 }).kiadhato).toBe(false);
  });

  it("fordított kontroll nélküli bázison nem élesíthető", () => {
    const e = tervKapukatErtekel({ ...tervZold, forditottKontrollok: 0, forditottKontrollHelyes: 0 });
    expect(e.kiadhato).toBe(false);
    expect(e.kapuk[1]?.uzenet).toContain("kontroll-minta nélkül");
  });
});

describe("Kérdezz-kapu", () => {
  it("zöld, ha nincs forrás nélküli állítás és minden hiány-kontroll helyes", () => {
    expect(qaKapukatErtekel(qaZold).kiadhato).toBe(true);
  });

  it("egyetlen forrás nélküli állítás blokkol", () => {
    expect(qaKapukatErtekel({ ...qaZold, forrasNelkuliAllitasok: 1 }).kiadhato).toBe(false);
  });

  it("a hiány-kimondás 100%-os elvárás: hét a nyolcból bukás", () => {
    expect(qaKapukatErtekel({ ...qaZold, helyesHianyKimondas: 7 }).kiadhato).toBe(false);
  });

  it("a küszöb alatti forrásból épült válasz blokkol", () => {
    const e = qaKapukatErtekel({ ...qaZold, kuszobAlattiValaszok: 2 });
    expect(e.kiadhato).toBe(false);
    expect(e.kapuk[2]?.uzenet).toContain("magabiztosnak látszik");
  });
});

describe("brand-őr kapu", () => {
  it("nulla tiltott kifejezés és nulla igazolatlan szám a feltétel", () => {
    expect(brandKapukatErtekel({ tesztekSzama: 20, tiltottKifejezesKimenetben: 0, nemIgazoltSzamKimenetben: 0 }).kiadhato).toBe(true);
    expect(brandKapukatErtekel({ tesztekSzama: 20, tiltottKifejezesKimenetben: 1, nemIgazoltSzamKimenetben: 0 }).kiadhato).toBe(false);
    expect(brandKapukatErtekel({ tesztekSzama: 20, tiltottKifejezesKimenetben: 0, nemIgazoltSzamKimenetben: 3 }).kiadhato).toBe(false);
  });
});

describe("két számos jelentés", () => {
  it("csak akkor élesíthető, ha mindkét készleten zöld", () => {
    const k = ketSzamosKapu({ tanulo: qaZold, heldOut: qaZold }, qaKapukatErtekel);
    expect(k.kiadhato).toBe(true);
    expect(k.uzenet).toContain("Mindkét készleten zöld");
  });

  it("a held-out romlását nem fedi el a tanuló készlet", () => {
    const k = ketSzamosKapu(
      { tanulo: qaZold, heldOut: { ...qaZold, forrasNelkuliAllitasok: 2 } },
      qaKapukatErtekel,
    );
    expect(k.kiadhato).toBe(false);
    expect(k.tanulo.kiadhato).toBe(true);
    expect(k.uzenet).toContain("held-out");
  });
});

describe("bázis-méret lelet", () => {
  it("a teljes bázison nincs lelet", () => {
    expect(bazisLelet("qa", BAZIS_MERETEK.qa)).toBeUndefined();
  });

  it("az épülő bázison a mérés fut, de a lelet látszik", () => {
    const lelet = bazisLelet("terv", 15);
    expect(lelet?.elvart).toBe(30);
    expect(lelet?.uzenet).toContain("még nem a teljes bázison");
  });
});
