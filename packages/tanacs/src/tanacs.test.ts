import { describe, expect, it } from "vitest";
import { uresProfil, type BrandProfil } from "@meggyozes/brand";
import { briefetGeneral, sorrendetEllenoriz, type Epitoelem, type EpitesiLepes } from "./brief.js";
import { intentAllapot, intentKulonbseg, ujVerzio, uresIntent, type Intent } from "./intent.js";
import { kapuzottJavaslatok, sajatJavaslatKapu } from "./kapu.js";
import { belepoCsomag, kovetkezoKerdes, nyitottKerdesek } from "./kerdesek.js";
import { KONSTRUKCIO_TIPUSOK, tipustFelismer } from "./konstrukcio.js";

describe("konstrukció-típus felismerése", () => {
  it("a belépő mondatból felismeri az akciót", () => {
    expect(tipustFelismer("jövő héten 20% kedvezmény a webshopon").tipus).toBe("KON-AKC");
  });

  it("a cikk önálló típus, nem esik a kampányra", () => {
    expect(tipustFelismer("írnánk egy szakcikket a szállítási időkről").tipus).toBe("KON-CIK");
    expect(KONSTRUKCIO_TIPUSOK).toContain("KON-CIK");
  });

  it("holtversenynél nem választ, hanem kérdez", () => {
    const f = tipustFelismer("hűségprogram és árazás egyszerre");
    expect(f.tipus).toBeUndefined();
    expect(f.kerdezniKell).toBe(true);
    expect(f.kerdes).toContain("hűségprogram");
  });

  it("felismerhetetlen mondatnál is kérdés a kimenet, nem találgatás", () => {
    const f = tipustFelismer("csinálnánk valamit jövő hónapban");
    expect(f.tipus).toBeUndefined();
    expect(f.kerdezniKell).toBe(true);
  });
});

describe("Intent", () => {
  const alap = uresIntent("i-1", "p-1", "2026-09-02T10:00:00Z");

  it("az üres Intent nem validálható, és a kötelező mezőket sorolja", () => {
    const a = intentAllapot(alap);
    expect(a.validalhato).toBe(false);
    expect(a.hianyzoKotelezoMezok).toContain("cel");
    expect(a.kitoltottseg).toBe(0);
  });

  it("a kötelező mezők kitöltése után validálható, akkor is, ha az opcionálisak hiányoznak", () => {
    const kesz = ujVerzio(
      alap,
      {
        konstrukcioTipus: "KON-AKC",
        cel: "bevétel",
        kozonseg: "visszatérő vevők",
        mechanika: "20% kedvezmény",
        igeret: "Egy hétig olcsóbban.",
      },
      "2026-09-02T10:05:00Z",
    );
    const a = intentAllapot(kesz);
    expect(a.validalhato).toBe(true);
    expect(a.hianyzoMezok).toContain("meres");
  });

  it("a módosítás új verziót szül, az előző változatlan marad", () => {
    const v1: Intent = { ...alap, mechanika: "20% kedvezmény" };
    const v2 = ujVerzio(v1, { mechanika: "ajándék a vásárlás mellé" }, "2026-09-02T11:00:00Z");
    expect(v1.mechanika).toBe("20% kedvezmény");
    expect(v2.verzio).toBe(2);
    expect(v2.elozoVerzio).toBe(1);
  });

  it("a „mi van, ha” iterációra különbség-összefoglalót ad, nem új riportot", () => {
    const v1: Intent = { ...alap, mechanika: "20% kedvezmény", csatornak: ["hírlevél"] };
    const v2 = ujVerzio(v1, { mechanika: "ajándék a vásárlás mellé" }, "2026-09-02T11:00:00Z");
    const k = intentKulonbseg(v1, v2);
    expect(k.valtozasok.map((v) => v.mezo)).toEqual(["mechanika"]);
    expect(k.osszefoglalo).toContain("20% kedvezmény → ajándék a vásárlás mellé");
  });
});

describe("1C belépő kérdések", () => {
  it("minden típushoz 6–10 kérdéses csomag tartozik", () => {
    for (const tipus of KONSTRUKCIO_TIPUSOK) {
      const csomag = belepoCsomag(tipus);
      expect(csomag.length).toBeGreaterThanOrEqual(6);
      expect(csomag.length).toBeLessThanOrEqual(10);
    }
  });

  it("előbb a kötelező mezőt kérdezi", () => {
    const intent: Intent = { ...uresIntent("i-1", "p-1", "2026-09-02T10:00:00Z"), konstrukcioTipus: "KON-HUS" };
    expect(kovetkezoKerdes(intent)?.mezo).toBe("cel");
  });

  it("a hűségprogram vásárlási gyakoriság kérdése benne van, mert enélkül az S-126-1 nem futtatható", () => {
    expect(belepoCsomag("KON-HUS").some((k) => k.kerdes.includes("Milyen gyakran vásárol"))).toBe(true);
  });

  it("kitöltött mezőre nem kérdez rá újra", () => {
    const intent: Intent = {
      ...uresIntent("i-1", "p-1", "2026-09-02T10:00:00Z"),
      konstrukcioTipus: "KON-AKC",
      cel: "bevétel",
    };
    expect(nyitottKerdesek(intent).some((k) => k.mezo === "cel")).toBe(false);
  });

  it("típus nélkül nem kérdez: előbb a típus dől el", () => {
    expect(kovetkezoKerdes(uresIntent("i-1", "p-1", "2026-09-02T10:00:00Z"))).toBeUndefined();
  });
});

describe("§4/b kapu a saját javaslatra", () => {
  const alap = { azonosito: "j1", szoveg: "…", sotetValtozat: false, technikaKod: "TK-111" };

  it("a KO-sávos saját javaslat visszaküldés, nem megjegyzés mellette", () => {
    const e = sajatJavaslatKapu({ ...alap, sav: "0 Jogi KO" });
    expect(e.dontes).toBe("visszakuldes");
    expect(e.teendo).toContain("Alternatíva");
  });

  it("a sötét változat leírása akkor is visszaküldés, ha a sáv hatásosság", () => {
    expect(sajatJavaslatKapu({ ...alap, sav: "3 Hatasossag es hiany", sotetValtozat: true }).dontes).toBe("visszakuldes");
  });

  it("a mérési sáv nem blokkol, de figyelmeztetést kap", () => {
    expect(sajatJavaslatKapu({ ...alap, sav: "2 Meresi KO" }).dontes).toBe("kiadhato_figyelmeztetessel");
  });

  it("a kiadott kimenetben nulla KO-sértés marad, az elfogottak száma pedig mérhető", () => {
    const o = kapuzottJavaslatok([
      { ...alap, azonosito: "j1", sav: "3 Hatasossag es hiany" },
      { ...alap, azonosito: "j2", sav: "1 Etikai KO" },
      { ...alap, azonosito: "j3", sav: "2 Meresi KO" },
    ]);
    expect(o.kiadottKoSertes).toBe(0);
    expect(o.elfogottKoSertes).toBe(1);
    expect(o.kiadhatok.map((j) => j.azonosito)).toEqual(["j1", "j3"]);
    expect(o.figyelmeztetettek).toHaveLength(1);
  });
});

describe("brief-generátor", () => {
  const intent: Intent = {
    ...uresIntent("i-1", "p-1", "2026-09-02T10:00:00Z"),
    konstrukcioTipus: "KON-AKC",
    cel: "bevétel",
    kozonseg: "visszatérő vevők",
    mechanika: "ajándék a vásárlás mellé",
    igeret: "Egy hétig ajándékkal.",
    meres: "rendelésszám az előző héthez képest",
  };

  const epitoelem = (modosit: Partial<Epitoelem> = {}): Epitoelem => ({
    technikaKod: "TK-112",
    technikaNev: "Meglepetés-jutalom",
    mikorJo: "visszatérő vevőknél, alacsony kedvezmény-érzékenységnél",
    briefMondat: "A rendelés mellé adjatok kis meglepetés-ajándékot, előre nem kommunikálva.",
    mitMerj: "ismételt rendelés aránya 30 napon belül",
    mitNeIgerj: "ne ígérj konkrét ajándékot, amíg a készlet nincs meg",
    forras: "KUT-118",
    ...modosit,
  });

  const lepesek: EpitesiLepes[] = [
    { sorszam: 1, cim: "Készlet ellenőrzése", miert: "Ígéret csak fedezettel." },
    { sorszam: 2, cim: "Ajándék kiválasztása", miert: "A releváns ajándék hajt, az általános nem." },
    { sorszam: 3, cim: "Mérés beállítása", miert: "Enélkül nincs előtte/utána." },
  ];

  it("a brief a kilenc mezőt és az építőelemeket rendezi egy oldalra", () => {
    const b = briefetGeneral({ intent, epitoelemek: [epitoelem()], lepesek, profil: undefined });
    expect(b.szoveg).toContain("Cél: bevétel");
    expect(b.szoveg).toContain("Meglepetés-jutalom");
    expect(b.szoveg).toContain("Mit ne ígérj");
  });

  it("a hiányzó mezőt bekérendőként jelöli, nem tölti ki találgatással", () => {
    const b = briefetGeneral({ intent: { ...intent, idotartam: undefined }, epitoelemek: [epitoelem()], lepesek, profil: undefined });
    expect(b.szoveg).toContain("Időtartam: [bekérendő]");
  });

  it("a brand tiltólistás kifejezése visszaküldi a briefet", () => {
    const alapProfil = uresProfil("b", "sz", "Példa Kft.");
    const profil: BrandProfil = {
      ...alapProfil,
      hangnem: { ...alapProfil.hangnem, tiltottKifejezesek: ["meglepetés"] },
    };
    const b = briefetGeneral({ intent, epitoelemek: [epitoelem()], lepesek, profil });
    expect(b.kiadhato).toBe(false);
    expect(b.brandOr.kifogasok.some((k) => k.szabaly === "tiltott-kifejezes")).toBe(true);
  });

  it("az építőelem forrásának száma idézetnek számít, a máshonnan jövő szám helyőrzőt kap", () => {
    const b = briefetGeneral({
      intent: { ...intent, cel: "40%-kal több rendelés" },
      epitoelemek: [epitoelem()],
      lepesek,
      profil: undefined,
    });
    expect(b.brandOr.kifogasok.some((k) => k.szabaly === "nem-igazolt-szam" && k.talalat === "40%")).toBe(true);
  });

  it("az építési sorrend 3–7 lépés", () => {
    expect(sorrendetEllenoriz(lepesek)).toBeUndefined();
    expect(sorrendetEllenoriz(lepesek.slice(0, 2))?.ok).toBe("keves-lepes");
    const sok = Array.from({ length: 8 }, (_, i) => ({ sorszam: i + 1, cim: `L${i}`, miert: "…" }));
    expect(sorrendetEllenoriz(sok)?.ok).toBe("sok-lepes");
    expect(sorrendetEllenoriz([{ sorszam: 1, cim: "a", miert: "…" }, { sorszam: 3, cim: "b", miert: "…" }, { sorszam: 4, cim: "c", miert: "…" }])?.ok).toBe("sorszam-hiba");
  });

  it("hibás sorrendnél a brief nem kiadható", () => {
    const b = briefetGeneral({ intent, epitoelemek: [epitoelem()], lepesek: lepesek.slice(0, 2), profil: undefined });
    expect(b.kiadhato).toBe(false);
    expect(b.sorrendHiba?.ok).toBe("keves-lepes");
  });
});
