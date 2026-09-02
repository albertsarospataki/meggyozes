/**
 * Brief-generátor és építési sorrend (brief v2.0 W3, 3.3).
 *
 * A Tanácsadó-oldal 8. pontja szerint a rendszer „nem ír teljes kampányt”, Albert
 * viszont komplett, indokolt javaslatot kér. A kettő ott ér össze, hogy a P10′ nem
 * szabad szöveget ír, hanem ÉPÍTŐELEMEKBŐL rak össze: minden brief-mondat egy
 * tervezési technikához és annak forrásához kötött. Ami nem építőelemből jön, az
 * nem kerül a briefbe.
 *
 * A generált brief átmegy a brand-őrön: a tiltott kifejezés visszaküldi, az igazolatlan
 * szám helyőrzőt kap. A brief bemásolható dokumentum — ami itt kicsúszik, az az ügyfél
 * nevében megy ki.
 */

import { brandOr, type BrandOrEredmeny, type BrandProfil } from "@meggyozes/brand";
import type { Intent } from "./intent";
import { KONSTRUKCIO_NEVEK } from "./konstrukcio";

/**
 * Javaslat-építőelem: a tervezési technika bemásolható brief-mondattá fordítva
 * (a 40-es zóna Javaslat-építőelem tárának futásidejű alakja).
 */
export interface Epitoelem {
  readonly technikaKod: string;
  readonly technikaNev: string;
  readonly mikorJo: string;
  /** A brief-be kerülő mondat. */
  readonly briefMondat: string;
  readonly mitMerj: string;
  /** Amit a technika NEM tud — a túlígérés elleni fegyelem. */
  readonly mitNeIgerj: string;
  readonly forras: string | undefined;
}

export interface EpitesiLepes {
  readonly sorszam: number;
  readonly cim: string;
  readonly miert: string;
}

export const EPITESI_SORREND_MIN = 3;
export const EPITESI_SORREND_MAX = 7;

export interface SorrendHiba {
  readonly ok: "keves-lepes" | "sok-lepes" | "sorszam-hiba";
  readonly uzenet: string;
}

/**
 * Az építési sorrend 3–7 lépés. A korlát nem esztétika: két lépés nem sorrend, nyolc
 * lépést pedig senki nem hajt végre — a megvalósítási arány (az elsődleges KPI) azon
 * bukik, hogy a lista végrehajthatatlan.
 */
export function sorrendetEllenoriz(lepesek: readonly EpitesiLepes[]): SorrendHiba | undefined {
  if (lepesek.length < EPITESI_SORREND_MIN) {
    return { ok: "keves-lepes", uzenet: `Az építési sorrend legalább ${EPITESI_SORREND_MIN} lépés.` };
  }
  if (lepesek.length > EPITESI_SORREND_MAX) {
    return { ok: "sok-lepes", uzenet: `Az építési sorrend legfeljebb ${EPITESI_SORREND_MAX} lépés; a hosszabb listát nem hajtják végre.` };
  }
  const vart = lepesek.map((_, i) => i + 1);
  if (lepesek.map((l) => l.sorszam).join(",") !== vart.join(",")) {
    return { ok: "sorszam-hiba", uzenet: "A lépések sorszáma 1-től hézagmentesen növekvő kell legyen." };
  }
  return undefined;
}

export interface BriefBemenet {
  readonly intent: Intent;
  readonly epitoelemek: readonly Epitoelem[];
  readonly lepesek: readonly EpitesiLepes[];
  readonly profil: BrandProfil | undefined;
  readonly mikor?: Date;
}

export interface BriefEredmeny {
  /** Az egyoldalas, bemásolható brief. Visszaküldésnél is elkészül — de nem adható ki. */
  readonly szoveg: string;
  readonly brandOr: BrandOrEredmeny;
  readonly kiadhato: boolean;
  readonly sorrendHiba: SorrendHiba | undefined;
}

const sor = (cimke: string, ertek: string | undefined): string => `${cimke}: ${ertek ?? "[bekérendő]"}`;

export function briefetGeneral(b: BriefBemenet): BriefEredmeny {
  const { intent } = b;
  const tipusNev = intent.konstrukcioTipus === undefined ? "konstrukció" : KONSTRUKCIO_NEVEK[intent.konstrukcioTipus];

  const reszek = [
    `# Brief — ${tipusNev} (Intent v${intent.verzio})`,
    "",
    sor("Cél", intent.cel),
    sor("Közönség", intent.kozonseg),
    sor("Mechanika", intent.mechanika),
    sor("Ígéret", intent.igeret),
    sor("Csatornák", intent.csatornak.length === 0 ? undefined : intent.csatornak.join(", ")),
    sor("Időtartam", intent.idotartam),
    sor("Korlátok", intent.korlatok.length === 0 ? undefined : intent.korlatok.join("; ")),
    sor("Mit mérj", intent.meres),
    "",
    "## Amit építs",
    ...b.epitoelemek.map((e) => `- ${e.briefMondat} (${e.technikaNev}${e.forras === undefined ? "" : `, forrás: ${e.forras}`})`),
    "",
    "## Építési sorrend",
    ...b.lepesek.map((l) => `${l.sorszam}. ${l.cim} — ${l.miert}`),
    "",
    "## Mit mérj",
    ...b.epitoelemek.map((e) => `- ${e.mitMerj}`),
    "",
    "## Mit ne ígérj",
    ...b.epitoelemek.map((e) => `- ${e.mitNeIgerj}`),
  ];

  const szoveg = reszek.join("\n");
  const or = brandOr({
    szoveg,
    profil: b.profil,
    idezettForrasok: b.epitoelemek.map((e) => e.forras).filter((f): f is string => f !== undefined),
    ...(b.mikor === undefined ? {} : { mikor: b.mikor }),
  });
  const sorrendHiba = sorrendetEllenoriz(b.lepesek);

  return { szoveg, brandOr: or, kiadhato: or.kiadhato && sorrendHiba === undefined, sorrendHiba };
}
