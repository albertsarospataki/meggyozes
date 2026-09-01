/**
 * Futás lezárása: brand-őr a javaslatokon, HUM-kapu és kredit-visszaírás
 * (brief v2.0 W2 6–7. lépés, W7, 7.4).
 *
 * Itt dől el, mit lát az ügyfél. Három dolgot kell egyszerre teljesíteni:
 *  - a KO-sávú megállapítást ember nézze át (P12), DE a nem-KO részek ne várjanak;
 *  - a saját javaslat-szövegek átmenjenek a brand-őrön, mert azok az ügyfél nevében
 *    másolhatók be;
 *  - hibás vagy elakadt futás ne kerüljön kreditbe.
 */

import { brandOr, type BrandOrEredmeny, type BrandProfil } from "@meggyozes/brand";
import type { Megallapitas, RiportStatusz } from "@meggyozes/projekt";
import { visszairasok, type Fokonyv, type KreditTranzakcio } from "@meggyozes/szervezet";

export interface JavaslatSzoveg {
  readonly azonosito: string;
  /** A bemásolható szövegminta — ez megy ki az ügyfél nevében. */
  readonly szoveg: string;
}

export interface LezarasBemenet {
  readonly megallapitasok: readonly Megallapitas[];
  readonly javaslatSzovegek: readonly JavaslatSzoveg[];
  readonly profil: BrandProfil | undefined;
  readonly idezettForrasok?: readonly string[];
  readonly mikor?: Date;
}

export interface JavaslatEllenorzes {
  readonly azonosito: string;
  readonly eredmeny: BrandOrEredmeny;
  /** A helyőrzőzött, kiadható szöveg — visszaküldésnél nem használható. */
  readonly kiadhatoSzoveg: string | undefined;
}

export interface LezarasEredmeny {
  readonly riportStatusz: RiportStatusz;
  readonly humKapuraKell: boolean;
  /** Mely megállapítások miatt kell ember — a HUM-sor ezt mutatja. */
  readonly koMegallapitasok: readonly Megallapitas[];
  readonly javaslatok: readonly JavaslatEllenorzes[];
  readonly visszakuldottJavaslatok: readonly string[];
  readonly uzenet: string;
}

const KO_SAVOK = new Set(["0 Jogi KO", "1 Etikai KO"]);

export function futastLezar(b: LezarasBemenet): LezarasEredmeny {
  // A KO-sávot csak TÉNY fokozatú megállapítás viszi HUM-kapura: a gyanú és a
  // „nem eldönthető" sosem bizonyított probléma (DET 6.), és ha ezek is sorba
  // állnának, a kapu megtelne, az SLA pedig értelmét vesztené.
  const koMegallapitasok = b.megallapitasok.filter(
    (m) => KO_SAVOK.has(m.sav) && m.bizonyitekSzint === "teny" && m.minosites === "problema",
  );

  const javaslatok: JavaslatEllenorzes[] = b.javaslatSzovegek.map((j) => {
    const eredmeny = brandOr({
      szoveg: j.szoveg,
      profil: b.profil,
      ...(b.idezettForrasok === undefined ? {} : { idezettForrasok: b.idezettForrasok }),
      ...(b.mikor === undefined ? {} : { mikor: b.mikor }),
    });
    return {
      azonosito: j.azonosito,
      eredmeny,
      kiadhatoSzoveg: eredmeny.kiadhato ? eredmeny.helyorzosSzoveg : undefined,
    };
  });

  const visszakuldottJavaslatok = javaslatok.filter((j) => !j.eredmeny.kiadhato).map((j) => j.azonosito);
  const humKapuraKell = koMegallapitasok.length > 0;

  return {
    riportStatusz: humKapuraKell ? "ellenorzes_alatt" : "kesz",
    humKapuraKell,
    koMegallapitasok,
    javaslatok,
    visszakuldottJavaslatok,
    uzenet: humKapuraKell
      ? `${koMegallapitasok.length} KO-sávú megállapítás szakértői ellenőrzés alatt; a többi rész már olvasható.`
      : "A riport kész.",
  };
}

export type FutasKimenetel = "sikeres" | "hiba" | "hum_kapun_elakadt";

export interface KreditRendezes {
  readonly visszairasok: readonly KreditTranzakcio[];
  readonly uzenet: string;
}

/**
 * Kredit rendezése a futás kimenetele szerint. A 7.4 szabály: a HUM-kapun elakadt
 * vagy hibával leállt futás nem von le kreditet, a visszaírás automatikus.
 *
 * A „hum_kapun_elakadt" nem azonos a HUM-kapura kerüléssel: az ellenőrzésre váró
 * riport rendes eredmény, azért fizetni kell. Elakadásról akkor beszélünk, ha az
 * SLA lejárt, és az ügyfél nem kapott döntést.
 */
export function kreditetRendez(
  kimenetel: FutasKimenetel,
  fokonyv: Fokonyv,
  terheles: KreditTranzakcio,
  mikor: string,
): KreditRendezes {
  if (kimenetel === "sikeres") {
    return { visszairasok: [], uzenet: "A futás lefutott, a kredit levonva marad." };
  }
  const indok = kimenetel === "hiba" ? "A futás hibával leállt." : "A HUM-kapun elakadt futás (SLA lejárt).";
  const tetelek = visszairasok(fokonyv, terheles, mikor, indok);
  return {
    visszairasok: tetelek,
    uzenet: `${indok} Visszaírva ${tetelek.reduce((s, t) => s + t.mennyiseg, 0)} kredit.`,
  };
}
