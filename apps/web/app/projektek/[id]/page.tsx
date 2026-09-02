import Link from "next/link";
import { notFound } from "next/navigation";
import { Hej } from "@/components/hej";
import { idovonal } from "@meggyozes/projekt";
import { projektetLezar } from "@/lib/muveletek";
import { menesztVagyBelepes, tar } from "@/lib/tar";

export default async function ProjektOldal({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await menesztVagyBelepes();
  const t = tar();
  const projekt = t.projekt(m.hatokor, id);
  if (projekt === undefined) notFound();

  const artefaktumok = t.artefaktumok(m.hatokor, id);
  const futasok = t.futasok(m.hatokor, id);
  const riportok = t.riportok(m.hatokor, id);
  const brand = t.brand(m.hatokor, projekt.brandAzonosito);

  const elemek = idovonal({
    artefaktumok,
    futasok,
    riportok: riportok.map((r) => ({ ...r })),
  });

  const riportAzonositok = new Set(riportok.map((r) => r.azonosito));

  return (
    <Hej aktiv="/projektek">
      <div className="oldalfej">
        <span className="eyebrow">Projekt · {brand?.nev ?? "nincs brand"}</span>
        <div className="oldalfej__sor">
          <h1>{projekt.nev}</h1>
          <div className="sor">
            <Link className="gomb gomb--mod" href={`/audit?projekt=${projekt.azonosito}`}>
              Audit ebbe a projektbe
            </Link>
            {projekt.statusz === "aktiv" ? (
              <form action={projektetLezar}>
                <input type="hidden" name="projekt" value={projekt.azonosito} />
                <button className="gomb gomb--halk" type="submit">
                  Lezárás
                </button>
              </form>
            ) : (
              <span className="badge badge--semleges">lezárt</span>
            )}
          </div>
        </div>
      </div>

      <section className="oszlop">
        <span className="eyebrow">Idővonal</span>
        {elemek.length === 0 ? (
          <div className="ures">
            <h2>Még nincs semmi ezen az idővonalon</h2>
            <p className="small">Indíts egy auditot ebbe a projektbe, és minden futás ide kerül.</p>
          </div>
        ) : (
          <div className="kartya" style={{ padding: 0, overflow: "hidden" }}>
            <table className="tabla">
              <tbody>
                {elemek.map((e) => (
                  <tr key={`${e.tipus}-${e.azonosito}`}>
                    <td style={{ width: 110 }} className="small nums">
                      {e.mikor === "" ? "—" : e.mikor.slice(0, 16).replace("T", " ")}
                    </td>
                    <td>
                      {riportAzonositok.has(e.azonosito) ? (
                        <Link href={`/riportok/${e.azonosito}`}>{e.cim}</Link>
                      ) : (
                        e.cim
                      )}
                    </td>
                    <td className="small">{e.reszlet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Hej>
  );
}
