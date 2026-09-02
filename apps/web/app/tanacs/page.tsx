import { Hej } from "@/components/hej";
import { KONSTRUKCIO_NEVEK, KONSTRUKCIO_TIPUSOK, belepoCsomag, type KonstrukcioTipus } from "@meggyozes/tanacs";
import { ar } from "@meggyozes/szervezet";
import { tanacsMezotMent, tanacsotIndit, tanacsotValidal } from "@/lib/muveletek";
import { fokonyv, menesztVagyBelepes, tar } from "@/lib/tar";

/**
 * Tanács (brief 3.2, brandbook 8.5).
 *
 * Bal oldalon a beszélgetés, jobb oldalon az Intent-panel. Beszélni és kattintani
 * ugyanaz: amit a beszélgetésben megadsz, az azonnal a panelen van, és fordítva.
 * A rendszer egyenként kérdez — a tízmezős űrlap elriaszt, a beszélgetés nem.
 */
export default async function Tanacs({
  searchParams,
}: {
  readonly searchParams: Promise<{ szal?: string; hiba?: string; uzenet?: string }>;
}) {
  const { szal, hiba, uzenet } = await searchParams;
  const m = await menesztVagyBelepes();
  const t = tar();
  const egyenleg = fokonyv(m.hatokor);

  type Allapot = {
    mondat: string;
    felismeres: { tipus: KonstrukcioTipus | undefined; kerdezniKell: boolean; kerdes: string | undefined };
    mezok: Record<string, string>;
  };

  const allapot = szal === undefined ? undefined : t.beszelgetes<Allapot>(m.hatokor, szal);
  const tipus = allapot?.felismeres.tipus;
  const csomag = tipus === undefined ? [] : belepoCsomag(tipus);
  const kitoltott = allapot?.mezok ?? {};
  const kovetkezo = csomag.find((k) => (kitoltott[k.mezo] ?? "") === "");

  return (
    <Hej aktiv="/tanacs">
      <div className="oldalfej">
        <span className="eyebrow">Tanács · készülő konstrukció</span>
        <div className="oldalfej__sor">
          <h1>Mit terveztek?</h1>
          <span className="small nums">{ar({ tipus: "intent_validalas" }).osszesen} kredit / validáció</span>
        </div>
        <p className="lead olvaso">
          Egy mondat elég. Felismerem a konstrukció típusát, és rákérdezek arra, amit nem tudok —
          aztán megmondom, mi a kockázat, mi a jó benne, és milyen sorrendben építsétek.
        </p>
      </div>

      {hiba !== undefined ? (
        <div className="kartya kartya--sik" style={{ borderColor: "var(--risk)" }}>
          <span className="badge badge--hibas">Nem futott le</span>
          <p>{uzenet ?? "A validáció nem indítható."}</p>
        </div>
      ) : null}

      {allapot === undefined ? (
        <form action={tanacsotIndit} className="kartya">
          <div className="mezo">
            <label htmlFor="mondat">Mondd el egy mondatban</label>
            <input id="mondat" name="mondat" type="text" placeholder="Jövő héten 20% a webshopon." />
          </div>
          <div className="sor sor--kozott">
            <span className="small nums">Egyenleg: {egyenleg.osszesen} kredit</span>
            <button className="gomb gomb--mod" type="submit">
              Kezdjük
            </button>
          </div>
        </form>
      ) : (
        <div className="sor beszelgetes-elrendezes" style={{ alignItems: "flex-start", gap: 20 }}>
          <div className="oszlop" style={{ flex: 1, minWidth: 0 }}>
            <div className="kartya beszelgetes">
              <div className="uzenet uzenet--tolem">
                <span className="uzenet__ki">Te</span>
                <span className="uzenet__buborek">{allapot.mondat}</span>
              </div>

              <div className="uzenet">
                <span className="uzenet__ki">Convictly</span>
                <span className="uzenet__buborek">
                  {tipus === undefined
                    ? (allapot.felismeres.kerdes ?? "Milyen konstrukciót terveztek?")
                    : `Ezt ${KONSTRUKCIO_NEVEK[tipus]}-ként olvasom. ${
                        kovetkezo === undefined
                          ? "Minden megvan, amit kérdezni szoktam — validálhatjuk."
                          : kovetkezo.kerdes
                      }`}
                </span>
              </div>

              {tipus === undefined ? (
                <form action={tanacsMezotMent} className="sor">
                  <input type="hidden" name="szal" value={szal} />
                  <select name="tipus" defaultValue="" aria-label="Konstrukció típusa" style={{ width: "auto" }}>
                    {KONSTRUKCIO_TIPUSOK.map((x) => (
                      <option key={x} value={x}>
                        {KONSTRUKCIO_NEVEK[x]}
                      </option>
                    ))}
                  </select>
                  <button className="gomb" type="submit">
                    Ez az
                  </button>
                </form>
              ) : kovetkezo === undefined ? (
                <form action={tanacsotValidal}>
                  <input type="hidden" name="szal" value={szal} />
                  <button className="gomb gomb--mod" type="submit">
                    Validálom
                  </button>
                </form>
              ) : (
                <form action={tanacsMezotMent} className="oszlop" style={{ gap: 8 }}>
                  <input type="hidden" name="szal" value={szal} />
                  <input type="hidden" name="mezo" value={kovetkezo.mezo} />
                  <div className="mezo">
                    <label htmlFor="ertek">
                      <span className="mono">{kovetkezo.kod}</span> · {kovetkezo.kerdes}
                    </label>
                    <input id="ertek" name="ertek" type="text" placeholder="A válaszod" />
                    <span className="small">{kovetkezo.indoklas}</span>
                  </div>
                  <button className="gomb" type="submit">
                    Válasz mentése
                  </button>
                </form>
              )}
            </div>
          </div>

          <aside className="intent-panel">
            <div className="kartya">
              <div className="sor sor--kozott">
                <span className="eyebrow">Intent</span>
                <span className="chip">
                  {Object.keys(kitoltott).length} / {csomag.length === 0 ? 9 : csomag.length} mező
                </span>
              </div>
              {tipus === undefined ? (
                <p className="small">A típus még nincs eldöntve.</p>
              ) : (
                <div className="oszlop" style={{ gap: 0 }}>
                  <div className="intent-sor">
                    <span className="intent-sor__kulcs">típus</span>
                    <span className="intent-sor__ertek">{KONSTRUKCIO_NEVEK[tipus]}</span>
                  </div>
                  {csomag.map((k) => (
                    <div className="intent-sor" key={k.kod}>
                      <span className="intent-sor__kulcs">{k.mezo}</span>
                      <span
                        className={`intent-sor__ertek ${(kitoltott[k.mezo] ?? "") === "" ? "intent-sor__ertek--ures" : ""}`}
                      >
                        {(kitoltott[k.mezo] ?? "") === "" ? "—" : kitoltott[k.mezo]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </Hej>
  );
}
