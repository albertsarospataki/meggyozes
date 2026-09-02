import { Hej } from "@/components/hej";
import { ar } from "@meggyozes/szervezet";
import { kerdestFeltesz } from "@/lib/muveletek";
import { fokonyv, menesztVagyBelepes, tar } from "@/lib/tar";

/**
 * Kérdezz (brief 3.2, brandbook 8.6).
 *
 * Nem chat: a válasz hat kötött blokkból áll, minden állítás mellett forrás, és ha a
 * tudásbázisban nincs mért eredmény, a rendszer ezt mondja ki — azzal együtt, mit
 * lehetne megmérni hozzá.
 */
export default async function Kerdezz({
  searchParams,
}: {
  readonly searchParams: Promise<{ valasz?: string; hiba?: string; uzenet?: string }>;
}) {
  const { valasz, hiba, uzenet } = await searchParams;
  const m = await menesztVagyBelepes();
  const t = tar();
  const egyenleg = fokonyv(m.hatokor);

  type Allapot = {
    kerdes: string;
    osztalyozas: { osztaly: string; indoklas: string };
    kartya: {
      rovidValasz: { szoveg: string; forrasAzonositok: string[] }[];
      technikak: { kod: string; nev: string; mechanizmus: string }[];
      bizonyitek: { forrasAzonosito: string; bizonyitekero: number | undefined; kontextus: string; mertek: string | undefined }[];
      alternativak: { cim: string; leiras: string }[];
      amitNemTudunk: string[];
      kovetkezoLepesek: { cim: string; muvelet: string }[];
      hianyKimondas: boolean;
    };
    ellenorzes: { kiadhato: boolean; kifogasok: { szabaly: string; reszlet: string }[] };
    kizart: { tetel: { azonosito: string }; ok: string }[];
    tudasbazisVerzio: string;
  };

  const allapot = valasz === undefined ? undefined : t.beszelgetes<Allapot>(m.hatokor, valasz);

  return (
    <Hej aktiv="/kerdezz">
      <div className="oldalfej">
        <span className="eyebrow">Kérdezz · tudástár-kérdezés</span>
        <div className="oldalfej__sor">
          <h1>Kérdezz bármit a meggyőzésről</h1>
          <span className="small nums">{ar({ tipus: "kerdes_mely" }).osszesen} kredit / kérdés</span>
        </div>
        <p className="lead olvaso">
          Nem chatbot: a válasz csak forrásolt tételekből épülhet. Ha a tudásbázisban nincs rá mért
          eredmény, azt mondom meg — és azt is, mit lehetne megmérni.
        </p>
      </div>

      {hiba !== undefined ? (
        <div className="kartya kartya--sik" style={{ borderColor: "var(--risk)" }}>
          <span className="badge badge--hibas">Nem futott le</span>
          <p>{uzenet ?? "A kérdés nem futtatható."}</p>
        </div>
      ) : null}

      <form action={kerdestFeltesz} className="kartya">
        <div className="mezo">
          <label htmlFor="kerdes">A kérdésed</label>
          <input
            id="kerdes"
            name="kerdes"
            type="text"
            defaultValue={allapot?.kerdes ?? ""}
            placeholder="Mikor működik a visszaszámláló, és mikor árt?"
          />
          <span className="small">
            Példák: „Százalék vagy ajándék legyen a hírlevélben?" · „Mit változtassunk elsőként a
            landingen?" · „Mikor árt a készlet-szűkösség?"
          </span>
        </div>
        <div className="sor sor--kozott">
          <span className="small nums">Egyenleg: {egyenleg.osszesen} kredit</span>
          <button className="gomb gomb--mod" type="submit">
            Kérdezz
          </button>
        </div>
      </form>

      {allapot === undefined ? null : (
        <section className="oszlop">
          <div className="sor">
            <span className="eyebrow">Válasz-kártya</span>
            <span className="chip">{allapot.osztalyozas.osztaly}</span>
            <span className="chip chip--kod">{allapot.tudasbazisVerzio}</span>
            {allapot.ellenorzes.kiadhato ? (
              <span className="badge badge--ok">őrök rendben</span>
            ) : (
              <span className="badge badge--hibas">visszaküldve</span>
            )}
          </div>

          <div className="kartya">
            <span className="eyebrow">1 · Rövid válasz</span>
            {allapot.kartya.rovidValasz.map((x, i) => (
              <p key={i}>
                {x.szoveg}{" "}
                {x.forrasAzonositok.filter((f) => f !== "").map((f) => (
                  <span className="chip chip--kod" key={f}>
                    {f}
                  </span>
                ))}
              </p>
            ))}

            {allapot.kartya.hianyKimondas ? null : (
              <>
                <span className="eyebrow">2 · Technikák és miért</span>
                {allapot.kartya.technikak.length === 0 ? (
                  <p className="small">
                    A küszöb felett nem volt önálló technika-tétel. A válasz a szabály-tételre
                    támaszkodik, és ezt itt mondom ki, nem hallgatom el.
                  </p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {allapot.kartya.technikak.map((tk) => (
                      <li key={tk.kod}>
                        <span className="chip chip--kod">{tk.kod}</span> {tk.mechanizmus}
                      </li>
                    ))}
                  </ul>
                )}

                <span className="eyebrow">3 · Bizonyíték</span>
                <table className="tabla">
                  <tbody>
                    {allapot.kartya.bizonyitek.map((b) => (
                      <tr key={b.forrasAzonosito}>
                        <td className="mono">{b.forrasAzonosito}</td>
                        <td className="small">
                          bizonyítékerő: {b.bizonyitekero === undefined ? "nincs megadva" : `${b.bizonyitekero}/5`}
                        </td>
                        <td className="small">{b.kontextus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <span className="eyebrow">4 · Javaslat a brand kontextusában</span>
                <div className="variansok">
                  {allapot.kartya.alternativak.map((a) => (
                    <div className="varians" key={a.cim}>
                      <span className="varians__cimke">{a.cim}</span>
                      <span>{a.leiras}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <span className="eyebrow">5 · Amit nem tudunk</span>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {allapot.kartya.amitNemTudunk.map((x) => (
                <li key={x} className="small">
                  {x}
                </li>
              ))}
            </ul>

            <span className="eyebrow">6 · Következő lépés</span>
            <div className="sor">
              {allapot.kartya.kovetkezoLepesek.map((l) => (
                <a className="gomb" href={l.muvelet === "audit" ? "/audit" : "/tanacs"} key={l.cim}>
                  {l.cim}
                </a>
              ))}
            </div>
          </div>

          {allapot.kizart.length > 0 ? (
            <p className="small">
              Kizárt források: {allapot.kizart.length} tétel a küszöb alatt vagy karanténban
              {allapot.kizart.some((k) => k.ok === "karanten")
                ? " — köztük karanténos tétel, ami akkor sem idézhető, ha releváns."
                : "."}
            </p>
          ) : null}

          {allapot.ellenorzes.kifogasok.length > 0 ? (
            <div className="kartya kartya--sik" style={{ borderColor: "var(--improve)" }}>
              <span className="eyebrow">Az őrök jelzései</span>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {allapot.ellenorzes.kifogasok.map((k, i) => (
                  <li key={i} className="small">
                    <span className="mono">{k.szabaly}</span> — {k.reszlet}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      )}
    </Hej>
  );
}
