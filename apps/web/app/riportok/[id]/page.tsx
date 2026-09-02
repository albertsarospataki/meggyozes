import Link from "next/link";
import { notFound } from "next/navigation";
import { Hej } from "@/components/hej";
import { MegallapitasKartya, Savok } from "@/components/riport";
import { DEMO_TUDASBAZIS } from "@meggyozes/motor";
import { menesztVagyBelepes, tar } from "@/lib/tar";

/**
 * A riport (brief 3.3 anatómia, brandbook 8.3–8.4).
 *
 * A sorrend kötött, és a legfontosabb eleme az első: a 20–40 másodperces, köznyelvi
 * összefoglaló. A korlátok közvetlenül utána jönnek — a rendszer a korlátait a riport
 * ELEJÉN mondja ki, nem a végén (katalógus H.1). A vezetői kokpit négy külön mérő,
 * összpontszám nélkül.
 */
export default async function RiportOldal({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await menesztVagyBelepes();
  const t = tar();
  const riport = t.riport(m.hatokor, id);
  if (riport === undefined) notFound();

  const tartalom = riport.tartalom as typeof riport.tartalom & {
    korlatok?: readonly string[];
    naplo?: readonly string[];
    visszakuldottJavaslatok?: readonly string[];
    epitesiSorrend?: readonly { sorszam: number; cim: string; miert: string }[];
  };

  const javaslatMegallapitasra = new Map(tartalom.javaslatok.map((j) => [j.megallapitasAzonosito, j]));
  const cimek = new Map(DEMO_TUDASBAZIS.szabalyok.map((s) => [s.kod, s.cim]));
  const visszakuldott = new Set(tartalom.visszakuldottJavaslatok ?? []);
  const visszajelzesek = t.visszajelzesek(m.hatokor, riport.azonosito);
  const top5 = [...tartalom.javaslatok].sort((a, b) => a.rangsor - b.rangsor).slice(0, 5);
  const egyeb = tartalom.megallapitasok.filter(
    (x) => !top5.some((j) => j.megallapitasAzonosito === x.azonosito),
  );

  const brandEgyezes = tartalom.brandEgyezes as {
    vanProfil: boolean;
    osszefoglalo: string;
    tetelek?: readonly { szempont: string; allapot: string; uzenet: string }[];
  };

  return (
    <Hej aktiv="/riportok">
      {/* 1 — összefoglaló köznyelven, kód nélkül */}
      <div className="oldalfej">
        <span className="eyebrow">{riport.mod === "audit" ? "Audit-riport" : "Előzetes validáció"}</span>
        <h1>{tartalom.masthead.cim}</h1>
        <p className="lead olvaso">{tartalom.osszefoglalo}</p>
      </div>

      {/* 2 — masthead és korlátok: a korlát elöl hitelesít */}
      <div className="kartya kartya--sik">
        <div className="sor">
          {tartalom.masthead.brandNev === undefined ? (
            <span className="chip">nincs brand-profil</span>
          ) : (
            <span className="chip">brand: {tartalom.masthead.brandNev}</span>
          )}
          <span className="chip">{tartalom.masthead.forras}</span>
          <span className="chip">{riport.keszult.slice(0, 10)}</span>
          <span className="chip chip--kod">{tartalom.masthead.tudasbazisVerzio}</span>
          <span className="chip chip--kod">{tartalom.masthead.detektorVerzio}</span>
          {riport.statusz === "ellenorzes_alatt" ? (
            <span className="badge badge--jelzes">szakértői ellenőrzés alatt</span>
          ) : null}
        </div>
        {(tartalom.korlatok ?? []).length > 0 ? (
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {(tartalom.korlatok ?? []).map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* 3 — vezetői kokpit: négy sáv, összpontszám nélkül */}
      <section className="oszlop">
        <span className="eyebrow">Vezetői kokpit</span>
        <Savok savok={tartalom.savok} />
      </section>

      {/* 4 — pozitív visszaigazolás: kötelező blokk */}
      {tartalom.pozitivak.length > 0 ? (
        <section className="oszlop">
          <span className="eyebrow">Ami már működik</span>
          <div className="racs racs--2">
            {tartalom.pozitivak.map((p) => (
              <div className="kartya kartya--sik" key={p.kod}>
                <span className="badge badge--ok">Működik</span>
                <h3>{p.cim}</h3>
                {p.idezet === "" ? null : <p className="small">„{p.idezet}"</p>}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 5 — top 5 javaslat */}
      <section className="oszlop">
        <span className="eyebrow">Top {top5.length} javaslat</span>
        {top5.length === 0 ? (
          <div className="kartya kartya--sik">
            <p>Nincs javaslat: az anyagon nem találtam olyan mintázatot, amin változtatni kellene.</p>
          </div>
        ) : (
          top5.map((j) => {
            const megallapitas = tartalom.megallapitasok.find((x) => x.azonosito === j.megallapitasAzonosito);
            if (megallapitas === undefined) return null;
            return (
              <MegallapitasKartya
                key={j.azonosito}
                megallapitas={megallapitas}
                javaslat={j}
                riportAzonosito={riport.azonosito}
                cim={cimek.get(megallapitas.szabalyKod) ?? megallapitas.szabalyKod}
                visszakuldott={visszakuldott.has(j.azonosito)}
              />
            );
          })
        )}
      </section>

      {/* 6 — brand-egyezés */}
      {brandEgyezes.osszefoglalo === "" ? null : (
      <section className="oszlop">
        <span className="eyebrow">Brand-egyezés</span>
        <div className="kartya kartya--sik">
          <p>{brandEgyezes.osszefoglalo}</p>
          {(brandEgyezes.tetelek ?? []).length > 0 ? (
            <table className="tabla">
              <tbody>
                {(brandEgyezes.tetelek ?? []).map((x) => (
                  <tr key={x.szempont}>
                    <td style={{ width: 130 }}>{x.szempont}</td>
                    <td>
                      <span
                        className={`badge ${
                          x.allapot === "egyezik" ? "badge--ok" : x.allapot === "elter" ? "badge--hibas" : "badge--semleges"
                        }`}
                      >
                        {x.allapot}
                      </span>
                    </td>
                    <td className="small">{x.uzenet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </section>
      )}

      {/* 7 — építési sorrend (tanácsnál kötelező) */}
      {(tartalom.epitesiSorrend ?? []).length > 0 ? (
        <section className="oszlop">
          <span className="eyebrow">Építési sorrend</span>
          <div className="kartya kartya--sik">
            <ol className="oszlop" style={{ gap: 10, margin: 0, paddingLeft: 18 }}>
              {(tartalom.epitesiSorrend ?? []).map((l) => (
                <li key={l.sorszam}>
                  <strong>{l.cim}</strong>
                  <div className="small">{l.miert}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* 8 — szakértői tábla */}
      {egyeb.length > 0 ? (
        <section className="oszlop">
          <span className="eyebrow">Szakértői tábla</span>
          <div className="kartya" style={{ padding: 0, overflow: "hidden" }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Kód</th>
                  <th>Megállapítás</th>
                  <th>Idézet</th>
                  <th>Fokozat</th>
                </tr>
              </thead>
              <tbody>
                {egyeb.map((x) => (
                  <tr key={x.azonosito}>
                    <td className="mono">{x.szabalyKod}</td>
                    <td>{cimek.get(x.szabalyKod) ?? "—"}</td>
                    <td className="small">„{x.idezet}"</td>
                    <td className="small">{x.bizonyitekSzint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* 9 — tisztázó kérdések */}
      {tartalom.kerdesek.length > 0 ? (
        <section className="oszlop">
          <span className="eyebrow">Tisztázó kérdések</span>
          <div className="kartya kartya--sik">
            <p className="small">
              Ezekkel pontosabb lesz a következő futás. A válaszok után a riport érintett részei
              újrafuthatnak (2 kredit).
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {tartalom.kerdesek.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* 10 — lábléc */}
      <footer className="lablec">
        <span>gépi elemzés</span>
        <span>detektor {tartalom.masthead.detektorVerzio}</span>
        <span>tudásbázis {tartalom.masthead.tudasbazisVerzio}</span>
        <span>nem jogi tanácsadás</span>
        <span>{visszajelzesek.length} visszajelzés</span>
        <Link href={`/projektek/${riport.projektAzonosito}`}>projekt idővonala</Link>
      </footer>
    </Hej>
  );
}
