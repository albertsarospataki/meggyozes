/**
 * Válasz-kártya és a Q2 DET-őrök (brief v2.0 W4, 3.2 „❓ Kérdezz").
 *
 * A válasz szerkezete KÖTÖTT, hat blokkban. Ez a kötöttség maga a feloldása a szabad
 * chat tilalmának: nem a modell dönti el, mit mond, hanem a séma, és minden blokk
 * ellenőrizhető. Négy őr fut rajta:
 *
 *  1. forrás-kötelezettség — minden tudás-állítás mellett forrás-azonosító;
 *  2. ismeretlen/karanténos forrás — csak a visszakeresés kimenetére hivatkozhat;
 *  3. szám-őr — szám csak idézve, a forrás számai közül;
 *  4. hiány-ág — ha nincs használható forrás, a helyes válasz a kimondott hiány.
 *
 * Az utolsó a legfontosabb és a legkönnyebben elrontható: a „nincs rá mért eredmény”
 * nem kudarc, hanem a termék egyik legértékesebb válasza. A Q&A-gold nyolc kontrollja
 * pontosan ezt méri.
 */

import { szamotNormalizal, szamTalalatok } from "@meggyozes/brand";
import type { ForrasTetel, VisszakeresesEredmeny } from "./visszakereses.js";

export interface Allitas {
  readonly szoveg: string;
  readonly forrasAzonositok: readonly string[];
}

export interface TechnikaBlokk {
  readonly kod: string;
  readonly nev: string;
  readonly mechanizmus: string;
  readonly forrasAzonositok: readonly string[];
}

export interface BizonyitekBlokk {
  readonly forrasAzonosito: string;
  readonly bizonyitekero: number | undefined;
  readonly kontextus: string;
  readonly mertek: string | undefined;
}

export interface AlternativaBlokk {
  readonly cim: string;
  readonly leiras: string;
  readonly forrasAzonositok: readonly string[];
}

export interface KovetkezoLepesGomb {
  readonly cim: string;
  readonly muvelet: "audit" | "tanacs" | "kapcsolodo-technikak";
}

export interface ValaszKartya {
  /** 1. blokk — köznyelvi válasz, legfeljebb öt mondat. */
  readonly rovidValasz: readonly Allitas[];
  /** 2. blokk — mely technikák és miért. */
  readonly technikak: readonly TechnikaBlokk[];
  /** 3. blokk — forrás, bizonyítékerő, kontextus, mérték. */
  readonly bizonyitek: readonly BizonyitekBlokk[];
  /** 4. blokk — 2–3 alternatíva a brand kontextusában. */
  readonly alternativak: readonly AlternativaBlokk[];
  /** 5. blokk — amit nem tudunk / ellentmondó eredmények. */
  readonly amitNemTudunk: readonly string[];
  /** 6. blokk — következő lépés gombok. */
  readonly kovetkezoLepesek: readonly KovetkezoLepesGomb[];
  /** Igaz, ha ez a kimondott hiány válasza (nincs használható forrás). */
  readonly hianyKimondas: boolean;
}

export const ROVID_VALASZ_MAX_MONDAT = 5;
export const ALTERNATIVA_MIN = 2;
export const ALTERNATIVA_MAX = 3;

export type ValaszKifogasSzabaly =
  | "forras-nelkuli-allitas"
  | "ismeretlen-forras"
  | "karantenos-forras"
  | "idezetlen-szam"
  | "tul-hosszu-rovid-valasz"
  | "keves-alternativa"
  | "sok-alternativa"
  | "hianyag-elmulasztva"
  | "hianyag-forrast-idez";

export interface ValaszKifogas {
  readonly szabaly: ValaszKifogasSzabaly;
  readonly reszlet: string;
}

export interface ValaszEllenorzes {
  readonly kiadhato: boolean;
  readonly kifogasok: readonly ValaszKifogas[];
  /** A 9. fejezet Kérdezz-kapujának mérőszáma: forrás nélküli állítás = 0. */
  readonly forrasNelkuliAllitasok: number;
}

function mondatokSzama(szoveg: string): number {
  return szoveg
    .split(/[.!?]+/)
    .map((m) => m.trim())
    .filter((m) => m !== "").length;
}

/**
 * A válasz-kártya ellenőrzése a visszakeresés kimenetéhez képest.
 *
 * A `karantenosTetelek` külön paraméter, mert a szűrő már kizárta őket a
 * használhatóból — de ha a válasz mégis rájuk hivatkozik, azt NEM elég „ismeretlen
 * forrásnak" nevezni: a karanténos idézés önálló, súlyosabb szabálysértés.
 */
export function valasztEllenoriz(
  kartya: ValaszKartya,
  visszakereses: VisszakeresesEredmeny,
): ValaszEllenorzes {
  const kifogasok: ValaszKifogas[] = [];
  const hasznalhato = new Map(visszakereses.hasznalhato.map((t) => [t.azonosito, t]));
  const karantenos = new Set(
    visszakereses.kizart.filter((k) => k.ok === "karanten").map((k) => k.tetel.azonosito),
  );

  const hivatkozasokatEllenoriz = (azonositok: readonly string[], hol: string): void => {
    for (const azonosito of azonositok) {
      if (karantenos.has(azonosito)) {
        kifogasok.push({ szabaly: "karantenos-forras", reszlet: `${hol}: ${azonosito} karanténos, nem idézhető.` });
      } else if (!hasznalhato.has(azonosito)) {
        kifogasok.push({ szabaly: "ismeretlen-forras", reszlet: `${hol}: ${azonosito} nincs a visszakeresés kimenetében.` });
      }
    }
  };

  // 4. őr: a hiány-ág. Ha nincs használható forrás, csak a kimondott hiány adható ki.
  if (visszakereses.hianyAg) {
    if (!kartya.hianyKimondas) {
      kifogasok.push({
        szabaly: "hianyag-elmulasztva",
        reszlet: "Nincs küszöb feletti, nem karanténos forrás — a helyes válasz a kimondott hiány.",
      });
    }
    const hivatkozott = [
      ...kartya.rovidValasz.flatMap((a) => a.forrasAzonositok),
      ...kartya.technikak.flatMap((t) => t.forrasAzonositok),
      ...kartya.bizonyitek.map((b) => b.forrasAzonosito),
    ];
    if (hivatkozott.length > 0) {
      kifogasok.push({
        szabaly: "hianyag-forrast-idez",
        reszlet: `A hiány-ág nem hivatkozhat forrásra: ${hivatkozott.join(", ")}.`,
      });
    }
  }

  // 1. őr: forrás-kötelezettség. A hiány-ág mondatai nem tudás-állítások, ezért kivételek.
  let forrasNelkuli = 0;
  if (!kartya.hianyKimondas) {
    for (const allitas of kartya.rovidValasz) {
      if (allitas.forrasAzonositok.length === 0) {
        forrasNelkuli += 1;
        kifogasok.push({ szabaly: "forras-nelkuli-allitas", reszlet: `Rövid válasz: „${allitas.szoveg}”` });
      }
    }
    for (const technika of kartya.technikak) {
      if (technika.forrasAzonositok.length === 0) {
        forrasNelkuli += 1;
        kifogasok.push({ szabaly: "forras-nelkuli-allitas", reszlet: `Technika: ${technika.kod}` });
      }
    }
  }

  // 2. őr: csak a visszakeresés kimenetére hivatkozhat.
  kartya.rovidValasz.forEach((a, i) => hivatkozasokatEllenoriz(a.forrasAzonositok, `rövid válasz ${i + 1}.`));
  kartya.technikak.forEach((t) => hivatkozasokatEllenoriz(t.forrasAzonositok, `technika ${t.kod}`));
  kartya.bizonyitek.forEach((b) => hivatkozasokatEllenoriz([b.forrasAzonosito], "bizonyíték"));
  kartya.alternativak.forEach((a) => hivatkozasokatEllenoriz(a.forrasAzonositok, `alternatíva „${a.cim}”`));

  // 3. őr: szám csak idézve.
  const idezhetok = new Set(
    visszakereses.hasznalhato.flatMap((t) => [
      ...t.szamok.map(szamotNormalizal),
      ...szamTalalatok(t.kulcsallitas).map((sz) => szamotNormalizal(sz.ertek)),
    ]),
  );
  const szovegek = [
    ...kartya.rovidValasz.map((a) => a.szoveg),
    ...kartya.technikak.map((t) => t.mechanizmus),
    ...kartya.alternativak.map((a) => a.leiras),
  ];
  for (const szoveg of szovegek) {
    for (const szam of szamTalalatok(szoveg)) {
      if (!idezhetok.has(szamotNormalizal(szam.ertek))) {
        kifogasok.push({ szabaly: "idezetlen-szam", reszlet: `„${szam.ertek}” nem szerepel egyik forrásban sem.` });
      }
    }
  }

  // Formai kapuk: a hosszú válasz nem köznyelvi, az egy alternatíva nem választás.
  const mondatok = kartya.rovidValasz.reduce((s, a) => s + mondatokSzama(a.szoveg), 0);
  if (mondatok > ROVID_VALASZ_MAX_MONDAT) {
    kifogasok.push({
      szabaly: "tul-hosszu-rovid-valasz",
      reszlet: `${mondatok} mondat, a köznyelvi válasz legfeljebb ${ROVID_VALASZ_MAX_MONDAT}.`,
    });
  }
  if (!kartya.hianyKimondas) {
    if (kartya.alternativak.length < ALTERNATIVA_MIN) {
      kifogasok.push({ szabaly: "keves-alternativa", reszlet: `${kartya.alternativak.length} alternatíva; a minimum ${ALTERNATIVA_MIN}.` });
    }
    if (kartya.alternativak.length > ALTERNATIVA_MAX) {
      kifogasok.push({ szabaly: "sok-alternativa", reszlet: `${kartya.alternativak.length} alternatíva; a maximum ${ALTERNATIVA_MAX}.` });
    }
  }

  return { kiadhato: kifogasok.length === 0, kifogasok, forrasNelkuliAllitasok: forrasNelkuli };
}

/**
 * A kimondott hiány válasz-kártyája. Nem üres válasz: megmondja, mit NEM tudunk, és
 * mit lehetne megmérni ahhoz, hogy tudjuk — ez a különbség a hasznos és a bosszantó
 * „nem tudom" között.
 */
export function hianyKartya(kerdes: string, mitLehetneMerni: readonly string[]): ValaszKartya {
  return {
    rovidValasz: [
      {
        szoveg: `Erre a kérdésre a tudásbázisban nincs mért eredmény: „${kerdes.trim()}”.`,
        forrasAzonositok: [],
      },
    ],
    technikak: [],
    bizonyitek: [],
    alternativak: [],
    amitNemTudunk:
      mitLehetneMerni.length === 0
        ? ["A kérdés megválaszolásához saját mérés kellene."]
        : mitLehetneMerni.map((m) => `Megmérhető lenne: ${m}`),
    kovetkezoLepesek: [{ cim: "Indíts auditot erre a felületre", muvelet: "audit" }],
    hianyKimondas: true,
  };
}

/** A bizonyíték-blokk a használt forrásokból, egységes alakban. */
export function bizonyitekBlokkot(tetelek: readonly ForrasTetel[]): readonly BizonyitekBlokk[] {
  return tetelek.map((t) => ({
    forrasAzonosito: t.azonosito,
    bizonyitekero: t.bizonyitekero,
    kontextus: [t.agazat, t.felulet].filter((x): x is string => x !== undefined).join(" · ") || "általános",
    mertek: t.szamok.length === 0 ? undefined : t.szamok.join(", "),
  }));
}
