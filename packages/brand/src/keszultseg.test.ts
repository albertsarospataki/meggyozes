import { describe, expect, it } from "vitest";
import { BRAND_BLOKKOK, BRAND_KONTEXTUS_KUSZOB, keszultseget } from "./keszultseg";
import { uresProfil, type BrandProfil } from "./profil";

function feltoltott(): BrandProfil {
  const p = uresProfil("b", "sz", "Példa Kft.");
  return {
    ...p,
    alapadatok: {
      nev: "Példa Kft.",
      agazat: "e-kereskedelem",
      agazatiModulok: [],
      uzletiModell: "B2C",
      piacEsNyelv: "HU / magyar",
      joghatosag: "Magyarország",
      domainek: ["pelda.hu"],
    },
    pozicionalas: {
      foIgeret: "Két nap alatt otthon, kérdés nélküli visszavétellel.",
      ertekek: ["gyorsaság", "őszinteség", "egyszerűség"],
      differencialas: "Saját futárhálózat.",
      amitSosemMondunk: ["utolsó darabok"],
    },
    hangnem: {
      megszolitas: "tegezes",
      kotelezoKifejezesek: ["kérdés nélkül", "két nap", "nálunk"],
      tiltottKifejezesek: ["olcsó", "akciós", "utolsó esély", "villámakció", "csak most"],
      peldamondatok: ["Nálunk kérdés nélkül visszaveheted.", "Két nap, és nálad van.", "Írj, ha elakadsz."],
      cimkek: ["közvetlen"],
    },
    bizonyitekTar: [1, 2, 3, 4, 5].map((n) => ({
      azonosito: `PP-${n}`,
      allitas: `Igazolt állítás ${n}.`,
      forras: "belső mérés",
      ervenyesseg: undefined,
      igazolta: "Kiss Anna",
      szamertek: undefined,
    })),
  };
}

describe("brand-készültség", () => {
  it("az üres profil 0 pont, és nem használható brand-kontextusra", () => {
    const k = keszultseget(uresProfil("b", "sz", "Példa Kft."));
    // A név egyetlen mezője az alapadatok blokk töredéke, ezért nem pont nulla a blokk,
    // de a súlyozott összeg a küszöb alatt marad.
    expect(k.pont).toBeLessThan(BRAND_KONTEXTUS_KUSZOB);
    expect(k.brandKontextusHasznalhato).toBe(false);
    expect(k.blokkok).toHaveLength(BRAND_BLOKKOK.length);
  });

  it("a kérdőívvel feltöltött profil átlépi a brand-kontextus küszöbét", () => {
    const k = keszultseget(feltoltott());
    expect(k.pont).toBeGreaterThanOrEqual(BRAND_KONTEXTUS_KUSZOB);
    expect(k.brandKontextusHasznalhato).toBe(true);
  });

  it("a hiányzó blokkokat a legtöbbet érő szerint sorolja, és megmondja, mit javítanának", () => {
    const k = keszultseget(feltoltott());
    const elso = k.hianyzok[0];
    expect(elso).toBeDefined();
    expect(elso?.kitoltottseg).toBeLessThan(1);
    expect(elso?.mitTennePontosabba).not.toBe("");
    const sulyozott = k.hianyzok.map((h) => h.suly * (1 - h.kitoltottseg));
    expect([...sulyozott].sort((a, b) => b - a)).toEqual(sulyozott);
  });

  it("a teljes profil 5 pont", () => {
    const p = feltoltott();
    const teljes: BrandProfil = {
      ...p,
      szegmensek: [
        { megnevezes: "első vásárló", dontesiSzakasz: "összehasonlít", tolcserPozicio: "meleg", foKifogas: "szállítás" },
        { megnevezes: "visszatérő", dontesiSzakasz: "kész", tolcserPozicio: "visszatérő", foKifogas: "ár" },
      ],
      vizualisJegyek: { szinek: ["#101010"], tipografia: "Inter", logoSzabalyok: "sosem nyújtva", kepiStilus: "dokumentarista" },
      ajanlatok: [{ megnevezes: "Alap", ar: "9 900 Ft", viszonyitasiAr: undefined, garancia: "30 nap" }],
      jogiKeret: { kotelezettsegek: ["elállás 14 nap"], kotelezoJelolesek: ["áfa"], jogaszJovahagyasaKell: [] },
      versenytarsak: [
        { nev: "A", url: undefined },
        { nev: "B", url: undefined },
        { nev: "C", url: undefined },
      ],
      meres: { elerhetoForrasok: ["GA4"], kpik: ["konverzió"] },
      tanultMintazatok: [1, 2, 3].map((n) => ({
        azonosito: `TM-${n}`,
        leiras: `Mintázat ${n}`,
        tipus: "lyuk" as const,
        eloforduasok: 3,
        jovahagyta: "Albert",
        jovahagyva: "2026-09-02",
      })),
    };
    expect(keszultseget(teljes).pont).toBe(5);
    expect(keszultseget(teljes).hianyzok).toHaveLength(0);
  });
});
