import { describe, expect, it } from "vitest";
import { uresProfil } from "@meggyozes/brand";
import type { Projekt } from "@meggyozes/projekt";
import { Tar, type Hatokor } from "./tar.js";
import { kezdoallapototLetrehoz } from "./kezdoallapot.js";

function tar(): Tar {
  const t = new Tar(":memory:");
  kezdoallapototLetrehoz(t, {
    szervezetNev: "Alfa",
    email: "a@pelda.hu",
    felhasznaloNev: "A",
    haviKredit: 1200,
    mikor: "2026-09-02T10:00:00Z",
  });
  return t;
}

const mind: Hatokor = { szervezetAzonosito: "szerv-alfa", brandHozzaferes: "mind", felhasznaloAzonosito: "u-tulajdonos" };
const csakA: Hatokor = { szervezetAzonosito: "szerv-alfa", brandHozzaferes: ["brand-a"], felhasznaloAzonosito: "u-2" };
const masikSzervezet: Hatokor = { szervezetAzonosito: "szerv-masik", brandHozzaferes: "mind", felhasznaloAzonosito: "u-3" };

const projekt = (azonosito: string, brand: string): Projekt => ({
  azonosito,
  szervezetAzonosito: "szerv-alfa",
  brandAzonosito: brand,
  nev: azonosito,
  tipus: "audit",
  statusz: "aktiv",
  letrehozva: "2026-09-02T10:00:00Z",
  utolsoAktivitas: "2026-09-02T10:00:00Z",
});

describe("tár és tenant-szigetelés", () => {
  it("a kezdőállapot szervezetet, tulajdonost és havi keretet hoz létre", () => {
    const t = tar();
    expect(t.szervezet("szerv-alfa")?.csomag).toBe("alfa");
    expect(t.kreditTranzakciok(mind)).toHaveLength(1);
    expect(t.tagsagok("u-tulajdonos")[0]?.szerep).toBe("tulajdonos");
    t.close();
  });

  it("a kezdőállapot újrafuttatása nem ír felül és nem duplikál keretet", () => {
    const t = tar();
    kezdoallapototLetrehoz(t, { szervezetNev: "Más", email: "b@pelda.hu", felhasznaloNev: "B", haviKredit: 999, mikor: "2026-09-03T10:00:00Z" });
    expect(t.kreditTranzakciok(mind)).toHaveLength(1);
    t.close();
  });

  it("a brand-hozzáférés szűkíti a brand- és projektlistát", () => {
    const t = tar();
    for (const b of ["brand-a", "brand-b"]) {
      t.brandetMent({
        azonosito: b,
        szervezetAzonosito: "szerv-alfa",
        nev: b,
        profil: uresProfil(b, "szerv-alfa", b),
        letrehozva: "2026-09-02T10:00:00Z",
      });
    }
    t.projektetMent(projekt("p-1", "brand-a"));
    t.projektetMent(projekt("p-2", "brand-b"));

    expect(t.brandek(mind).map((b) => b.azonosito)).toEqual(["brand-a", "brand-b"]);
    expect(t.brandek(csakA).map((b) => b.azonosito)).toEqual(["brand-a"]);
    expect(t.projektek(csakA).map((p) => p.azonosito)).toEqual(["p-1"]);
    expect(t.projekt(csakA, "p-2")).toBeUndefined();
    t.close();
  });

  it("másik szervezet semmit nem lát, akkor sem, ha minden brandhez van hozzáférése", () => {
    const t = tar();
    t.brandetMent({
      azonosito: "brand-a",
      szervezetAzonosito: "szerv-alfa",
      nev: "A",
      profil: uresProfil("brand-a", "szerv-alfa", "A"),
      letrehozva: "2026-09-02T10:00:00Z",
    });
    t.projektetMent(projekt("p-1", "brand-a"));
    expect(t.brandek(masikSzervezet)).toEqual([]);
    expect(t.projektek(masikSzervezet)).toEqual([]);
    expect(t.kreditTranzakciok(masikSzervezet)).toEqual([]);
    t.close();
  });

  it("üres brand-hozzáférés semmit nem ad vissza, nem mindent", () => {
    const t = tar();
    t.brandetMent({
      azonosito: "brand-a",
      szervezetAzonosito: "szerv-alfa",
      nev: "A",
      profil: uresProfil("brand-a", "szerv-alfa", "A"),
      letrehozva: "2026-09-02T10:00:00Z",
    });
    const senki: Hatokor = { szervezetAzonosito: "szerv-alfa", brandHozzaferes: [], felhasznaloAzonosito: "u-9" };
    expect(t.brandek(senki)).toEqual([]);
    t.close();
  });
});
