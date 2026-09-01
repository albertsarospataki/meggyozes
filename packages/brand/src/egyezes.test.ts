import { describe, expect, it } from "vitest";
import { brandEgyezes } from "./egyezes.js";
import { uresProfil, type BrandProfil } from "./profil.js";

function profil(): BrandProfil {
  const p = uresProfil("b", "sz", "Példa Kft.");
  return {
    ...p,
    pozicionalas: {
      foIgeret: "Kérdés nélküli visszavétel harminc napig.",
      ertekek: [],
      differencialas: undefined,
      amitSosemMondunk: [],
    },
    hangnem: { ...p.hangnem, megszolitas: "tegezes", tiltottKifejezesek: ["utolsó esély"] },
    bizonyitekTar: [
      {
        azonosito: "PP-1",
        allitas: "A legrövidebb szállítási idő a kategóriában, GLS-mérés alapján.",
        forras: "GLS",
        ervenyesseg: undefined,
        igazolta: "Kiss Anna",
        szamertek: undefined,
      },
    ],
  };
}

describe("brand-egyezés blokk", () => {
  it("profil nélkül kimondja, hogy általános javaslat készül", () => {
    const e = brandEgyezes("Bármi.", undefined);
    expect(e.vanProfil).toBe(false);
    expect(e.tetelek).toHaveLength(0);
    expect(e.osszefoglalo).toContain("általános");
  });

  it("felismeri az ígéret megjelenését az anyagban", () => {
    const e = brandEgyezes("Nálunk kérdés nélküli a visszavétel, harminc napig.", profil());
    expect(e.tetelek.find((t) => t.szempont === "igeret")?.allapot).toBe("egyezik");
  });

  it("az ígéret hiányát nem nevezi eltérésnek, csak azt, hogy nem található", () => {
    const e = brandEgyezes("Vásárolj most, gyors kiszállítással.", profil());
    expect(e.tetelek.find((t) => t.szempont === "igeret")?.allapot).toBe("nem-talalhato");
  });

  it("a tiltólistás kifejezést megállapításként hozza", () => {
    const e = brandEgyezes("Utolsó esély, ne maradj le!", profil());
    const tetel = e.tetelek.find((t) => t.szempont === "tiltolista");
    expect(tetel?.allapot).toBe("elter");
    expect(tetel?.idezetek).toHaveLength(1);
  });

  it("a proof pointtal fedett felsőfokot elfogadja, a fedetlent kifogásolja", () => {
    const fedett = brandEgyezes("A legrövidebb szállítási idő vár rád.", profil());
    expect(fedett.tetelek.find((t) => t.szempont === "proof-point")?.allapot).toBe("egyezik");

    const fedetlen = brandEgyezes("A legolcsóbb ajánlat a piacon.", profil());
    expect(fedetlen.tetelek.find((t) => t.szempont === "proof-point")?.allapot).toBe("elter");
  });

  it("üres tiltólistánál nem állít semmit, hanem tanításra hív", () => {
    const p = profil();
    const uresTilto: BrandProfil = { ...p, hangnem: { ...p.hangnem, tiltottKifejezesek: [] } };
    const tetel = brandEgyezes("Bármi.", uresTilto).tetelek.find((t) => t.szempont === "tiltolista");
    expect(tetel?.allapot).toBe("nem-eldontheto");
  });

  it("az összefoglaló emberi mondat, és tartalmazza a készültséget", () => {
    const e = brandEgyezes("Nálunk kérdés nélküli a visszavétel harminc napig.", profil());
    expect(e.osszefoglalo).toMatch(/készültség \d/);
  });
});
