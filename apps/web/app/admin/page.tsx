import Link from "next/link";
import { redirect } from "next/navigation";
import { Hej } from "@/components/hej";
import { ALAPVONAL_FUTAS_6, KAPUK, MOD_KAPUK, BAZIS_MERETEK } from "@meggyozes/kalibracio";
import { DEMO_TUDASBAZIS } from "@meggyozes/motor";
import { kuratoriCsomag } from "@meggyozes/tanulas";
import { humDontes } from "@/lib/muveletek";
import { menesztVagyBelepes, tar } from "@/lib/tar";

/**
 * Admin-pult (brief 3.2): HUM-kapu sor · tudásbázis-szinkron · CI-pult · tanulási sor.
 *
 * A HUM-sor a platform szintjén globális — a KO-sávos riportot ember nézi át, mielőtt
 * kiadható lesz. A tanulási sor jelöltjei anonimizáltak, és a Notionba emberi kéz
 * viszi át őket: a runtime soha nem ír vissza.
 */
export default async function Admin() {
  const m = await menesztVagyBelepes();
  if (m.tagsag.szerep !== "tulajdonos" && m.tagsag.szerep !== "platform_admin") redirect("/");

  const t = tar();
  const humSor = t.humSor();
  const jeloltek = t.jeloltek();
  const csomag = kuratoriCsomag(jeloltek, new Date().toISOString().slice(0, 10));

  return (
    <Hej aktiv="/admin">
      <div className="oldalfej">
        <span className="eyebrow">Admin · platform</span>
        <h1>Kapuk, sorok, jelöltek</h1>
      </div>

      <section className="oszlop">
        <span className="eyebrow">HUM-kapu (P12)</span>
        {humSor.length === 0 ? (
          <div className="kartya kartya--sik">
            <p>Nincs szakértői ellenőrzésre váró riport.</p>
          </div>
        ) : (
          <div className="kartya" style={{ padding: 0, overflow: "hidden" }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Riport</th>
                  <th>KO-megállapítás</th>
                  <th>Készült</th>
                  <th>Döntés</th>
                </tr>
              </thead>
              <tbody>
                {humSor.map((r) => (
                  <tr key={r.azonosito}>
                    <td>
                      <Link href={`/riportok/${r.azonosito}`}>{r.tartalom.masthead.cim}</Link>
                    </td>
                    <td className="nums">
                      {r.megallapitasok.filter((x) => x.sav === "0 Jogi KO" || x.sav === "1 Etikai KO").length}
                    </td>
                    <td className="small nums">{r.keszult.slice(0, 16).replace("T", " ")}</td>
                    <td>
                      <form action={humDontes} className="sor" style={{ gap: 6 }}>
                        <input type="hidden" name="riport" value={r.azonosito} />
                        <input type="hidden" name="dontes" value="jovahagy" />
                        <button className="gomb" type="submit">
                          Jóváhagyom
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="oszlop">
        <span className="eyebrow">Tudásbázis</span>
        <div className="kartya kartya--sik">
          <div className="sor">
            <span className="chip chip--kod">{DEMO_TUDASBAZIS.verzio}</span>
            {DEMO_TUDASBAZIS.demo ? <span className="badge badge--reszleges">demó bázis</span> : null}
            <span className="small">
              {DEMO_TUDASBAZIS.jelek.length} jel · {DEMO_TUDASBAZIS.szabalyok.length} szabály ·{" "}
              {DEMO_TUDASBAZIS.technikak.length} technika
            </span>
          </div>
          <p className="small">
            A Notion-szinkron a <span className="mono">pnpm kb:sync</span> paranccsal fut, és
            verziózott pillanatképet ír. Élesítés csak zöld CI után; a régi riportok nem törlődnek,
            csak „elavult tudásbázis-verzió" jelölést kapnak.
          </p>
        </div>
      </section>

      <section className="oszlop">
        <span className="eyebrow">CI-pult</span>
        <div className="racs racs--3">
          <div className="kartya kartya--sik">
            <h3>Audit-kapu</h3>
            <p className="small">
              PASS ≥ {Math.round(KAPUK.passArany * 100)}% · recall ≥ {Math.round(KAPUK.kotelezoRecall * 100)}% ·
              kontroll-álpozitív = {KAPUK.kontrollAlpozitivMax}
            </p>
            <p className="small nums">
              #6 futás: {Math.round(ALAPVONAL_FUTAS_6.passArany * 100)}% PASS ·{" "}
              {Math.round(ALAPVONAL_FUTAS_6.kotelezoRecall * 100)}% recall
            </p>
            <span className="badge badge--semleges">bázis {BAZIS_MERETEK.audit} teszt</span>
          </div>
          <div className="kartya kartya--sik">
            <h3>Tanács-kapu</h3>
            <p className="small">
              PASS ≥ {Math.round(MOD_KAPUK.tervPassArany * 100)}% · fordított kontroll 100% · saját
              javaslat KO-sértés = 0
            </p>
            <span className="badge badge--semleges">bázis {BAZIS_MERETEK.terv} teszt</span>
          </div>
          <div className="kartya kartya--sik">
            <h3>Kérdezz-kapu</h3>
            <p className="small">
              forrás nélküli állítás = 0 · hiány-kimondás 100% · relevancia ≥ {MOD_KAPUK.qaRelevanciaKuszob}
            </p>
            <span className="badge badge--semleges">bázis {BAZIS_MERETEK.qa} teszt</span>
          </div>
        </div>
        <p className="small">
          A gold-készletek a Notionben épülnek (N2–N4, N9). Amíg nem teljesek, a kapu fut, de a szám
          nem a teljes bázison áll — ezt a bázis-lelet mondja ki.
        </p>
      </section>

      <section className="oszlop">
        <span className="eyebrow">Tanulási sor · kurátori csomag</span>
        {csomag.osszesen === 0 ? (
          <div className="kartya kartya--sik">
            <p>Nincs nyitott jelölt. A „nem helyes" és a „nem értem" visszajelzésekből keletkeznek.</p>
          </div>
        ) : (
          csomag.tipusok.map((cs) => (
            <div className="kartya" key={cs.tipus}>
              <div className="sor sor--kozott">
                <h3>{cs.tipus}</h3>
                <span className="chip nums">{cs.jeloltek.length}</span>
              </div>
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Anonim idézet</th>
                    <th>Kódok</th>
                    <th>Előfordulás</th>
                    <th>Notion-sor</th>
                  </tr>
                </thead>
                <tbody>
                  {cs.jeloltek.map((j) => (
                    <tr key={j.jeloltAzonositok.join(",")}>
                      <td>„{j.anonimIdezet}"</td>
                      <td className="mono small">{j.kodok.join(" ")}</td>
                      <td className="nums">{j.eloforduasok}</td>
                      <td className="small mono">{j.notionSor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
        {csomag.heldOutMiattKizart > 0 ? (
          <p className="small">
            {csomag.heldOutMiattKizart} jelölt held-out futásból származik, ezért nem kerül a sorba —
            a held-out készletből nem lesz szabály.
          </p>
        ) : null}
      </section>
    </Hej>
  );
}
