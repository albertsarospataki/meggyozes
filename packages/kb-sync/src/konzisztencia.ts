import type { TudasbazisPillanatkep } from "@meggyozes/core";

/**
 * Szinkron utáni automatikus konzisztencia-ellenőrzés (C komponens, 3. szinkron-szabály).
 *
 * A cél nem a szépség, hanem a NÉMA KIESÉS megelőzése: a tudásbázis olyan hibái,
 * amelyek nem hibaüzenetként, hanem HIÁNYZÓ MEGÁLLAPÍTÁSKÉNT jelennének meg az
 * ügyfél riportjában. Ezek a legdrágább hibák, mert semmi nem jelzi őket.
 */

export type Sulyossag = "hiba" | "figyelmeztetes" | "informacio";

export interface KonzisztenciaLelet {
  readonly azonosito: string;
  readonly sulyossag: Sulyossag;
  readonly uzenet: string;
  /** Az érintett sorok kódjai — a javításhoz ennyi kell. */
  readonly erintettek: readonly string[];
}

export interface ArvaRelacio {
  readonly tar: string;
  readonly kod: string;
  readonly mezo: string;
  readonly ismeretlenIdk: readonly string[];
}

const MVP_MAG = "MVP-mag";

function lelet(
  azonosito: string,
  sulyossag: Sulyossag,
  uzenet: string,
  erintettek: readonly string[],
): KonzisztenciaLelet {
  return { azonosito, sulyossag, uzenet, erintettek };
}

export function konzisztenciatEllenoriz(
  p: TudasbazisPillanatkep,
  arvak: readonly ArvaRelacio[] = [],
): KonzisztenciaLelet[] {
  const leletek: KonzisztenciaLelet[] = [];
  const aktivSzabalyok = p.szabalyok.filter((sz) => sz.allapot === "Aktiv");

  // I8 — Artefaktum-hatókörű szabály jel nélkül.
  // Ilyen szabályt semmi nem hív elő: a jel→szabály úton soha nem kerül a riportba,
  // de a tárban élőnek látszik. Némán kiesne.
  const i8 = aktivSzabalyok.filter(
    (sz) => sz.hatokor === "Artefaktum" && sz.kivaltoJelek.length === 0,
  );
  if (i8.length > 0) {
    leletek.push(
      lelet(
        "I8",
        "figyelmeztetes",
        `${i8.length} aktív, artefaktum-hatókörű szabályhoz nincs kiváltó jel — ezek némán kiesnének az előhívásból.`,
        i8.map((sz) => sz.kod),
      ),
    );
  }

  // I12 — Felület és Artefaktum-osztály KÉT KÜLÖN DIMENZIÓ (kimondott elv, 2026-08-29).
  // Ha az egyik hiányzik, a P7 szűrés az adott dimenzió mentén vagy mindent átenged,
  // vagy mindent kizár — mindkettő rossz, és egyik sem látszik a riporton.
  const i12 = aktivSzabalyok.filter(
    (sz) =>
      sz.hatokor === "Artefaktum" &&
      (sz.felulet.length === 0 || sz.artefaktumOsztaly.length === 0),
  );
  if (i12.length > 0) {
    leletek.push(
      lelet(
        "I12",
        "figyelmeztetes",
        `${i12.length} aktív, artefaktum-hatókörű szabálynál hiányzik a Felület vagy az Artefaktum-osztály — a P7 szűrés e dimenzió mentén megbízhatatlan.`,
        i12.map((sz) => sz.kod),
      ),
    );
  }

  // FIGYELEM a mezőnév-ütközésre: az «Állapot» két különböző dolgot jelent.
  // A Szabálytárban és az Elvárás-listában ADATÉLETCIKLUS (Aktív / Karantén /
  // Visszavont), a Technikatárban viszont TARTALMI MINŐSÍTÉS (Aktív / Vitatott /
  // Kerülendő): a TK-001 «Hamis visszaszámláló» azért Kerülendő, mert a technika
  // maga kerülendő — az adat teljesen érvényes, és pont ezt kell detektálni.
  // A kettőt összekeverni azt jelentené, hogy a rendszer kizárja a sötét mintákat
  // a saját felismerési köréből.
  const nemAktivElvarasok = p.elvarasok.filter((e) => e.allapot !== "Aktiv");
  if (nemAktivElvarasok.length > 0) {
    leletek.push(
      lelet(
        "KARANTEN-ELVARAS",
        "informacio",
        `${nemAktivElvarasok.length} elvárás nem aktív állapotú — a hiány-detekcióból kimarad.`,
        nemAktivElvarasok.map((e) => e.kod),
      ),
    );
  }

  const karantenosSzabalyok = p.szabalyok.filter((sz) => sz.allapot === "Karanten");
  if (karantenosSzabalyok.length > 0) {
    leletek.push(
      lelet(
        "KARANTEN-SZABALY",
        "informacio",
        `${karantenosSzabalyok.length} szabály karanténban — ezekre épülő megállapítás nem adható ki, az előhívás kihagyja őket.`,
        karantenosSzabalyok.map((sz) => sz.kod),
      ),
    );
  }

  // A vitatott technika kiadható, de a riportnak jeleznie kell — ha egy MVP-szabály
  // ilyenre épül, azt a kiadás-előtti kapunak látnia kell.
  const vitatottTechnikak = new Set(
    p.technikak.filter((t) => t.allapot === "Vitatott").map((t) => t.kod),
  );
  const vitatottraEpulo = aktivSzabalyok.filter(
    (sz) => sz.mvpStatusz === MVP_MAG && sz.technikak.some((t) => vitatottTechnikak.has(t)),
  );
  if (vitatottraEpulo.length > 0) {
    leletek.push(
      lelet(
        "VITATOTT-TECHNIKA",
        "figyelmeztetes",
        `${vitatottraEpulo.length} MVP-mag szabály vitatott állapotú technikára épül — ezek megállapításai a kiadás-előtti emberi kapuba tartoznak.`,
        vitatottraEpulo.map((sz) => sz.kod),
      ),
    );
  }

  // Árva relációk: olyan hivatkozás, amely nem oldható fel kódra. A leképezés
  // kihagyná, tehát a szabály kevesebb jellel futna, mint amennyi a tárban áll.
  if (arvak.length > 0) {
    leletek.push(
      lelet(
        "ARVA-RELACIO",
        "hiba",
        `${arvak.length} sorban van feloldhatatlan reláció — a hivatkozott sor hiányzik a szinkronból vagy nincs kódja.`,
        arvak.map((a) => `${a.tar}/${a.kod}#${a.mezo}`),
      ),
    );
  }

  // MVP-mag lefedettség. A zárt alfa küszöbe mindhárom mutatóra 100% —
  // ez a mérés teszi a Baseline 3. blokkjának KPI-ját folyamatosan láthatóvá.
  const mvp = aktivSzabalyok.filter((sz) => sz.mvpStatusz === MVP_MAG);
  if (mvp.length > 0) {
    const jelNelkul = mvp.filter((sz) => sz.kivaltoJelek.length === 0);
    const technikaNelkul = mvp.filter((sz) => sz.technikak.length === 0);
    const kontextusNelkul = mvp.filter((sz) => sz.kotelezoKontextus.length === 0);

    const mutato = (hianyzo: number) => `${(((mvp.length - hianyzo) / mvp.length) * 100).toFixed(1)}%`;

    if (jelNelkul.length > 0) {
      leletek.push(
        lelet(
          "MVP-JEL",
          "figyelmeztetes",
          `MVP-mag jel-lefedettség: ${mutato(jelNelkul.length)} (${jelNelkul.length}/${mvp.length} szabálynál hiányzik). Az alfa-küszöb 100%.`,
          jelNelkul.map((sz) => sz.kod),
        ),
      );
    }
    if (technikaNelkul.length > 0) {
      leletek.push(
        lelet(
          "MVP-TECHNIKA",
          "figyelmeztetes",
          `MVP-mag technika-lefedettség: ${mutato(technikaNelkul.length)} (${technikaNelkul.length}/${mvp.length} szabálynál hiányzik). Az alfa-küszöb 100%.`,
          technikaNelkul.map((sz) => sz.kod),
        ),
      );
    }
    if (kontextusNelkul.length > 0) {
      leletek.push(
        lelet(
          "MVP-KONTEXTUS",
          "figyelmeztetes",
          `MVP-mag kontextus-lefedettség: ${mutato(kontextusNelkul.length)} (${kontextusNelkul.length}/${mvp.length} szabálynál hiányzik). Az alfa-küszöb 100%.`,
          kontextusNelkul.map((sz) => sz.kod),
        ),
      );
    }
  }

  // A hatásossági szabály javaslat nélkül nem tud javaslatot adni — az ügyfél
  // megkapja a problémát, de nem kapja meg a „mire cserélje" választ.
  const rosszJoNelkul = aktivSzabalyok.filter(
    (sz) => sz.sav === "3 Hatasossag es hiany" && !sz.rosszJo,
  );
  if (rosszJoNelkul.length > 0) {
    leletek.push(
      lelet(
        "ROSSZ-JO",
        "figyelmeztetes",
        `${rosszJoNelkul.length} hatásossági szabálynál hiányzik a «Rossz → jó» — ezekből nem születhet javaslat.`,
        rosszJoNelkul.map((sz) => sz.kod),
      ),
    );
  }

  // Az aranystandard nem teljes sorai nem futtathatók: a minőségi kapu szerint
  // csak a teljes sor lehet „Aktív teszt".
  const hianyosGold = p.aranystandard.filter(
    (t) => t.statusz === "Aktív teszt" && (!t.befagyasztottTartalom || !t.elvartKotelezo),
  );
  if (hianyosGold.length > 0) {
    leletek.push(
      lelet(
        "GOLD-HIANYOS",
        "hiba",
        `${hianyosGold.length} «Aktív teszt» aranystandard-sorból hiányzik a befagyasztott tartalom vagy a kötelező elvárás — ezek nem futtathatók.`,
        hianyosGold.map((t) => t.nev),
      ),
    );
  }

  return leletek;
}

/** Igaz, ha a pillanatkép élesíthető. Hiba szintű lelet blokkol. */
export function elesitheto(leletek: readonly KonzisztenciaLelet[]): boolean {
  return !leletek.some((l) => l.sulyossag === "hiba");
}
