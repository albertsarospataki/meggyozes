"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { szovegAjto, urlAjto, BemenetiHiba, type ArtefaktumObjektum } from "@meggyozes/bemenet";
import { uresProfil, type BrandProfil, type Megszolitas } from "@meggyozes/brand";
import type { AuditKontextus, ArtefaktumCel, TolcserPozicio, UzletiModell } from "@meggyozes/core";
import { futastLezar, inditastEllenoriz, kreditetRendez } from "@meggyozes/folyamat";
import { auditotFuttat, DEMO_TUDASBAZIS, tervetValidal, tudasbazisbolKeres } from "@meggyozes/motor";
import { bizonyitekBlokkot, forrasokatSzur, hianyKartya, kerdestOsztalyoz, valasztEllenoriz } from "@meggyozes/kerdezz";
import { KONSTRUKCIO_NEVEK, tipustFelismer, type KonstrukcioTipus } from "@meggyozes/tanacs";
import type { Futas, Riport } from "@meggyozes/projekt";
import { ar, type Muvelet } from "@meggyozes/szervezet";
import { jeloltetKepez, type Visszajelzes } from "@meggyozes/tanulas";
import { hatokorTagsagbol } from "@meggyozes/tarolas";
import { azonosito, most } from "./azonosito";
import { aktivBrandAzonosito, fokonyv, MENESZT_SUTI, meneszt, menesztVagyBelepes, tar } from "./tar";

const DETEKTOR = {
  promptVerzio: process.env.PROMPT_VERZIO ?? "p-2026-09-02",
  detVerzio: process.env.DET_VERZIO ?? "det-0.1",
  modell: process.env.LLM_MODELL ?? "determinisztikus",
} as const;

/* ---------- belépés ---------- */

export async function belepes(formData: FormData): Promise<void> {
  const kod = String(formData.get("kod") ?? "");
  const vart = process.env.ALFA_MEGHIVO ?? "alfa";
  if (kod.trim() !== vart) redirect("/belepes?hiba=kod");

  const t = tar();
  const tulajdonos = t.felhasznaloEmailbol(process.env.TULAJDONOS_EMAIL ?? "albert@convictly.com");
  if (tulajdonos === undefined) redirect("/belepes?hiba=fiok");

  (await cookies()).set(MENESZT_SUTI, tulajdonos.azonosito, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/");
}

export async function kilepes(): Promise<void> {
  (await cookies()).delete(MENESZT_SUTI);
  redirect("/belepes");
}

export async function brandotValt(formData: FormData): Promise<void> {
  const brand = String(formData.get("brand") ?? "");
  (await cookies()).set("convictly_brand", brand, { sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}

/* ---------- brand ---------- */

export async function brandetLetrehoz(formData: FormData): Promise<void> {
  const m = await menesztVagyBelepes();
  const nev = String(formData.get("nev") ?? "").trim();
  if (nev === "") redirect("/brandek?hiba=nev");

  const uj = azonosito("brand");
  tar().brandetMent({
    azonosito: uj,
    szervezetAzonosito: m.tagsag.szervezetAzonosito,
    nev,
    profil: uresProfil(uj, m.tagsag.szervezetAzonosito, nev),
    letrehozva: most(),
  });
  (await cookies()).set("convictly_brand", uj, { sameSite: "lax", path: "/" });
  redirect(`/brandek/${uj}`);
}

const sorokra = (ertek: FormDataEntryValue | null): string[] =>
  String(ertek ?? "")
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter((s) => s !== "");

/**
 * Brand-profil mentése a kérdőívből (1D csomag).
 *
 * A W1 kapuja: profil-mezőt generált tartalom nem tölthet jóváhagyás nélkül. Ezért
 * ez a művelet csak azt írja be, amit ember gépelt — a rendszer által javasolt
 * mintázatok külön, jóváhagyással kerülnek be.
 */
export async function brandProfiltMent(formData: FormData): Promise<void> {
  const m = await menesztVagyBelepes();
  const brandAzonosito = String(formData.get("brand") ?? "");
  const t = tar();
  const sor = t.brand(m.hatokor, brandAzonosito);
  if (sor === undefined) redirect("/brandek");

  const uresRe = (ertek: FormDataEntryValue | null): string | undefined => {
    const sz = String(ertek ?? "").trim();
    return sz === "" ? undefined : sz;
  };

  const profil: BrandProfil = {
    ...sor.profil,
    verzio: sor.profil.verzio + 1,
    alapadatok: {
      ...sor.profil.alapadatok,
      nev: sor.nev,
      agazat: uresRe(formData.get("agazat")),
      uzletiModell: (uresRe(formData.get("uzletiModell")) as UzletiModell | undefined),
      piacEsNyelv: uresRe(formData.get("piacEsNyelv")),
      joghatosag: uresRe(formData.get("joghatosag")),
      domainek: sorokra(formData.get("domainek")),
      agazatiModulok: sor.profil.alapadatok.agazatiModulok,
    },
    pozicionalas: {
      foIgeret: uresRe(formData.get("foIgeret")),
      ertekek: sorokra(formData.get("ertekek")),
      differencialas: uresRe(formData.get("differencialas")),
      amitSosemMondunk: sorokra(formData.get("amitSosemMondunk")),
    },
    hangnem: {
      ...sor.profil.hangnem,
      megszolitas: (uresRe(formData.get("megszolitas")) as Megszolitas | undefined),
      kotelezoKifejezesek: sorokra(formData.get("kotelezoKifejezesek")),
      tiltottKifejezesek: sorokra(formData.get("tiltottKifejezesek")),
      peldamondatok: sorokra(formData.get("peldamondatok")),
    },
    meres: {
      elerhetoForrasok: sorokra(formData.get("meresForrasok")),
      kpik: sorokra(formData.get("kpik")),
    },
  };

  t.brandetMent({ ...sor, profil });
  revalidatePath(`/brandek/${brandAzonosito}`);
}

export async function proofPointotFelvesz(formData: FormData): Promise<void> {
  const m = await menesztVagyBelepes();
  const brandAzonosito = String(formData.get("brand") ?? "");
  const t = tar();
  const sor = t.brand(m.hatokor, brandAzonosito);
  if (sor === undefined) redirect("/brandek");

  const allitas = String(formData.get("allitas") ?? "").trim();
  const forras = String(formData.get("forras") ?? "").trim();
  if (allitas === "" || forras === "") redirect(`/brandek/${brandAzonosito}?hiba=proof`);

  const ervenyesseg = String(formData.get("ervenyesseg") ?? "").trim();
  const szamertek = String(formData.get("szamertek") ?? "").trim();

  t.brandetMent({
    ...sor,
    profil: {
      ...sor.profil,
      bizonyitekTar: [
        ...sor.profil.bizonyitekTar,
        {
          azonosito: azonosito("pp"),
          allitas,
          forras,
          ervenyesseg: ervenyesseg === "" ? undefined : ervenyesseg,
          igazolta: m.felhasznaloNev,
          szamertek: szamertek === "" ? undefined : szamertek,
        },
      ],
    },
  });
  revalidatePath(`/brandek/${brandAzonosito}`);
}

/* ---------- projekt ---------- */

export async function projektetLetrehoz(formData: FormData): Promise<void> {
  const m = await menesztVagyBelepes();
  const nev = String(formData.get("nev") ?? "").trim();
  const brandAzonosito = String(formData.get("brand") ?? "") || (await aktivBrandAzonosito(m.hatokor)) || "";
  if (nev === "" || brandAzonosito === "") redirect("/projektek?hiba=adat");

  const uj = azonosito("p");
  tar().projektetMent({
    azonosito: uj,
    szervezetAzonosito: m.tagsag.szervezetAzonosito,
    brandAzonosito,
    nev,
    tipus: "vegyes",
    statusz: "aktiv",
    letrehozva: most(),
    utolsoAktivitas: most(),
  });
  redirect(`/projektek/${uj}`);
}

export async function projektetLezar(formData: FormData): Promise<void> {
  const m = await menesztVagyBelepes();
  const t = tar();
  const p = t.projekt(m.hatokor, String(formData.get("projekt") ?? ""));
  if (p === undefined) redirect("/projektek");
  t.projektetMent({ ...p, statusz: "lezart", utolsoAktivitas: most() });
  revalidatePath("/projektek");
}

/* ---------- audit ---------- */

function kontextusFormbol(formData: FormData): AuditKontextus {
  const ertek = (nev: string): string | undefined => {
    const sz = String(formData.get(nev) ?? "").trim();
    return sz === "" ? undefined : sz;
  };
  return {
    uzletiModell: ertek("uzletiModell") as UzletiModell | undefined,
    agazat: ertek("agazat"),
    artefaktumCel: ertek("artefaktumCel") as ArtefaktumCel | undefined,
    tolcserPozicio: ertek("tolcserPozicio") as TolcserPozicio | undefined,
  };
}

/**
 * Audit indítása és lefuttatása (W2).
 *
 * A sorrend a folyamat-réteg négy kapuja: jogosultság → csomagkorlát → kredit →
 * terhelés; és csak azután nyúlunk a hálózathoz. Ha a futás hibára fut, a kredit
 * automatikusan visszaíródik — a nem lefutott munkáért nem fizet az ügyfél (7.4).
 */
export async function auditotIndit(formData: FormData): Promise<void> {
  const m = await menesztVagyBelepes();
  const t = tar();

  const ajto = String(formData.get("ajto") ?? "url") as "url" | "szoveg";
  const url = String(formData.get("url") ?? "").trim();
  const szoveg = String(formData.get("szoveg") ?? "").trim();
  const brandAzonosito = String(formData.get("brand") ?? "") || (await aktivBrandAzonosito(m.hatokor));

  if (ajto === "url" && url === "") redirect("/audit?hiba=url");
  if (ajto === "szoveg" && szoveg === "") redirect("/audit?hiba=szoveg");

  // Projekt: a megadott, vagy egy új, az anyagról elnevezve.
  let projektAzonosito = String(formData.get("projekt") ?? "");
  if (projektAzonosito === "" || t.projekt(m.hatokor, projektAzonosito) === undefined) {
    if (brandAzonosito === undefined) redirect("/brandek?hiba=nincs-brand");
    projektAzonosito = azonosito("p");
    t.projektetMent({
      azonosito: projektAzonosito,
      szervezetAzonosito: m.tagsag.szervezetAzonosito,
      brandAzonosito,
      nev: ajto === "url" ? url.replace(/^https?:\/\//, "").slice(0, 60) : szoveg.slice(0, 48),
      tipus: "audit",
      statusz: "aktiv",
      letrehozva: most(),
      utolsoAktivitas: most(),
    });
  }

  const muvelet: Muvelet = { tipus: ajto === "url" ? "audit_url" : "audit_szoveg" };
  const futasAzonosito = azonosito("f");

  const inditas = inditastEllenoriz({
    tag: m.tagsag,
    cel: {
      szervezetAzonosito: m.tagsag.szervezetAzonosito,
      ...(brandAzonosito === undefined ? {} : { brandAzonosito }),
    },
    mod: "audit",
    csomag: m.csomag,
    muvelet,
    auditKeres: { ajto },
    fokonyv: fokonyv(m.hatokor),
    futasAzonosito,
    mikor: most(),
  });

  if (inditas.dontes !== "indulhat" || inditas.terheles === undefined) {
    redirect(`/audit?hiba=${inditas.dontes}&uzenet=${encodeURIComponent(inditas.uzenet)}`);
  }

  t.kreditetMent([inditas.terheles]);

  const alapFutas: Futas = {
    azonosito: futasAzonosito,
    projektAzonosito,
    mod: "audit",
    inditotta: m.tagsag.felhasznaloAzonosito,
    inditva: most(),
    statusz: "fut",
    tudasbazisVerzio: DEMO_TUDASBAZIS.verzio,
    promptVerzio: DETEKTOR.promptVerzio,
    detVerzio: DETEKTOR.detVerzio,
    modell: DETEKTOR.modell,
    kreditKoltseg: ar(muvelet).osszesen,
  };
  t.futastMent(m.hatokor, alapFutas, brandAzonosito);

  let objektum: ArtefaktumObjektum;
  try {
    objektum =
      ajto === "url"
        ? await urlAjto({ url, rogzitve: most() })
        : szovegAjto(szoveg, "beillesztett szöveg", most());
  } catch (hiba) {
    // Hibás futás: a kredit visszaíródik, és a hiba emberi nyelven, ajánlattal jön.
    const rendezes = kreditetRendez("hiba", fokonyv(m.hatokor), inditas.terheles, most());
    t.kreditetMent(rendezes.visszairasok);
    t.futastMent(m.hatokor, { ...alapFutas, statusz: "hiba" }, brandAzonosito);
    const uzenet = hiba instanceof BemenetiHiba ? `${hiba.message} ${hiba.ajanlat}` : String(hiba);
    redirect(`/audit?hiba=bemenet&uzenet=${encodeURIComponent(uzenet)}`);
  }

  const brandSor = brandAzonosito === undefined ? undefined : t.brand(m.hatokor, brandAzonosito);

  const eredmeny = auditotFuttat({
    objektum,
    kontextus: kontextusFormbol(formData),
    profil: brandSor?.profil,
    brandNev: brandSor?.nev,
    tudasbazis: DEMO_TUDASBAZIS,
    verzio: { tudasbazisVerzio: DEMO_TUDASBAZIS.verzio, ...DETEKTOR },
  });

  const lezaras = futastLezar({
    megallapitasok: eredmeny.megallapitasok,
    javaslatSzovegek: eredmeny.javaslatok.map((j) => ({ azonosito: j.azonosito, szoveg: j.helyetteEz })),
    profil: brandSor?.profil,
  });

  const artefaktumAzonosito = azonosito("a");
  t.artefaktumotMent(
    m.hatokor,
    {
      azonosito: artefaktumAzonosito,
      projektAzonosito,
      ajto,
      megnevezes: objektum.forras,
      rogzitve: objektum.rogzitve,
      masodikMegfigyeles: undefined,
    },
    objektum,
  );

  const riportAzonosito = azonosito("r");
  const riport: Riport = {
    azonosito: riportAzonosito,
    futasAzonosito,
    projektAzonosito,
    verzio: 1,
    keszult: most(),
    mod: "audit",
    statusz: lezaras.riportStatusz,
    megallapitasok: eredmeny.megallapitasok,
    javaslatok: eredmeny.javaslatok,
    tisztazoKerdesek: eredmeny.kerdesek,
  };

  t.riportotMent(m.hatokor, riport, brandAzonosito, {
    osszefoglalo: eredmeny.osszefoglalo,
    masthead: eredmeny.masthead,
    savok: eredmeny.savok.map((s) => ({ nev: s.nev, allapot: s.allapot, ertek: s.ertek })),
    pozitivak: eredmeny.pozitivak,
    megallapitasok: eredmeny.megallapitasok,
    javaslatok: eredmeny.javaslatok,
    brandEgyezes: eredmeny.brandEgyezes,
    kerdesek: eredmeny.kerdesek,
    korlatok: eredmeny.korlatok,
    naplo: [...eredmeny.naplo, ...(lezaras.humKapuraKell ? [lezaras.uzenet] : [])],
    visszakuldottJavaslatok: lezaras.visszakuldottJavaslatok,
  } as never);

  t.futastMent(
    m.hatokor,
    { ...alapFutas, statusz: lezaras.humKapuraKell ? "hum_kapun" : "kesz" },
    brandAzonosito,
    eredmeny.naplo,
  );
  t.projektAktivitas(projektAzonosito, most());

  redirect(`/riportok/${riportAzonosito}`);
}

/* ---------- visszajelzés és megvalósítás ---------- */

export async function visszajelzestAd(formData: FormData): Promise<void> {
  const m = await menesztVagyBelepes();
  const t = tar();
  const riportAzonosito = String(formData.get("riport") ?? "");
  const megallapitasAzonosito = String(formData.get("megallapitas") ?? "");
  const tipus = String(formData.get("tipus") ?? "helyes") as Visszajelzes["tipus"];

  const riport = t.riport(m.hatokor, riportAzonosito);
  if (riport === undefined) redirect("/riportok");

  const visszajelzes: Visszajelzes = {
    azonosito: `${riportAzonosito}:${megallapitasAzonosito}`,
    megallapitasAzonosito,
    riportAzonosito,
    tipus,
    szoveg: undefined,
    ki: m.tagsag.felhasznaloAzonosito,
    mikor: most(),
  };
  t.visszajelzestMent(m.hatokor, visszajelzes);

  // A 👎 és a 🤔 tanulási jelöltet szül — anonimizálva, ügyfél-adat nélkül (W9).
  const megallapitas = riport.megallapitasok.find((x) => x.azonosito === megallapitasAzonosito);
  if (megallapitas !== undefined) {
    const brandSor = riport.brandAzonosito === undefined ? undefined : t.brand(m.hatokor, riport.brandAzonosito);
    const jelolt = jeloltetKepez({
      visszajelzes,
      megallapitas: {
        azonosito: megallapitas.azonosito,
        szabalyKod: megallapitas.szabalyKod,
        jelKodok: megallapitas.jelKodok,
        idezet: megallapitas.idezet,
        bizonyitekSzint: megallapitas.bizonyitekSzint,
      },
      futasAzonosito: riport.futasAzonosito,
      sajatNevek: [
        ...(brandSor === undefined ? [] : [brandSor.nev]),
        ...(brandSor?.profil.alapadatok.domainek ?? []),
      ],
      tanulasiReszvetel: process.env.TANULASI_RESZVETEL !== "ki",
    });
    if (jelolt !== undefined) t.jeloltetMent(jelolt);
  }

  revalidatePath(`/riportok/${riportAzonosito}`);
}

export async function megvalositastJelol(formData: FormData): Promise<void> {
  const m = await menesztVagyBelepes();
  const riportAzonosito = String(formData.get("riport") ?? "");
  tar().megvalositastMent(
    m.hatokor,
    riportAzonosito,
    String(formData.get("javaslat") ?? ""),
    "megvalositva",
    most(),
    m.tagsag.felhasznaloAzonosito,
  );
  revalidatePath(`/riportok/${riportAzonosito}`);
}

/* ---------- HUM-kapu ---------- */

export async function humDontes(formData: FormData): Promise<void> {
  const m = await menesztVagyBelepes();
  if (m.tagsag.szerep !== "tulajdonos" && m.tagsag.szerep !== "platform_admin") redirect("/");
  const riportAzonosito = String(formData.get("riport") ?? "");
  const dontes = String(formData.get("dontes") ?? "jovahagy");
  tar().riportStatusz(riportAzonosito, dontes === "jovahagy" ? "kesz" : "ellenorzes_alatt");
  revalidatePath("/admin");
}

/* ---------- Kérdezz (W4) ---------- */

export async function kerdestFeltesz(formData: FormData): Promise<void> {
  const m = await menesztVagyBelepes();
  const t = tar();
  const kerdes = String(formData.get("kerdes") ?? "").trim();
  if (kerdes === "") redirect("/kerdezz?hiba=ures");

  const brandAzonosito = await aktivBrandAzonosito(m.hatokor);
  const muvelet: Muvelet = { tipus: "kerdes_mely" };
  const futasAzonosito = azonosito("f");

  const inditas = inditastEllenoriz({
    tag: m.tagsag,
    cel: {
      szervezetAzonosito: m.tagsag.szervezetAzonosito,
      ...(brandAzonosito === undefined ? {} : { brandAzonosito }),
    },
    mod: "kerdezz",
    csomag: m.csomag,
    muvelet,
    fokonyv: fokonyv(m.hatokor),
    futasAzonosito,
    mikor: most(),
  });

  if (inditas.dontes !== "indulhat" || inditas.terheles === undefined) {
    redirect(`/kerdezz?hiba=${inditas.dontes}&uzenet=${encodeURIComponent(inditas.uzenet)}`);
  }
  t.kreditetMent([inditas.terheles]);

  const osztalyozas = kerdestOsztalyoz(kerdes, brandAzonosito === undefined ? {} : { brandAzonosito });
  const tetelek = tudasbazisbolKeres(kerdes, DEMO_TUDASBAZIS).map((x) => ({
    azonosito: x.azonosito,
    tipus: x.tipus === "szabaly" ? ("szabaly" as const) : ("technika" as const),
    kulcsallitas: x.kulcsallitas,
    bizonyitekero: x.bizonyitekero,
    karantenos: x.karantenos,
    relevancia: x.relevancia,
    agazat: x.agazat,
    felulet: x.felulet,
    szamok: x.szamok,
  }));

  const visszakereses = forrasokatSzur(tetelek, { topK: 5 });
  const brandSor = brandAzonosito === undefined ? undefined : t.brand(m.hatokor, brandAzonosito);

  // Az alternatívák a szabály három variánsából jönnek, nem forrásonként egyből:
  // „egy javaslat nem javaslat" (brandbook 3), és a variánsok épp erre valók.
  const elso = visszakereses.hasznalhato[0];
  const elsoSzabaly =
    elso === undefined ? undefined : DEMO_TUDASBAZIS.szabalyok.find((x) => x.kod === elso.azonosito);

  const kartya = visszakereses.hianyAg
    ? hianyKartya(kerdes, [
        "Egy A/B-teszt a saját felületeden, két hétig, azonos forgalommal.",
        "A meglévő anyagok auditja: a mintázat a saját adataidon látszik.",
      ])
    : {
        rovidValasz: [
          { szoveg: elso?.kulcsallitas ?? "", forrasAzonositok: [elso?.azonosito ?? ""] },
        ],
        technikak: visszakereses.hasznalhato
          .filter((x) => x.tipus === "technika")
          .slice(0, 3)
          .map((x) => ({
            kod: x.azonosito,
            nev: x.kulcsallitas.split(":")[0] ?? x.azonosito,
            mechanizmus: x.kulcsallitas,
            forrasAzonositok: [x.azonosito],
          })),
        bizonyitek: bizonyitekBlokkot(visszakereses.hasznalhato),
        alternativak:
          elsoSzabaly === undefined
            ? visszakereses.hasznalhato.slice(0, 3).map((x, i) => ({
                cim: ["Konzervatív", "Bátrabb", "Kísérleti"][i] ?? "Alternatíva",
                leiras: x.kulcsallitas,
                forrasAzonositok: [x.azonosito],
              }))
            : [
                { cim: "Konzervatív", leiras: elsoSzabaly.variansok.konzervativ, forrasAzonositok: [elsoSzabaly.kod] },
                { cim: "Bátrabb", leiras: elsoSzabaly.variansok.batrabb, forrasAzonositok: [elsoSzabaly.kod] },
                { cim: "Kísérleti", leiras: elsoSzabaly.variansok.kiserleti, forrasAzonositok: [elsoSzabaly.kod] },
              ],
        amitNemTudunk: [
          "A demó tudásbázis nem tartalmaz mért hatásokat; a hatásmértékek a Notion-szinkron után jelennek meg.",
          ...(visszakereses.hasznalhato.some((x) => x.tipus === "technika")
            ? []
            : ["A küszöb felett nem volt önálló technika-tétel, ezért a technikák blokk üres."]),
        ],
        kovetkezoLepesek: [{ cim: "Indíts auditot erre a felületre", muvelet: "audit" as const }],
        hianyKimondas: false,
      };

  const ellenorzes = valasztEllenoriz(kartya, visszakereses);

  const beszelgetesAzonosito = azonosito("q");
  t.beszelgetestMent(
    m.hatokor,
    beszelgetesAzonosito,
    "kerdezz",
    {
      kerdes,
      osztalyozas,
      kartya,
      ellenorzes,
      forrasok: visszakereses.hasznalhato,
      kizart: visszakereses.kizart,
      brandNev: brandSor?.nev,
      tudasbazisVerzio: DEMO_TUDASBAZIS.verzio,
    },
    most(),
    undefined,
    brandAzonosito,
  );

  redirect(`/kerdezz?valasz=${beszelgetesAzonosito}`);
}

/* ---------- Tanács (W3) ---------- */

export async function tanacsotIndit(formData: FormData): Promise<void> {
  const m = await menesztVagyBelepes();
  const mondat = String(formData.get("mondat") ?? "").trim();
  if (mondat === "") redirect("/tanacs?hiba=ures");

  const felismeres = tipustFelismer(mondat);
  const beszelgetesAzonosito = azonosito("t");
  const brandAzonosito = await aktivBrandAzonosito(m.hatokor);

  tar().beszelgetestMent(
    m.hatokor,
    beszelgetesAzonosito,
    "tanacs",
    { mondat, felismeres, mezok: {}, valaszok: [] },
    most(),
    undefined,
    brandAzonosito,
  );

  redirect(`/tanacs?szal=${beszelgetesAzonosito}`);
}

export async function tanacsMezotMent(formData: FormData): Promise<void> {
  const m = await menesztVagyBelepes();
  const t = tar();
  const szal = String(formData.get("szal") ?? "");
  const allapot = t.beszelgetes<{
    mondat: string;
    felismeres: ReturnType<typeof tipustFelismer>;
    mezok: Record<string, string>;
  }>(m.hatokor, szal);
  if (allapot === undefined) redirect("/tanacs");

  const mezo = String(formData.get("mezo") ?? "");
  const ertek = String(formData.get("ertek") ?? "").trim();
  const tipus = String(formData.get("tipus") ?? "");

  const mezok = { ...allapot.mezok };
  if (mezo !== "" && ertek !== "") mezok[mezo] = ertek;

  const felismeres =
    tipus === ""
      ? allapot.felismeres
      : { ...allapot.felismeres, tipus: tipus as KonstrukcioTipus, kerdezniKell: false, kerdes: undefined };

  t.beszelgetestMent(m.hatokor, szal, "tanacs", { ...allapot, felismeres, mezok }, most());
  revalidatePath("/tanacs");
}

export async function tanacsotValidal(formData: FormData): Promise<void> {
  const m = await menesztVagyBelepes();
  const t = tar();
  const szal = String(formData.get("szal") ?? "");
  const allapot = t.beszelgetes<{
    mondat: string;
    felismeres: ReturnType<typeof tipustFelismer>;
    mezok: Record<string, string>;
  }>(m.hatokor, szal);
  if (allapot === undefined || allapot.felismeres.tipus === undefined) redirect("/tanacs");

  const brandAzonosito = await aktivBrandAzonosito(m.hatokor);
  const muvelet: Muvelet = { tipus: "intent_validalas" };
  const futasAzonosito = azonosito("f");

  const inditas = inditastEllenoriz({
    tag: m.tagsag,
    cel: {
      szervezetAzonosito: m.tagsag.szervezetAzonosito,
      ...(brandAzonosito === undefined ? {} : { brandAzonosito }),
    },
    mod: "tanacs",
    csomag: m.csomag,
    muvelet,
    fokonyv: fokonyv(m.hatokor),
    futasAzonosito,
    mikor: most(),
  });
  if (inditas.dontes !== "indulhat" || inditas.terheles === undefined) {
    redirect(`/tanacs?szal=${szal}&hiba=${inditas.dontes}&uzenet=${encodeURIComponent(inditas.uzenet)}`);
  }
  t.kreditetMent([inditas.terheles]);

  // Projekt a tervhez — az idővonal ettől kezdve összeköti az iterációkat.
  let projektAzonosito = azonosito("p");
  if (brandAzonosito === undefined) redirect("/brandek?hiba=nincs-brand");
  t.projektetMent({
    azonosito: projektAzonosito,
    szervezetAzonosito: m.tagsag.szervezetAzonosito,
    brandAzonosito,
    nev: allapot.mondat.slice(0, 60),
    tipus: "terv",
    statusz: "aktiv",
    letrehozva: most(),
    utolsoAktivitas: most(),
  });

  const validacio = tervetValidal({
    konstrukcioTipus: KONSTRUKCIO_NEVEK[allapot.felismeres.tipus],
    mezok: allapot.mezok,
    tudasbazis: DEMO_TUDASBAZIS,
  });

  const futas: Futas = {
    azonosito: futasAzonosito,
    projektAzonosito,
    mod: "tanacs",
    inditotta: m.tagsag.felhasznaloAzonosito,
    inditva: most(),
    statusz: "kesz",
    tudasbazisVerzio: DEMO_TUDASBAZIS.verzio,
    promptVerzio: DETEKTOR.promptVerzio,
    detVerzio: DETEKTOR.detVerzio,
    modell: DETEKTOR.modell,
    kreditKoltseg: ar(muvelet).osszesen,
  };
  t.futastMent(m.hatokor, futas, brandAzonosito);

  const riportAzonosito = azonosito("r");
  const brandSor = t.brand(m.hatokor, brandAzonosito);

  t.riportotMent(
    m.hatokor,
    {
      azonosito: riportAzonosito,
      futasAzonosito,
      projektAzonosito,
      verzio: 1,
      keszult: most(),
      mod: "tanacs",
      statusz: "kesz",
      megallapitasok: validacio.megallapitasok,
      javaslatok: validacio.javaslatok,
      tisztazoKerdesek: [],
    },
    brandAzonosito,
    {
      osszefoglalo: validacio.osszefoglalo,
      masthead: {
        cim: `Előzetes validáció — ${KONSTRUKCIO_NEVEK[allapot.felismeres.tipus]}`,
        forras: allapot.mondat,
        brandNev: brandSor?.nev,
        tudasbazisVerzio: DEMO_TUDASBAZIS.verzio,
        detektorVerzio: `${DETEKTOR.detVerzio} · prompt ${DETEKTOR.promptVerzio} · ${DETEKTOR.modell}`,
      },
      savok: [
        { nev: "Jogi KO", allapot: validacio.kockazatok.some((k) => k.sav === "0 Jogi KO") ? "hibas" : "ok", ertek: validacio.kockazatok.filter((k) => k.sav === "0 Jogi KO").length === 0 ? "0 · üres" : "vizsgálandó" },
        { nev: "Etikai KO", allapot: validacio.kockazatok.some((k) => k.sav === "1 Etikai KO") ? "hibas" : "ok", ertek: `${validacio.kockazatok.filter((k) => k.sav === "1 Etikai KO").length}` },
        { nev: "Mérési", allapot: (allapot.mezok.meres ?? "") === "" ? "reszleges" : "ok", ertek: (allapot.mezok.meres ?? "") === "" ? "nincs megadva" : "megvan" },
        { nev: "Hatásosság", allapot: validacio.javaslatok.length === 0 ? "ok" : "reszleges", ertek: `${validacio.javaslatok.length} javaslat` },
      ],
      pozitivak: validacio.jolTalaltatok.map((x, i) => ({ kod: `POZ-T${i + 1}`, cim: x, idezet: "" })),
      megallapitasok: validacio.megallapitasok,
      javaslatok: validacio.javaslatok,
      brandEgyezes: { vanProfil: brandSor !== undefined, keszultseg: undefined, tetelek: [], osszefoglalo: "" },
      kerdesek: [],
      korlatok: ["Terv-validáció: a rendszer csak azt látja, amit leírtatok."],
      epitesiSorrend: validacio.epitesiSorrend,
      naplo: [],
      // A terv-riportban a KO-kapu tartja vissza a javaslatot, nem a brand-őr — a
      // lebeszélés magában a javaslat szövegében áll. A brand-őr mezőjét ezért nem
      // töltjük: két különböző visszatartást nem mondunk egyféleképpen.
      visszakuldottJavaslatok: [],
    } as never,
  );

  redirect(`/riportok/${riportAzonosito}`);
}
