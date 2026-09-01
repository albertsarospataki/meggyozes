import { describe, expect, it } from "vitest";
import {
  adminKorrekcio,
  fedezetet,
  felhasznalas,
  fokonyvet,
  haviJovairas,
  kiegeszitoVasarlas,
  visszairasok,
  type KreditTranzakcio,
} from "./fokonyv.js";

const szerv = "szerv-1";
const ciklus = { szervezetAzonosito: szerv, haviKredit: 300, ciklusKezdet: "2026-09-01T00:00:00Z", ciklusVege: "2026-10-01T00:00:00Z" };

describe("kredit-főkönyv", () => {
  it("a havi keret a ciklus elején jóváíródik", () => {
    const f = fokonyvet([haviJovairas(ciklus)], new Date("2026-09-10T00:00:00Z"));
    expect(f.havi).toBe(300);
    expect(f.osszesen).toBe(300);
  });

  it("a fel nem használt havi keret a ciklus végén elvész, nem gördül át", () => {
    const tr = [
      haviJovairas(ciklus),
      haviJovairas({ ...ciklus, ciklusKezdet: "2026-10-01T00:00:00Z", ciklusVege: "2026-11-01T00:00:00Z" }),
    ];
    const f = fokonyvet(tr, new Date("2026-10-05T00:00:00Z"));
    expect(f.havi).toBe(300);
  });

  it("előbb a havi keretet fogyasztja, csak utána a kiegészítőt", () => {
    const tr: KreditTranzakcio[] = [
      haviJovairas({ ...ciklus, haviKredit: 20 }),
      kiegeszitoVasarlas({ szervezetAzonosito: szerv, mennyiseg: 100, vasarolt: "2026-09-02T00:00:00Z" }),
      felhasznalas({ szervezetAzonosito: szerv, koltseg: 15, futasAzonosito: "f-1", muvelet: "Audit — URL", mikor: "2026-09-03T00:00:00Z" }),
    ];
    const f = fokonyvet(tr, new Date("2026-09-04T00:00:00Z"));
    expect(f.havi).toBe(5);
    expect(f.kiegeszito).toBe(100);
  });

  it("a havi keret kifogyása után a kiegészítőbe nyúl", () => {
    const tr: KreditTranzakcio[] = [
      haviJovairas({ ...ciklus, haviKredit: 20 }),
      kiegeszitoVasarlas({ szervezetAzonosito: szerv, mennyiseg: 100, vasarolt: "2026-09-02T00:00:00Z" }),
      felhasznalas({ szervezetAzonosito: szerv, koltseg: 30, futasAzonosito: "f-1", muvelet: "Audit — videó", mikor: "2026-09-03T00:00:00Z" }),
    ];
    const f = fokonyvet(tr, new Date("2026-09-04T00:00:00Z"));
    expect(f.havi).toBe(0);
    expect(f.kiegeszito).toBe(90);
  });

  it("a kiegészítő csomag 12 hónapig él", () => {
    const tr = [kiegeszitoVasarlas({ szervezetAzonosito: szerv, mennyiseg: 100, vasarolt: "2026-09-02T00:00:00Z" })];
    expect(fokonyvet(tr, new Date("2027-08-01T00:00:00Z")).kiegeszito).toBe(100);
    expect(fokonyvet(tr, new Date("2027-09-03T00:00:00Z")).kiegeszito).toBe(0);
  });

  it("a hibás futás visszaírása abba a keretbe megy vissza, ahonnan levonódott", () => {
    const terheles = felhasznalas({
      szervezetAzonosito: szerv,
      koltseg: 10,
      futasAzonosito: "f-1",
      muvelet: "Audit — URL",
      mikor: "2026-09-03T00:00:00Z",
    });
    const elozetes = fokonyvet([haviJovairas(ciklus), terheles], new Date("2026-09-03T02:00:00Z"));
    const tr = [
      haviJovairas(ciklus),
      terheles,
      ...visszairasok(elozetes, terheles, "2026-09-03T01:00:00Z", "A futás hibával leállt."),
    ];
    const f = fokonyvet(tr, new Date("2026-09-04T00:00:00Z"));
    expect(f.havi).toBe(300);
    expect(f.kiegeszito).toBe(0);
    // A visszaírt kredit a havi kerettel együtt jár le — nem lesz belőle tartós kredit.
    expect(fokonyvet(tr, new Date("2026-10-02T00:00:00Z")).osszesen).toBe(0);
  });

  it("a kiegészítőből fogyasztott kredit visszaírása is a kiegészítő lejáratát viszi", () => {
    const terheles = felhasznalas({
      szervezetAzonosito: szerv,
      koltseg: 25,
      futasAzonosito: "f-2",
      muvelet: "Audit — videó",
      mikor: "2026-09-03T00:00:00Z",
    });
    const alap = [
      haviJovairas({ ...ciklus, haviKredit: 10 }),
      kiegeszitoVasarlas({ szervezetAzonosito: szerv, mennyiseg: 100, vasarolt: "2026-09-02T00:00:00Z" }),
      terheles,
    ];
    const elozetes = fokonyvet(alap, new Date("2026-09-03T02:00:00Z"));
    const vissza = visszairasok(elozetes, terheles, "2026-09-03T01:00:00Z", "HUM-kapun elakadt.");
    expect(vissza.map((v) => [v.keret, v.mennyiseg])).toEqual([
      ["havi", 10],
      ["kiegeszito", 15],
    ]);
    const f = fokonyvet([...alap, ...vissza], new Date("2026-09-04T00:00:00Z"));
    expect(f.havi).toBe(10);
    expect(f.kiegeszito).toBe(100);
  });

  it("a fedezet nélküli terhelést nem nyeli el, hanem kimutatja", () => {
    const tr = [
      haviJovairas({ ...ciklus, haviKredit: 5 }),
      felhasznalas({ szervezetAzonosito: szerv, koltseg: 10, futasAzonosito: "f-1", muvelet: "Audit — URL", mikor: "2026-09-03T00:00:00Z" }),
    ];
    const f = fokonyvet(tr, new Date("2026-09-04T00:00:00Z"));
    expect(f.fedezetlen).toHaveLength(1);
    expect(f.fedezetlen[0]?.hiany).toBe(5);
  });

  it("hiányzó fedezetnél nem indít, hanem kiegészítőt ajánl", () => {
    const f = fokonyvet([haviJovairas({ ...ciklus, haviKredit: 3 })], new Date("2026-09-04T00:00:00Z"));
    const e = fedezetet(f, 10);
    expect(e.fedezett).toBe(false);
    expect(e.hiany).toBe(7);
    expect(e.uzenet).toContain("kiegészítő");
  });

  it("elég fedezetnél az indítás előtti mondatot adja", () => {
    const f = fokonyvet([haviJovairas({ ...ciklus, haviKredit: 284 })], new Date("2026-09-04T00:00:00Z"));
    expect(fedezetet(f, 10).uzenet).toBe("Ez a művelet 10 kreditbe kerül, marad 274.");
  });

  it("az admin-korrekció kiállító nélkül nem rögzíthető", () => {
    expect(() => adminKorrekcio(szerv, 50, "kiegeszito", "2026-09-04T00:00:00Z", "  ", "jóvátétel")).toThrow(
      /naplózatlan|kiállító|naplózási/i,
    );
    const tr = adminKorrekcio(szerv, 50, "kiegeszito", "2026-09-04T00:00:00Z", "albert", "jóvátétel");
    expect(tr.kiAllitotta).toBe("albert");
  });
});
