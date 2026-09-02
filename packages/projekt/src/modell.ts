/**
 * Projekt-adatmodell (brief v2.0 4.1).
 *
 * A hierarchia: Szervezet → Brand → Projekt → {Artefaktum, Intent, Beszélgetés, Futás}
 * → Riport → {Megállapítás, Javaslat, Visszajelzés, Megvalósítás}.
 *
 * A projekt azért nem opcionális mappa, hanem tartóelem, mert három dolgot csak itt
 * lehet megcsinálni: a köteg-auditot (e-mail + céloldal üzenetegyezése csak együtt
 * ítélhető meg), az átjárást audit és terv között, és az előtte/utána mérést. Ezek
 * mind két vagy több futás VISZONYÁRÓL szólnak — viszony pedig csak közös kereten
 * belül értelmezhető.
 */

import type { BizonyitekSzint, Minosites, Sav } from "@meggyozes/core";

export type Uzemmod = "audit" | "tanacs" | "kerdezz";

export type ProjektTipus = "audit" | "terv" | "vegyes";
export type ProjektStatusz = "aktiv" | "lezart";

export type AuditAjto = "url" | "kep" | "szoveg" | "video";

export interface Artefaktum {
  readonly azonosito: string;
  readonly projektAzonosito: string;
  readonly ajto: AuditAjto;
  /** URL, fájlnév vagy a beillesztett szöveg első sora — a felületen ez azonosítja. */
  readonly megnevezes: string;
  readonly rogzitve: string;
  /** Kétidőpontos módnál a második megfigyelés ideje. */
  readonly masodikMegfigyeles: string | undefined;
}

/**
 * Köteg: több artefaktum EGYÜTT auditálva. Az Artefaktum-katalógus J. szakasza
 * szerint az e-mail és a céloldal üzenetegyezése csak a kettő együttes beadásával
 * ítélhető meg — külön-külön mindkettő hibátlan lehet, miközben egymásnak mondanak ellent.
 */
export interface Koteg {
  readonly azonosito: string;
  readonly projektAzonosito: string;
  readonly artefaktumAzonositok: readonly string[];
  readonly leiras: string;
}

export type FutasStatusz =
  | "sorban"
  | "fut"
  | "hum_kapun"
  | "kesz"
  | "hiba"
  | "elavult_tudasbazis";

export interface Futas {
  readonly azonosito: string;
  readonly projektAzonosito: string;
  readonly mod: Uzemmod;
  readonly inditotta: string;
  readonly inditva: string;
  readonly statusz: FutasStatusz;
  /** A riport visszavezethetőségének négy eleme (8.4). */
  readonly tudasbazisVerzio: string;
  readonly promptVerzio: string;
  readonly detVerzio: string;
  readonly modell: string;
  readonly kreditKoltseg: number;
}

export interface Megallapitas {
  readonly azonosito: string;
  /** S-kód a Szabálytárból. */
  readonly szabalyKod: string;
  readonly jelKodok: readonly string[];
  readonly technikaKodok: readonly string[];
  /** Szó szerinti idézet. Nélküle a megállapítás nem adható ki (8.4 szerződés). */
  readonly idezet: string;
  readonly sav: Sav;
  readonly bizonyitekSzint: BizonyitekSzint;
  readonly minosites: Minosites;
  readonly forras: string | undefined;
}

export interface JavaslatVariansok {
  readonly konzervativ: string;
  readonly batrabb: string;
  readonly kiserleti: string;
}

export interface Javaslat {
  readonly azonosito: string;
  readonly megallapitasAzonosito: string;
  readonly mostEzVan: string;
  readonly helyetteEz: string;
  readonly variansok: JavaslatVariansok;
  readonly beavatkozasiSzint: string;
  readonly varhatoHatas: string | undefined;
  /** ⚖ — jogi/etikai megjegyzés a javaslat MELLETT, sosem helyette. */
  readonly jogiMegjegyzes: string | undefined;
  /** 1 = a top-5 első helye. */
  readonly rangsor: number;
}

export type RiportStatusz = "kesz" | "ellenorzes_alatt" | "elavult_tudasbazis";

export interface Riport {
  readonly azonosito: string;
  readonly futasAzonosito: string;
  readonly projektAzonosito: string;
  /** Ugyanarra a futásra a bekérő kör után új verzió készül (W5). */
  readonly verzio: number;
  readonly keszult: string;
  readonly mod: Uzemmod;
  readonly statusz: RiportStatusz;
  readonly megallapitasok: readonly Megallapitas[];
  readonly javaslatok: readonly Javaslat[];
  readonly tisztazoKerdesek: readonly string[];
}

export type MegvalositasStatusz = "nyitott" | "megvalositva" | "elvetve";

export interface Megvalositas {
  readonly javaslatAzonosito: string;
  readonly statusz: MegvalositasStatusz;
  readonly jelolve: string | undefined;
  readonly jelolte: string | undefined;
  /** Az ügyfél által BEÍRT mért változás. A rendszer sosem találja ki (W6). */
  readonly mertValtozas: string | undefined;
}

export interface Projekt {
  readonly azonosito: string;
  readonly szervezetAzonosito: string;
  readonly brandAzonosito: string;
  readonly nev: string;
  readonly tipus: ProjektTipus;
  readonly statusz: ProjektStatusz;
  readonly letrehozva: string;
  readonly utolsoAktivitas: string;
}

/**
 * Az alapnézet csak az aktív projekteket mutatja, a lezártak az Archívum fülön.
 * (A brief 3.2 ezt Albert általános szabályaként rögzíti; a listázó ezért nem
 * „minden projekt" alapértelmezéssel indul.)
 */
export function aktivProjektek(projektek: readonly Projekt[]): readonly Projekt[] {
  return projektek
    .filter((p) => p.statusz === "aktiv")
    .sort((a, b) => Date.parse(b.utolsoAktivitas) - Date.parse(a.utolsoAktivitas));
}

export function archivaltProjektek(projektek: readonly Projekt[]): readonly Projekt[] {
  return projektek
    .filter((p) => p.statusz === "lezart")
    .sort((a, b) => Date.parse(b.utolsoAktivitas) - Date.parse(a.utolsoAktivitas));
}

export interface KotegHiba {
  readonly ok: "keves-artefaktum" | "idegen-artefaktum" | "ismetlodo-artefaktum";
  readonly uzenet: string;
}

/**
 * A köteg érvényessége. Csak azonos projekt artefaktumaiból állhat: két különböző
 * projekt (jellemzően két kampány) anyagai között az üzenetegyezés kérdése értelmetlen,
 * és a jogosultsági szigetelést is átvinné.
 */
export function kotegetEllenoriz(koteg: Koteg, artefaktumok: readonly Artefaktum[]): KotegHiba | undefined {
  if (koteg.artefaktumAzonositok.length < 2) {
    return { ok: "keves-artefaktum", uzenet: "A köteg legalább két artefaktumot kíván — különben sima audit." };
  }
  const egyediek = new Set(koteg.artefaktumAzonositok);
  if (egyediek.size !== koteg.artefaktumAzonositok.length) {
    return { ok: "ismetlodo-artefaktum", uzenet: "Ugyanaz az artefaktum kétszer szerepel a kötegben." };
  }
  const projektbeliek = new Set(
    artefaktumok.filter((a) => a.projektAzonosito === koteg.projektAzonosito).map((a) => a.azonosito),
  );
  const idegen = koteg.artefaktumAzonositok.filter((id) => !projektbeliek.has(id));
  if (idegen.length > 0) {
    return {
      ok: "idegen-artefaktum",
      uzenet: `A köteg csak a projekt saját artefaktumaiból állhat; idegen: ${idegen.join(", ")}.`,
    };
  }
  return undefined;
}
