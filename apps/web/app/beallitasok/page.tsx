import { Hej } from "@/components/hej";
import { kilepes } from "@/lib/muveletek";
import { menesztVagyBelepes } from "@/lib/tar";

export default async function Beallitasok() {
  const m = await menesztVagyBelepes();
  const tanul = process.env.TANULASI_RESZVETEL !== "ki";

  return (
    <Hej aktiv="/beallitasok">
      <div className="oldalfej">
        <span className="eyebrow">Beállítások</span>
        <h1>{m.felhasznaloNev}</h1>
      </div>

      <div className="racs racs--2">
        <div className="kartya">
          <span className="eyebrow">Adat és tanulás</span>
          <p className="small">
            A visszajelzéseidből anonimizált tanulási jelöltek készülnek: idézet és kód, domain és
            márkanév nélkül. A részvétel kikapcsolható.
          </p>
          <p>
            <span className={`badge ${tanul ? "badge--ok" : "badge--semleges"}`}>
              {tanul ? "részvétel bekapcsolva" : "részvétel kikapcsolva"}
            </span>
          </p>
          <p className="small">
            Kapcsoló: a <span className="mono">TANULASI_RESZVETEL=ki</span> környezeti változó. Az
            önkiszolgáló kapcsoló a fizetős nyitással érkezik.
          </p>
        </div>

        <div className="kartya">
          <span className="eyebrow">Munkamenet</span>
          <p className="small">Szervezet: {m.szervezetNev}</p>
          <p className="small">Szerep: {m.tagsag.szerep}</p>
          <form action={kilepes}>
            <button className="gomb" type="submit">
              Kilépés
            </button>
          </form>
        </div>
      </div>
    </Hej>
  );
}
