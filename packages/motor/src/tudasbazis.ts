/**
 * A motor tudásbázis-szerződése.
 *
 * A tudás a Notionben él, és a `kb-sync` hozza le verziózott pillanatképként. A motor
 * viszont nem a Notion alakját ismeri, hanem ezt: jel → szabály → technika → elvárás,
 * mindegyik futtatható alakban. Így a detektor tesztelhető a Notion nélkül, és a
 * szinkron cseréje nem érinti a pipeline-t.
 *
 * Egy dolog szándékosan hiányzik innen: a szabad szöveges „kiváltó feltétel". A P7
 * előhívás kódon és címkén megy, nem szövegilleszkedésen — ez a projekt fegyelme.
 */

import type { BizonyitekSzint, Sav } from "@meggyozes/core";
import type { ArtefaktumObjektum, Blokk } from "@meggyozes/bemenet";

export interface JelTalalat {
  readonly blokk: Blokk;
  /** Szó szerinti idézet. Nélküle a megállapítás nem adható ki (8.4 szerződés). */
  readonly idezet: string;
  readonly bizonyitekSzint: BizonyitekSzint;
}

export interface Jel {
  readonly kod: string;
  readonly megnevezes: string;
  readonly jelosztaly: string;
  /**
   * A megfigyelés. Determinisztikus függvény, mert a kalibráció fő tanulsága szerint
   * az LLM a jelenséget megtalálja, de a KÓDKIADÁSA ingadozik — a kódhoz kötést ezért
   * nem bízzuk a modellre.
   */
  readonly megfigyel: (objektum: ArtefaktumObjektum) => JelTalalat[];
  /** Mely ajtókon értelmezhető egyáltalán. Máshol „nem eldönthető". */
  readonly ajtok: readonly ArtefaktumObjektum["ajto"][];
}

export interface Variansok {
  readonly konzervativ: string;
  readonly batrabb: string;
  readonly kiserleti: string;
}

export interface Szabaly {
  readonly kod: string;
  /** A megállapítás címe: a JELENSÉG, nem a hiba (brandbook 8.4). */
  readonly cim: string;
  readonly sav: Sav;
  readonly kivaltoJelek: readonly string[];
  readonly technikak: readonly string[];
  readonly mostEzVan: string;
  readonly helyetteEz: string;
  readonly variansok: Variansok;
  readonly miert: string;
  readonly beavatkozasiSzint: "Szövegcsere" | "Felületátalakítás" | "Folyamat- vagy rendszerváltoztatás";
  readonly varhatoHatas: string | undefined;
  readonly jogiMegjegyzes: string | undefined;
  readonly forras: string | undefined;
  readonly bizonyitekero: number | undefined;
}

/** Pozitív visszaigazolás: a jól működő technika saját tétele, nem kifogás. */
export interface PozitivTetel {
  readonly kod: string;
  readonly cim: string;
  readonly jelKod: string;
  readonly technikak: readonly string[];
}

/**
 * Elvárás — a „pozitívan hiányzó" detekció. Nem jelre fut, hanem a jel HIÁNYÁRA:
 * ha a hiány megállapítható az adott ajtón, megállapítás lesz belőle; ha nem, „nem
 * eldönthető" — és ez sem hiba, hanem a bemenet határa.
 */
export interface Elvaras {
  readonly kod: string;
  readonly cim: string;
  readonly sav: Sav;
  readonly ajtok: readonly ArtefaktumObjektum["ajto"][];
  readonly teljesul: (objektum: ArtefaktumObjektum) => boolean;
  readonly szabalyKod: string;
}

export interface Technika {
  readonly kod: string;
  readonly nev: string;
  readonly meghatarozas: string;
  readonly sotetValtozat: string | undefined;
  readonly valasztovonal: string | undefined;
  readonly allapot: "Aktiv" | "Vitatott" | "Kerulendo";
}

export interface MotorTudasbazis {
  readonly verzio: string;
  /** Igaz, ha ez nem a Notion-szinkron kimenete. A riport ezt kiírja. */
  readonly demo: boolean;
  readonly jelek: readonly Jel[];
  readonly szabalyok: readonly Szabaly[];
  readonly elvarasok: readonly Elvaras[];
  readonly technikak: readonly Technika[];
  readonly pozitivak: readonly PozitivTetel[];
}
