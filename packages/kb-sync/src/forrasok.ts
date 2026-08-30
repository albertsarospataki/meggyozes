/**
 * A tudásbázis Notion-adatforrásai.
 *
 * Ezek data source ID-k (a Notion UI-ban «collection://…» alakban jelennek meg),
 * nem adatbázis-ID-k — a 2025-09-03 API a /v1/data_sources/{id}/query végponton
 * kéri őket. Az ID-k stabilak: a tár átnevezése vagy áthelyezése nem változtatja meg.
 *
 * A runtime SOHA nem ír vissza ezekbe (C komponens, 1. szinkron-szabály): a Notion
 * a szerkesztőségi igazságforrás, a szoftver csak olvassa.
 */

export const TAR_NEVEK = [
  "szabalytar",
  "jeltar",
  "technikatar",
  "diszkriminanstar",
  "kombinaciotar",
  "elvaraslista",
  "aranystandard",
] as const;

export type TarNev = (typeof TAR_NEVEK)[number];

export interface TarForras {
  readonly nev: TarNev;
  readonly cim: string;
  readonly dataSourceId: string;
  /** A kódot hordozó címmező (title property) neve a Notion-sémában. */
  readonly kodMezo: string;
  /** Várt nagyságrend a 2026-08-29-i állapot szerint — a szinkron ezt ellenőrzi. */
  readonly vartDarab: number;
}

export const TAR_FORRASOK: Readonly<Record<TarNev, TarForras>> = {
  szabalytar: {
    nev: "szabalytar",
    cim: "⚙️ Szabálytár",
    dataSourceId: "056ca26c-7ac8-43a7-b899-245a5677ddf4",
    kodMezo: "Szabálykód",
    vartDarab: 4453,
  },
  jeltar: {
    nev: "jeltar",
    cim: "🔦 Jeltár",
    dataSourceId: "f596eb38-b21d-4b0a-8cac-e6343743402e",
    kodMezo: "Jelkód",
    vartDarab: 275,
  },
  technikatar: {
    nev: "technikatar",
    cim: "🎭 Technikatár",
    dataSourceId: "0c87fd5f-6dc2-467c-baf9-aed8873bde1b",
    kodMezo: "Technikakód",
    vartDarab: 108,
  },
  diszkriminanstar: {
    nev: "diszkriminanstar",
    cim: "🔬 Diszkrimináns-tár",
    dataSourceId: "2c48b5f9-b3b5-4943-baf4-327d0072c09f",
    kodMezo: "D-kód",
    vartDarab: 35,
  },
  kombinaciotar: {
    nev: "kombinaciotar",
    cim: "🔗 Kombináció-tár",
    dataSourceId: "0fd2d8ae-dc40-448c-8970-e4a435750bd3",
    kodMezo: "K-kód",
    vartDarab: 0,
  },
  elvaraslista: {
    nev: "elvaraslista",
    cim: "✅ Elvárás-lista",
    dataSourceId: "cd75c266-d568-4fbe-b210-fec5aa757f33",
    kodMezo: "Elváráskód",
    vartDarab: 86,
  },
  aranystandard: {
    nev: "aranystandard",
    cim: "🏅 Aranystandard-tesztek",
    dataSourceId: "aea07526-bc61-448f-ab8a-c0b647fb9393",
    kodMezo: "Teszt neve",
    vartDarab: 150,
  },
};
