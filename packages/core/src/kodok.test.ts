import { describe, expect, it } from "vitest";
import { kodErtekeketKinyer, kodFedi, kodokatKinyer, kodotElemez, kodotNormalizal } from "./kodok.js";

describe("kodotElemez — egyetlen kód normalizálása", () => {
  it("párnázza a jel- és technikakódot három számjegyre", () => {
    expect(kodotElemez("J-11")?.ertek).toBe("J-011");
    expect(kodotElemez("TK-45")?.ertek).toBe("TK-045");
    expect(kodotElemez("D-35")?.ertek).toBe("D-035");
    expect(kodotElemez("EL-18")?.ertek).toBe("EL-018");
  });

  it("kisbetűs és szóközös alakot is elfogad", () => {
    expect(kodotElemez("  tk-045  ")?.ertek).toBe("TK-045");
    expect(kodotElemez("j-448")?.ertek).toBe("J-448");
  });

  it("a szabálykódot NEM párnázza — a sorszám a jegyzetre mutat", () => {
    const k = kodotElemez("S-330-1");
    expect(k?.ertek).toBe("S-330-1");
    expect(k?.sorszam).toBe(330);
    expect(k?.alsorszam).toBe(1);
    // Az S-047 és az S-0047 két különböző jegyzet lenne, ezért tilos a párnázás.
    expect(kodotElemez("S-47")?.ertek).toBe("S-47");
  });

  it("felismeri a csillagos szabályhivatkozást", () => {
    expect(kodotElemez("S-047-*")?.alsorszam).toBe("*");
  });

  it("nem-kód bemenetre undefined — soha nem találgat", () => {
    expect(kodotElemez("nincs itt kód")).toBeUndefined();
    expect(kodotElemez("")).toBeUndefined();
    expect(kodotElemez("M01")).toBeUndefined();
    // Mondat, nem puszta kód: erre a kodokatKinyer való.
    expect(kodotElemez("a J-011 jel")).toBeUndefined();
  });

  it("a típust az előtagból állapítja meg, az EL-t nem nézi E-nek", () => {
    expect(kodotElemez("EL-086")?.tipus).toBe("elvaras");
    expect(kodotElemez("J-001")?.tipus).toBe("jel");
    expect(kodotElemez("TK-001")?.tipus).toBe("technika");
    expect(kodotElemez("K-012")?.tipus).toBe("kombinacio");
  });
});

describe("kodokatKinyer — pontozási szabály 1: kódemlítés bárhol találat", () => {
  it("kinyeri a kódokat futó szövegből, megjelenési sorrendben", () => {
    const sz = "A TK-066-ot kiadtad — a J-239 elemi jel is fennáll? Idézd a helyét.";
    expect(kodErtekeketKinyer(sz)).toEqual(["TK-066", "J-239"]);
  });

  it("átlát a magyar toldalékokon és az összetételeken", () => {
    expect(kodErtekeketKinyer("a J-011-et és a TK-105-ellenpróbát")).toEqual(["J-011", "TK-105"]);
  });

  it("kezeli a per-jellel elválasztott felsorolást", () => {
    expect(kodErtekeketKinyer("J-129/J-125 → TK-039")).toEqual(["J-129", "J-125", "TK-039"]);
  });

  it("zárójeles és másodlagos említést is felvesz", () => {
    const sz = "Pozitív visszaigazolás: kiegyensúlyozott érvkészlet (J-448), forrásmegjelölés rendben.";
    expect(kodErtekeketKinyer(sz)).toContain("J-448");
  });

  it("duplikátumot egyszer ad vissza", () => {
    expect(kodErtekeketKinyer("J-011, majd újra J-011 és J-11")).toEqual(["J-011"]);
  });

  it("nem talál kódot azonosító belsejében", () => {
    expect(kodErtekeketKinyer("SJ-011 és xTK-045 és A_J-011")).toEqual([]);
  });

  it("nem téveszti meg a dátum és a jogszabályi hivatkozás", () => {
    const sz = "2026-08-29, DSA 25. cikk, EU 1169/2011, 4/2009. NFGM-SZMM rendelet";
    expect(kodErtekeketKinyer(sz)).toEqual([]);
  });

  it("üres szövegre üres listát ad", () => {
    expect(kodErtekeketKinyer("")).toEqual([]);
  });

  it("a szabálykód alsorszámát megtartja", () => {
    const kodok = kodokatKinyer("Az S-330-4 él, az S-330-1 hiányzik.");
    expect(kodok.map((k) => k.ertek)).toEqual(["S-330-4", "S-330-1"]);
  });
});

describe("kodFedi — csillagos szabályhivatkozás", () => {
  it("a csillag lefedi a jegyzet minden szabályát", () => {
    expect(kodFedi("S-047-*", "S-047-3")).toBe(true);
    expect(kodFedi("S-047-*", "S-048-3")).toBe(false);
  });

  it("csillag nélkül szigorú az egyezés", () => {
    expect(kodFedi("J-011", "J-011")).toBe(true);
    expect(kodFedi("J-011", "J-012")).toBe(false);
    expect(kodFedi("S-330-1", "S-330-2")).toBe(false);
  });

  it("a normalizálás után hasonlít össze", () => {
    expect(kodFedi("j-11", "J-011")).toBe(true);
  });
});

describe("kodotNormalizal", () => {
  it("nem-kódot változatlanul (trimmelve) ad vissza", () => {
    expect(kodotNormalizal("  egyéb  ")).toBe("egyéb");
    expect(kodotNormalizal("j-11")).toBe("J-011");
  });
});
