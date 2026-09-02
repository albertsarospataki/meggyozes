/**
 * Konstrukció-típusok és felismerésük (brief v2.0 W3, Tervezői mód architektúra 1. pont).
 *
 * A típus a determinisztikus előhívási kulcs: a Szabálytár `Kiváltó feltétel` mezője
 * szabad szöveg, és egy szándékot 4 378 szabad szöveges feltételhez illeszteni pontosan
 * az a homályos előhívás, amit a projekt fegyelme tilt. A KON-címke ezért nem kényelmi
 * kategória, hanem a P7′ szűrő kulcsa.
 *
 * A hetedik típus (KON-CIK, tartalom/cikk) a v2.0 brief 12. nyitott döntése; a kód
 * felveszi, mert a hiánya látszik a legjobban: a „cikket is tervezzünk" kérés ma a
 * kampány-típusra esne, ami más szabálykört hív elő.
 */

export const KONSTRUKCIO_TIPUSOK = [
  "KON-HUS",
  "KON-AKC",
  "KON-ARA",
  "KON-KAM",
  "KON-WEB",
  "KON-KOM",
  "KON-CIK",
] as const;

export type KonstrukcioTipus = (typeof KONSTRUKCIO_TIPUSOK)[number];

export const KONSTRUKCIO_NEVEK: Readonly<Record<KonstrukcioTipus, string>> = {
  "KON-HUS": "hűségprogram",
  "KON-AKC": "akció / promóció",
  "KON-ARA": "árazás / csomagolás",
  "KON-KAM": "kampány",
  "KON-WEB": "weboldal / landing terv",
  "KON-KOM": "kommunikáció / e-mail",
  "KON-CIK": "tartalom / cikk",
};

/**
 * Felismerési kulcsszavak. Szándékosan szűk és kimondott: a homályos illesztés
 * rosszabb, mint a rákérdezés. Ha két típus egyformán erős, a rendszer nem választ,
 * hanem kérdez (Constitution 4.: nem találgat, bekér).
 */
const KULCSSZAVAK: Readonly<Record<KonstrukcioTipus, readonly string[]>> = {
  "KON-HUS": ["hűségprogram", "hűségkártya", "pontgyűjt", "törzsvásárl", "loyalty", "klubtagság"],
  "KON-AKC": ["akció", "kedvezmény", "leárazás", "promóció", "kupon", "ajándék a vásárlás", "black friday"],
  "KON-ARA": ["árazás", "árstruktúra", "csomagár", "előfizetési díj", "árlista", "árat emel", "csomagolás"],
  "KON-KAM": ["kampány", "hirdetési", "médiaterv", "üzenetív", "launch", "bevezető kampány"],
  "KON-WEB": ["landing", "weboldal", "aloldal", "checkout", "űrlap", "drótváz", "oldalterv", "honlap"],
  "KON-KOM": ["hírlevél", "e-mail", "email", "értesítő", "push üzenet", "ügyfélkommunikáció", "levél"],
  "KON-CIK": ["cikk", "blogposzt", "blogcikk", "szakcikk", "tartalomterv", "poszt-sorozat", "esettanulmány"],
};

export interface TipusFelismeres {
  readonly tipus: KonstrukcioTipus | undefined;
  /** Az összes talált jelölt, erősség szerint — a felület ebből kínál választást. */
  readonly jeloltek: readonly { readonly tipus: KonstrukcioTipus; readonly talalatok: readonly string[] }[];
  /** Igaz, ha a rendszer nem dönt, hanem kérdez. */
  readonly kerdezniKell: boolean;
  readonly kerdes: string | undefined;
}

/**
 * Konstrukció-típus felismerése a belépő mondatból („jövő héten 20% a webshopon”).
 * Nem osztályozó modell: kimondott kulcsszavak. A kimenet vagy egy típus, vagy egy
 * kérdés — harmadik ág nincs.
 */
export function tipustFelismer(belepoMondat: string): TipusFelismeres {
  const szoveg = belepoMondat.toLowerCase();
  const jeloltek = KONSTRUKCIO_TIPUSOK.map((tipus) => ({
    tipus,
    talalatok: KULCSSZAVAK[tipus].filter((k) => szoveg.includes(k)),
  }))
    .filter((j) => j.talalatok.length > 0)
    .sort((a, b) => b.talalatok.length - a.talalatok.length);

  const elso = jeloltek[0];
  const masodik = jeloltek[1];

  if (elso === undefined) {
    return {
      tipus: undefined,
      jeloltek,
      kerdezniKell: true,
      kerdes: `Mit terveztek? (${KONSTRUKCIO_TIPUSOK.map((t) => KONSTRUKCIO_NEVEK[t]).join(" · ")})`,
    };
  }

  if (masodik !== undefined && masodik.talalatok.length === elso.talalatok.length) {
    return {
      tipus: undefined,
      jeloltek,
      kerdezniKell: true,
      kerdes: `Ez ${KONSTRUKCIO_NEVEK[elso.tipus]} vagy ${KONSTRUKCIO_NEVEK[masodik.tipus]}? A kettő más szabálykört hív elő.`,
    };
  }

  return { tipus: elso.tipus, jeloltek, kerdezniKell: false, kerdes: undefined };
}
