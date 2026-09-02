import type { Javaslat, Megallapitas } from "@meggyozes/projekt";
import { megvalositastJelol, visszajelzestAd } from "@/lib/muveletek";

/**
 * A Megállapítás-kártya (brandbook 8.4) — a termék központi egysége.
 *
 * A sorrend kötött, mert ez maga a hangvétel: kód és technika → idézet forrással és
 * bizonyíték-fokozattal → státusz → most ez van → helyette ez → három variáns →
 * miért → meta → cselekvés. Ha nincs három variáns, a kártya nem megy ki. A ⚖ jogi
 * megjegyzés a javaslat MELLETT áll, sosem helyette.
 */

export type Statusz = "ok" | "reszleges" | "hibas" | "nem-eldontheto" | "tervezett";

const STATUSZ_SZO: Readonly<Record<Statusz, string>> = {
  ok: "Működik",
  reszleges: "Részleges",
  hibas: "Kizáró ok",
  "nem-eldontheto": "Nem eldönthető",
  tervezett: "Tervezett",
};

const STATUSZ_OSZTALY: Readonly<Record<Statusz, string>> = {
  ok: "badge--ok",
  reszleges: "badge--reszleges",
  hibas: "badge--hibas",
  "nem-eldontheto": "badge--semleges",
  tervezett: "badge--semleges",
};

export function statuszt(m: Megallapitas): Statusz {
  if (m.bizonyitekSzint === "tervezett") return "tervezett";
  if (m.bizonyitekSzint === "nem-eldontheto") return "nem-eldontheto";
  if (m.sav === "0 Jogi KO" || m.sav === "1 Etikai KO") return "hibas";
  if (m.minosites === "pozitiv") return "ok";
  return "reszleges";
}

export function Allapotjelzo({ statusz }: { readonly statusz: Statusz }) {
  return <span className={`badge ${STATUSZ_OSZTALY[statusz]}`}>{STATUSZ_SZO[statusz]}</span>;
}

const FOKOZAT_SZO: Readonly<Record<string, string>> = {
  teny: "tény",
  gyanu: "gyanú",
  "nem-eldontheto": "nem eldönthető",
  tervezett: "tervezett",
};

export function MegallapitasKartya({
  megallapitas,
  javaslat,
  riportAzonosito,
  cim,
  visszakuldott,
}: {
  readonly megallapitas: Megallapitas;
  readonly javaslat: Javaslat | undefined;
  readonly riportAzonosito: string;
  readonly cim: string;
  readonly visszakuldott: boolean;
}) {
  const statusz = statuszt(megallapitas);

  return (
    <article className="megallapitas">
      <div className="megallapitas__fej">
        {megallapitas.technikaKodok.map((kod) => (
          <span className="chip chip--kod" key={kod}>
            {kod}
          </span>
        ))}
        <span className="chip chip--kod">{megallapitas.szabalyKod}</span>
        <span style={{ flex: 1 }} />
        <Allapotjelzo statusz={statusz} />
      </div>

      <h3 className="megallapitas__cim">{cim}</h3>

      <blockquote className="idezet">
        <span className="idezet__szoveg">„{megallapitas.idezet}"</span>
        <span className="idezet__forras">
          {megallapitas.jelKodok.length > 0 ? `${megallapitas.jelKodok.join(" · ")} · ` : ""}
          bizonyíték-fokozat: {FOKOZAT_SZO[megallapitas.bizonyitekSzint] ?? megallapitas.bizonyitekSzint}
          {megallapitas.forras === undefined ? " · forrás: demó tétel" : ` · forrás: ${megallapitas.forras}`}
        </span>
      </blockquote>

      {javaslat === undefined ? null : (
        <>
          <div className="csere">
            <div className="csere__doboz">
              <span className="csere__cimke">Most ez van</span>
              <span>{javaslat.mostEzVan}</span>
            </div>
            <span className="csere__nyil" aria-hidden="true">
              →
            </span>
            <div className="csere__doboz csere__doboz--helyette">
              <span className="csere__cimke">Helyette ez</span>
              <span>{javaslat.helyetteEz}</span>
            </div>
          </div>

          <div className="variansok">
            <div className="varians">
              <span className="varians__cimke">Konzervatív</span>
              <span>{javaslat.variansok.konzervativ}</span>
            </div>
            <div className="varians">
              <span className="varians__cimke">Bátrabb</span>
              <span>{javaslat.variansok.batrabb}</span>
            </div>
            <div className="varians">
              <span className="varians__cimke">Kísérleti</span>
              <span>{javaslat.variansok.kiserleti}</span>
            </div>
          </div>

          <div className="meta">
            <span>beavatkozás: {javaslat.beavatkozasiSzint.toLowerCase()}</span>
            <span>várható hatás: {javaslat.varhatoHatas ?? "nincs mért adat"}</span>
            <span>
              {javaslat.jogiMegjegyzes === undefined ? "nincs jogi megjegyzés" : `⚖ ${javaslat.jogiMegjegyzes}`}
            </span>
          </div>

          {visszakuldott ? (
            <p className="small" style={{ color: "var(--improve)" }}>
              A brand-őr visszaküldte ezt a szövegmintát: tiltott kifejezést tartalmazott. A javaslat
              tartalma áll, a bemásolható szöveg szerkesztendő.
            </p>
          ) : null}
        </>
      )}

      <div className="sor" style={{ gap: 8 }}>
        {(["helyes", "nem-helyes", "nem-ertem"] as const).map((tipus) => (
          <form action={visszajelzestAd} key={tipus}>
            <input type="hidden" name="riport" value={riportAzonosito} />
            <input type="hidden" name="megallapitas" value={megallapitas.azonosito} />
            <input type="hidden" name="tipus" value={tipus} />
            <button className="gomb gomb--halk" type="submit">
              {tipus === "helyes" ? "Helyes" : tipus === "nem-helyes" ? "Nem helyes" : "Nem értem"}
            </button>
          </form>
        ))}
        {javaslat === undefined ? null : (
          <form action={megvalositastJelol}>
            <input type="hidden" name="riport" value={riportAzonosito} />
            <input type="hidden" name="javaslat" value={javaslat.azonosito} />
            <button className="gomb" type="submit">
              Megvalósítottuk
            </button>
          </form>
        )}
      </div>
    </article>
  );
}

export function Savok({ savok }: { readonly savok: readonly { nev: string; allapot: string; ertek: string }[] }) {
  return (
    <div className="savok">
      {savok.map((s) => (
        <div className={`sav sav--${s.allapot}`} key={s.nev}>
          <span className="sav__nev">{s.nev}</span>
          <span className="sav__ertek">{s.ertek}</span>
        </div>
      ))}
    </div>
  );
}
