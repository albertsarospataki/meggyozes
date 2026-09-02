import { Hej } from "@/components/hej";
import { SZEREP_KEPESSEGEK } from "@meggyozes/szervezet";
import { menesztVagyBelepes, tar } from "@/lib/tar";

export default async function Csapat() {
  const m = await menesztVagyBelepes();
  const csapat = tar().csapat(m.hatokor);

  return (
    <Hej aktiv="/csapat">
      <div className="oldalfej">
        <span className="eyebrow">Csapat</span>
        <h1>Ki mit lát</h1>
        <p className="lead olvaso">
          Az Elemző és a Néző csak a kijelölt brandeket látja — ügynökségi használatra ez a minimum.
          A szerep és a brand-hozzáférés két külön kérdés.
        </p>
      </div>

      <div className="kartya" style={{ padding: 0, overflow: "hidden" }}>
        <table className="tabla">
          <thead>
            <tr>
              <th>Név</th>
              <th>E-mail</th>
              <th>Szerep</th>
              <th>Brand-hozzáférés</th>
              <th>Képességek</th>
            </tr>
          </thead>
          <tbody>
            {csapat.map((x) => (
              <tr key={x.felhasznalo.azonosito}>
                <td>{x.felhasznalo.nev}</td>
                <td className="small">{x.felhasznalo.email}</td>
                <td>
                  <span className="badge badge--semleges">{x.tagsag.szerep}</span>
                </td>
                <td className="small">
                  {x.tagsag.brandHozzaferes === "mind" ? "minden brand" : x.tagsag.brandHozzaferes.join(", ")}
                </td>
                <td className="small nums">{SZEREP_KEPESSEGEK[x.tagsag.szerep].length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="kartya kartya--sik">
        <span className="eyebrow">Meghívó</span>
        <p className="small">
          Az alfában a meghívás kódos: a kód birtokában a tulajdonosi fiókba lehet belépni. A
          több-felhasználós meghívó a fizetős nyitással érkezik (M6).
        </p>
      </div>
    </Hej>
  );
}
