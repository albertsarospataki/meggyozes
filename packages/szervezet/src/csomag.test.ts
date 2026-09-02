import { describe, expect, it } from "vitest";
import { auditIndithato, brandNyithato, CSOMAGOK, ulesNyithato } from "./csomag";

describe("csomagkorlátok", () => {
  it("a Starter két brandet és három ülést enged", () => {
    expect(brandNyithato("starter", { brandekSzama: 1, ulesekSzama: 1 })).toBeUndefined();
    const sertes = brandNyithato("starter", { brandekSzama: 2, ulesekSzama: 1 });
    expect(sertes?.korlat).toBe("brandekMax");
    expect(sertes?.feloldja).toBe("pro");
    expect(ulesNyithato("starter", { brandekSzama: 0, ulesekSzama: 3 })?.korlat).toBe("ulesekMax");
  });

  it("a Pro brand-korlátjánál nincs mire váltani", () => {
    expect(brandNyithato("pro", { brandekSzama: 10, ulesekSzama: 1 })?.feloldja).toBeUndefined();
  });

  it("a videó-hossz csomagfüggő", () => {
    expect(auditIndithato("starter", { ajto: "video", videoPerc: 4 })).toBeUndefined();
    expect(auditIndithato("starter", { ajto: "video", videoPerc: 12 })?.korlat).toBe("videoPercMax");
    expect(auditIndithato("pro", { ajto: "video", videoPerc: 12 })).toBeUndefined();
  });

  it("a kétidőpontos mód és a köteg Pro-képesség", () => {
    expect(auditIndithato("starter", { ajto: "url", ketidopontos: true })?.korlat).toBe("ketidopontosMod");
    expect(auditIndithato("starter", { ajto: "url", koteg: true })?.korlat).toBe("koteg");
    expect(auditIndithato("pro", { ajto: "url", ketidopontos: true, koteg: true })).toBeUndefined();
  });

  it("az alfa Pro-képességeket kap, mert a nyitáskor Starterré vagy Próvá alakul", () => {
    expect(CSOMAGOK.alfa.videoPercMax).toBe(CSOMAGOK.pro.videoPercMax);
    expect(auditIndithato("alfa", { ajto: "video", videoPerc: 18 })).toBeUndefined();
  });
});
