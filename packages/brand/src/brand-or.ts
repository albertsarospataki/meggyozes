/**
 * Brand-őr — a DET-réteg 8. szabálycsoportja (brief v2.0 8.1 / I komponens).
 *
 * Ez az őr a RENDSZER SAJÁT KIMENETÉT ellenőrzi, nem az ügyfél anyagát. A különbség
 * lényeges: az auditban a nulla álpozitív elv miatt inkább nem állítunk valamit,
 * itt viszont fordítva — inkább visszaküldjük a saját javaslatunkat, mint hogy egy
 * tiltott kifejezés vagy kitalált szám az ügyfél nevében kimenjen.
 *
 * Négy szabály (a 9. fejezet brand-kapuja az első kettőt méri nullára):
 *  1. tiltott kifejezés  → VISSZAKÜLDÉS (a kimenet nem adható ki)
 *  2. nem igazolt szám   → HELYŐRZŐ (a szám helyére mérési utasítás kerül)
 *  3. igazolatlan szuperlatívusz → HELYŐRZŐ (az állítás lefokozása)
 *  4. hangnem-eltérés    → JELÖLÉS (nem blokkol, de a szerkesztőnek szól)
 */

import { FELSOFOK_TALALATOK } from "./felsofok.js";
import { ervenyesProofPoint, type BrandProfil } from "./profil.js";
import { idezetKivag, keresesiAlak, kifejezestKeres } from "./szoveg.js";

export type BrandKifogasSzint = "visszakuldes" | "helyorzo" | "jeloles";

export type BrandSzabaly =
  | "tiltott-kifejezes"
  | "nem-igazolt-szam"
  | "igazolatlan-szuperlativusz"
  | "hangnem-elteres";

export interface BrandKifogas {
  readonly szabaly: BrandSzabaly;
  readonly szint: BrandKifogasSzint;
  readonly talalat: string;
  readonly idezet: string;
  readonly kezdet: number;
  readonly hossz: number;
  readonly indoklas: string;
  /** Mit tegyen a szerkesztő; számoknál ez a mérési utasítás. */
  readonly teendo: string;
}

/** A helyőrző, ami a nem igazolt szám helyére kerül. Szándékosan feltűnő. */
export const SZAM_HELYORZO = "[saját mért adat]";

/**
 * Szám-minta. Százalék, pénz, szorzó, egyszerű szám. A dátumot és az évszámot
 * kihagyjuk: azok nem teljesítmény-állítások, és a helyőrzőzésük olvashatatlanná
 * tenné a szöveget („[saját mért adat] óta a piacon”).
 */
const SZAM_MINTA =
  /\b\d+(?:[ \u00A0]\d{3})*(?:[.,]\d+)?\s?(?:%|százalék|szazalek|x|-szeres|-szoros|ft|eur|€|\$)?/gi;
const EVSZAM_MINTA = /^(19|20)\d{2}$/;
/** Dátum-tag: a „2026-09-02" és a „09.02." darabjait nem helyőrzőzzük. */
const DATUM_ELVALASZTO = /[-./]/;

/** Magázó és tegező jelölők. Csak egyértelmű alakok — a kétes eset nem jelölés. */
const MAGAZO_JELOLOK: readonly string[] = ["on", "ont", "onnek", "onok", "onnel", "szíveskedjen", "sziveskedjen"];
const TEGEZO_JELOLOK: readonly string[] = ["te", "teged", "neked", "nalad", "tied", "hozzad"];

function szamotNormalizal(nyers: string): string {
  return keresesiAlak(nyers).replace(/\s+/g, "").replace(/,/g, ".");
}

/**
 * Az igazolt számok halmaza: a brand bizonyíték-tárának érvényes proof pointjai,
 * plusz amit a futás idézetként HOZOTT (idézett forrás számai). A Constitution
 * szerint a szám csak idézve mehet ki — a „hozott” lista ezt az idézetet képviseli.
 */
export function igazoltSzamok(
  profil: BrandProfil | undefined,
  idezettForrasok: readonly string[],
  mikor: Date,
): ReadonlySet<string> {
  const halmaz = new Set<string>();
  const felvesz = (szoveg: string): void => {
    for (const talalat of szoveg.matchAll(SZAM_MINTA)) {
      const nyers = talalat[0];
      if (nyers.trim() !== "") halmaz.add(szamotNormalizal(nyers));
    }
  };

  for (const pp of profil?.bizonyitekTar ?? []) {
    if (!ervenyesProofPoint(pp, mikor)) continue;
    if (pp.szamertek !== undefined) halmaz.add(szamotNormalizal(pp.szamertek));
    felvesz(pp.allitas);
  }
  for (const forras of idezettForrasok) felvesz(forras);
  return halmaz;
}

function proofPointFedi(profil: BrandProfil | undefined, allitas: string, mikor: Date): boolean {
  if (profil === undefined) return false;
  const keresett = keresesiAlak(allitas);
  return profil.bizonyitekTar.some(
    (pp) => ervenyesProofPoint(pp, mikor) && keresesiAlak(pp.allitas).includes(keresett),
  );
}

export interface BrandOrBemenet {
  /** A rendszer által előállított szöveg (javaslat, szövegminta, brief-mondat, válasz). */
  readonly szoveg: string;
  readonly profil: BrandProfil | undefined;
  /** Szó szerinti idézetek a forrásokból — az itt szereplő szám idézettnek számít. */
  readonly idezettForrasok?: readonly string[];
  readonly mikor?: Date;
}

export interface BrandOrEredmeny {
  /**
   * Kiadható-e a szöveg. Hamis, ha bármely kifogás visszaküldés szintű — ilyenkor a
   * P10 újrafuttatandó, nem a szerkesztő javítja kézzel.
   */
  readonly kiadhato: boolean;
  readonly kifogasok: readonly BrandKifogas[];
  /**
   * A helyőrzőzött szöveg: a nem igazolt számok helyén mérési helyőrző áll.
   * Visszaküldés szintű kifogásnál ez nem használható kimenetként.
   */
  readonly helyorzosSzoveg: string;
  /** Igaz, ha nincs brand-profil: ilyenkor a rendszer általános javaslatot ad, és kimondja. */
  readonly altalanosMod: boolean;
}

export function brandOr(bemenet: BrandOrBemenet): BrandOrEredmeny {
  const { szoveg, profil } = bemenet;
  const mikor = bemenet.mikor ?? new Date();
  const kifogasok: BrandKifogas[] = [];

  // 1. Tiltott kifejezés — a brand kimondott tiltólistája és az „amit sosem mondunk".
  const tiltottak = [
    ...(profil?.hangnem.tiltottKifejezesek ?? []),
    ...(profil?.pozicionalas.amitSosemMondunk ?? []),
  ];
  for (const tiltott of tiltottak) {
    for (const talalat of kifejezestKeres(szoveg, tiltott)) {
      kifogasok.push({
        szabaly: "tiltott-kifejezes",
        szint: "visszakuldes",
        talalat: talalat.kifejezes,
        idezet: idezetKivag(szoveg, talalat.kezdet, talalat.hossz),
        kezdet: talalat.kezdet,
        hossz: talalat.hossz,
        indoklas: `A brand tiltólistáján szereplő kifejezés: „${tiltott}”.`,
        teendo: "A javaslat újrafuttatandó a tiltott kifejezés nélkül.",
      });
    }
  }

  // 2. Nem igazolt szám — helyőrző + mérési utasítás.
  const engedelyezett = igazoltSzamok(profil, bemenet.idezettForrasok ?? [], mikor);
  const szamTalalatok: { kezdet: number; hossz: number; ertek: string }[] = [];
  for (const talalat of szoveg.matchAll(SZAM_MINTA)) {
    const nyers = talalat[0];
    const kezdet = talalat.index;
    if (nyers.trim() === "" || kezdet === undefined) continue;
    const csakSzam = nyers.trim().replace(/[^\d.,]/g, "");
    if (EVSZAM_MINTA.test(csakSzam)) continue;
    const elotte = kezdet >= 2 ? szoveg.slice(kezdet - 2, kezdet) : "";
    if (elotte.length === 2 && DATUM_ELVALASZTO.test(elotte[1] ?? "") && /\d/.test(elotte[0] ?? "")) continue;
    if (engedelyezett.has(szamotNormalizal(nyers))) continue;
    szamTalalatok.push({ kezdet, hossz: nyers.trimEnd().length, ertek: nyers.trim() });
  }
  for (const t of szamTalalatok) {
    kifogasok.push({
      szabaly: "nem-igazolt-szam",
      szint: "helyorzo",
      talalat: t.ertek,
      idezet: idezetKivag(szoveg, t.kezdet, t.hossz),
      kezdet: t.kezdet,
      hossz: t.hossz,
      indoklas:
        profil === undefined
          ? "Nincs brand-profil, így egyetlen szám sem igazolható a bizonyíték-tárból."
          : "A szám nem szerepel a brand bizonyíték-tárában és nem idézet forrásból.",
      teendo: `Helyőrző: ${SZAM_HELYORZO}. Mérd meg a saját adatodon, vagy vedd fel proof pointként forrással.`,
    });
  }

  // 3. Igazolatlan szuperlatívusz.
  for (const sz of FELSOFOK_TALALATOK(szoveg)) {
    if (proofPointFedi(profil, sz.kifejezes, mikor)) continue;
    kifogasok.push({
      szabaly: "igazolatlan-szuperlativusz",
      szint: "helyorzo",
      talalat: sz.kifejezes,
      idezet: idezetKivag(szoveg, sz.kezdet, sz.hossz),
      kezdet: sz.kezdet,
      hossz: sz.hossz,
      indoklas: "Felsőfokú állítás, amit a bizonyíték-tár nem igazol.",
      teendo: "Cseréld konkrét, igazolható előnyre, vagy vedd fel proof pointként forrással.",
    });
  }

  // 4. Hangnem-eltérés — jelölés, nem blokk. A kétes alak nem jelölés (nulla álpozitív).
  const megszolitas = profil?.hangnem.megszolitas;
  if (megszolitas !== undefined) {
    const rosszJelolok = megszolitas === "tegezes" ? MAGAZO_JELOLOK : TEGEZO_JELOLOK;
    for (const jelolo of rosszJelolok) {
      for (const talalat of kifejezestKeres(szoveg, jelolo, true)) {
        kifogasok.push({
          szabaly: "hangnem-elteres",
          szint: "jeloles",
          talalat: talalat.kifejezes,
          idezet: idezetKivag(szoveg, talalat.kezdet, talalat.hossz),
          kezdet: talalat.kezdet,
          hossz: talalat.hossz,
          indoklas: `A brand hangneme ${megszolitas === "tegezes" ? "tegező" : "magázó"}, a kifejezés a másik regiszterből való.`,
          teendo: "Írd át a brand megszólítására, vagy hagyd jóvá kivételként.",
        });
      }
    }
  }

  const rendezett = [...kifogasok].sort((a, b) => a.kezdet - b.kezdet);
  return {
    kiadhato: !rendezett.some((k) => k.szint === "visszakuldes"),
    kifogasok: rendezett,
    helyorzosSzoveg: helyorzoketBehelyettesit(szoveg, rendezett),
    altalanosMod: profil === undefined,
  };
}

/** A helyőrző szintű kifogások behelyettesítése hátulról előre, hogy az indexek ne csússzanak. */
function helyorzoketBehelyettesit(szoveg: string, kifogasok: readonly BrandKifogas[]): string {
  const szamok = kifogasok
    .filter((k) => k.szabaly === "nem-igazolt-szam")
    .sort((a, b) => b.kezdet - a.kezdet);
  let eredmeny = szoveg;
  for (const k of szamok) {
    eredmeny = eredmeny.slice(0, k.kezdet) + SZAM_HELYORZO + eredmeny.slice(k.kezdet + k.hossz);
  }
  return eredmeny;
}
