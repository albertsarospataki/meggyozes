import { Hej } from "@/components/hej";
import { DEMO_TUDASBAZIS } from "@meggyozes/motor";
import { menesztVagyBelepes } from "@/lib/tar";

/**
 * Technika-lexikon (brief 3.2) — csak olvasható, a tudásbázis-szinkron tölti.
 * A demó bázison ez tíz tétel; a Notion-szinkron után a 150 technika.
 */
export default async function Lexikon() {
  await menesztVagyBelepes();
  const t = DEMO_TUDASBAZIS;

  return (
    <Hej aktiv="/lexikon">
      <div className="oldalfej">
        <span className="eyebrow">Technika-lexikon</span>
        <h1>Amit a rendszer felismer</h1>
        <p className="lead olvaso">
          Minden technikánál ott a választóvonal: mikor legitim, és mitől válik sötétté. A lexikont a
          tudásbázis-szinkron tölti — most a demó bázis {t.technikak.length} tétele látszik.
        </p>
      </div>

      <div className="racs racs--2">
        {t.technikak.map((tk) => (
          <div className="kartya" key={tk.kod}>
            <div className="sor sor--kozott">
              <span className="chip chip--kod">{tk.kod}</span>
              <span
                className={`badge ${
                  tk.allapot === "Aktiv" ? "badge--ok" : tk.allapot === "Vitatott" ? "badge--reszleges" : "badge--hibas"
                }`}
              >
                {tk.allapot === "Aktiv" ? "aktív" : tk.allapot === "Vitatott" ? "vitatott" : "kerülendő"}
              </span>
            </div>
            <h3>{tk.nev}</h3>
            <p className="small">{tk.meghatarozas}</p>
            {tk.sotetValtozat === undefined ? null : (
              <p className="small">
                <strong>Sötét változat:</strong> {tk.sotetValtozat}
              </p>
            )}
            {tk.valasztovonal === undefined ? null : (
              <p className="small">
                <strong>A választóvonal:</strong> {tk.valasztovonal}
              </p>
            )}
          </div>
        ))}
      </div>
    </Hej>
  );
}
