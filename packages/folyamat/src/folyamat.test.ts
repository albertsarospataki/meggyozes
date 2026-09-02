import { describe, expect, it } from "vitest";
import { uresProfil, type BrandProfil } from "@meggyozes/brand";
import type { Megallapitas } from "@meggyozes/projekt";
import {
  fokonyvet,
  haviJovairas,
  type Cel,
  type Fokonyv,
  type Tagsag,
} from "@meggyozes/szervezet";
import { inditastEllenoriz, type InditasKeres } from "./inditas";
import { futastLezar, kreditetRendez } from "./lezaras";

const mikor = "2026-09-03T09:00:00Z";

const elemzo: Tagsag = {
  felhasznaloAzonosito: "u-1",
  szervezetAzonosito: "szerv-1",
  szerep: "elemzo",
  brandHozzaferes: ["brand-a"],
};

const cel: Cel = { szervezetAzonosito: "szerv-1", brandAzonosito: "brand-a" };

function fokonyv(havi = 300): Fokonyv {
  return fokonyvet(
    [
      haviJovairas({
        szervezetAzonosito: "szerv-1",
        haviKredit: havi,
        ciklusKezdet: "2026-09-01T00:00:00Z",
        ciklusVege: "2026-10-01T00:00:00Z",
      }),
    ],
    new Date(mikor),
  );
}

function keres(modosit: Partial<InditasKeres> = {}): InditasKeres {
  return {
    tag: elemzo,
    cel,
    mod: "audit",
    csomag: "starter",
    muvelet: { tipus: "audit_url" },
    auditKeres: { ajto: "url" },
    fokonyv: fokonyv(),
    futasAzonosito: "f-1",
    mikor,
    ...modosit,
  };
}

describe("indítás négy kapuja", () => {
  it("a szabályos kérés indulhat, és megadja a levonás tranzakcióját", () => {
    const e = inditastEllenoriz(keres());
    expect(e.dontes).toBe("indulhat");
    expect(e.ar.osszesen).toBe(10);
    expect(e.terheles?.mennyiseg).toBe(-10);
    expect(e.uzenet).toBe("Ez a művelet 10 kreditbe kerül, marad 290.");
  });

  it("nem kijelölt brandnél a jogosultság bukik, és nincs terhelés", () => {
    const e = inditastEllenoriz(keres({ cel: { szervezetAzonosito: "szerv-1", brandAzonosito: "brand-b" } }));
    expect(e.dontes).toBe("jogosultsag-hiany");
    expect(e.terheles).toBeUndefined();
  });

  it("a csomagkorlát a kredit előtt fog, hogy a tiltott futás ne kerüljön kreditbe", () => {
    const e = inditastEllenoriz(
      keres({ muvelet: { tipus: "audit_video", percek: 12 }, auditKeres: { ajto: "video", videoPerc: 12 } }),
    );
    expect(e.dontes).toBe("csomagkorlat");
    expect(e.korlatSertes?.feloldja).toBe("pro");
    expect(e.terheles).toBeUndefined();
  });

  it("fedezet hiányában nem indít, hanem kiegészítőt ajánl", () => {
    const e = inditastEllenoriz(keres({ fokonyv: fokonyv(4) }));
    expect(e.dontes).toBe("kredit-hiany");
    expect(e.uzenet).toContain("kiegészítő");
  });

  it("a Néző auditot nem indíthat", () => {
    const e = inditastEllenoriz(keres({ tag: { ...elemzo, szerep: "nezo" } }));
    expect(e.dontes).toBe("jogosultsag-hiany");
  });
});

function megallapitas(x: Partial<Megallapitas> & { azonosito: string }): Megallapitas {
  return {
    szabalyKod: "S-1",
    jelKodok: [],
    technikaKodok: [],
    idezet: "…",
    sav: "3 Hatasossag es hiany",
    bizonyitekSzint: "teny",
    minosites: "problema",
    forras: undefined,
    ...x,
  };
}

describe("lezárás: HUM-kapu és brand-őr", () => {
  const profil = (): BrandProfil => {
    const alap = uresProfil("brand-a", "szerv-1", "Példa Kft.");
    return { ...alap, hangnem: { ...alap.hangnem, megszolitas: "tegezes", tiltottKifejezesek: ["utolsó esély"] } };
  };

  it("KO-sáv nélkül a riport kész", () => {
    const e = futastLezar({
      megallapitasok: [megallapitas({ azonosito: "m1" })],
      javaslatSzovegek: [{ azonosito: "j1", szoveg: "Írd ki a garanciát a gomb mellé." }],
      profil: profil(),
    });
    expect(e.riportStatusz).toBe("kesz");
    expect(e.humKapuraKell).toBe(false);
  });

  it("a tény fokozatú KO-megállapítás HUM-kapura viszi, de a többi rész olvasható marad", () => {
    const e = futastLezar({
      megallapitasok: [
        megallapitas({ azonosito: "m1", sav: "0 Jogi KO" }),
        megallapitas({ azonosito: "m2" }),
      ],
      javaslatSzovegek: [],
      profil: profil(),
    });
    expect(e.riportStatusz).toBe("ellenorzes_alatt");
    expect(e.koMegallapitasok.map((m) => m.azonosito)).toEqual(["m1"]);
    expect(e.uzenet).toContain("már olvasható");
  });

  it("a gyanús KO-megállapítás nem tölti meg a HUM-sort", () => {
    const e = futastLezar({
      megallapitasok: [megallapitas({ azonosito: "m1", sav: "0 Jogi KO", bizonyitekSzint: "gyanu" })],
      javaslatSzovegek: [],
      profil: profil(),
    });
    expect(e.humKapuraKell).toBe(false);
  });

  it("a tiltott kifejezést tartalmazó javaslatot visszaküldi, a többit helyőrzőzve kiadja", () => {
    const e = futastLezar({
      megallapitasok: [],
      javaslatSzovegek: [
        { azonosito: "j1", szoveg: "Utolsó esély, ne maradj le!" },
        { azonosito: "j2", szoveg: "A vásárlók 80%-a ajánl minket." },
      ],
      profil: profil(),
    });
    expect(e.visszakuldottJavaslatok).toEqual(["j1"]);
    const j2 = e.javaslatok.find((j) => j.azonosito === "j2");
    expect(j2?.kiadhatoSzoveg).toContain("[saját mért adat]");
  });
});

describe("kredit rendezése a kimenetel szerint", () => {
  const indulas = inditastEllenoriz(keres());
  const terheles = indulas.terheles;

  it("sikeres futásnál a kredit levonva marad", () => {
    expect(terheles).toBeDefined();
    if (terheles === undefined) return;
    const konyv = fokonyvet(
      [
        haviJovairas({ szervezetAzonosito: "szerv-1", haviKredit: 300, ciklusKezdet: "2026-09-01T00:00:00Z", ciklusVege: "2026-10-01T00:00:00Z" }),
        terheles,
      ],
      new Date(mikor),
    );
    expect(kreditetRendez("sikeres", konyv, terheles, mikor).visszairasok).toHaveLength(0);
    expect(konyv.osszesen).toBe(290);
  });

  it("hibás futásnál automatikusan visszaír", () => {
    expect(terheles).toBeDefined();
    if (terheles === undefined) return;
    const alap = [
      haviJovairas({ szervezetAzonosito: "szerv-1", haviKredit: 300, ciklusKezdet: "2026-09-01T00:00:00Z", ciklusVege: "2026-10-01T00:00:00Z" }),
      terheles,
    ];
    const konyv = fokonyvet(alap, new Date(mikor));
    const rendezes = kreditetRendez("hiba", konyv, terheles, "2026-09-03T09:10:00Z");
    expect(rendezes.uzenet).toContain("Visszaírva 10 kredit");
    expect(fokonyvet([...alap, ...rendezes.visszairasok], new Date("2026-09-03T10:00:00Z")).osszesen).toBe(300);
  });
});
