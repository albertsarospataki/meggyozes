import { notFound } from "next/navigation";
import { Hej } from "@/components/hej";
import { ervenyesProofPoint, keszultseget } from "@meggyozes/brand";
import { brandProfiltMent, proofPointotFelvesz } from "@/lib/muveletek";
import { menesztVagyBelepes, tar } from "@/lib/tar";

/**
 * Brand-oldal (brief 3.2): profil · tanítás · bizonyíték-tár · tiltólista és hangnem ·
 * készültség.
 *
 * A W1 kapuja itt látszik: minden mezőt ember tölt. A rendszer javasolhat mintázatot,
 * de jóváhagyás nélkül nem ír a profilba — ezért nincs „automatikus kitöltés" gomb.
 */
export default async function BrandOldal({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await menesztVagyBelepes();
  const sor = tar().brand(m.hatokor, id);
  if (sor === undefined) notFound();

  const p = sor.profil;
  const kesz = keszultseget(p);
  const sorok = (x: readonly string[]): string => x.join("\n");

  return (
    <Hej aktiv="/brandek">
      <div className="oldalfej">
        <span className="eyebrow">Brand</span>
        <div className="oldalfej__sor">
          <h1>{sor.nev}</h1>
          <span className={`badge ${kesz.brandKontextusHasznalhato ? "badge--ok" : "badge--reszleges"}`}>
            készültség {kesz.pont} / 5
          </span>
        </div>
        <p className="lead olvaso">
          {kesz.brandKontextusHasznalhato
            ? "A profil elég ahhoz, hogy a javaslatok a te kontextusodban készüljenek."
            : "A profil még kevés: a javaslatok általánosak maradnak, amíg a súlyos blokkok üresek."}
        </p>
      </div>

      <section className="oszlop">
        <span className="eyebrow">Készültség</span>
        <div className="kartya" style={{ padding: 0, overflow: "hidden" }}>
          <table className="tabla">
            <thead>
              <tr>
                <th>Blokk</th>
                <th>Kitöltöttség</th>
                <th>Mit tenne pontosabbá</th>
              </tr>
            </thead>
            <tbody>
              {kesz.blokkok.map((b) => (
                <tr key={b.blokk}>
                  <td>{b.blokk}</td>
                  <td className="nums">{Math.round(b.kitoltottseg * 100)}%</td>
                  <td className="small">{b.mitTennePontosabba}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <form action={brandProfiltMent} className="racs racs--2">
        <input type="hidden" name="brand" value={sor.azonosito} />

        <div className="kartya">
          <span className="eyebrow">Alapadatok</span>
          <div className="mezo">
            <label htmlFor="agazat">Ágazat</label>
            <input id="agazat" name="agazat" type="text" defaultValue={p.alapadatok.agazat ?? ""} />
          </div>
          <div className="mezo">
            <label htmlFor="uzletiModell">Üzleti modell</label>
            <select id="uzletiModell" name="uzletiModell" defaultValue={p.alapadatok.uzletiModell ?? ""}>
              <option value="">Nincs megadva</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
            </select>
          </div>
          <div className="mezo">
            <label htmlFor="piacEsNyelv">Piac és nyelv</label>
            <input id="piacEsNyelv" name="piacEsNyelv" type="text" defaultValue={p.alapadatok.piacEsNyelv ?? ""} />
          </div>
          <div className="mezo">
            <label htmlFor="joghatosag">Joghatóság</label>
            <input id="joghatosag" name="joghatosag" type="text" defaultValue={p.alapadatok.joghatosag ?? ""} />
          </div>
          <div className="mezo">
            <label htmlFor="domainek">Domainek — soronként egy</label>
            <textarea id="domainek" name="domainek" defaultValue={sorok(p.alapadatok.domainek)} style={{ minHeight: 70 }} />
          </div>
        </div>

        <div className="kartya">
          <span className="eyebrow">Pozicionálás</span>
          <div className="mezo">
            <label htmlFor="foIgeret">Fő ígéret egy mondatban</label>
            <input id="foIgeret" name="foIgeret" type="text" defaultValue={p.pozicionalas.foIgeret ?? ""} />
          </div>
          <div className="mezo">
            <label htmlFor="ertekek">Három érték — soronként egy</label>
            <textarea id="ertekek" name="ertekek" defaultValue={sorok(p.pozicionalas.ertekek)} style={{ minHeight: 70 }} />
          </div>
          <div className="mezo">
            <label htmlFor="differencialas">Differenciálás</label>
            <input id="differencialas" name="differencialas" type="text" defaultValue={p.pozicionalas.differencialas ?? ""} />
          </div>
          <div className="mezo">
            <label htmlFor="amitSosemMondunk">Amit sosem mondunk — soronként egy</label>
            <textarea id="amitSosemMondunk" name="amitSosemMondunk" defaultValue={sorok(p.pozicionalas.amitSosemMondunk)} style={{ minHeight: 70 }} />
          </div>
        </div>

        <div className="kartya">
          <span className="eyebrow">Hangnem és tiltólista</span>
          <p className="small">
            A brand-őr ebből dolgozik: a tiltott kifejezés visszaküldi a saját javaslatunkat, mielőtt
            kimenne a te nevedben.
          </p>
          <div className="mezo">
            <label htmlFor="megszolitas">Megszólítás</label>
            <select id="megszolitas" name="megszolitas" defaultValue={p.hangnem.megszolitas ?? ""}>
              <option value="">Nincs megadva</option>
              <option value="tegezes">tegezés</option>
              <option value="magazas">magázás</option>
            </select>
          </div>
          <div className="mezo">
            <label htmlFor="kotelezoKifejezesek">Kötelező kifejezések</label>
            <textarea id="kotelezoKifejezesek" name="kotelezoKifejezesek" defaultValue={sorok(p.hangnem.kotelezoKifejezesek)} style={{ minHeight: 70 }} />
          </div>
          <div className="mezo">
            <label htmlFor="tiltottKifejezesek">Tiltott kifejezések</label>
            <textarea id="tiltottKifejezesek" name="tiltottKifejezesek" defaultValue={sorok(p.hangnem.tiltottKifejezesek)} style={{ minHeight: 70 }} />
          </div>
          <div className="mezo">
            <label htmlFor="peldamondatok">Példamondatok</label>
            <textarea id="peldamondatok" name="peldamondatok" defaultValue={sorok(p.hangnem.peldamondatok)} style={{ minHeight: 70 }} />
          </div>
        </div>

        <div className="kartya">
          <span className="eyebrow">Mérés</span>
          <div className="mezo">
            <label htmlFor="meresForrasok">Elérhető adatforrások</label>
            <textarea id="meresForrasok" name="meresForrasok" defaultValue={sorok(p.meres.elerhetoForrasok)} style={{ minHeight: 70 }} />
          </div>
          <div className="mezo">
            <label htmlFor="kpik">KPI-k</label>
            <textarea id="kpik" name="kpik" defaultValue={sorok(p.meres.kpik)} style={{ minHeight: 70 }} />
          </div>
          <button className="gomb gomb--elsodleges" type="submit">
            Profil mentése
          </button>
        </div>
      </form>

      <section className="oszlop">
        <span className="eyebrow">Bizonyíték-tár</span>
        <p className="small olvaso">
          Amit igazolni tudsz. A szuperlatívusz- és a szám-őr ezen áll: ami nincs itt, az a kimenetben
          helyőrző lesz, nem állítás.
        </p>

        {p.bizonyitekTar.length > 0 ? (
          <div className="kartya" style={{ padding: 0, overflow: "hidden" }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Állítás</th>
                  <th>Forrás</th>
                  <th>Érvényesség</th>
                  <th>Igazolta</th>
                </tr>
              </thead>
              <tbody>
                {p.bizonyitekTar.map((pp) => (
                  <tr key={pp.azonosito}>
                    <td>{pp.allitas}</td>
                    <td className="small">{pp.forras}</td>
                    <td className="small">
                      {pp.ervenyesseg === undefined ? (
                        "nincs lejárat"
                      ) : ervenyesProofPoint(pp, new Date()) ? (
                        pp.ervenyesseg
                      ) : (
                        <span className="badge badge--hibas">lejárt</span>
                      )}
                    </td>
                    <td className="small">{pp.igazolta ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <form action={proofPointotFelvesz} className="kartya">
          <input type="hidden" name="brand" value={sor.azonosito} />
          <div className="racs racs--2">
            <div className="mezo">
              <label htmlFor="allitas">Állítás</label>
              <input id="allitas" name="allitas" type="text" placeholder="A vásárlók 92%-a 24 órán belül megkapja a csomagot." />
            </div>
            <div className="mezo">
              <label htmlFor="forras">Forrás</label>
              <input id="forras" name="forras" type="text" placeholder="Logisztikai riport, 2026 Q2" />
            </div>
            <div className="mezo">
              <label htmlFor="ervenyesseg">Érvényesség (ISO dátum)</label>
              <input id="ervenyesseg" name="ervenyesseg" type="text" placeholder="2026-12-31" />
            </div>
            <div className="mezo">
              <label htmlFor="szamertek">A benne szereplő szám</label>
              <input id="szamertek" name="szamertek" type="text" placeholder="92%" />
            </div>
          </div>
          <button className="gomb" type="submit">
            Proof point felvétele
          </button>
        </form>
      </section>
    </Hej>
  );
}
