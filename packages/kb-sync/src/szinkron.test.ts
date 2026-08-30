import { describe, expect, it } from "vitest";
import { TAR_FORRASOK, type TarNev } from "./forrasok.js";
import type { NotionForras, NotionOldal } from "./notion-kliens.js";
import { kodTerkepetEpit, szabalytLekepez, jeletLekepez } from "./lekepezes.js";
import { konzisztenciatEllenoriz, elesitheto } from "./konzisztencia.js";
import { indexetEpit, szabalyokatElohiv } from "./index-epito.js";
import { arvaRelaciokatKeres, szinkronizal } from "./szinkron.js";

/** Notion-oldal gyártó a tesztekhez — csak a ténylegesen használt property-alakok. */
function oldal(id: string, properties: Record<string, unknown>): NotionOldal {
  return { id, url: `https://notion.so/${id}`, properties };
}
const cim = (s: string) => ({ type: "title", title: [{ plain_text: s }] });
const szoveg = (s: string) => ({ type: "rich_text", rich_text: [{ plain_text: s }] });
const valasztas = (s: string) => ({ type: "select", select: { name: s } });
const tobb = (...s: string[]) => ({ type: "multi_select", multi_select: s.map((n) => ({ name: n })) });
const relacio = (...ids: string[]) => ({ type: "relation", relation: ids.map((id) => ({ id })) });
const szam = (n: number) => ({ type: "number", number: n });

const JEL_1 = oldal("jel1", {
  Jelkód: cim("J-011"),
  Megnevezés: szoveg("Újrainduló visszaszámláló"),
  "Megfigyelés időbelisége": valasztas("Kétidőpontos / ismételt"),
  Kétértelmű: { type: "checkbox", checkbox: true },
});
const TECHNIKA_1 = oldal("tech1", {
  Technikakód: cim("TK-001"),
  "Technika neve": szoveg("Hamis sürgetés"),
  "Jogi tét": { type: "checkbox", checkbox: true },
  Állapot: valasztas("Aktív"),
});
const SZABALY_1 = oldal("sz1", {
  Szabálykód: cim("S-330-1"),
  Cím: szoveg("Visszaszámláló valós határidővel"),
  "Rossz → jó": szoveg("Újrainduló számláló → valós, lejáró határidő"),
  Sáv: valasztas("3 Hatásosság és hiány"),
  Hatókör: valasztas("Artefaktum"),
  Állapot: valasztas("Aktív"),
  "Kiváltó jelek": relacio("jel1"),
  Technika: relacio("tech1"),
  Felület: tobb("F01"),
  "Artefaktum-osztály": tobb("Landing oldal"),
  "Kötelező kontextus": tobb("B2B / B2C"),
  "MVP-státusz": valasztas("MVP-mag"),
  Bizonyítékerő: szam(4),
  "Beavatkozási arány": valasztas("Szövegcsere – 1.5"),
  Automatizálhatóság: valasztas("Félgépi"),
});

describe("lekepezes — Notion-oldal → domain sor", () => {
  const terkep = kodTerkepetEpit(
    new Map<TarNev, NotionOldal[]>([
      ["jeltar", [JEL_1]],
      ["technikatar", [TECHNIKA_1]],
      ["szabalytar", [SZABALY_1]],
    ]),
  );

  it("a relációkat KÓDRA oldja fel, nem oldal-ID-re", () => {
    const sz = szabalytLekepez(SZABALY_1, terkep);
    expect(sz?.kivaltoJelek).toEqual(["J-011"]);
    expect(sz?.technikak).toEqual(["TK-001"]);
  });

  it("a beavatkozási arányt számmá alakítja a címkéből", () => {
    expect(szabalytLekepez(SZABALY_1, terkep)?.beavatkozasiArany).toBe(1.5);
  });

  it("a sávot és az automatizálhatóságot kanonikus alakra hozza", () => {
    const sz = szabalytLekepez(SZABALY_1, terkep);
    expect(sz?.sav).toBe("3 Hatasossag es hiany");
    expect(sz?.automatizalhatosag).toBe("Felgepi");
  });

  it("a kétidőpontos jelet megjelöli — ezt pillanatképből nem lehet tényként állítani", () => {
    const jel = jeletLekepez(JEL_1, terkep);
    expect(jel?.megfigyelesIdobelisege).toBe("Kétidőpontos / ismételt");
    expect(jel?.ketertelmu).toBe(true);
  });

  it("kód nélküli sort kihagy, nem talál ki kódot", () => {
    expect(szabalytLekepez(oldal("x", { Cím: szoveg("kód nélkül") }), terkep)).toBeUndefined();
  });

  it("hiányzó Állapot mezőt Aktívnak vesz — a Notionben az üres mező élő sort jelent", () => {
    const nyers = oldal("sz2", { Szabálykód: cim("S-1-1") });
    expect(szabalytLekepez(nyers, terkep)?.allapot).toBe("Aktiv");
  });
});

describe("arvaRelaciokatKeres — a néma jelvesztés elleni védelem", () => {
  it("jelzi a feloldhatatlan hivatkozást", () => {
    const oldalankent = new Map<TarNev, NotionOldal[]>([
      ["jeltar", [JEL_1]],
      [
        "szabalytar",
        [oldal("sz9", { Szabálykód: cim("S-9-1"), "Kiváltó jelek": relacio("jel1", "nincs-ilyen") })],
      ],
    ]);
    const arvak = arvaRelaciokatKeres(oldalankent, kodTerkepetEpit(oldalankent));
    expect(arvak).toHaveLength(1);
    expect(arvak[0]?.ismeretlenIdk).toEqual(["nincs-ilyen"]);
    expect(arvak[0]?.mezo).toBe("Kiváltó jelek");
  });

  it("hibátlan relációknál nem jelez", () => {
    const oldalankent = new Map<TarNev, NotionOldal[]>([
      ["jeltar", [JEL_1]],
      ["technikatar", [TECHNIKA_1]],
      ["szabalytar", [SZABALY_1]],
    ]);
    expect(arvaRelaciokatKeres(oldalankent, kodTerkepetEpit(oldalankent))).toEqual([]);
  });
});

describe("konzisztenciatEllenoriz — a néma kiesés detektálása", () => {
  const alap = {
    verzio: "teszt",
    keszult: "2026-08-30T00:00:00Z",
    szabalyok: [],
    jelek: [],
    technikak: [],
    diszkriminansok: [],
    kombinaciok: [],
    elvarasok: [],
    aranystandard: [],
  };
  const terkep = kodTerkepetEpit(
    new Map<TarNev, NotionOldal[]>([["jeltar", [JEL_1]], ["technikatar", [TECHNIKA_1]]]),
  );
  const jo = szabalytLekepez(SZABALY_1, terkep)!;
  const kodok = (leletek: ReturnType<typeof konzisztenciatEllenoriz>) =>
    leletek.map((l) => l.azonosito);

  it("a hibátlan szabályra nincs lelet", () => {
    expect(konzisztenciatEllenoriz({ ...alap, szabalyok: [jo] })).toEqual([]);
  });

  it("I8 — artefaktum-hatókörű szabály jel nélkül", () => {
    const leletek = konzisztenciatEllenoriz({ ...alap, szabalyok: [{ ...jo, kivaltoJelek: [] }] });
    expect(kodok(leletek)).toContain("I8");
  });

  it("I12 — hiányzó Felület vagy Artefaktum-osztály", () => {
    expect(kodok(konzisztenciatEllenoriz({ ...alap, szabalyok: [{ ...jo, felulet: [] }] }))).toContain("I12");
    expect(
      kodok(konzisztenciatEllenoriz({ ...alap, szabalyok: [{ ...jo, artefaktumOsztaly: [] }] })),
    ).toContain("I12");
  });

  it("MVP-lefedettség — a hiányzó technika a zárt alfa küszöbét sérti", () => {
    const leletek = konzisztenciatEllenoriz({ ...alap, szabalyok: [{ ...jo, technikak: [] }] });
    expect(kodok(leletek)).toContain("MVP-TECHNIKA");
    expect(leletek.find((l) => l.azonosito === "MVP-TECHNIKA")?.uzenet).toContain("0.0%");
  });

  it("hatásossági szabály «Rossz → jó» nélkül nem tud javaslatot adni", () => {
    const leletek = konzisztenciatEllenoriz({
      ...alap,
      szabalyok: [{ ...jo, rosszJo: undefined }],
    });
    expect(kodok(leletek)).toContain("ROSSZ-JO");
  });

  it("az árva reláció HIBA, és blokkolja az élesítést", () => {
    const leletek = konzisztenciatEllenoriz({ ...alap, szabalyok: [jo] }, [
      { tar: "szabalytar", kod: "S-9-1", mezo: "Kiváltó jelek", ismeretlenIdk: ["x"] },
    ]);
    expect(kodok(leletek)).toContain("ARVA-RELACIO");
    expect(elesitheto(leletek)).toBe(false);
  });

  it("a figyelmeztetés önmagában nem blokkol", () => {
    expect(elesitheto(konzisztenciatEllenoriz({ ...alap, szabalyok: [{ ...jo, kivaltoJelek: [] }] }))).toBe(true);
  });

  it("hiányos «Aktív teszt» gold-sor blokkol — nem futtatható", () => {
    const leletek = konzisztenciatEllenoriz({
      ...alap,
      aranystandard: [
        {
          nev: "01 · teszt",
          mintaTipus: "Negativ",
          artefaktumOsztaly: undefined,
          forrasTipus: undefined,
          befagyasztottTartalom: undefined,
          kontextus: undefined,
          elvartKotelezo: "J-011",
          elvartOpcionalis: undefined,
          tiltottTalalatok: undefined,
          sikerkriterium: undefined,
          statusz: "Aktív teszt",
          nehezsegiSzint: undefined,
          url: undefined,
          notionUrl: "https://notion.so/x",
        },
      ],
    });
    expect(kodok(leletek)).toContain("GOLD-HIANYOS");
    expect(elesitheto(leletek)).toBe(false);
  });
});

describe("indexetEpit / szabalyokatElohiv — a P7 előhívás csonkulás nélkül", () => {
  const terkep = kodTerkepetEpit(
    new Map<TarNev, NotionOldal[]>([["jeltar", [JEL_1]], ["technikatar", [TECHNIKA_1]]]),
  );
  const szabaly = szabalytLekepez(SZABALY_1, terkep)!;
  const jel = jeletLekepez(JEL_1, terkep)!;
  const pillanatkep = {
    verzio: "teszt",
    keszult: "2026-08-30T00:00:00Z",
    szabalyok: [szabaly],
    jelek: [jel],
    technikak: [],
    diszkriminansok: [],
    kombinaciok: [],
    elvarasok: [],
    aranystandard: [],
  };

  it("a jelből előhívja a szabályt", () => {
    const index = indexetEpit(pillanatkep);
    expect(szabalyokatElohiv(index, ["J-011"]).map((sz) => sz.kod)).toEqual(["S-330-1"]);
  });

  it("a karanténos szabály nem hívható elő", () => {
    const index = indexetEpit({ ...pillanatkep, szabalyok: [{ ...szabaly, allapot: "Karanten" }] });
    expect(szabalyokatElohiv(index, ["J-011"])).toEqual([]);
  });

  it("a Felület- és osztályszűrő kizárja a nem illő szabályt", () => {
    const index = indexetEpit(pillanatkep);
    expect(szabalyokatElohiv(index, ["J-011"], { felulet: "F04" })).toEqual([]);
    expect(szabalyokatElohiv(index, ["J-011"], { felulet: "F01" })).toHaveLength(1);
    expect(szabalyokatElohiv(index, ["J-011"], { artefaktumOsztaly: "Checkout" })).toEqual([]);
  });

  it("a sávszűrő a KO-sávokat külön kezeli", () => {
    const index = indexetEpit(pillanatkep);
    expect(szabalyokatElohiv(index, ["J-011"], { savok: ["0 Jogi KO"] })).toEqual([]);
    expect(szabalyokatElohiv(index, ["J-011"], { savok: ["3 Hatasossag es hiany"] })).toHaveLength(1);
  });

  it("egy szabályt egyszer ad vissza akkor is, ha több jel hívja elő", () => {
    const ketJeles = { ...szabaly, kivaltoJelek: ["J-011", "J-033"] };
    const index = indexetEpit({ ...pillanatkep, szabalyok: [ketJeles], jelek: [] });
    expect(szabalyokatElohiv(index, ["J-011", "J-033"])).toHaveLength(1);
  });
});

describe("szinkronizal — teljes menet hamis forrással", () => {
  const forras: NotionForras = {
    async osszesOldal(dataSourceId: string) {
      if (dataSourceId === TAR_FORRASOK.jeltar.dataSourceId) return [JEL_1];
      if (dataSourceId === TAR_FORRASOK.technikatar.dataSourceId) return [TECHNIKA_1];
      if (dataSourceId === TAR_FORRASOK.szabalytar.dataSourceId) return [SZABALY_1];
      return [];
    },
  };

  it("előáll a teljes pillanatkép, feloldott relációkkal", async () => {
    const e = await szinkronizal(forras, { verzio: "tudasbazis-v1", most: () => new Date(0) });
    expect(e.pillanatkep.szabalyok[0]?.kivaltoJelek).toEqual(["J-011"]);
    expect(e.arvak).toEqual([]);
    expect(e.elesitheto).toBe(true);
  });

  it("jelzi, ha a szinkron a vártnál drámaian kevesebb sort hozott", async () => {
    const e = await szinkronizal(forras, { verzio: "tudasbazis-v1" });
    // 1 szabály jött a várt ~4453 helyett — ez a néma csonkulás jelzője.
    expect(e.darabszamEltéresek.some((u) => u.includes("Szabálytár"))).toBe(true);
  });
});
