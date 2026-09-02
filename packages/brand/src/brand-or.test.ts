import { describe, expect, it } from "vitest";
import { brandOr, SZAM_HELYORZO } from "./brand-or";
import { uresProfil, type BrandProfil } from "./profil";

const mikor = new Date("2026-09-02T10:00:00Z");

function profil(modosit: (p: BrandProfil) => BrandProfil = (p) => p): BrandProfil {
  const alap = uresProfil("brand-1", "szerv-1", "Példa Kft.");
  return modosit({
    ...alap,
    hangnem: {
      ...alap.hangnem,
      megszolitas: "tegezes",
      tiltottKifejezesek: ["olcsó", "utolsó esély"],
    },
    bizonyitekTar: [
      {
        azonosito: "PP-1",
        allitas: "A vásárlók 92%-a 24 órán belül megkapja a csomagot.",
        forras: "Logisztikai riport 2026 Q2",
        ervenyesseg: "2026-12-31",
        igazolta: "Kiss Anna",
        szamertek: "92%",
      },
    ],
  });
}

describe("brand-őr", () => {
  it("a tiltott kifejezés visszaküldést vált ki, nem csak jelölést", () => {
    const e = brandOr({ szoveg: "Ez az ár, mert olcsó vagyunk.", profil: profil(), mikor });
    const tiltott = e.kifogasok.filter((k) => k.szabaly === "tiltott-kifejezes");
    expect(tiltott).toHaveLength(1);
    expect(tiltott[0]?.szint).toBe("visszakuldes");
    expect(e.kiadhato).toBe(false);
  });

  it("a toldalékolt tiltott kifejezést is megtalálja, a szó belsejét nem", () => {
    const p = profil((x) => ({ ...x, hangnem: { ...x.hangnem, tiltottKifejezesek: ["akció"] } }));
    expect(brandOr({ szoveg: "Az akciónk holnap indul.", profil: p, mikor }).kifogasok).toHaveLength(1);
    expect(brandOr({ szoveg: "Reakció nélkül maradt.", profil: p, mikor }).kifogasok).toHaveLength(0);
  });

  it("a bizonyíték-tárban igazolt számot kiengedi, az igazolatlant helyőrzőzi", () => {
    const e = brandOr({
      szoveg: "A csomagok 92%-a egy napon belül megérkezik, és 40%-kal gyorsabbak vagyunk.",
      profil: profil(),
      mikor,
    });
    const szamok = e.kifogasok.filter((k) => k.szabaly === "nem-igazolt-szam");
    expect(szamok.map((k) => k.talalat)).toEqual(["40%"]);
    expect(e.helyorzosSzoveg).toContain(`${SZAM_HELYORZO}-kal gyorsabbak`);
    expect(e.helyorzosSzoveg).toContain("92%-a");
    expect(e.kiadhato).toBe(true);
  });

  it("az idézett forrás száma idézetnek számít, ezért kimehet", () => {
    const e = brandOr({
      szoveg: "A garancia-közlés 17%-kal emelte a konverziót.",
      profil: profil(),
      idezettForrasok: ["A garancia kiemelése 17%-kal emelte a konverziót (KUT-118)."],
      mikor,
    });
    expect(e.kifogasok.filter((k) => k.szabaly === "nem-igazolt-szam")).toHaveLength(0);
  });

  it("az évszámot és a dátumdarabokat nem helyőrzőzi", () => {
    const e = brandOr({ szoveg: "A 2026-09-02 óta érvényes árlista 2025-ben készült.", profil: profil(), mikor });
    expect(e.kifogasok.filter((k) => k.szabaly === "nem-igazolt-szam")).toHaveLength(0);
  });

  it("a proof point nélküli felsőfokot lefokozásra jelöli", () => {
    const e = brandOr({ szoveg: "A legmegbízhatóbb megoldás a piacon.", profil: profil(), mikor });
    expect(e.kifogasok.map((k) => k.szabaly)).toContain("igazolatlan-szuperlativusz");
  });

  it("a proof pointtal fedett felsőfokot nem kifogásolja", () => {
    const p = profil((x) => ({
      ...x,
      bizonyitekTar: [
        {
          azonosito: "PP-2",
          allitas: "A kategória legrövidebb szállítási ideje, GLS-mérés alapján.",
          forras: "GLS 2026 H1",
          ervenyesseg: undefined,
          igazolta: "Nagy Béla",
          szamertek: undefined,
        },
      ],
    }));
    const e = brandOr({ szoveg: "A legrövidebb szállítási idő a kategóriában.", profil: p, mikor });
    expect(e.kifogasok.filter((k) => k.szabaly === "igazolatlan-szuperlativusz")).toHaveLength(0);
  });

  it("a lejárt proof point már nem igazol", () => {
    const alap = profil();
    const p: BrandProfil = {
      ...alap,
      bizonyitekTar: alap.bizonyitekTar.map((pp) => ({ ...pp, ervenyesseg: "2026-06-30" })),
    };
    const e = brandOr({ szoveg: "A csomagok 92%-a egy napon belül megérkezik.", profil: p, mikor });
    expect(e.kifogasok.filter((k) => k.szabaly === "nem-igazolt-szam")).toHaveLength(1);
  });

  it("a hangnem-eltérés jelölés, és nem üt ki szó belsejében", () => {
    const e = brandOr({ szoveg: "Ön válassza az online fizetést.", profil: profil(), mikor });
    const hangnem = e.kifogasok.filter((k) => k.szabaly === "hangnem-elteres");
    expect(hangnem).toHaveLength(1);
    expect(hangnem[0]?.szint).toBe("jeloles");
    expect(e.kiadhato).toBe(true);
  });

  it("profil nélkül általános módra vált, és minden számot helyőrzőz", () => {
    const e = brandOr({ szoveg: "Az ügyfelek 80%-a ajánl minket.", profil: undefined, mikor });
    expect(e.altalanosMod).toBe(true);
    expect(e.helyorzosSzoveg).toContain(SZAM_HELYORZO);
  });

  it("a kifogások szövegpozíció szerint rendezettek", () => {
    const e = brandOr({ szoveg: "Olcsó, 30%-kal jobb, legnagyobb.", profil: profil(), mikor });
    const poziciok = e.kifogasok.map((k) => k.kezdet);
    expect([...poziciok].sort((a, b) => a - b)).toEqual(poziciok);
  });
});
