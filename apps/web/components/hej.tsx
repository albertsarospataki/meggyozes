import Link from "next/link";
import { Vonas } from "./vonas";
import { brandotValt } from "@/lib/muveletek";
import { fokonyv, meneszt, tar, aktivBrandAzonosito } from "@/lib/tar";

/**
 * Az alkalmazás váza (brandbook 8.1, brief 3.1).
 *
 * Két dolog fix: a kredit MINDIG látszik (sosem rejtett menüben), és a három mód
 * neve szó, nem ikon. A brand-váltó a kontextus — minden javaslat abban a brandben
 * értendő, ami itt ki van választva.
 */
export async function Hej({ children, aktiv }: { readonly children: React.ReactNode; readonly aktiv: string }) {
  const m = await meneszt();
  if (m === undefined) return <>{children}</>;

  const t = tar();
  const brandek = t.brandek(m.hatokor);
  const aktivBrand = await aktivBrandAzonosito(m.hatokor);
  const brand = brandek.find((b) => b.azonosito === aktivBrand);
  const egyenleg = fokonyv(m.hatokor);
  const platformAdmin = m.tagsag.szerep === "tulajdonos" || m.tagsag.szerep === "platform_admin";

  const elem = (utvonal: string, cimke: string, extra?: React.ReactNode) => (
    <Link
      className="nav__elem"
      href={utvonal}
      aria-current={aktiv === utvonal ? "page" : undefined}
      key={utvonal}
    >
      <span>{cimke}</span>
      {extra}
    </Link>
  );

  return (
    <div className="hej">
      <nav className="nav" aria-label="Fő navigáció">
        <div className="nav__markanev">
          <span style={{ color: "var(--blue)", display: "inline-flex" }}>
            <Vonas meret={22} />
          </span>
          <span>Convictly</span>
        </div>

        <div className="nav__csoport">
          {elem("/", "Vezérlőpult")}
          {elem("/brandek", "Brandek", <span className="small nums">{brandek.length}</span>)}
          {elem("/projektek", "Projektek")}
        </div>

        <div className="nav__csoport">
          {elem("/audit", "Audit")}
          {elem("/tanacs", "Tanács")}
          {elem("/kerdezz", "Kérdezz")}
        </div>

        <div className="nav__csoport">
          {elem("/riportok", "Riportok")}
          {elem("/lexikon", "Technika-lexikon")}
        </div>

        <div className="nav__valaszto" />

        <div className="nav__csoport">
          {elem("/csapat", "Csapat")}
          {elem("/elofizetes", "Előfizetés és kreditek", <span className="small nums">{egyenleg.osszesen}</span>)}
          {elem("/beallitasok", "Beállítások")}
          {platformAdmin ? elem("/admin", "Admin") : null}
        </div>
      </nav>

      <div className="fo">
        <header className="fejlec">
          <div className="sor">
            {brandek.length === 0 ? (
              <Link className="gomb" href="/brandek">
                Taníts egy brandet
              </Link>
            ) : (
              <form action={brandotValt} className="sor" style={{ gap: 8 }}>
                <select name="brand" defaultValue={brand?.azonosito ?? ""} aria-label="Aktív brand" style={{ width: "auto" }}>
                  {brandek.map((b) => (
                    <option key={b.azonosito} value={b.azonosito}>
                      {b.nev}
                    </option>
                  ))}
                </select>
                <button className="gomb gomb--halk" type="submit">
                  Váltás
                </button>
              </form>
            )}
          </div>

          <div className="fejlec__jobb">
            <span className="small nums">
              {egyenleg.osszesen} kredit
            </span>
            <Link className="gomb gomb--mod" href="/audit">
              Új audit
            </Link>
          </div>
        </header>

        <main className="tartalom">{children}</main>
      </div>
    </div>
  );
}
