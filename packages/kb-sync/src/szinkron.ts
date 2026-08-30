import type { TudasbazisPillanatkep } from "@meggyozes/core";
import { TAR_FORRASOK, TAR_NEVEK, type TarNev } from "./forrasok.js";
import type { NotionForras, NotionOldal } from "./notion-kliens.js";
import {
  aranystandardotLekepez,
  diszkriminanstLekepez,
  elvarastLekepez,
  jeletLekepez,
  kodTerkepetEpit,
  kombinaciotLekepez,
  relacioIdk,
  szabalytLekepez,
  technikatLekepez,
  type KodTerkep,
} from "./lekepezes.js";
import { konzisztenciatEllenoriz, elesitheto, type ArvaRelacio, type KonzisztenciaLelet } from "./konzisztencia.js";

/** Melyik táron mely mezők hordoznak relációt — az árva-ellenőrzés ezeket járja be. */
const RELACIOS_MEZOK: Readonly<Record<TarNev, readonly string[]>> = {
  szabalytar: ["Kiváltó jelek", "Technika", "Elvárások"],
  jeltar: ["Kiváltott szabályok", "Technika", "Diszkrimináns tesztek"],
  technikatar: ["Jelek", "Szabályok"],
  diszkriminanstar: ["Melyik jelhez"],
  kombinaciotar: ["Együttálló jelek"],
  elvaraslista: ["Hiány-jel", "Tükör-szabály"],
  aranystandard: ["Elvárt jelek", "Elvárt technikák"],
};

export interface SzinkronEredmeny {
  readonly pillanatkep: TudasbazisPillanatkep;
  readonly leletek: readonly KonzisztenciaLelet[];
  readonly arvak: readonly ArvaRelacio[];
  readonly elesitheto: boolean;
  /** Tárankénti eltérés a várt darabszámtól — a néma adatvesztés jelzője. */
  readonly darabszamEltéresek: readonly string[];
}

/**
 * Feltérképezi a feloldhatatlan relációkat.
 *
 * Ez nem kozmetika: egy fel nem oldott «Kiváltó jel» azt jelenti, hogy a szabály
 * kevesebb jelre fog beindulni, mint amennyire a szerkesztő szánta — és ez a riportban
 * nem hibaként, hanem hiányzó megállapításként jelenne meg.
 */
export function arvaRelaciokatKeres(
  oldalankent: ReadonlyMap<TarNev, readonly NotionOldal[]>,
  terkep: KodTerkep,
): ArvaRelacio[] {
  const arvak: ArvaRelacio[] = [];
  for (const [tar, oldalak] of oldalankent) {
    const kodMezo = TAR_FORRASOK[tar].kodMezo;
    for (const oldal of oldalak) {
      const kod = terkep.get(oldal.id) ?? oldal.id;
      for (const mezo of RELACIOS_MEZOK[tar]) {
        const ismeretlenIdk = relacioIdk(oldal, mezo).filter((id) => !terkep.has(id));
        if (ismeretlenIdk.length > 0) {
          arvak.push({ tar, kod, mezo, ismeretlenIdk });
        }
      }
      void kodMezo;
    }
  }
  return arvak;
}

export interface SzinkronOpciok {
  readonly verzio: string;
  readonly most?: () => Date;
}

export async function szinkronizal(
  forras: NotionForras,
  opciok: SzinkronOpciok,
): Promise<SzinkronEredmeny> {
  const oldalankent = new Map<TarNev, NotionOldal[]>();
  for (const tar of TAR_NEVEK) {
    oldalankent.set(tar, await forras.osszesOldal(TAR_FORRASOK[tar].dataSourceId));
  }

  const terkep = kodTerkepetEpit(oldalankent);
  const oldalak = (tar: TarNev): NotionOldal[] => oldalankent.get(tar) ?? [];
  const nemUres = <T>(x: T | undefined): x is T => x !== undefined;

  const pillanatkep: TudasbazisPillanatkep = {
    verzio: opciok.verzio,
    keszult: (opciok.most?.() ?? new Date()).toISOString(),
    szabalyok: oldalak("szabalytar").map((o) => szabalytLekepez(o, terkep)).filter(nemUres),
    jelek: oldalak("jeltar").map((o) => jeletLekepez(o, terkep)).filter(nemUres),
    technikak: oldalak("technikatar").map((o) => technikatLekepez(o, terkep)).filter(nemUres),
    diszkriminansok: oldalak("diszkriminanstar").map((o) => diszkriminanstLekepez(o, terkep)).filter(nemUres),
    kombinaciok: oldalak("kombinaciotar").map((o) => kombinaciotLekepez(o, terkep)).filter(nemUres),
    elvarasok: oldalak("elvaraslista").map((o) => elvarastLekepez(o, terkep)).filter(nemUres),
    aranystandard: oldalak("aranystandard").map((o) => aranystandardotLekepez(o)).filter(nemUres),
  };

  const arvak = arvaRelaciokatKeres(oldalankent, terkep);
  const leletek = konzisztenciatEllenoriz(pillanatkep, arvak);

  // A várt darabszámtól való eltérés a néma adatvesztés legkorábbi jelzője:
  // ha a szinkron 4453 helyett 100 szabályt hoz, azt itt kell észrevenni, nem a riportban.
  const kapott: Record<TarNev, number> = {
    szabalytar: pillanatkep.szabalyok.length,
    jeltar: pillanatkep.jelek.length,
    technikatar: pillanatkep.technikak.length,
    diszkriminanstar: pillanatkep.diszkriminansok.length,
    kombinaciotar: pillanatkep.kombinaciok.length,
    elvaraslista: pillanatkep.elvarasok.length,
    aranystandard: pillanatkep.aranystandard.length,
  };
  const darabszamEltéresek = TAR_NEVEK.flatMap((tar) => {
    const vart = TAR_FORRASOK[tar].vartDarab;
    if (vart === 0) return [];
    const most = kapott[tar];
    // 10%-nál nagyobb zsugorodás gyanús; a növekedés természetes (a tár él).
    return most < vart * 0.9
      ? [`${TAR_FORRASOK[tar].cim}: ${most} sor jött, a várt ~${vart} helyett.`]
      : [];
  });

  return { pillanatkep, leletek, arvak, elesitheto: elesitheto(leletek), darabszamEltéresek };
}
