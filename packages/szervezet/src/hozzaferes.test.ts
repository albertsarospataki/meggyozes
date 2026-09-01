import { describe, expect, it } from "vitest";
import { jogosult, lathatoBrandek, latja, SZEREP_KEPESSEGEK, type Tagsag } from "./hozzaferes.js";

const elemzo: Tagsag = {
  felhasznaloAzonosito: "u-1",
  szervezetAzonosito: "szerv-1",
  szerep: "elemzo",
  brandHozzaferes: ["brand-a"],
};

const admin: Tagsag = { ...elemzo, felhasznaloAzonosito: "u-2", szerep: "admin", brandHozzaferes: "mind" };
const nezo: Tagsag = { ...elemzo, felhasznaloAzonosito: "u-3", szerep: "nezo" };
const platform: Tagsag = {
  felhasznaloAzonosito: "albert",
  szervezetAzonosito: "platform",
  szerep: "platform_admin",
  brandHozzaferes: "mind",
};

describe("jogosultság-mátrix", () => {
  it("brandet Admin hoz létre, az Elemző nem", () => {
    expect(jogosult(admin, "brand:letrehoz", { szervezetAzonosito: "szerv-1" }).engedelyezett).toBe(true);
    expect(jogosult(elemzo, "brand:letrehoz", { szervezetAzonosito: "szerv-1" }).indok).toBe("szerep-nem-jogosult");
  });

  it("az Elemző szerkeszti a kijelölt brandet, a nem kijelöltet nem", () => {
    expect(jogosult(elemzo, "brand:szerkeszt", { szervezetAzonosito: "szerv-1", brandAzonosito: "brand-a" }).engedelyezett).toBe(true);
    const idegen = jogosult(elemzo, "brand:szerkeszt", { szervezetAzonosito: "szerv-1", brandAzonosito: "brand-b" });
    expect(idegen.engedelyezett).toBe(false);
    expect(idegen.indok).toBe("brand-nem-kijelolt");
  });

  it("másik szervezet objektumához senki nem fér hozzá, még a saját szerepével sem", () => {
    const d = jogosult(admin, "riport:olvas", { szervezetAzonosito: "szerv-2", brandAzonosito: "brand-x" });
    expect(d.engedelyezett).toBe(false);
    expect(d.indok).toBe("masik-szervezet");
  });

  it("a Néző csak külön engedéllyel kérdezhet", () => {
    expect(jogosult(nezo, "futas:kerdezz", { szervezetAzonosito: "szerv-1", brandAzonosito: "brand-a" }).indok).toBe(
      "nezo-kerdezes-tiltva",
    );
    const engedve: Tagsag = { ...nezo, kerdezhet: true };
    expect(jogosult(engedve, "futas:kerdezz", { szervezetAzonosito: "szerv-1", brandAzonosito: "brand-a" }).engedelyezett).toBe(true);
  });

  it("a Néző az engedéllyel sem indíthat auditot", () => {
    const engedve: Tagsag = { ...nezo, kerdezhet: true };
    expect(jogosult(engedve, "futas:audit", { szervezetAzonosito: "szerv-1" }).engedelyezett).toBe(false);
  });

  it("az Elemző csak a saját futását törli", () => {
    const sajat = { szervezetAzonosito: "szerv-1", brandAzonosito: "brand-a", letrehozoAzonosito: "u-1" };
    const masé = { szervezetAzonosito: "szerv-1", brandAzonosito: "brand-a", letrehozoAzonosito: "u-9" };
    expect(jogosult(elemzo, "torles:sajat_futas", sajat).engedelyezett).toBe(true);
    expect(jogosult(elemzo, "torles:sajat_futas", masé).indok).toBe("nem-sajat-futas");
  });

  it("a szervezet törlése csak a Tulajdonosé", () => {
    expect(SZEREP_KEPESSEGEK.tulajdonos).toContain("torles:szervezet");
    expect(SZEREP_KEPESSEGEK.admin).not.toContain("torles:szervezet");
  });

  it("ügyfél-szerep nem nyúlhat platform-pulthoz", () => {
    expect(jogosult(admin, "platform:hum_kapu").engedelyezett).toBe(false);
    expect(jogosult(platform, "platform:hum_kapu").engedelyezett).toBe(true);
  });

  it("a kurátor csak a tanulási sorhoz fér hozzá", () => {
    const kurator: Tagsag = { ...platform, szerep: "kurator" };
    expect(jogosult(kurator, "platform:tanulasi_sor").engedelyezett).toBe(true);
    expect(jogosult(kurator, "platform:kredit_korrekcio").engedelyezett).toBe(false);
  });

  it("a platform-admin ügyfél-objektumon csak naplózott támogatói hozzáféréssel jár el", () => {
    const d = jogosult(platform, "riport:olvas", { szervezetAzonosito: "szerv-1", brandAzonosito: "brand-a" });
    expect(d.engedelyezett).toBe(true);
    expect(d.naplozandoTamogatoiHozzaferes).toBe(true);
  });
});

describe("adatszigetelés", () => {
  it("a láthatóság szervezet és brand szerint szűkít", () => {
    expect(latja(elemzo, { szervezetAzonosito: "szerv-1", brandAzonosito: "brand-a" })).toBe(true);
    expect(latja(elemzo, { szervezetAzonosito: "szerv-1", brandAzonosito: "brand-b" })).toBe(false);
    expect(latja(elemzo, { szervezetAzonosito: "szerv-2" })).toBe(false);
  });

  it("a listázás csak a kijelölt brandeket adja vissza", () => {
    expect(lathatoBrandek(elemzo, ["brand-a", "brand-b", "brand-c"])).toEqual(["brand-a"]);
    expect(lathatoBrandek(admin, ["brand-a", "brand-b"])).toEqual(["brand-a", "brand-b"]);
  });
});
