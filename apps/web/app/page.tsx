import Link from "next/link";
import { Hej } from "@/components/hej";
import { keszultseget } from "@meggyozes/brand";
import { kovetkezoLepes } from "@meggyozes/projekt";
import { aktivBrandAzonosito, fokonyv, menesztVagyBelepes, tar } from "@/lib/tar";

/**
 * Vezérlőpult (brief 3.2).
 *
 * Üres állapotban a három lépés: taníts brandet · indíts auditot · kérdezz bármit.
 * Ha már van anyag, a „következő lépés" kártya a projekt-réteg ajánlója — előbb a
 * már elvégzett munka behajtása, csak utána új futás.
 */
export default async function Vezerlopult() {
  const m = await menesztVagyBelepes();
  const t = tar();
  const brandek = t.brandek(m.hatokor);
  const aktiv = await aktivBrandAzonosito(m.hatokor);
  const brand = brandek.find((b) => b.azonosito === aktiv);
  const kesz = brand === undefined ? undefined : keszultseget(brand.profil);
  const riportok = t.riportok(m.hatokor);
  const egyenleg = fokonyv(m.hatokor);
  const megvalositasok = t.megvalositasok(m.hatokor);

  const lepes = kovetkezoLepes({
    riportok: riportok.map((r) => ({ ...r })),
    megvalositasok: megvalositasok.map((x) => ({
      javaslatAzonosito: x.javaslatAzonosito,
      statusz: x.statusz as "nyitott" | "megvalositva" | "elvetve",
      jelolve: x.jelolve,
      jelolte: undefined,
      mertValtozas: undefined,
    })),
    brandKeszultseg: kesz?.pont ?? 0,
    mikor: new Date(),
  });

  const humVar = riportok.filter((r) => r.statusz === "ellenorzes_alatt").length;

  return (
    <Hej aktiv="/">
      <div className="oldalfej">
        <span className="eyebrow">Vezérlőpult</span>
        <div className="oldalfej__sor">
          <h1>{m.szervezetNev}</h1>
          <span className="small nums">{egyenleg.osszesen} kredit · havi keret {egyenleg.havi}</span>
        </div>
      </div>

      {riportok.length === 0 && brandek.length === 0 ? (
        <div className="ures">
          <h2>Kezdjük három lépésben</h2>
          <ol className="ures__lepesek">
            <li className="ures__lepes">
              <span className="ures__szam">1</span>
              <span>
                <Link href="/brandek">Taníts egy brandet</Link> — 10 perc, és minden javaslat a te
                hangodon szól.
              </span>
            </li>
            <li className="ures__lepes">
              <span className="ures__szam">2</span>
              <span>
                <Link href="/audit">Indíts egy auditot</Link> — egy URL vagy egy beillesztett szöveg elég.
              </span>
            </li>
            <li className="ures__lepes">
              <span className="ures__szam">3</span>
              <span>
                <Link href="/kerdezz">Kérdezz bármit</Link> — forrásolt válasz, alternatívákkal.
              </span>
            </li>
          </ol>
        </div>
      ) : null}

      <div className="racs racs--3">
        <div className="kartya kartya--sik">
          <span className="eyebrow">Aktív brand</span>
          <h3>{brand?.nev ?? "Nincs kiválasztva"}</h3>
          <p className="small">
            {kesz === undefined
              ? "Brand-profil nélkül a javaslatok általánosak — és a rendszer ezt ki is mondja."
              : `Készültség ${kesz.pont} / 5 · ${kesz.brandKontextusHasznalhato ? "brand-kontextusú javaslatok" : "még általános javaslatok"}`}
          </p>
          {brand === undefined ? (
            <Link className="gomb" href="/brandek">
              Brand létrehozása
            </Link>
          ) : (
            <Link className="gomb" href={`/brandek/${brand.azonosito}`}>
              Tanítás folytatása
            </Link>
          )}
        </div>

        <div className="kartya kartya--sik">
          <span className="eyebrow">Következő lépés</span>
          <h3>{lepes.cim}</h3>
          <p className="small">{lepes.indoklas}</p>
          <Link
            className="gomb"
            href={
              lepes.muvelet === "brand_tanitas"
                ? "/brandek"
                : lepes.muvelet === "tanacs"
                  ? "/tanacs"
                  : lepes.muvelet === "megvalositas_jeloles"
                    ? "/riportok"
                    : "/audit"
            }
          >
            Ugrás
          </Link>
        </div>

        <div className="kartya kartya--sik">
          <span className="eyebrow">Állapot</span>
          <h3 className="nums">{riportok.length} riport</h3>
          <p className="small">
            {humVar === 0
              ? "Nincs szakértői ellenőrzésre váró riport."
              : `${humVar} riport szakértői ellenőrzés alatt (KO-sáv).`}
          </p>
          <Link className="gomb" href="/riportok">
            Riportok
          </Link>
        </div>
      </div>

      {riportok.length > 0 ? (
        <div className="kartya">
          <span className="eyebrow">Legutóbbi riportok</span>
          <table className="tabla">
            <thead>
              <tr>
                <th>Anyag</th>
                <th>Mód</th>
                <th>Megállapítás</th>
                <th>Állapot</th>
              </tr>
            </thead>
            <tbody>
              {riportok.slice(0, 6).map((r) => (
                <tr key={r.azonosito}>
                  <td>
                    <Link href={`/riportok/${r.azonosito}`}>{r.tartalom.masthead.cim}</Link>
                  </td>
                  <td className="small">{r.mod}</td>
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
      ) : null}
    </Hej>
  );
}
