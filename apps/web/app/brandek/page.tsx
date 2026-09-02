import Link from "next/link";
import { Hej } from "@/components/hej";
import { keszultseget } from "@meggyozes/brand";
import { brandNyithato } from "@meggyozes/szervezet";
import { brandetLetrehoz } from "@/lib/muveletek";
import { menesztVagyBelepes, tar } from "@/lib/tar";

export default async function Brandek() {
  const m = await menesztVagyBelepes();
  const t = tar();
  const brandek = t.brandek(m.hatokor);
  const projektek = t.projektek(m.hatokor);
  const korlat = brandNyithato(m.csomag, { brandekSzama: brandek.length, ulesekSzama: 1 });

  return (
    <Hej aktiv="/brandek">
      <div className="oldalfej">
        <span className="eyebrow">Brandek</span>
        <div className="oldalfej__sor">
          <h1>Amit a rendszer tud rólad</h1>
        </div>
        <p className="lead olvaso">
          A brand-profil az ügyfél adata: pozicionálás, hangnem, tiltólista, igazolt állítások. Ebből
          dolgozik minden javaslat — és profil nélkül a rendszer általánosat ad, és ezt ki is mondja.
        </p>
      </div>

      <div className="racs racs--2">
        {brandek.map((b) => {
          const kesz = keszultseget(b.profil);
          const sajat = projektek.filter((p) => p.brandAzonosito === b.azonosito).length;
          return (
            <div className="kartya" key={b.azonosito}>
              <div className="sor sor--kozott">
                <h3>{b.nev}</h3>
                <span className={`badge ${kesz.brandKontextusHasznalhato ? "badge--ok" : "badge--reszleges"}`}>
                  készültség {kesz.pont} / 5
                </span>
              </div>
              <p className="small">
                {b.profil.alapadatok.agazat ?? "ágazat még nincs megadva"} · {sajat} projekt ·{" "}
                {b.profil.bizonyitekTar.length} proof point
              </p>
              <p className="small">
                Ami a legtöbbet érne most: {kesz.hianyzok[0]?.mitTennePontosabba ?? "a profil teljes"}
              </p>
              <Link className="gomb" href={`/brandek/${b.azonosito}`}>
                Megnyitás
              </Link>
            </div>
          );
        })}

        <div className="kartya">
          <span className="eyebrow">Új brand</span>
          {korlat === undefined ? (
            <form action={brandetLetrehoz} className="oszlop">
              <div className="mezo">
                <label htmlFor="nev">Brand neve</label>
                <input id="nev" name="nev" type="text" placeholder="pl. Zenon" />
              </div>
              <button className="gomb gomb--elsodleges" type="submit">
                Létrehozás
              </button>
            </form>
          ) : (
            <>
              <p>{korlat.uzenet}</p>
              {korlat.feloldja === undefined ? null : (
                <Link className="gomb" href="/elofizetes">
                  Csomagváltás
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </Hej>
  );
}
