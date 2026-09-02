import Link from "next/link";
import { Hej } from "@/components/hej";
import { menesztVagyBelepes, tar } from "@/lib/tar";

export default async function Riportok() {
  const m = await menesztVagyBelepes();
  const riportok = tar().riportok(m.hatokor);

  return (
    <Hej aktiv="/riportok">
      <div className="oldalfej">
        <span className="eyebrow">Riportok</span>
        <h1>Minden futás eredménye</h1>
      </div>

      {riportok.length === 0 ? (
        <div className="ures">
          <h2>Még nincs riport</h2>
          <p className="small">Indíts egy auditot egy URL-lel — egy perc, és lesz mit elolvasni.</p>
          <Link className="gomb gomb--mod" href="/audit">
            Audit indítása
          </Link>
        </div>
      ) : (
        <div className="kartya" style={{ padding: 0, overflow: "hidden" }}>
          <table className="tabla">
            <thead>
              <tr>
                <th>Anyag</th>
                <th>Mód</th>
                <th>Készült</th>
                <th>Megállapítás</th>
                <th>Állapot</th>
              </tr>
            </thead>
            <tbody>
              {riportok.map((r) => (
                <tr key={r.azonosito}>
                  <td>
                    <Link href={`/riportok/${r.azonosito}`}>{r.tartalom.masthead.cim}</Link>
                    <div className="small">{r.tartalom.masthead.forras}</div>
                  </td>
                  <td className="small">{r.mod}</td>
                  <td className="small nums">{r.keszult.slice(0, 10)}</td>
                  <td className="nums">{r.megallapitasok.length}</td>
                  <td>
                    <span className={`badge ${r.statusz === "kesz" ? "badge--ok" : "badge--jelzes"}`}>
                      {r.statusz === "kesz" ? "kész" : "szakértői ellenőrzés alatt"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Hej>
  );
}
