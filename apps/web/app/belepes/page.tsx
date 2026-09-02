import { Vonas } from "@/components/vonas";
import { belepes } from "@/lib/muveletek";

/**
 * Alfa-belépés meghívó-kóddal (brief 7.2: kártya nélkül, meghívóval).
 * A korlát elöl van kimondva, nem a végén — ez a márka szabálya is (brandbook 3).
 */
export default async function Belepes({ searchParams }: { readonly searchParams: Promise<{ hiba?: string }> }) {
  const { hiba } = await searchParams;

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="kartya" style={{ maxWidth: 420, width: "100%", gap: 18 }}>
        <div className="sor" style={{ gap: 9 }}>
          <span style={{ color: "var(--blue)", display: "inline-flex" }}>
            <Vonas meret={26} />
          </span>
          <span style={{ fontWeight: 600, fontSize: 19, letterSpacing: "-0.02em" }}>Convictly</span>
        </div>

        <div className="oszlop" style={{ gap: 6 }}>
          <h1 style={{ fontSize: 22 }}>Zárt alfa</h1>
          <p className="small">
            Meghívó-kóddal léphetsz be, kártya nélkül. A fiók Pro-képességekkel fut, a havi keret az
            alfa beállításából jön.
          </p>
        </div>

        <form action={belepes} className="oszlop" style={{ gap: 12 }}>
          <div className="mezo">
            <label htmlFor="kod">Meghívó-kód</label>
            <input id="kod" name="kod" type="text" autoComplete="off" placeholder="A kód, amit kaptál" />
          </div>
          {hiba === "kod" ? (
            <p className="small" style={{ color: "var(--risk)" }}>
              Ez a kód nem érvényes. Ellenőrizd a meghívóban, vagy kérj újat.
            </p>
          ) : null}
          {hiba === "fiok" ? (
            <p className="small" style={{ color: "var(--risk)" }}>
              A kód rendben van, de a fiók még nem készült el. Indítsd újra az alkalmazást.
            </p>
          ) : null}
          <button className="gomb gomb--elsodleges" type="submit">
            Belépés
          </button>
        </form>

        <p className="small">Gépi elemzés · nem jogi tanácsadás</p>
      </div>
    </main>
  );
}
