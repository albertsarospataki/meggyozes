import type { Szabaly, TudasbazisPillanatkep } from "@meggyozes/core";

/**
 * Előhívási index (P7).
 *
 * A szabály-előhívás a jelekből indul, és a Szabálytár 4453 sorából kell kiszűrnie a
 * néhány százat. Ezt SOHA nem szabad LLM-kontextusban vagy lapozott lekérdezéssel
 * megtenni — a 100 soros csonkulás pontosan így keletkezett. Az index a szinkron
 * idején épül fel egyszer, és onnantól memóriából, teljes egészében válaszol.
 */

export interface EloghivasiIndex {
  /** jelkód → az általa kiváltott szabálykódok */
  readonly jelSzerint: ReadonlyMap<string, readonly string[]>;
  /** technikakód → szabálykódok */
  readonly technikaSzerint: ReadonlyMap<string, readonly string[]>;
  /** szabálykód → szabály */
  readonly szabalyok: ReadonlyMap<string, Szabaly>;
}

function hozzafuz(terkep: Map<string, string[]>, kulcs: string, ertek: string): void {
  const lista = terkep.get(kulcs);
  if (lista) lista.push(ertek);
  else terkep.set(kulcs, [ertek]);
}

export function indexetEpit(p: TudasbazisPillanatkep): EloghivasiIndex {
  const jelSzerint = new Map<string, string[]>();
  const technikaSzerint = new Map<string, string[]>();
  const szabalyok = new Map<string, Szabaly>();

  for (const sz of p.szabalyok) {
    szabalyok.set(sz.kod, sz);
    // Csak aktív szabály hívható elő: a karanténos/visszavont sorra épülő
    // megállapítás nem adható ki (Constitution 6.).
    if (sz.allapot !== "Aktiv") continue;
    for (const jel of sz.kivaltoJelek) hozzafuz(jelSzerint, jel, sz.kod);
    for (const technika of sz.technikak) hozzafuz(technikaSzerint, technika, sz.kod);
  }

  // A Jeltár „Kiváltott szabályok" oldala ugyanezt a relációt hordozza a másik
  // irányból. A kettő uniója védi ki a féloldalas relációkat.
  for (const jel of p.jelek) {
    for (const szKod of jel.kivaltottSzabalyok) {
      const sz = szabalyok.get(szKod);
      if (!sz || sz.allapot !== "Aktiv") continue;
      if (!(jelSzerint.get(jel.kod) ?? []).includes(szKod)) hozzafuz(jelSzerint, jel.kod, szKod);
    }
  }

  return { jelSzerint, technikaSzerint, szabalyok };
}

export interface EloghivasSzuro {
  readonly felulet?: string;
  readonly artefaktumOsztaly?: string;
  /** Ha üres, minden sáv jön. A KO-sávok szűrőként futnak a javaslatok mögött. */
  readonly savok?: readonly string[];
}

/**
 * Adott jelkészletből előhívja a szabályokat, a P7 szűrésével.
 * A visszatérés TELJES — nincs lapkorlát, nincs csonkulás.
 */
export function szabalyokatElohiv(
  index: EloghivasiIndex,
  jelkodok: readonly string[],
  szuro: EloghivasSzuro = {},
): Szabaly[] {
  const talalt = new Map<string, Szabaly>();

  for (const jel of jelkodok) {
    for (const szKod of index.jelSzerint.get(jel) ?? []) {
      const sz = index.szabalyok.get(szKod);
      if (!sz) continue;
      if (szuro.felulet && sz.felulet.length > 0 && !sz.felulet.includes(szuro.felulet as never)) continue;
      if (
        szuro.artefaktumOsztaly &&
        sz.artefaktumOsztaly.length > 0 &&
        !sz.artefaktumOsztaly.includes(szuro.artefaktumOsztaly)
      ) {
        continue;
      }
      if (szuro.savok && szuro.savok.length > 0 && (!sz.sav || !szuro.savok.includes(sz.sav))) continue;
      talalt.set(sz.kod, sz);
    }
  }

  return [...talalt.values()];
}
