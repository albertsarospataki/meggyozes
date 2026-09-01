import { describe, expect, it } from "vitest";
import { kerdestOsztalyoz } from "./kerdes.js";
import { bizonyitekBlokkot, hianyKartya, valasztEllenoriz, type ValaszKartya } from "./valasz.js";
import { forrasokatSzur, RELEVANCIA_KUSZOB, type ForrasTetel } from "./visszakereses.js";

function tetel(x: Partial<ForrasTetel> & { azonosito: string }): ForrasTetel {
  return {
    tipus: "kutatas",
    kulcsallitas: "A garancia kiemelése emeli a konverziót.",
    bizonyitekero: 4,
    karantenos: false,
    relevancia: 0.8,
    agazat: undefined,
    felulet: undefined,
    szamok: [],
    ...x,
  };
}

describe("kérdés-osztályozás", () => {
  it("felismeri a fogalmi kérdést", () => {
    expect(kerdestOsztalyoz("Mi az a zero-click keresés?").osztaly).toBe("fogalom");
  });

  it("felismeri a döntési kérdést", () => {
    expect(kerdestOsztalyoz("Százalék vagy ajándék legyen a hírlevélben?").osztaly).toBe("x-vagy-y");
  });

  it("a cselekvést kérő kérdés erősebb, mint a fogalmi minta", () => {
    expect(kerdestOsztalyoz("Mit változtassunk elsőként a landingen?").osztaly).toBe("mit-csinaljak");
  });

  it("brand-specifikus, ha a saját anyagra kérdez és van kontextus", () => {
    expect(kerdestOsztalyoz("Nálunk működne ez?", { brandAzonosito: "b-1" }).osztaly).toBe("brand-specifikus");
    // Kontextus nélkül nem az: általános tanácsot kell adni, nem a saját adat helyett.
    expect(kerdestOsztalyoz("Nálunk működne ez?").osztaly).not.toBe("brand-specifikus");
  });

  it("felismerhetetlen kérdésnél nem találgat, hanem általános előhívást jelöl", () => {
    const o = kerdestOsztalyoz("Visszaszámláló.");
    expect(o.osztaly).toBe("egyeb");
    expect(o.indoklas).toContain("nem ismerhető fel");
  });
});

describe("visszakeresés szűrése", () => {
  it("a karanténos forrást akkor is kizárja, ha releváns", () => {
    const e = forrasokatSzur([tetel({ azonosito: "KUT-1", karantenos: true, relevancia: 0.99 })]);
    expect(e.hasznalhato).toHaveLength(0);
    expect(e.kizart[0]?.ok).toBe("karanten");
    expect(e.hianyAg).toBe(true);
  });

  it("a küszöb alatti találatot kizárja", () => {
    const e = forrasokatSzur([tetel({ azonosito: "KUT-1", relevancia: RELEVANCIA_KUSZOB - 0.01 })]);
    expect(e.kizart[0]?.ok).toBe("relevancia-alatt");
  });

  it("az ágazat-független tétel általános érvényű, nem zárjuk ki", () => {
    const e = forrasokatSzur(
      [tetel({ azonosito: "KUT-1", agazat: undefined }), tetel({ azonosito: "KUT-2", agazat: "pénzügy" })],
      { agazat: "e-kereskedelem" },
    );
    expect(e.hasznalhato.map((t) => t.azonosito)).toEqual(["KUT-1"]);
  });

  it("relevancia, majd bizonyítékerő szerint rendez, és top-k-ra vág", () => {
    const e = forrasokatSzur(
      [
        tetel({ azonosito: "A", relevancia: 0.7, bizonyitekero: 2 }),
        tetel({ azonosito: "B", relevancia: 0.9, bizonyitekero: 1 }),
        tetel({ azonosito: "C", relevancia: 0.7, bizonyitekero: 5 }),
      ],
      { topK: 2 },
    );
    expect(e.hasznalhato.map((t) => t.azonosito)).toEqual(["B", "C"]);
  });
});

describe("válasz-kártya őrei", () => {
  const visszakereses = forrasokatSzur([
    tetel({ azonosito: "KUT-118", kulcsallitas: "A garancia kiemelése 17%-kal emelte a konverziót.", szamok: ["17%"] }),
    tetel({ azonosito: "TK-045", tipus: "technika", kulcsallitas: "Kockázatcsökkentés." }),
    tetel({ azonosito: "KUT-999", karantenos: true }),
  ]);

  const jo: ValaszKartya = {
    rovidValasz: [{ szoveg: "A garancia kiemelése segít, mert csökkenti az észlelt kockázatot.", forrasAzonositok: ["KUT-118"] }],
    technikak: [{ kod: "TK-045", nev: "Kockázatcsökkentés", mechanizmus: "A vevő félelmét oldja.", forrasAzonositok: ["TK-045"] }],
    bizonyitek: [{ forrasAzonosito: "KUT-118", bizonyitekero: 4, kontextus: "általános", mertek: "17%" }],
    alternativak: [
      { cim: "Konzervatív", leiras: "Tedd a garanciát a gomb mellé.", forrasAzonositok: ["KUT-118"] },
      { cim: "Bátrabb", leiras: "Emeld az első képernyőre.", forrasAzonositok: ["KUT-118"] },
    ],
    amitNemTudunk: ["B2B-re nincs mért eredmény."],
    kovetkezoLepesek: [{ cim: "Indíts auditot", muvelet: "audit" }],
    hianyKimondas: false,
  };

  it("a szabályos kártyát kiadja", () => {
    const e = valasztEllenoriz(jo, visszakereses);
    expect(e.kifogasok).toEqual([]);
    expect(e.kiadhato).toBe(true);
  });

  it("a forrás nélküli állítást megfogja, és számolja is", () => {
    const e = valasztEllenoriz({ ...jo, rovidValasz: [{ szoveg: "Ez így működik.", forrasAzonositok: [] }] }, visszakereses);
    expect(e.forrasNelkuliAllitasok).toBe(1);
    expect(e.kiadhato).toBe(false);
  });

  it("a karanténos forrás idézése önálló szabálysértés", () => {
    const e = valasztEllenoriz(
      { ...jo, rovidValasz: [{ szoveg: "Segít.", forrasAzonositok: ["KUT-999"] }] },
      visszakereses,
    );
    expect(e.kifogasok.map((k) => k.szabaly)).toContain("karantenos-forras");
  });

  it("a visszakeresésen kívüli forrásra nem hivatkozhat", () => {
    const e = valasztEllenoriz({ ...jo, bizonyitek: [{ forrasAzonosito: "KUT-777", bizonyitekero: 3, kontextus: "általános", mertek: undefined }] }, visszakereses);
    expect(e.kifogasok.map((k) => k.szabaly)).toContain("ismeretlen-forras");
  });

  it("a forrásból idézett szám kimehet, a máshonnan jövő nem", () => {
    const idezett = valasztEllenoriz(
      { ...jo, rovidValasz: [{ szoveg: "A mérés szerint 17%-os emelkedés volt.", forrasAzonositok: ["KUT-118"] }] },
      visszakereses,
    );
    expect(idezett.kifogasok).toEqual([]);

    const kitalalt = valasztEllenoriz(
      { ...jo, rovidValasz: [{ szoveg: "Nagyjából 30%-ot hozhat.", forrasAzonositok: ["KUT-118"] }] },
      visszakereses,
    );
    expect(kitalalt.kifogasok.map((k) => k.szabaly)).toContain("idezetlen-szam");
  });

  it("a rövid válasz legfeljebb öt mondat", () => {
    const hosszu = { szoveg: "Egy. Kettő. Három. Négy. Öt. Hat.", forrasAzonositok: ["KUT-118"] };
    expect(valasztEllenoriz({ ...jo, rovidValasz: [hosszu] }, visszakereses).kifogasok.map((k) => k.szabaly)).toContain(
      "tul-hosszu-rovid-valasz",
    );
  });

  it("egy alternatíva nem választás", () => {
    const e = valasztEllenoriz({ ...jo, alternativak: jo.alternativak.slice(0, 1) }, visszakereses);
    expect(e.kifogasok.map((k) => k.szabaly)).toContain("keves-alternativa");
  });
});

describe("hiány-ág", () => {
  const uresVisszakereses = forrasokatSzur([tetel({ azonosito: "KUT-1", relevancia: 0.2 })]);

  it("használható forrás nélkül csak a kimondott hiány adható ki", () => {
    const kartya = hianyKartya("Működik a visszaszámláló B2B-ben?", ["A/B-teszt a saját listán, 4 hét"]);
    const e = valasztEllenoriz(kartya, uresVisszakereses);
    expect(e.kiadhato).toBe(true);
    expect(kartya.amitNemTudunk[0]).toContain("Megmérhető lenne");
  });

  it("a hiány elmulasztása kifogás: nem adhat magabiztos választ forrás nélkül", () => {
    const magabiztos: ValaszKartya = {
      rovidValasz: [{ szoveg: "Igen, működik.", forrasAzonositok: [] }],
      technikak: [],
      bizonyitek: [],
      alternativak: [
        { cim: "A", leiras: "…", forrasAzonositok: [] },
        { cim: "B", leiras: "…", forrasAzonositok: [] },
      ],
      amitNemTudunk: [],
      kovetkezoLepesek: [],
      hianyKimondas: false,
    };
    const e = valasztEllenoriz(magabiztos, uresVisszakereses);
    expect(e.kifogasok.map((k) => k.szabaly)).toContain("hianyag-elmulasztva");
    expect(e.kiadhato).toBe(false);
  });

  it("a hiány-ág nem hivatkozhat forrásra", () => {
    const kartya = hianyKartya("Kérdés?", []);
    const hibas: ValaszKartya = { ...kartya, bizonyitek: [{ forrasAzonosito: "KUT-1", bizonyitekero: 2, kontextus: "x", mertek: undefined }] };
    expect(valasztEllenoriz(hibas, uresVisszakereses).kifogasok.map((k) => k.szabaly)).toContain("hianyag-forrast-idez");
  });
});

describe("bizonyíték-blokk", () => {
  it("a forrásokból egységes alakot épít, és jelzi, ha nincs bizonyítékerő", () => {
    const blokk = bizonyitekBlokkot([
      tetel({ azonosito: "KUT-1", bizonyitekero: undefined, agazat: "e-kereskedelem", felulet: "F04", szamok: ["17%"] }),
    ]);
    expect(blokk[0]?.bizonyitekero).toBeUndefined();
    expect(blokk[0]?.kontextus).toBe("e-kereskedelem · F04");
    expect(blokk[0]?.mertek).toBe("17%");
  });
});
