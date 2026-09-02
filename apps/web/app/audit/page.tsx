import { Hej } from "@/components/hej";
import { ar, arElonezet } from "@meggyozes/szervezet";
import { auditotIndit } from "@/lib/muveletek";
import { aktivBrandAzonosito, fokonyv, menesztVagyBelepes, tar } from "@/lib/tar";

/**
 * Audit indítása (brief 3.2, brandbook 8.2).
 *
 * Három lépés: ajtó → kontextus (P0, a brand-profilból előtöltve) → kredit-előnézet.
 * A kérdés a termék része, nem hibaüzenet: minden mező opcionális, de a hiányt a
 * riport kimondja, és a tisztázó kérdések között visszakérdez.
 */
export default async function Audit({
  searchParams,
}: {
  readonly searchParams: Promise<{ hiba?: string; uzenet?: string; projekt?: string }>;
}) {
  const { hiba, uzenet, projekt } = await searchParams;
  const m = await menesztVagyBelepes();
  const t = tar();
  const brandek = t.brandek(m.hatokor);
  const aktiv = await aktivBrandAzonosito(m.hatokor);
  const brand = brandek.find((b) => b.azonosito === aktiv);
  const egyenleg = fokonyv(m.hatokor);
  const projektek = t.projektek(m.hatokor).filter((p) => p.statusz === "aktiv");

  const urlAr = ar({ tipus: "audit_url" });
  const szovegAr = ar({ tipus: "audit_szoveg" });

  return (
    <Hej aktiv="/audit">
      <div className="oldalfej">
        <span className="eyebrow">Audit · kész anyag</span>
        <div className="oldalfej__sor">
          <h1>Mit nézzünk meg?</h1>
          <span className="small nums">{egyenleg.osszesen} kredit</span>
        </div>
        <p className="lead olvaso">
          Egy URL vagy a beillesztett szöveg elég. A riport megmondja, mely technikák dolgoznak az
          anyagon, mi működik, és mi legyen helyette — mindig alternatívákkal.
        </p>
      </div>

      {hiba !== undefined ? (
        <div className="kartya kartya--sik" style={{ borderColor: "var(--risk)" }}>
          <span className="badge badge--hibas">Nem indult el</span>
          <p>{uzenet ?? "A futás nem indítható."}</p>
        </div>
      ) : null}

      {brandek.length === 0 ? (
        <div className="ures">
          <h2>Előbb egy brand kell</h2>
          <p className="small">
            Brand nélkül tudunk auditálni, de a javaslatok általánosak maradnak. Tíz perc tanítás,
            és a szövegminták a te hangodon szólnak.
          </p>
          <a className="gomb gomb--elsodleges" href="/brandek">
            Brand létrehozása
          </a>
        </div>
      ) : null}

      <form action={auditotIndit} className="racs racs--2">
        <div className="kartya">
          <span className="eyebrow">1 · Ajtó</span>

          <div className="mezo">
            <label htmlFor="ajto">Bemenet</label>
            <select id="ajto" name="ajto" defaultValue="url">
              <option value="url">URL — a rendszer betölti az oldalt ({urlAr.osszesen} kredit)</option>
              <option value="szoveg">Szöveg — beillesztve ({szovegAr.osszesen} kredit)</option>
            </select>
          </div>

          <div className="mezo">
            <label htmlFor="url">Oldal címe</label>
            <input id="url" name="url" type="url" placeholder="https://pelda.hu/arak" />
            <span className="small">
              Ha az oldal nem érhető el, illeszd be a szövegét — a szöveges megállapítások ugyanúgy
              elkészülnek.
            </span>
          </div>

          <div className="mezo">
            <label htmlFor="szoveg">Vagy illeszd be a szöveget</label>
            <textarea id="szoveg" name="szoveg" placeholder="Az oldal vagy a levél szövege…" />
          </div>
        </div>

        <div className="kartya">
          <span className="eyebrow">2 · Kontextus</span>
          <p className="small">
            {brand === undefined
              ? "Nincs aktív brand — a mezők üresen indulnak."
              : `Előtöltve a(z) ${brand.nev} brand-profiljából. Ha valami nem stimmel, írd át.`}
          </p>

          <input type="hidden" name="brand" value={brand?.azonosito ?? ""} />

          <div className="mezo">
            <label htmlFor="uzletiModell">Kinek szól</label>
            <select id="uzletiModell" name="uzletiModell" defaultValue={brand?.profil.alapadatok.uzletiModell ?? ""}>
              <option value="">Nincs megadva</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
            </select>
          </div>

          <div className="mezo">
            <label htmlFor="agazat">Ágazat</label>
            <input id="agazat" name="agazat" type="text" defaultValue={brand?.profil.alapadatok.agazat ?? ""} placeholder="pl. e-kereskedelem" />
          </div>

          <div className="mezo">
            <label htmlFor="artefaktumCel">Az anyag célja</label>
            <select id="artefaktumCel" name="artefaktumCel" defaultValue="">
              <option value="">Nincs megadva</option>
              <option value="vasarlas">vásárlás</option>
              <option value="foglalas">foglalás</option>
              <option value="lead">lead</option>
              <option value="feliratkozas">feliratkozás</option>
              <option value="tajekoztatas">tájékoztatás</option>
            </select>
          </div>

          <div className="mezo">
            <label htmlFor="tolcserPozicio">Hol tart a látogató</label>
            <select id="tolcserPozicio" name="tolcserPozicio" defaultValue="">
              <option value="">Nincs megadva</option>
              <option value="hideg">hideg</option>
              <option value="meleg">meleg</option>
              <option value="visszatero">visszatérő</option>
            </select>
          </div>

          <div className="mezo">
            <label htmlFor="projekt">Projekt</label>
            <select id="projekt" name="projekt" defaultValue={projekt ?? ""}>
              <option value="">Új projekt az anyagról elnevezve</option>
              {projektek.map((p) => (
                <option key={p.azonosito} value={p.azonosito}>
                  {p.nev}
                </option>
              ))}
            </select>
          </div>

          <div className="oszlop" style={{ gap: 8 }}>
            <p className="small nums">{arElonezet(urlAr, egyenleg.osszesen)}</p>
            <button className="gomb gomb--mod" type="submit">
              Audit indítása
            </button>
            <p className="small">
              Futás közben elhagyhatod az oldalt. Ha a futás hibára fut, a kredit automatikusan
              visszaíródik.
            </p>
          </div>
        </div>
      </form>
    </Hej>
  );
}
