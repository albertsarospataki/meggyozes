import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { EkvivalenciaTerkep, type EkvivalenciaTerkepAdat } from "./ekvivalencia.js";

const adat = JSON.parse(
  readFileSync(new URL("../data/ekvivalencia-terkep.v7.json", import.meta.url), "utf8"),
) as EkvivalenciaTerkepAdat;

const terkep = EkvivalenciaTerkep.betolt(adat);
const kiadott = (...kodok: string[]) => new Set(kodok);

describe("EkvivalenciaTerkep — alapértelmezés a szigorúság", () => {
  it("pontos egyezést fogad el", () => {
    expect(terkep.teljesiti("J-011", kiadott("J-011"))?.fajta).toBe("pontos");
  });

  it("két tetszőleges kódot KÜLÖNBÖZŐNEK tekint, ha a térkép nem mond mást", () => {
    // A #12 tétel szerint a J-031 és a J-001 külön kiadandó — egyik sem teljesíti a másikat.
    expect(terkep.teljesiti("J-031", kiadott("J-001"))).toBeUndefined();
    // A #4 tétel: J-234 ↔ J-235 KÜLÖNBÖZŐ.
    expect(terkep.teljesiti("J-234", kiadott("J-235"))).toBeUndefined();
  });
});

describe("EKVIVALENS párok — mindkét irányban teljesítenek", () => {
  it("J-215 ↔ TK-045 (1. tétel)", () => {
    expect(terkep.teljesiti("TK-045", kiadott("J-215"))?.fajta).toBe("ekvivalens");
    expect(terkep.teljesiti("J-215", kiadott("TK-045"))?.fajta).toBe("ekvivalens");
  });

  it("TK-066 ↔ J-239 (34. tétel)", () => {
    expect(terkep.teljesiti("TK-066", kiadott("J-239"))?.fajta).toBe("ekvivalens");
    expect(terkep.teljesiti("J-239", kiadott("TK-066"))?.fajta).toBe("ekvivalens");
  });

  it("a J-204 a J-403/TK-093 pártól KÜLÖNBÖZŐ marad (27. tétel korlátja)", () => {
    expect(terkep.teljesiti("J-403", kiadott("TK-093"))?.fajta).toBe("ekvivalens");
    expect(terkep.teljesiti("J-204", kiadott("J-403"))).toBeUndefined();
    expect(terkep.teljesiti("J-204", kiadott("TK-093"))).toBeUndefined();
  });

  it("a TK-049 a TK-053/J-260 pártól KÜLÖNBÖZŐ marad (47. tétel korlátja)", () => {
    expect(terkep.teljesiti("TK-053", kiadott("J-260"))?.fajta).toBe("ekvivalens");
    expect(terkep.teljesiti("TK-049", kiadott("TK-053", "J-260"))).toBeUndefined();
  });

  it("normalizált alakon dolgozik", () => {
    expect(terkep.teljesiti("tk-45", kiadott("j-215"))?.fajta).toBe("ekvivalens");
  });
});

describe("TARTALMAZÓ párok — szigorúan egyirányúak", () => {
  it("J-323 → TK-085: a jel teljesíti a technikát, fordítva nem (31. tétel)", () => {
    expect(terkep.teljesiti("TK-085", kiadott("J-323"))?.fajta).toBe("tartalmazo");
    // A TK-085 a J-423 ágán is megállhat, ezért a J-323-at nem teljesíti.
    expect(terkep.teljesiti("J-323", kiadott("TK-085"))).toBeUndefined();
  });

  it("TK-105 → J-150: az ellenpróba teljesíti a jelet, fordítva nem (56. tétel)", () => {
    expect(terkep.teljesiti("J-150", kiadott("TK-105"))?.fajta).toBe("tartalmazo");
    expect(terkep.teljesiti("TK-105", kiadott("J-150"))).toBeUndefined();
  });

  it("J-129 és J-125 egyaránt teljesíti a TK-039-et (24. tétel)", () => {
    expect(terkep.teljesiti("TK-039", kiadott("J-129"))?.fajta).toBe("tartalmazo");
    expect(terkep.teljesiti("TK-039", kiadott("J-125"))?.fajta).toBe("tartalmazo");
    // De a két jel egymást NEM teljesíti.
    expect(terkep.teljesiti("J-129", kiadott("J-125"))).toBeUndefined();
  });

  it("TK-087 → J-335 a fedezetlenség-ágon (50. tétel)", () => {
    expect(terkep.teljesiti("J-335", kiadott("TK-087"))?.fajta).toBe("tartalmazo");
  });

  it("J-156 és J-168 egyaránt teljesíti a TK-019-et, egymást nem (51. tétel)", () => {
    expect(terkep.teljesiti("TK-019", kiadott("J-156"))?.fajta).toBe("tartalmazo");
    expect(terkep.teljesiti("TK-019", kiadott("J-168"))?.fajta).toBe("tartalmazo");
    expect(terkep.teljesiti("J-156", kiadott("J-168"))).toBeUndefined();
  });
});

describe("Fedés-szabály (49. tétel) — a TK-029 két útja", () => {
  it("a J-041/J-042 bejárásos páros teljesíti", () => {
    expect(terkep.teljesiti("TK-029", kiadott("J-041", "J-042"))?.fajta).toBe("fedes");
  });

  it("a J-127 + J-043 EGYÜTTES felvétele elegendő fedés", () => {
    expect(terkep.teljesiti("TK-029", kiadott("J-127", "J-043"))?.fajta).toBe("fedes");
  });

  it("külön-külön egyik sem elég", () => {
    expect(terkep.teljesiti("TK-029", kiadott("J-127"))).toBeUndefined();
    expect(terkep.teljesiti("TK-029", kiadott("J-043"))).toBeUndefined();
    expect(terkep.teljesiti("TK-029", kiadott("J-041"))).toBeUndefined();
  });
});

describe("Pontozási szabály 4 — kompozit-kényszer", () => {
  it("elemi kódok nem teljesítik a kompozit tételt", () => {
    expect(terkep.kompozit("J-448")).toBe(true);
    expect(terkep.teljesiti("J-448", kiadott("J-447", "J-456", "J-457"))).toBeUndefined();
  });

  it("a kompozit tételt csak maga a kompozit kód teljesíti", () => {
    expect(terkep.teljesiti("J-448", kiadott("J-448"))?.fajta).toBe("pontos");
  });

  it("mind az öt kompozit kód fel van véve", () => {
    for (const kod of ["J-448", "J-450", "J-321", "TK-086", "TK-072"]) {
      expect(terkep.kompozit(kod)).toBe(true);
    }
    expect(terkep.kompozit("J-011")).toBe(false);
  });
});

describe("v7 bővítés — új tételek", () => {
  it("J-044 ↔ TK-030 EKVIVALENS (84. tétel)", () => {
    expect(terkep.teljesiti("TK-030", kiadott("J-044"))?.fajta).toBe("ekvivalens");
    expect(terkep.teljesiti("J-044", kiadott("TK-030"))?.fajta).toBe("ekvivalens");
  });

  it("J-240 → TK-070 TARTALMAZÓ, fordítva nem (81. tétel)", () => {
    expect(terkep.teljesiti("TK-070", kiadott("J-240"))?.fajta).toBe("tartalmazo");
    expect(terkep.teljesiti("J-240", kiadott("TK-070"))).toBeUndefined();
  });

  it("J-313 + J-204 együtt fedi a TK-083-at, külön-külön nem (75. tétel)", () => {
    expect(terkep.teljesiti("TK-083", kiadott("J-313", "J-204"))?.fajta).toBe("fedes");
    expect(terkep.teljesiti("TK-083", kiadott("J-204"))).toBeUndefined();
  });

  it("a J-302 fedéséhez mind a három elem kell (73. tétel)", () => {
    expect(terkep.teljesiti("J-302", kiadott("J-206", "J-338", "J-301"))?.fajta).toBe("fedes");
    expect(terkep.teljesiti("J-302", kiadott("J-206", "J-338"))).toBeUndefined();
  });
});

describe("Minta-típushoz kötött fedés (v7 #74, #76, #80, #83)", () => {
  it("a 76. tétel POZITÍV mintán fedi a J-312-t", () => {
    expect(terkep.teljesiti("J-312", kiadott("TK-105"), "Pozitiv")?.fajta).toBe("fedes");
  });

  it("NEGATÍV mintán ugyanez NEM fed — ott a J-312 kiadása kötelező marad", () => {
    expect(terkep.teljesiti("J-312", kiadott("TK-105"), "Negativ")).toBeUndefined();
    expect(terkep.teljesiti("J-312", kiadott("TK-105"), "Kontroll")).toBeUndefined();
  });

  it("minta-típus megadása nélkül a kötött fedés nem alkalmazható", () => {
    expect(terkep.teljesiti("J-312", kiadott("TK-105"))).toBeUndefined();
  });

  it("a TK-083 pozitív-oldali alakja egyetlen J-313-mal is fed (80. tétel)", () => {
    expect(terkep.teljesiti("TK-083", kiadott("J-313"), "Pozitiv")?.fajta).toBe("fedes");
    // Negatív mintán a #75 küszöbe él: J-313 ÉS J-204 kell.
    expect(terkep.teljesiti("TK-083", kiadott("J-313"), "Negativ")).toBeUndefined();
    expect(terkep.teljesiti("TK-083", kiadott("J-313", "J-204"), "Negativ")?.fajta).toBe("fedes");
  });
});
