/**
 * A tudásbázis hét tárának futásidejű típusai.
 *
 * A Notion a szerkesztőségi igazságforrás; ezek a típusok a DENORMALIZÁLT,
 * verziózott másolat alakját írják le. A runtime soha nem ír vissza a tárakba
 * (fejlesztői specifikáció, C komponens, 1. szinkron-szabály).
 *
 * A mezőnevek a Notion-sémát követik, hogy a leképezés egy az egyben ellenőrizhető
 * legyen; a magyar elnevezés szándékos — a szabályok szövege is magyar.
 */

export type Sav = "0 Jogi KO" | "1 Etikai KO" | "2 Meresi KO" | "3 Hatasossag es hiany";

/** A Notion select-értékei ékezettel; a leképezés ezekre a kanonikus alakokra hoz. */
export const SAV_LEKEPEZES: Readonly<Record<string, Sav>> = {
  "0 Jogi KO": "0 Jogi KO",
  "1 Etikai KO": "1 Etikai KO",
  "2 Mérési KO": "2 Meresi KO",
  "3 Hatásosság és hiány": "3 Hatasossag es hiany",
};

export type Allapot = "Aktiv" | "Karanten" | "Visszavont";

export const ALLAPOT_LEKEPEZES: Readonly<Record<string, Allapot>> = {
  Aktív: "Aktiv",
  Karantén: "Karanten",
  Visszavont: "Visszavont",
};

export type Automatizalhatosag = "Gepi" | "Felgepi" | "Emberi";

export const AUTOMATIZALHATOSAG_LEKEPEZES: Readonly<Record<string, Automatizalhatosag>> = {
  Gépi: "Gepi",
  Félgépi: "Felgepi",
  Emberi: "Emberi",
};

/**
 * Beavatkozási arány — a javaslat-rangsor egyik szorzója.
 * A számérték a Notion-címkében van kódolva ("Szövegcsere – 1.5").
 */
export const BEAVATKOZASI_ARANY: Readonly<Record<string, number>> = {
  "Szövegcsere – 1.5": 1.5,
  "Felületátalakítás – 1.0": 1.0,
  "Folyamat- vagy rendszerváltoztatás – 0.5": 0.5,
};

export type FeluletKod = `F${string}`;
export type MechanizmusKod = `M${string}`;
export type TolcserKod = "T1" | "T2" | "T3" | "T4" | "T5";

/** ⚙️ Szabálytár — a megállapítások és javaslatok forrása. */
export interface Szabaly {
  readonly kod: string;
  readonly cim: string;
  /** A HA→AKKOR→MERT szerkezetű szabályszöveg. */
  readonly szabaly: string;
  /** A konkrét javaslat alapja; a hatásossági szabályok 99,7%-ánál kitöltve. */
  readonly rosszJo: string | undefined;
  readonly sav: Sav | undefined;
  readonly allapot: Allapot;
  readonly hatokor: string | undefined;
  readonly artefaktumOsztaly: readonly string[];
  readonly felulet: readonly FeluletKod[];
  readonly tolcser: readonly TolcserKod[];
  readonly mechanizmus: readonly MechanizmusKod[];
  readonly automatizalhatosag: Automatizalhatosag | undefined;
  readonly mvpStatusz: string | undefined;
  /** 1–5; a rangsor egyik szorzója. */
  readonly bizonyitekero: number | undefined;
  /** 1.5 / 1.0 / 0.5; a rangsor másik szorzója. */
  readonly beavatkozasiArany: number | undefined;
  readonly hatasmeret: string | undefined;
  readonly hatasmeretErteke: number | undefined;
  /** Jelkódok, amelyek ezt a szabályt előhívják (P7 reláció). */
  readonly kivaltoJelek: readonly string[];
  readonly technikak: readonly string[];
  readonly kotelezoKontextus: readonly string[];
  readonly jogiHivatkozas: string | undefined;
  readonly ellenjavallat: string | undefined;
  readonly forrasjegyzet: string | undefined;
  readonly notionUrl: string;
}

/** 🔦 Jeltár — a detektálás szótára. */
export interface Jel {
  readonly kod: string;
  readonly megnevezes: string;
  /** MEGFIGYELHETŐ · TESZT · KÉRDÉS szerkezetű leírás. */
  readonly megfigyelesiModszer: string | undefined;
  readonly jelosztaly: string | undefined;
  readonly jelreteg: readonly string[];
  readonly kinyerhetoseg: string | undefined;
  /** "Egyszeri" | "Kétidőpontos / ismételt" | "Folyamatos" — a kétidőpontos mód kapuja. */
  readonly megfigyelesIdobelisege: string | undefined;
  readonly ketertelmu: boolean;
  /** Az elhatárolás-mező; a determinisztikus réteg és a futtató is ezt olvassa. */
  readonly elhatarolas: string | undefined;
  readonly alpozitivKockazat: string | undefined;
  readonly kivaltottSzabalyok: readonly string[];
  readonly technikak: readonly string[];
  readonly diszkriminansTesztek: readonly string[];
  readonly notionUrl: string;
}

/** 🎭 Technikatár — ügyfél-érthető névadás + felismerési támpont. */
export interface Technika {
  readonly kod: string;
  readonly nev: string;
  readonly meghatarozas: string | undefined;
  readonly sotetValtozat: string | undefined;
  readonly legitimValtozat: string | undefined;
  /** "A kettő közti választóvonal" — a döntő megfigyelés. */
  readonly valasztovonal: string | undefined;
  readonly allapot: "Aktiv" | "Vitatott" | "Kerulendo" | undefined;
  /** Igaz, ha a sötét változat jogszabályt sért — a 14 jogi tétű technika jelölése. */
  readonly jogiTet: boolean;
  readonly jelek: readonly string[];
  readonly szabalyok: readonly string[];
  readonly notionUrl: string;
}

/** 🔬 Diszkrimináns-tár — összetéveszthető technikák szétválasztása. */
export interface Diszkriminans {
  readonly kod: string;
  readonly kerdes: string;
  readonly igenAg: string | undefined;
  readonly nemAg: string | undefined;
  /** Mit írjon a riport, ha nem eldönthető — soha ne találgasson. */
  readonly haNemEldontheto: string | undefined;
  readonly elvegzesModja: string | undefined;
  readonly kiTudjaElvegezni: string | undefined;
  readonly melyikJelhez: readonly string[];
  readonly notionUrl: string;
}

/** 🔗 Kombináció-tár — együtt erősítő / kioltó párok. */
export interface Kombinacio {
  readonly kod: string;
  readonly megnevezes: string;
  readonly viszony: "Erosites" | "Kioltas" | "Telitodes" | "Jogi sulyosbitas" | undefined;
  readonly hatasIranya: string | undefined;
  readonly egyutallJelek: readonly string[];
  readonly bizonyitekero: number | undefined;
  readonly notionUrl: string;
}

/** ✅ Elvárás-lista — a „pozitívan hiányzó" detekció forrása. */
export interface Elvaras {
  readonly kod: string;
  readonly megnevezes: string;
  readonly mitKellTartalmaznia: string | undefined;
  readonly hogyanEllenorizheto: string | undefined;
  /** A kontextus kikapcsolhatja — pl. B2B ajánlatkérőn nincs 30 napos ár. */
  readonly mikorNemElvaras: string | undefined;
  readonly kotelezettseg: "Kotelezo" | "Ajanlott" | undefined;
  readonly hianySavja: Sav | undefined;
  readonly artefaktumOsztaly: readonly string[];
  readonly artefaktumCelja: readonly string[];
  readonly felulet: readonly FeluletKod[];
  readonly hianyJel: readonly string[];
  readonly allapot: Allapot;
  readonly notionUrl: string;
}

export type MintaTipus =
  | "Pozitiv"
  | "Negativ"
  | "Kontroll"
  | "Vegyes";

export const MINTA_TIPUS_LEKEPEZES: Readonly<Record<string, MintaTipus>> = {
  "Pozitív – jól meggyőző": "Pozitiv",
  "Negatív – problémás": "Negativ",
  "Kontroll – technikamentes": "Kontroll",
  Vegyes: "Vegyes",
};

/** 🏅 Aranystandard — a QA/CI tesztbázis egy sora. */
export interface AranystandardTeszt {
  readonly nev: string;
  readonly mintaTipus: MintaTipus | undefined;
  readonly artefaktumOsztaly: string | undefined;
  readonly forrasTipus: string | undefined;
  /** A befagyasztott artefaktum-tartalom — ez megy a futtatóhoz. */
  readonly befagyasztottTartalom: string | undefined;
  readonly kontextus: string | undefined;
  /** Szabad szöveg; a kódokat a pontozó nyeri ki belőle (VAGY-ágakkal együtt). */
  readonly elvartKotelezo: string | undefined;
  readonly elvartOpcionalis: string | undefined;
  /** Amit a rendszernek NEM szabad kiadnia — az álpozitív-védelem mércéje. */
  readonly tiltottTalalatok: string | undefined;
  readonly sikerkriterium: string | undefined;
  readonly statusz: string | undefined;
  readonly nehezsegiSzint: string | undefined;
  readonly url: string | undefined;
  readonly notionUrl: string;
}

/** A hét tár egy verziózott pillanatképe. */
export interface TudasbazisPillanatkep {
  readonly verzio: string;
  readonly keszult: string;
  readonly szabalyok: readonly Szabaly[];
  readonly jelek: readonly Jel[];
  readonly technikak: readonly Technika[];
  readonly diszkriminansok: readonly Diszkriminans[];
  readonly kombinaciok: readonly Kombinacio[];
  readonly elvarasok: readonly Elvaras[];
  readonly aranystandard: readonly AranystandardTeszt[];
}
