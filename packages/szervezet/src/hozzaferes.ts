/**
 * Szerepek, jogosultságok és tenant-szigetelés (brief v2.0 6.1–6.2, H komponens).
 *
 * Két külön kérdés, amit sosem szabad összemosni:
 *  1. MIT tehet a szerep (jogosultság-mátrix);
 *  2. MELYIK objektumon teheti (szervezet- és brand-szintű szigetelés).
 * A legtöbb kiszivárgás a másodikon bukik: a szerep stimmel, csak épp más ügyfél
 * adatán. Ezért a döntés két lépésben történik, és a második lépés alapértelmezése
 * a TILTÁS — az egyezést bizonyítani kell, nem az eltérést.
 */

export type Szerep = "tulajdonos" | "admin" | "elemzo" | "nezo" | "platform_admin" | "kurator";

export const KEPESSEGEK = [
  "brand:letrehoz",
  "brand:szerkeszt",
  "brand:olvas",
  "projekt:letrehoz",
  "projekt:szerkeszt",
  "projekt:olvas",
  "futas:audit",
  "futas:tanacs",
  "futas:kerdezz",
  "riport:olvas",
  "riport:visszajelez",
  "riport:megvalositast_jelol",
  "riport:megoszt",
  "csapat:meghiv",
  "csapat:szerep",
  "fizetes:kezel",
  "torles:szervezet",
  "torles:brand",
  "torles:projekt",
  "torles:sajat_futas",
  "platform:hum_kapu",
  "platform:ci",
  "platform:szinkron",
  "platform:tanulasi_sor",
  "platform:kredit_korrekcio",
  "platform:meghivo",
] as const;

export type Kepesseg = (typeof KEPESSEGEK)[number];

const UGYFEL_OLVASAS: readonly Kepesseg[] = ["brand:olvas", "projekt:olvas", "riport:olvas", "riport:visszajelez"];

const ELEMZO: readonly Kepesseg[] = [
  ...UGYFEL_OLVASAS,
  "brand:szerkeszt",
  "projekt:letrehoz",
  "projekt:szerkeszt",
  "futas:audit",
  "futas:tanacs",
  "futas:kerdezz",
  "riport:megvalositast_jelol",
  "torles:sajat_futas",
];

const ADMIN: readonly Kepesseg[] = [
  ...ELEMZO,
  "brand:letrehoz",
  "riport:megoszt",
  "csapat:meghiv",
  "csapat:szerep",
  "fizetes:kezel",
  "torles:brand",
  "torles:projekt",
];

/**
 * A mátrix. A Néző kérdezhet is, DE csak ha az Admin engedélyezte — ez nem szerep-,
 * hanem szervezet-beállítás, ezért nem itt van, hanem a `Tagsag.kerdezhet` mezőben.
 */
export const SZEREP_KEPESSEGEK: Readonly<Record<Szerep, readonly Kepesseg[]>> = {
  nezo: UGYFEL_OLVASAS,
  elemzo: ELEMZO,
  admin: ADMIN,
  tulajdonos: [...ADMIN, "torles:szervezet"],
  platform_admin: [
    "platform:hum_kapu",
    "platform:ci",
    "platform:szinkron",
    "platform:tanulasi_sor",
    "platform:kredit_korrekcio",
    "platform:meghivo",
  ],
  kurator: ["platform:tanulasi_sor"],
};

/** „mind” = a szervezet összes brandje; a lista = kijelölt brandek (ügynökségi minimum). */
export type BrandHozzaferes = "mind" | readonly string[];

export interface Tagsag {
  readonly felhasznaloAzonosito: string;
  readonly szervezetAzonosito: string;
  readonly szerep: Szerep;
  readonly brandHozzaferes: BrandHozzaferes;
  /** Néző-szerepnél az Admin engedélye a Kérdezz módra. */
  readonly kerdezhet?: boolean;
}

export interface Cel {
  readonly szervezetAzonosito: string;
  readonly brandAzonosito?: string;
  /** Ki indította az adott futást — a „saját futás" törléséhez. */
  readonly letrehozoAzonosito?: string;
}

export type DontesIndok =
  | "engedelyezve"
  | "szerep-nem-jogosult"
  | "masik-szervezet"
  | "brand-nem-kijelolt"
  | "nem-sajat-futas"
  | "nezo-kerdezes-tiltva";

export interface Dontes {
  readonly engedelyezett: boolean;
  readonly indok: DontesIndok;
  /**
   * A platform-admin más szervezet adatához csak támogatási céllal, NAPLÓZVA fér hozzá
   * (6.1). A napló nem a hívó jóindulatán múlik: a döntés kimondja, hogy kötelező.
   */
  readonly naplozandoTamogatoiHozzaferes: boolean;
  readonly uzenet: string;
}

const engedve = (naplozando = false): Dontes => ({
  engedelyezett: true,
  indok: "engedelyezve",
  naplozandoTamogatoiHozzaferes: naplozando,
  uzenet: naplozando ? "Engedélyezve, támogatói hozzáférésként naplózva." : "Engedélyezve.",
});

const tiltva = (indok: DontesIndok, uzenet: string): Dontes => ({
  engedelyezett: false,
  indok,
  naplozandoTamogatoiHozzaferes: false,
  uzenet,
});

function platformKepesseg(kepesseg: Kepesseg): boolean {
  return kepesseg.startsWith("platform:");
}

export function jogosult(tag: Tagsag, kepesseg: Kepesseg, cel?: Cel): Dontes {
  const kepessegek = SZEREP_KEPESSEGEK[tag.szerep];

  // Platform-szerepek: a saját pultjukon dolgoznak, ügyfél-objektumon csak támogatásként.
  if (tag.szerep === "platform_admin" || tag.szerep === "kurator") {
    if (platformKepesseg(kepesseg)) {
      return kepessegek.includes(kepesseg)
        ? engedve()
        : tiltva("szerep-nem-jogosult", `A ${tag.szerep} szerep nem fér hozzá ehhez a pulthoz.`);
    }
    if (tag.szerep === "platform_admin" && cel !== undefined) return engedve(true);
    return tiltva("szerep-nem-jogosult", "Ügyfél-objektumon ez a szerep nem járhat el.");
  }

  if (platformKepesseg(kepesseg)) {
    return tiltva("szerep-nem-jogosult", "Platform-képesség ügyfél-szerephez nem tartozik.");
  }

  if (!kepessegek.includes(kepesseg)) {
    // A Néző kérdezése az egyetlen szerep fölötti kivétel, és csak külön engedéllyel.
    if (kepesseg === "futas:kerdezz" && tag.szerep === "nezo") {
      return tag.kerdezhet === true
        ? sziget(tag, cel, kepesseg)
        : tiltva("nezo-kerdezes-tiltva", "A Néző csak akkor kérdezhet, ha az Admin engedélyezte.");
    }
    return tiltva("szerep-nem-jogosult", `A ${tag.szerep} szerep nem jogosult erre: ${kepesseg}.`);
  }

  return sziget(tag, cel, kepesseg);
}

/** A második lépés: a szervezet- és brand-szintű szigetelés. Alapértelmezés a tiltás. */
function sziget(tag: Tagsag, cel: Cel | undefined, kepesseg: Kepesseg): Dontes {
  if (cel === undefined) return engedve();

  if (cel.szervezetAzonosito !== tag.szervezetAzonosito) {
    return tiltva("masik-szervezet", "Az objektum másik szervezethez tartozik.");
  }

  if (cel.brandAzonosito !== undefined && tag.brandHozzaferes !== "mind") {
    if (!tag.brandHozzaferes.includes(cel.brandAzonosito)) {
      return tiltva("brand-nem-kijelolt", "Ehhez a brandhez nincs hozzáférésed.");
    }
  }

  if (kepesseg === "torles:sajat_futas" && cel.letrehozoAzonosito !== undefined) {
    if (cel.letrehozoAzonosito !== tag.felhasznaloAzonosito) {
      return tiltva("nem-sajat-futas", "Csak a saját futásod törölhető ezzel a szereppel.");
    }
  }

  return engedve();
}

/**
 * Az adatszigetelés önálló ellenőrzése: minden ügyfél-objektum organization_id +
 * brand_id alatt él (6.2). Ez a függvény a lekérdezés-szűrő párja — a kód bármely
 * pontján felhasználható, ahol objektum kerül a kezünkbe.
 */
export function latja(tag: Tagsag, cel: Cel): boolean {
  if (tag.szerep === "platform_admin") return true;
  if (cel.szervezetAzonosito !== tag.szervezetAzonosito) return false;
  if (cel.brandAzonosito === undefined) return true;
  return tag.brandHozzaferes === "mind" || tag.brandHozzaferes.includes(cel.brandAzonosito);
}

/** A listázások brand-szűrője: mely brandeket kérdezhet le ez a tagság. */
export function lathatoBrandek(tag: Tagsag, osszes: readonly string[]): readonly string[] {
  if (tag.brandHozzaferes === "mind") return osszes;
  return osszes.filter((b) => tag.brandHozzaferes.includes(b));
}
