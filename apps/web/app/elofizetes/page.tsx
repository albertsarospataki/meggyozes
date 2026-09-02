import { Hej } from "@/components/hej";
import { ALAPARAK, CSOMAGOK, MUVELET_NEVEK, type MuveletTipus } from "@meggyozes/szervezet";
import { fokonyv, menesztVagyBelepes, tar } from "@/lib/tar";

/**
 * Előfizetés és kreditek (brief 3.2, 7.).
 *
 * A kredit-történet soronként visszakereshető: mi, mikor, mennyi, melyik futáshoz.
 * A havi keret és a kiegészítő külön sorban áll — a kettő máshogy jár le.
 */
export default async function Elofizetes() {
  const m = await menesztVagyBelepes();
  const konyv = fokonyv(m.hatokor);
  const tranzakciok = [...tar().kreditTranzakciok(m.hatokor)].reverse();
  const csomag = CSOMAGOK[m.csomag];

  return (
    <Hej aktiv="/elofizetes">
      <div className="oldalfej">
        <span className="eyebrow">Előfizetés és kreditek</span>
        <h1>{m.csomag === "alfa" ? "Alfa — Pro-képességekkel, kártya nélkül" : csomag.nev}</h1>
        <p className="lead olvaso">
          Az alfa nem harmadik csomag, hanem állapot: a fizetős nyitáskor Starterré vagy Próvá alakul.
        </p>
      </div>

      <div className="racs racs--4">
        <div className="kartya kartya--sik">
          <span className="eyebrow">Egyenleg</span>
          <span className="sav__ertek nums">{konyv.osszesen}</span>
          <span className="small">havi keret {konyv.havi} · kiegészítő {konyv.kiegeszito}</span>
        </div>
        <div className="kartya kartya--sik">
          <span className="eyebrow">Brandek</span>
          <span className="sav__ertek nums">{csomag.brandekMax}</span>
          <span className="small">amit a csomag enged</span>
        </div>
        <div className="kartya kartya--sik">
          <span className="eyebrow">Ülések</span>
          <span className="sav__ertek nums">{csomag.ulesekMax}</span>
          <span className="small">felhasználó</span>
        </div>
        <div className="kartya kartya--sik">
          <span className="eyebrow">Videó</span>
          <span className="sav__ertek nums">{csomag.videoPercMax} perc</span>
          <span className="small">az ajtó felső korlátja</span>
        </div>
      </div>

      <section className="oszlop">
        <span className="eyebrow">Kredit-árlista</span>
        <div className="kartya" style={{ padding: 0, overflow: "hidden" }}>
          <table className="tabla">
            <thead>
              <tr>
                <th>Művelet</th>
                <th>Kredit</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(ALAPARAK) as MuveletTipus[]).map((k) => (
                <tr key={k}>
                  <td>{MUVELET_NEVEK[k]}</td>
                  <td className="nums">{ALAPARAK[k]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="oszlop">
        <span className="eyebrow">Kredit-történet</span>
        {tranzakciok.length === 0 ? (
          <p className="small">Még nincs mozgás.</p>
        ) : (
          <div className="kartya" style={{ padding: 0, overflow: "hidden" }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Mikor</th>
                  <th>Mi</th>
                  <th>Keret</th>
                  <th>Futás</th>
                  <th>Mennyiség</th>
                </tr>
              </thead>
              <tbody>
                {tranzakciok.map((tr) => (
                  <tr key={tr.azonosito}>
                    <td className="small nums">{tr.letrejott.slice(0, 16).replace("T", " ")}</td>
                    <td>{tr.indoklas ?? tr.tipus}</td>
                    <td className="small">{tr.keret}</td>
                    <td className="small mono">{tr.hivatkozottFutas ?? "—"}</td>
                    <td className="nums" style={{ color: tr.mennyiseg < 0 ? "var(--ink-2)" : "var(--works)" }}>
                      {tr.mennyiseg > 0 ? `+${tr.mennyiseg}` : tr.mennyiseg}
                    </td>
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
