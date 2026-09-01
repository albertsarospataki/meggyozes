/**
 * A tár — minden ügyfél-objektum egyetlen belépési pontja.
 *
 * A szigetelés itt kényszerül ki, nem a hívó fegyelmén: minden metódus `Hatokor`-t
 * kap (szervezet + brand-hozzáférés), és a WHERE-feltétel ebből épül. Nyers
 * lekérdezés nem hagyja el ezt a fájlt. A brief 6.2 szabálya — „minden artefaktum,
 * riport, intent, beszélgetés organization_id + brand_id alatt" — így nem policy,
 * hanem típus.
 */

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { BrandProfil } from "@meggyozes/brand";
import type { Artefaktum, Futas, Projekt, Riport, Uzemmod } from "@meggyozes/projekt";
import type { KreditTranzakcio, Szerep, Tagsag } from "@meggyozes/szervezet";
import type { Intent } from "@meggyozes/tanacs";
import type { TanulasiJelolt, Visszajelzes } from "@meggyozes/tanulas";
import { SEMA } from "./sema.js";

/**
 * A `node:sqlite` futásidőben töltődik be.
 *
 * A beépített SQLite-modul újabb, mint a köteg-építők beépített-modul listája: a Vite
 * és a webpack egyaránt megpróbálja feloldani „sqlite" csomagként, és elhasal rajta.
 * A változóba tett modulnév ezt a statikus elemzést kerüli meg — a típusok viszont
 * a valódi modulból jönnek, tehát a fordító továbbra is ellenőriz.
 */
const modulNev = "node:sqlite";
const { DatabaseSync } = createRequire(import.meta.url)(modulNev) as typeof import("node:sqlite");
type DatabaseSync = import("node:sqlite").DatabaseSync;

export interface Hatokor {
  readonly szervezetAzonosito: string;
  readonly brandHozzaferes: "mind" | readonly string[];
  readonly felhasznaloAzonosito: string;
}

export function hatokorTagsagbol(tag: Tagsag): Hatokor {
  return {
    szervezetAzonosito: tag.szervezetAzonosito,
    brandHozzaferes: tag.brandHozzaferes,
    felhasznaloAzonosito: tag.felhasznaloAzonosito,
  };
}

export interface Szervezet {
  readonly azonosito: string;
  readonly nev: string;
  readonly csomag: "starter" | "pro" | "alfa";
  readonly letrehozva: string;
}

export interface Felhasznalo {
  readonly azonosito: string;
  readonly email: string;
  readonly nev: string;
}

export interface BrandSor {
  readonly azonosito: string;
  readonly szervezetAzonosito: string;
  readonly nev: string;
  readonly profil: BrandProfil;
  readonly letrehozva: string;
}

export interface RiportSor extends Riport {
  readonly szervezetAzonosito: string;
  readonly brandAzonosito: string | undefined;
  readonly tartalom: RiportTartalom;
}

/**
 * A riport teljes tartalma (3.3 anatómia). A megállapítások és javaslatok a
 * projekt-csomag típusai; ez a boríték adja hozzá azt, ami csak a kiadott riportban
 * létezik: az összefoglalót, a sávokat, a brand-blokkot és a lábléc-adatokat.
 */
export interface RiportTartalom {
  readonly osszefoglalo: string;
  readonly masthead: {
    readonly cim: string;
    readonly forras: string;
    readonly brandNev: string | undefined;
    readonly tudasbazisVerzio: string;
    readonly detektorVerzio: string;
  };
  readonly savok: readonly { readonly nev: string; readonly allapot: string; readonly ertek: string }[];
  readonly pozitivak: readonly { readonly kod: string; readonly cim: string; readonly idezet: string }[];
  readonly megallapitasok: Riport["megallapitasok"];
  readonly javaslatok: Riport["javaslatok"];
  readonly brandEgyezes: unknown;
  readonly kerdesek: readonly string[];
  readonly epitesiSorrend?: readonly { readonly sorszam: number; readonly cim: string; readonly miert: string }[];
  readonly brief?: string;
}

type Sor = Record<string, unknown>;

const sz = (x: unknown): string => String(x ?? "");
const szam = (x: unknown): number => Number(x ?? 0);
const json = <T>(x: unknown): T => JSON.parse(sz(x)) as T;

export class Tar {
  readonly #db: DatabaseSync;

  constructor(utvonal: string) {
    if (utvonal !== ":memory:") mkdirSync(dirname(utvonal), { recursive: true });
    this.#db = new DatabaseSync(utvonal);
    this.#db.exec(SEMA);
  }

  close(): void {
    this.#db.close();
  }

  /** A brand-szűrő SQL-töredéke. „mind" esetén nincs szűkítés, egyébként IN-lista. */
  #brandSzuro(hatokor: Hatokor, oszlop: string): { sql: string; ertekek: string[] } {
    if (hatokor.brandHozzaferes === "mind") return { sql: "", ertekek: [] };
    if (hatokor.brandHozzaferes.length === 0) return { sql: ` AND 1 = 0`, ertekek: [] };
    const helyek = hatokor.brandHozzaferes.map(() => "?").join(", ");
    return { sql: ` AND ${oszlop} IN (${helyek})`, ertekek: [...hatokor.brandHozzaferes] };
  }

  /* ---------- szervezet, felhasználó, tagság ---------- */

  szervezetetMent(x: Szervezet): void {
    this.#db
      .prepare(`INSERT INTO szervezet (azonosito, nev, csomag, letrehozva) VALUES (?, ?, ?, ?)
                ON CONFLICT(azonosito) DO UPDATE SET nev = excluded.nev, csomag = excluded.csomag`)
      .run(x.azonosito, x.nev, x.csomag, x.letrehozva);
  }

  szervezet(azonosito: string): Szervezet | undefined {
    const sor = this.#db.prepare(`SELECT * FROM szervezet WHERE azonosito = ?`).get(azonosito) as Sor | undefined;
    return sor === undefined
      ? undefined
      : { azonosito: sz(sor.azonosito), nev: sz(sor.nev), csomag: sz(sor.csomag) as Szervezet["csomag"], letrehozva: sz(sor.letrehozva) };
  }

  felhasznalotMent(x: Felhasznalo): void {
    this.#db
      .prepare(`INSERT INTO felhasznalo (azonosito, email, nev) VALUES (?, ?, ?)
                ON CONFLICT(azonosito) DO UPDATE SET email = excluded.email, nev = excluded.nev`)
      .run(x.azonosito, x.email, x.nev);
  }

  felhasznaloEmailbol(email: string): Felhasznalo | undefined {
    const sor = this.#db.prepare(`SELECT * FROM felhasznalo WHERE email = ?`).get(email) as Sor | undefined;
    return sor === undefined ? undefined : { azonosito: sz(sor.azonosito), email: sz(sor.email), nev: sz(sor.nev) };
  }

  tagsagotMent(tag: Tagsag): void {
    this.#db
      .prepare(`INSERT INTO tagsag (felhasznalo_azonosito, szervezet_azonosito, szerep, brand_hozzaferes, kerdezhet)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(felhasznalo_azonosito, szervezet_azonosito)
                DO UPDATE SET szerep = excluded.szerep, brand_hozzaferes = excluded.brand_hozzaferes, kerdezhet = excluded.kerdezhet`)
      .run(
        tag.felhasznaloAzonosito,
        tag.szervezetAzonosito,
        tag.szerep,
        JSON.stringify(tag.brandHozzaferes),
        tag.kerdezhet === true ? 1 : 0,
      );
  }

  #tagsagSorbol(sor: Sor): Tagsag {
    return {
      felhasznaloAzonosito: sz(sor.felhasznalo_azonosito),
      szervezetAzonosito: sz(sor.szervezet_azonosito),
      szerep: sz(sor.szerep) as Szerep,
      brandHozzaferes: json<"mind" | string[]>(sor.brand_hozzaferes),
      kerdezhet: szam(sor.kerdezhet) === 1,
    };
  }

  tagsagok(felhasznaloAzonosito: string): Tagsag[] {
    return (this.#db.prepare(`SELECT * FROM tagsag WHERE felhasznalo_azonosito = ?`).all(felhasznaloAzonosito) as Sor[])
      .map((sor) => this.#tagsagSorbol(sor));
  }

  csapat(hatokor: Hatokor): { readonly tagsag: Tagsag; readonly felhasznalo: Felhasznalo }[] {
    const sorok = this.#db
      .prepare(`SELECT t.*, f.email, f.nev FROM tagsag t JOIN felhasznalo f ON f.azonosito = t.felhasznalo_azonosito
                WHERE t.szervezet_azonosito = ?`)
      .all(hatokor.szervezetAzonosito) as Sor[];
    return sorok.map((sor) => ({
      tagsag: this.#tagsagSorbol(sor),
      felhasznalo: { azonosito: sz(sor.felhasznalo_azonosito), email: sz(sor.email), nev: sz(sor.nev) },
    }));
  }

  /* ---------- brand ---------- */

  brandetMent(x: BrandSor): void {
    this.#db
      .prepare(`INSERT INTO brand (azonosito, szervezet_azonosito, nev, profil, letrehozva) VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(azonosito) DO UPDATE SET nev = excluded.nev, profil = excluded.profil`)
      .run(x.azonosito, x.szervezetAzonosito, x.nev, JSON.stringify(x.profil), x.letrehozva);
  }

  #brandSorbol(sor: Sor): BrandSor {
    return {
      azonosito: sz(sor.azonosito),
      szervezetAzonosito: sz(sor.szervezet_azonosito),
      nev: sz(sor.nev),
      profil: json<BrandProfil>(sor.profil),
      letrehozva: sz(sor.letrehozva),
    };
  }

  brandek(hatokor: Hatokor): BrandSor[] {
    const szuro = this.#brandSzuro(hatokor, "azonosito");
    const sorok = this.#db
      .prepare(`SELECT * FROM brand WHERE szervezet_azonosito = ?${szuro.sql} ORDER BY nev`)
      .all(hatokor.szervezetAzonosito, ...szuro.ertekek) as Sor[];
    return sorok.map((sor) => this.#brandSorbol(sor));
  }

  brand(hatokor: Hatokor, azonosito: string): BrandSor | undefined {
    return this.brandek(hatokor).find((b) => b.azonosito === azonosito);
  }

  /* ---------- projekt ---------- */

  projektetMent(x: Projekt): void {
    this.#db
      .prepare(`INSERT INTO projekt (azonosito, szervezet_azonosito, brand_azonosito, nev, tipus, statusz, letrehozva, utolso_aktivitas)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(azonosito) DO UPDATE SET nev = excluded.nev, tipus = excluded.tipus,
                  statusz = excluded.statusz, utolso_aktivitas = excluded.utolso_aktivitas`)
      .run(x.azonosito, x.szervezetAzonosito, x.brandAzonosito, x.nev, x.tipus, x.statusz, x.letrehozva, x.utolsoAktivitas);
  }

  #projektSorbol(sor: Sor): Projekt {
    return {
      azonosito: sz(sor.azonosito),
      szervezetAzonosito: sz(sor.szervezet_azonosito),
      brandAzonosito: sz(sor.brand_azonosito),
      nev: sz(sor.nev),
      tipus: sz(sor.tipus) as Projekt["tipus"],
      statusz: sz(sor.statusz) as Projekt["statusz"],
      letrehozva: sz(sor.letrehozva),
      utolsoAktivitas: sz(sor.utolso_aktivitas),
    };
  }

  projektek(hatokor: Hatokor, brandAzonosito?: string): Projekt[] {
    const szuro = this.#brandSzuro(hatokor, "brand_azonosito");
    const extra = brandAzonosito === undefined ? "" : " AND brand_azonosito = ?";
    const sorok = this.#db
      .prepare(`SELECT * FROM projekt WHERE szervezet_azonosito = ?${szuro.sql}${extra} ORDER BY utolso_aktivitas DESC`)
      .all(hatokor.szervezetAzonosito, ...szuro.ertekek, ...(brandAzonosito === undefined ? [] : [brandAzonosito])) as Sor[];
    return sorok.map((sor) => this.#projektSorbol(sor));
  }

  projekt(hatokor: Hatokor, azonosito: string): Projekt | undefined {
    return this.projektek(hatokor).find((p) => p.azonosito === azonosito);
  }

  projektAktivitas(azonosito: string, mikor: string): void {
    this.#db.prepare(`UPDATE projekt SET utolso_aktivitas = ? WHERE azonosito = ?`).run(mikor, azonosito);
  }

  /* ---------- artefaktum, futás, riport ---------- */

  artefaktumotMent(hatokor: Hatokor, x: Artefaktum, objektum: unknown): void {
    this.#db
      .prepare(`INSERT INTO artefaktum (azonosito, szervezet_azonosito, projekt_azonosito, ajto, megnevezes, rogzitve, objektum)
                VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(x.azonosito, hatokor.szervezetAzonosito, x.projektAzonosito, x.ajto, x.megnevezes, x.rogzitve, JSON.stringify(objektum));
  }

  artefaktumok(hatokor: Hatokor, projektAzonosito: string): Artefaktum[] {
    const sorok = this.#db
      .prepare(`SELECT * FROM artefaktum WHERE szervezet_azonosito = ? AND projekt_azonosito = ? ORDER BY rogzitve DESC`)
      .all(hatokor.szervezetAzonosito, projektAzonosito) as Sor[];
    return sorok.map((sor) => ({
      azonosito: sz(sor.azonosito),
      projektAzonosito: sz(sor.projekt_azonosito),
      ajto: sz(sor.ajto) as Artefaktum["ajto"],
      megnevezes: sz(sor.megnevezes),
      rogzitve: sz(sor.rogzitve),
      masodikMegfigyeles: undefined,
    }));
  }

  futastMent(hatokor: Hatokor, x: Futas, brandAzonosito: string | undefined, naplo: readonly string[] = []): void {
    this.#db
      .prepare(`INSERT INTO futas (azonosito, szervezet_azonosito, brand_azonosito, projekt_azonosito, mod, inditotta, inditva,
                  statusz, tudasbazis_verzio, prompt_verzio, det_verzio, modell, kredit_koltseg, naplo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(azonosito) DO UPDATE SET statusz = excluded.statusz, naplo = excluded.naplo`)
      .run(
        x.azonosito, hatokor.szervezetAzonosito, brandAzonosito ?? null, x.projektAzonosito, x.mod, x.inditotta, x.inditva,
        x.statusz, x.tudasbazisVerzio, x.promptVerzio, x.detVerzio, x.modell, x.kreditKoltseg, JSON.stringify(naplo),
      );
  }

  #futasSorbol(sor: Sor): Futas {
    return {
      azonosito: sz(sor.azonosito),
      projektAzonosito: sz(sor.projekt_azonosito),
      mod: sz(sor.mod) as Uzemmod,
      inditotta: sz(sor.inditotta),
      inditva: sz(sor.inditva),
      statusz: sz(sor.statusz) as Futas["statusz"],
      tudasbazisVerzio: sz(sor.tudasbazis_verzio),
      promptVerzio: sz(sor.prompt_verzio),
      detVerzio: sz(sor.det_verzio),
      modell: sz(sor.modell),
      kreditKoltseg: szam(sor.kredit_koltseg),
    };
  }

  futasok(hatokor: Hatokor, projektAzonosito?: string): Futas[] {
    const szuro = this.#brandSzuro(hatokor, "brand_azonosito");
    const extra = projektAzonosito === undefined ? "" : " AND projekt_azonosito = ?";
    const sorok = this.#db
      .prepare(`SELECT * FROM futas WHERE szervezet_azonosito = ?${szuro.sql}${extra} ORDER BY inditva DESC`)
      .all(hatokor.szervezetAzonosito, ...szuro.ertekek, ...(projektAzonosito === undefined ? [] : [projektAzonosito])) as Sor[];
    return sorok.map((sor) => this.#futasSorbol(sor));
  }

  riportotMent(hatokor: Hatokor, riport: Riport, brandAzonosito: string | undefined, tartalom: RiportTartalom): void {
    this.#db
      .prepare(`INSERT INTO riport (azonosito, szervezet_azonosito, brand_azonosito, projekt_azonosito, futas_azonosito,
                  verzio, keszult, mod, statusz, tartalom)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(azonosito) DO UPDATE SET statusz = excluded.statusz, tartalom = excluded.tartalom`)
      .run(
        riport.azonosito, hatokor.szervezetAzonosito, brandAzonosito ?? null, riport.projektAzonosito, riport.futasAzonosito,
        riport.verzio, riport.keszult, riport.mod, riport.statusz, JSON.stringify(tartalom),
      );
  }

  #riportSorbol(sor: Sor): RiportSor {
    const tartalom = json<RiportTartalom>(sor.tartalom);
    return {
      azonosito: sz(sor.azonosito),
      szervezetAzonosito: sz(sor.szervezet_azonosito),
      brandAzonosito: sor.brand_azonosito === null ? undefined : sz(sor.brand_azonosito),
      futasAzonosito: sz(sor.futas_azonosito),
      projektAzonosito: sz(sor.projekt_azonosito),
      verzio: szam(sor.verzio),
      keszult: sz(sor.keszult),
      mod: sz(sor.mod) as Uzemmod,
      statusz: sz(sor.statusz) as Riport["statusz"],
      megallapitasok: tartalom.megallapitasok,
      javaslatok: tartalom.javaslatok,
      tisztazoKerdesek: tartalom.kerdesek,
      tartalom,
    };
  }

  riportok(hatokor: Hatokor, projektAzonosito?: string): RiportSor[] {
    const szuro = this.#brandSzuro(hatokor, "brand_azonosito");
    const extra = projektAzonosito === undefined ? "" : " AND projekt_azonosito = ?";
    const sorok = this.#db
      .prepare(`SELECT * FROM riport WHERE szervezet_azonosito = ?${szuro.sql}${extra} ORDER BY keszult DESC`)
      .all(hatokor.szervezetAzonosito, ...szuro.ertekek, ...(projektAzonosito === undefined ? [] : [projektAzonosito])) as Sor[];
    return sorok.map((sor) => this.#riportSorbol(sor));
  }

  riport(hatokor: Hatokor, azonosito: string): RiportSor | undefined {
    return this.riportok(hatokor).find((r) => r.azonosito === azonosito);
  }

  /** A HUM-kapu sora: minden szervezetből, csak a platform-admin pultjára. */
  humSor(): RiportSor[] {
    const sorok = this.#db
      .prepare(`SELECT * FROM riport WHERE statusz = 'ellenorzes_alatt' ORDER BY keszult ASC`)
      .all() as Sor[];
    return sorok.map((sor) => this.#riportSorbol(sor));
  }

  riportStatusz(azonosito: string, statusz: Riport["statusz"]): void {
    this.#db.prepare(`UPDATE riport SET statusz = ? WHERE azonosito = ?`).run(statusz, azonosito);
  }

  /* ---------- kredit ---------- */

  kreditetMent(tranzakciok: readonly KreditTranzakcio[]): void {
    const beszur = this.#db.prepare(
      `INSERT INTO kredit_tranzakcio (azonosito, szervezet_azonosito, adat, letrejott) VALUES (?, ?, ?, ?)
       ON CONFLICT(azonosito) DO NOTHING`,
    );
    for (const t of tranzakciok) beszur.run(t.azonosito, t.szervezetAzonosito, JSON.stringify(t), t.letrejott);
  }

  kreditTranzakciok(hatokor: Hatokor): KreditTranzakcio[] {
    const sorok = this.#db
      .prepare(`SELECT adat FROM kredit_tranzakcio WHERE szervezet_azonosito = ? ORDER BY letrejott ASC`)
      .all(hatokor.szervezetAzonosito) as Sor[];
    return sorok.map((sor) => json<KreditTranzakcio>(sor.adat));
  }

  /* ---------- visszajelzés, megvalósítás, tanulás ---------- */

  visszajelzestMent(hatokor: Hatokor, x: Visszajelzes): void {
    this.#db
      .prepare(`INSERT INTO visszajelzes (azonosito, szervezet_azonosito, riport_azonosito, megallapitas_azonosito, tipus, szoveg, ki, mikor)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(azonosito) DO UPDATE SET tipus = excluded.tipus, szoveg = excluded.szoveg, mikor = excluded.mikor`)
      .run(x.azonosito, hatokor.szervezetAzonosito, x.riportAzonosito, x.megallapitasAzonosito, x.tipus, x.szoveg ?? null, x.ki, x.mikor);
  }

  visszajelzesek(hatokor: Hatokor, riportAzonosito: string): Visszajelzes[] {
    const sorok = this.#db
      .prepare(`SELECT * FROM visszajelzes WHERE szervezet_azonosito = ? AND riport_azonosito = ?`)
      .all(hatokor.szervezetAzonosito, riportAzonosito) as Sor[];
    return sorok.map((sor) => ({
      azonosito: sz(sor.azonosito),
      megallapitasAzonosito: sz(sor.megallapitas_azonosito),
      riportAzonosito: sz(sor.riport_azonosito),
      tipus: sz(sor.tipus) as Visszajelzes["tipus"],
      szoveg: sor.szoveg === null ? undefined : sz(sor.szoveg),
      ki: sz(sor.ki),
      mikor: sz(sor.mikor),
    }));
  }

  megvalositastMent(hatokor: Hatokor, riportAzonosito: string, javaslatAzonosito: string, statusz: string, mikor: string, ki: string): void {
    this.#db
      .prepare(`INSERT INTO megvalositas (javaslat_azonosito, szervezet_azonosito, riport_azonosito, statusz, jelolve, jelolte, mert_valtozas)
                VALUES (?, ?, ?, ?, ?, ?, NULL)
                ON CONFLICT(javaslat_azonosito) DO UPDATE SET statusz = excluded.statusz, jelolve = excluded.jelolve, jelolte = excluded.jelolte`)
      .run(javaslatAzonosito, hatokor.szervezetAzonosito, riportAzonosito, statusz, mikor, ki);
  }

  megvalositasok(hatokor: Hatokor): { javaslatAzonosito: string; statusz: string; jelolve: string | undefined }[] {
    const sorok = this.#db
      .prepare(`SELECT * FROM megvalositas WHERE szervezet_azonosito = ?`)
      .all(hatokor.szervezetAzonosito) as Sor[];
    return sorok.map((sor) => ({
      javaslatAzonosito: sz(sor.javaslat_azonosito),
      statusz: sz(sor.statusz),
      jelolve: sor.jelolve === null ? undefined : sz(sor.jelolve),
    }));
  }

  jeloltetMent(x: TanulasiJelolt): void {
    this.#db
      .prepare(`INSERT INTO tanulasi_jelolt (azonosito, adat, keletkezett, statusz) VALUES (?, ?, ?, ?)
                ON CONFLICT(azonosito) DO UPDATE SET adat = excluded.adat, statusz = excluded.statusz`)
      .run(x.azonosito, JSON.stringify(x), x.keletkezett, x.statusz);
  }

  /** A tanulási sor globális: a jelöltek anonimizáltak, ezért nincs tenant-szűrő. */
  jeloltek(): TanulasiJelolt[] {
    return (this.#db.prepare(`SELECT adat FROM tanulasi_jelolt ORDER BY keletkezett DESC`).all() as Sor[])
      .map((sor) => json<TanulasiJelolt>(sor.adat));
  }

  /* ---------- intent, beszélgetés ---------- */

  intentetMent(hatokor: Hatokor, intent: Intent): void {
    this.#db
      .prepare(`INSERT INTO intent (azonosito, szervezet_azonosito, projekt_azonosito, verzio, adat, letrejott)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(azonosito, verzio) DO UPDATE SET adat = excluded.adat`)
      .run(intent.azonosito, hatokor.szervezetAzonosito, intent.projektAzonosito, intent.verzio, JSON.stringify(intent), intent.letrejott);
  }

  intentVerziok(hatokor: Hatokor, azonosito: string): Intent[] {
    const sorok = this.#db
      .prepare(`SELECT adat FROM intent WHERE szervezet_azonosito = ? AND azonosito = ? ORDER BY verzio ASC`)
      .all(hatokor.szervezetAzonosito, azonosito) as Sor[];
    return sorok.map((sor) => json<Intent>(sor.adat));
  }

  beszelgetestMent(
    hatokor: Hatokor,
    azonosito: string,
    mod: Uzemmod,
    uzenetek: unknown,
    frissitve: string,
    projektAzonosito?: string,
    brandAzonosito?: string,
  ): void {
    this.#db
      .prepare(`INSERT INTO beszelgetes (azonosito, szervezet_azonosito, projekt_azonosito, brand_azonosito, mod, uzenetek, frissitve)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(azonosito) DO UPDATE SET uzenetek = excluded.uzenetek, frissitve = excluded.frissitve`)
      .run(azonosito, hatokor.szervezetAzonosito, projektAzonosito ?? null, brandAzonosito ?? null, mod, JSON.stringify(uzenetek), frissitve);
  }

  beszelgetes<T>(hatokor: Hatokor, azonosito: string): T | undefined {
    const sor = this.#db
      .prepare(`SELECT uzenetek FROM beszelgetes WHERE szervezet_azonosito = ? AND azonosito = ?`)
      .get(hatokor.szervezetAzonosito, azonosito) as Sor | undefined;
    return sor === undefined ? undefined : json<T>(sor.uzenetek);
  }
}
