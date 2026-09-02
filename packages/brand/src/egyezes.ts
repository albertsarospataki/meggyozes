/**
 * Brand-egyezés blokk — a riport új szakasza (brief v2.0 3.3).
 *
 * Az ELŐZŐ modul (brand-őr) a saját kimenetünket rostálja; ez itt az ÜGYFÉL anyagát
 * veti össze a brand-profillal. Ezért más a hangja: itt a nulla álpozitív elv az úr,
 * és a bizonytalan eset „nem eldönthető”, nem „eltér”. A brand-profil hiánya nem hiba
 * — olyankor a blokk kimondja, hogy általános javaslat készült.
 */

import { keszultseget, type Keszultseg } from "./keszultseg";
import { ervenyesProofPoint, type BrandProfil } from "./profil";
import { idezetKivag, keresesiAlak, kifejezestKeres } from "./szoveg";
import { FELSOFOK_TALALATOK } from "./felsofok";

export type EgyezesAllapot = "egyezik" | "reszben" | "nem-talalhato" | "elter" | "nem-eldontheto";

export interface EgyezesTetel {
  readonly szempont: "igeret" | "hangnem" | "tiltolista" | "proof-point";
  readonly allapot: EgyezesAllapot;
  readonly uzenet: string;
  readonly idezetek: readonly string[];
}

export interface BrandEgyezes {
  readonly vanProfil: boolean;
  readonly keszultseg: Keszultseg | undefined;
  readonly tetelek: readonly EgyezesTetel[];
  /** A blokk fejlécének emberi mondata — ez kerül a riportba kód nélkül. */
  readonly osszefoglalo: string;
}

/** Rövid, jelentés nélküli szavak, amiket az ígéret-egyezésnél nem számolunk. */
const TOLTELEK = new Set([
  "a", "az", "es", "vagy", "hogy", "amely", "ami", "egy", "nem", "is", "de", "mert",
  "meg", "csak", "mar", "minden", "leg", "tobb", "lesz", "van", "vagyunk", "neked",
]);

function tartalmiSzavak(szoveg: string): string[] {
  return keresesiAlak(szoveg)
    .split(/[^a-z0-9]+/)
    .filter((sz) => sz.length >= 5 && !TOLTELEK.has(sz));
}

const MAGAZO_JELOLOK = ["on", "ont", "onnek", "onok"] as const;
const TEGEZO_JELOLOK = ["te", "teged", "neked", "nalad"] as const;

export function brandEgyezes(artefaktumSzoveg: string, profil: BrandProfil | undefined, mikor = new Date()): BrandEgyezes {
  if (profil === undefined) {
    return {
      vanProfil: false,
      keszultseg: undefined,
      tetelek: [],
      osszefoglalo:
        "Nincs brand-profil ehhez az anyaghoz, ezért a javaslatok általánosak. " +
        "Taníts brandet (10 perc), és a következő riport a saját ígéreteddel, hangnemeddel és igazolható állításaiddal dolgozik.",
    };
  }

  const tetelek: EgyezesTetel[] = [];
  const kesz = keszultseget(profil);

  // Ígéret. Nem állítunk ellentmondást — csak azt, mennyire jelenik meg a fő ígéret.
  const igeret = profil.pozicionalas.foIgeret;
  if (igeret === undefined || igeret.trim() === "") {
    tetelek.push({
      szempont: "igeret",
      allapot: "nem-eldontheto",
      uzenet: "A brand-profilban nincs rögzített fő ígéret, így az egyezés nem ítélhető meg.",
      idezetek: [],
    });
  } else {
    const kulcsszavak = tartalmiSzavak(igeret);
    const anyag = keresesiAlak(artefaktumSzoveg);
    const talalt = kulcsszavak.filter((sz) => anyag.includes(sz));
    const arany = kulcsszavak.length === 0 ? 0 : talalt.length / kulcsszavak.length;
    tetelek.push({
      szempont: "igeret",
      allapot: arany >= 0.5 ? "egyezik" : arany > 0 ? "reszben" : "nem-talalhato",
      uzenet:
        arany >= 0.5
          ? `A fő ígéret („${igeret}”) felismerhetően megjelenik az anyagban.`
          : arany > 0
            ? `A fő ígéret csak részben jelenik meg (${talalt.length}/${kulcsszavak.length} kulcselem).`
            : "A brand fő ígérete nem jelenik meg az anyagban — az első képernyőn érdemes kimondani.",
      idezetek: talalt,
    });
  }

  // Hangnem. Csak egyértelmű jelölőnél mondunk eltérést.
  const megszolitas = profil.hangnem.megszolitas;
  if (megszolitas === undefined) {
    tetelek.push({
      szempont: "hangnem",
      allapot: "nem-eldontheto",
      uzenet: "A profil nem rögzíti a megszólítást (tegezés / magázás).",
      idezetek: [],
    });
  } else {
    const rosszak = megszolitas === "tegezes" ? MAGAZO_JELOLOK : TEGEZO_JELOLOK;
    const idezetek = rosszak.flatMap((j) =>
      kifejezestKeres(artefaktumSzoveg, j, true).map((t) => idezetKivag(artefaktumSzoveg, t.kezdet, t.hossz)),
    );
    tetelek.push({
      szempont: "hangnem",
      allapot: idezetek.length === 0 ? "egyezik" : "elter",
      uzenet:
        idezetek.length === 0
          ? `A szöveg a brand ${megszolitas === "tegezes" ? "tegező" : "magázó"} hangnemét követi.`
          : `A szöveg ${idezetek.length} helyen a másik regiszterbe vált.`,
      idezetek,
    });
  }

  // Tiltólista. Ez már megállapítás: a brand maga mondta, hogy ezt sosem mondja.
  const tiltottak = [...profil.hangnem.tiltottKifejezesek, ...profil.pozicionalas.amitSosemMondunk];
  const tiltottIdezetek = tiltottak.flatMap((t) =>
    kifejezestKeres(artefaktumSzoveg, t).map((tal) => idezetKivag(artefaktumSzoveg, tal.kezdet, tal.hossz)),
  );
  tetelek.push({
    szempont: "tiltolista",
    allapot: tiltottak.length === 0 ? "nem-eldontheto" : tiltottIdezetek.length === 0 ? "egyezik" : "elter",
    uzenet:
      tiltottak.length === 0
        ? "A profilban nincs tiltólista — töltsd ki, és a rendszer minden anyagon ellenőrzi."
        : tiltottIdezetek.length === 0
          ? "Az anyag nem használ tiltólistás kifejezést."
          : `Az anyag ${tiltottIdezetek.length} tiltólistás kifejezést használ.`,
    idezetek: tiltottIdezetek,
  });

  // Proof point nélküli felsőfok. Az EL „Brand-konzisztencia" modul kulcs-sora.
  const ervenyesek = profil.bizonyitekTar.filter((pp) => ervenyesProofPoint(pp, mikor));
  const igazolatlan = FELSOFOK_TALALATOK(artefaktumSzoveg).filter(
    (t) => !ervenyesek.some((pp) => keresesiAlak(pp.allitas).includes(keresesiAlak(t.kifejezes))),
  );
  tetelek.push({
    szempont: "proof-point",
    allapot: igazolatlan.length === 0 ? "egyezik" : "elter",
    uzenet:
      igazolatlan.length === 0
        ? "Nincs olyan felsőfokú állítás, amit a bizonyíték-tár ne fedne."
        : `${igazolatlan.length} felsőfokú állítás nincs proof pointtal alátámasztva.`,
    idezetek: igazolatlan.map((t) => idezetKivag(artefaktumSzoveg, t.kezdet, t.hossz)),
  });

  const eltero = tetelek.filter((t) => t.allapot === "elter" || t.allapot === "nem-talalhato").length;
  // Magyar tizedes: vessző (brandbook 6.2). A készültség a riportban fut, ezért a
  // formázás itt dől el, nem a felületen — hogy minden felhasználási helyen egyforma.
  const pont = kesz.pont.toFixed(1).replace(".", ",");
  return {
    vanProfil: true,
    keszultseg: kesz,
    tetelek,
    osszefoglalo:
      eltero === 0
        ? `Az anyag illeszkedik a brand-profilhoz (készültség ${pont}/5).`
        : `${eltero} ponton tér el az anyag a brand-profiltól (készültség ${pont}/5).`,
  };
}
