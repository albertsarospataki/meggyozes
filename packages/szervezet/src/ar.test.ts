import { describe, expect, it } from "vitest";
import { ALAPARAK, ar, arElonezet } from "./ar.js";

describe("kredit-árlista", () => {
  it("az egyoldalas URL-audit 10 kredit", () => {
    expect(ar({ tipus: "audit_url" }).osszesen).toBe(ALAPARAK.audit_url);
  });

  it("a kép-ajtó további oldalanként 2 kreditet számol", () => {
    expect(ar({ tipus: "audit_kep", oldalak: 1 }).osszesen).toBe(6);
    expect(ar({ tipus: "audit_kep", oldalak: 4 }).osszesen).toBe(6 + 3 * 2);
  });

  it("a videó első öt perce benne van az alapárban, felette percenként 3 kredit", () => {
    expect(ar({ tipus: "audit_video", percek: 5 }).osszesen).toBe(15);
    expect(ar({ tipus: "audit_video", percek: 8 }).osszesen).toBe(15 + 3 * 3);
  });

  it("a megkezdett perc egész percnek számít", () => {
    expect(ar({ tipus: "audit_video", percek: 5.2 }).osszesen).toBe(15 + 3);
  });

  it("a kétidőpontos felár csak audit-műveletre jön rá", () => {
    expect(ar({ tipus: "audit_url", ketidopontos: true }).osszesen).toBe(15);
    expect(ar({ tipus: "kerdes_rovid", ketidopontos: true }).osszesen).toBe(1);
  });

  it("tételes bontást ad, hogy a kredit-történet visszakereshető legyen", () => {
    const bontas = ar({ tipus: "audit_video", percek: 7, ketidopontos: true });
    expect(bontas.tetelek.map((t) => t.kredit)).toEqual([15, 6, 5]);
    expect(bontas.osszesen).toBe(26);
  });

  it("az indítás előtti mondat az egyenleget is mutatja", () => {
    expect(arElonezet(ar({ tipus: "audit_url" }), 284)).toBe("Ez a művelet 10 kreditbe kerül, marad 274.");
  });
});
