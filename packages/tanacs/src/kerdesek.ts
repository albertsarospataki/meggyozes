/**
 * 1C belépő kérdéscsomagok (brief v2.0 W3, Tervezői mód architektúra 5. pont).
 *
 * A Bemenetkérő-tár itt nem kiegészítő, hanem a VÉGREHAJTÓ MOTOR: a tervezési
 * szabályok fele emberi automatizálhatóságú és jel nélküli („milyen gyakran vásárol
 * a tipikus vevőd”) — ezekre csak a cég tud válaszolni. A kérdés a termék része,
 * nem hibaüzenet (3.4).
 *
 * A kérdéseket EGYENKÉNT tesszük fel, a kötelező mezőkkel kezdve: a tíz kérdéses
 * űrlap elriaszt, a beszélgetés nem.
 */

import type { KonstrukcioTipus } from "./konstrukcio";
import { INTENT_MEZOK, type Intent, type IntentMezo, intentAllapot } from "./intent";

export interface BelepoKerdes {
  /** B-kód a Bemenetkérő-tárból, ahol már létezik; új sor esetén a javasolt kód. */
  readonly kod: string;
  readonly mezo: IntentMezo;
  readonly kerdes: string;
  /** Miért kérdezzük — a felületen ez a „ezzel pontosabb lesz” magyarázat. */
  readonly indoklas: string;
}

const KOZOS: readonly BelepoKerdes[] = [
  { kod: "B-102", mezo: "cel", kerdes: "Mit akartok elérni ezzel? (bevétel, gyakoriság, új vevő, megtartás)", indoklas: "A cél dönti el, mely szabálykör releváns." },
  { kod: "B-103", mezo: "kozonseg", kerdes: "Kinek szól, és hol tart a döntésben? (hideg / meleg / visszatérő)", indoklas: "A tölcsérpozíció más technikát tesz helyessé." },
  { kod: "B-105", mezo: "igeret", kerdes: "Mit ígértek benne egy mondatban?", indoklas: "Az ígéret-egyezés és a KO-sáv ellenőrzése ezen áll." },
  { kod: "B-107", mezo: "korlatok", kerdes: "Mi a korlát? (költségkeret, jogi megkötés, márka-tiltás)", indoklas: "A korlátot sértő javaslat felesleges munka." },
  { kod: "B-108", mezo: "meres", kerdes: "Mihez képest és min mérnétek a sikert?", indoklas: "Mérés nélkül az előtte/utána visszamérés lehetetlen." },
];

/**
 * Típus-specifikus mechanika-kérdések. A hűségprogramnál a vásárlási gyakoriság
 * kérdése azért kiemelt, mert az S-126-1 enélkül nem futtatható (a szabály feltétele
 * kávé/drogéria/üzemanyag: igen, bútor/ingatlan/autó: nem).
 */
const TIPUS_KERDESEK: Readonly<Record<KonstrukcioTipus, readonly BelepoKerdes[]>> = {
  "KON-HUS": [
    { kod: "B-121", mezo: "mechanika", kerdes: "Milyen gyakran vásárol a tipikus vevőtök? (havonta többször / havonta / évente néhányszor)", indoklas: "Ritka vásárlásnál a pontgyűjtés nem hajt — ez a hűségprogram első kapuja." },
    { kod: "B-122", mezo: "mechanika", kerdes: "Mi a jutalom, és mikor válik láthatóvá a haladás?", indoklas: "A látható haladás nélkül a program lemorzsolódik." },
    { kod: "B-123", mezo: "idotartam", kerdes: "Meddig érvényesek a pontok, és mi történik lejáratkor?", indoklas: "A lejárati szabály jogi és etikai sávot is érinthet." },
  ],
  "KON-AKC": [
    { kod: "B-131", mezo: "mechanika", kerdes: "Mi a kedvezmény formája? (százalék, fix összeg, ajándék, szállítás)", indoklas: "A forma más észlelést és más szabálykört hoz." },
    { kod: "B-132", mezo: "idotartam", kerdes: "Mettől meddig tart, és mi történik utána az árral?", indoklas: "A visszaálló ár a viszonyítási ár szabályait érinti." },
    { kod: "B-133", mezo: "korlatok", kerdes: "Van készlet- vagy darabkorlát, és igazolható-e?", indoklas: "Az igazolatlan szűkösség a leggyakoribb KO-sávos hiba." },
  ],
  "KON-ARA": [
    { kod: "B-141", mezo: "mechanika", kerdes: "Hány csomag lesz, és mi a különbség köztük?", indoklas: "A csomagszám és a különbségek adják a viszonyítási keretet." },
    { kod: "B-142", mezo: "mechanika", kerdes: "Mi a viszonyítási ár, és mi igazolja?", indoklas: "Igazolatlan áthúzott ár jogi sávot érint." },
  ],
  "KON-KAM": [
    { kod: "B-151", mezo: "mechanika", kerdes: "Mi az üzenetív? (mit mondtok elsőként, mit másodszorra)", indoklas: "Az üzenetsorrend adja a kampány szabálykörét." },
    { kod: "B-152", mezo: "csatornak", kerdes: "Mely csatornákon fut, és melyik a vezető?", indoklas: "A felületkód szűri a szabályokat." },
  ],
  "KON-WEB": [
    { kod: "B-161", mezo: "mechanika", kerdes: "Mi az oldal egyetlen fő cselekvése?", indoklas: "Több egyenrangú CTA esetén a legtöbb szabály másképp szól." },
    { kod: "B-162", mezo: "mechanika", kerdes: "Mi kerül az első képernyőre?", indoklas: "Az ígéret és a bizonyíték helye dönt a hatásosságról." },
  ],
  "KON-KOM": [
    { kod: "B-171", mezo: "mechanika", kerdes: "Mi a levél egyetlen kérése, és mikor érkezik?", indoklas: "Az időzítés és az egyetlen kérés a levél két fő szabálya." },
    { kod: "B-172", mezo: "csatornak", kerdes: "Hova érkezik a kattintás?", indoklas: "Az e-mail és a céloldal üzenetegyezése csak együtt ítélhető meg." },
  ],
  "KON-CIK": [
    { kod: "B-181", mezo: "mechanika", kerdes: "Mi az egyetlen állítás, amit az olvasónak el kell hinnie, és mi bizonyítja?", indoklas: "Az állítás–bizonyíték terv a cikk gerince." },
    { kod: "B-182", mezo: "kozonseg", kerdes: "Az olvasó melyik döntési szakaszban van? (probléma-tudatlan / megoldást keres / szállítót választ)", indoklas: "A szakasz dönti el, mennyi bizonyíték kell és hol jöhet a CTA." },
    { kod: "B-183", mezo: "cel", kerdes: "Mi a cikk kimenete? (feliratkozás, megkeresés, ismertség)", indoklas: "A CTA-erősség ehhez igazodik — a cikk nem landing." },
  ],
};

/** Egy típus teljes belépő csomagja (6–10 kérdés). */
export function belepoCsomag(tipus: KonstrukcioTipus): readonly BelepoKerdes[] {
  return [...TIPUS_KERDESEK[tipus], ...KOZOS];
}

/**
 * A következő kérdés a beszélgetésben. Először a kötelező mezőket kérjük be, mert
 * azok nélkül a validáció el sem indul; a többi kérdés pontosít.
 */
export function kovetkezoKerdes(intent: Intent): BelepoKerdes | undefined {
  if (intent.konstrukcioTipus === undefined) return undefined;
  const allapot = intentAllapot(intent);
  const csomag = belepoCsomag(intent.konstrukcioTipus);
  const sorrend: readonly IntentMezo[] = [...allapot.hianyzoKotelezoMezok, ...allapot.hianyzoMezok];
  for (const mezo of sorrend) {
    const kerdes = csomag.find((k) => k.mezo === mezo);
    if (kerdes !== undefined) return kerdes;
  }
  return undefined;
}

/** A még nyitott kérdések listája — az Intent-panel „mi hiányzik" nézete. */
export function nyitottKerdesek(intent: Intent): readonly BelepoKerdes[] {
  if (intent.konstrukcioTipus === undefined) return [];
  const hianyzo = new Set(intentAllapot(intent).hianyzoMezok);
  return belepoCsomag(intent.konstrukcioTipus).filter((k) => hianyzo.has(k.mezo));
}

/** A mezők teljes listája — a felület az Intent-panelt ebből építi. */
export const PANEL_MEZOK = INTENT_MEZOK;
