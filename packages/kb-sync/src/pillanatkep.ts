import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { TudasbazisPillanatkep } from "@meggyozes/core";
import type { KonzisztenciaLelet } from "./konzisztencia.js";

/**
 * Verziózott tudásbázis-pillanatkép.
 *
 * A 2. szinkron-szabály: minden szinkron verziózott snapshotot készít
 * (tudasbazis-v{n}), és az audit-riport RÖGZÍTI, melyik verzióval készült.
 * Enélkül egy hónappal későbbi reklamációnál nem lehet megmondani, mit látott a
 * rendszer — a visszavezethetőség 100%-os KPI-ja ezen áll.
 */

export interface PillanatkepManifest {
  readonly verzio: string;
  readonly keszult: string;
  readonly darabszamok: Readonly<Record<string, number>>;
  /** A tartalom SHA-256 ujjlenyomata — két azonos ujjlenyomatú verzió azonos tudásbázis. */
  readonly ujjlenyomat: string;
  readonly leletek: readonly KonzisztenciaLelet[];
  readonly elesitheto: boolean;
}

export function ujjlenyomatotSzamol(p: TudasbazisPillanatkep): string {
  const rendezett = JSON.stringify({
    szabalyok: p.szabalyok.map((x) => x.kod).sort(),
    jelek: p.jelek.map((x) => x.kod).sort(),
    technikak: p.technikak.map((x) => x.kod).sort(),
    diszkriminansok: p.diszkriminansok.map((x) => x.kod).sort(),
    kombinaciok: p.kombinaciok.map((x) => x.kod).sort(),
    elvarasok: p.elvarasok.map((x) => x.kod).sort(),
    aranystandard: p.aranystandard.map((x) => x.nev).sort(),
  });
  return createHash("sha256").update(rendezett).digest("hex").slice(0, 16);
}

export function darabszamok(p: TudasbazisPillanatkep): Record<string, number> {
  return {
    szabalyok: p.szabalyok.length,
    jelek: p.jelek.length,
    technikak: p.technikak.length,
    diszkriminansok: p.diszkriminansok.length,
    kombinaciok: p.kombinaciok.length,
    elvarasok: p.elvarasok.length,
    aranystandard: p.aranystandard.length,
  };
}

/** A következő szabad verzió a könyvtárban: tudasbazis-v1, -v2, … */
export async function kovetkezoVerzio(gyoker: string): Promise<string> {
  let meglevok: string[] = [];
  try {
    meglevok = await readdir(gyoker);
  } catch {
    meglevok = [];
  }
  const szamok = meglevok
    .map((n) => /^tudasbazis-v(\d+)$/.exec(n)?.[1])
    .filter((n): n is string => n !== undefined)
    .map((n) => Number.parseInt(n, 10));
  return `tudasbazis-v${(szamok.length > 0 ? Math.max(...szamok) : 0) + 1}`;
}

export async function pillanatkepetIr(
  gyoker: string,
  p: TudasbazisPillanatkep,
  leletek: readonly KonzisztenciaLelet[],
  elesithetoE: boolean,
): Promise<PillanatkepManifest> {
  const konyvtar = join(gyoker, p.verzio);
  await mkdir(konyvtar, { recursive: true });

  const manifest: PillanatkepManifest = {
    verzio: p.verzio,
    keszult: p.keszult,
    darabszamok: darabszamok(p),
    ujjlenyomat: ujjlenyomatotSzamol(p),
    leletek,
    elesitheto: elesithetoE,
  };

  await Promise.all([
    writeFile(join(konyvtar, "szabalytar.json"), JSON.stringify(p.szabalyok, null, 2)),
    writeFile(join(konyvtar, "jeltar.json"), JSON.stringify(p.jelek, null, 2)),
    writeFile(join(konyvtar, "technikatar.json"), JSON.stringify(p.technikak, null, 2)),
    writeFile(join(konyvtar, "diszkriminanstar.json"), JSON.stringify(p.diszkriminansok, null, 2)),
    writeFile(join(konyvtar, "kombinaciotar.json"), JSON.stringify(p.kombinaciok, null, 2)),
    writeFile(join(konyvtar, "elvaraslista.json"), JSON.stringify(p.elvarasok, null, 2)),
    writeFile(join(konyvtar, "aranystandard.json"), JSON.stringify(p.aranystandard, null, 2)),
    writeFile(join(konyvtar, "manifest.json"), JSON.stringify(manifest, null, 2)),
  ]);

  return manifest;
}

export async function pillanatkepetOlvas(
  gyoker: string,
  verzio: string,
): Promise<TudasbazisPillanatkep> {
  const konyvtar = join(gyoker, verzio);
  const olvas = async <T>(fajl: string): Promise<T> =>
    JSON.parse(await readFile(join(konyvtar, fajl), "utf8")) as T;
  const manifest = await olvas<PillanatkepManifest>("manifest.json");

  return {
    verzio: manifest.verzio,
    keszult: manifest.keszult,
    szabalyok: await olvas("szabalytar.json"),
    jelek: await olvas("jeltar.json"),
    technikak: await olvas("technikatar.json"),
    diszkriminansok: await olvas("diszkriminanstar.json"),
    kombinaciok: await olvas("kombinaciotar.json"),
    elvarasok: await olvas("elvaraslista.json"),
    aranystandard: await olvas("aranystandard.json"),
  };
}
