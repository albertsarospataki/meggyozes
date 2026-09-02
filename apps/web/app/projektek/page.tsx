import Link from "next/link";
import { Hej } from "@/components/hej";
import { aktivProjektek, archivaltProjektek } from "@meggyozes/projekt";
import { projektetLetrehoz } from "@/lib/muveletek";
import { aktivBrandAzonosito, menesztVagyBelepes, tar } from "@/lib/tar";

/** Az alapnézet csak az aktív projekteket mutatja; a lezártak az archívumban. */
export default async function Projektek() {
  const m = await menesztVagyBelepes();
  const t = tar();
  const osszes = t.projektek(m.hatokor);
  const brandek = t.brandek(m.hatokor);
  const aktivBrand = await aktivBrandAzonosito(m.hatokor);
  const aktivak = aktivProjektek(osszes);
  const archivak = archivaltProjektek(osszes);
  const riportok = t.riportok(m.hatokor);

  const sor = (p: (typeof osszes)[number]) => (
    <tr key={p.azonosito}>
      <td>
        <Link href={`/projektek/${p.azonosito}`}>{p.nev}</Link>
      </td>
      <td className="small">{brandek.find((b) => b.azonosito === p.brandAzonosito)?.nev ?? "—"}</td>
      <td className="small">{p.tipus}</td>
      <td className="nums">{riportok.filter((r) => r.projektAzonosito === p.azonosito).length}</td>
      <td className="small nums">{p.utolsoAktivitas.slice(0, 10)}</td>
    </tr>
  );

  return (
    <Hej aktiv="/projektek">
      <div className="oldalfej">
        <span className="eyebrow">Projektek</span>
        <h1>Ami összetartozik, egy helyen</h1>
        <p className="lead olvaso">
          Egy projektben az artefaktumok, a tervek, a beszélgetések és a riportok egy idővonalon
          futnak. A köteg-audit és az előtte/utána mérés csak itt értelmezhető.
        </p>
      </div>

      {aktivak.length === 0 ? (
        <div className="ures">
          <h2>Még nincs aktív projekt</h2>
          <p className="small">Egy audit automatikusan létrehoz egyet, vagy nyithatsz üreset.</p>
        </div>
      ) : (
        <div className="kartya" style={{ padding: 0, overflow: "hidden" }}>
          <table className="tabla">
            <thead>
              <tr>
                <th>Projekt</th>
                <th>Brand</th>
                <th>Típus</th>
                <th>Riport</th>
                <th>Utolsó aktivitás</th>
              </tr>
            </thead>
            <tbody>{aktivak.map(sor)}</tbody>
          </table>
        </div>
      )}

      <form action={projektetLetrehoz} className="kartya">
        <span className="eyebrow">Új projekt</span>
        <div className="racs racs--2">
          <div className="mezo">
            <label htmlFor="nev">Projekt neve</label>
            <input id="nev" name="nev" type="text" placeholder="pl. Őszi kampány" />
          </div>
          <div className="mezo">
            <label htmlFor="brand">Brand</label>
            <select id="brand" name="brand" defaultValue={aktivBrand ?? ""}>
              {brandek.map((b) => (
                <option key={b.azonosito} value={b.azonosito}>
                  {b.nev}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="gomb" type="submit">
          Létrehozás
        </button>
      </form>

      {archivak.length > 0 ? (
        <section className="oszlop">
          <span className="eyebrow">Archívum</span>
          <div className="kartya" style={{ padding: 0, overflow: "hidden" }}>
            <table className="tabla">
              <tbody>{archivak.map(sor)}</tbody>
            </table>
          </div>
        </section>
      ) : null}
    </Hej>
  );
}
