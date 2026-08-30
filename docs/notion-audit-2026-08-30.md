# Notion-tudástár audit — a szoftverépítés szemszögéből

*2026-08-30 · élő SQL-lekérdezések a hét tár ellen*

Ez az audit egyetlen kérdést tesz fel minden tárra: **mi akadályozza, hogy egy
determinisztikus szoftver megbízhatóan használja?** Nem a tartalom minőségét méri
(az kiemelkedő) — a gépi olvashatóságot.

A leletek gépi megfelelője a `packages/kb-sync/src/konzisztencia.ts`: minden itt
felsorolt szerkezeti hiba ott ellenőrzésként is szerepel, hogy a szinkron a
jövőben magától jelezze.

## Hivatalos számok — mért állapot

| Tár | Dokumentált | Mért | Eltérés |
|---|---|---|---|
| ⚙️ Szabálytár | 4 453 | 4 453 (4 434 aktív, 19 karantén) | ✓ |
| 🔦 Jeltár | 275 | 275 | ✓ |
| 🎭 Technikatár | 108 | 108 | ✓ |
| ✅ Elvárás-lista | 86 | 86 | ✓ |
| 🏅 Aranystandard | 150 | 150 (mind Aktív) | ✓ |
| 🔬 Diszkrimináns-tár | 35 | **20** | **−15** |
| 🔗 Kombináció-tár | — | 10 | — |
| Jogi tétű technika | 14 | **21** | **+7** |

A D-tár kódjai D-001…D-035-ig futnak, de hézagosan (D-006–009, D-014–019,
D-025–029 nem létezik). A dokumentált „35" a legmagasabb kódszám, nem a sorszám.

## P0 — blokkolók

**1. Az MVP-mag nem adat, csak nézet.** Az `MVP-státusz` mező mind a 4 434 aktív
szabálynál üres. A 860-as szám egy Notion-nézet szűrőjéből származik. A szűrőt
reprodukálva (web/landing · Sáv 3 · Gépi+Félgépi) 908 sort kapok, jellel 736-ot —
a dokumentált 860 / 608 helyett. A szoftver így nem tudja megkérdezni, mi az
MVP-mag, és bármikor másképp válaszolhat, mint a nézet.
→ *Az `MVP-státusz` select feltöltése: a nézet szűrőjét adattá írni.*

**2. A gold elvárás-mezői emberi prózák.** A 150 sor tartalmilag hiánytalan, de a
kötelező elvárások szabad szövegben állnak, három géppel nehezen olvasható
konstrukcióval: 37 sorban zárójeles kód (kontextus vagy kötelező?), 21 sorban
per-jeles alternatíva kiírt VAGY nélkül, 114 sor tiltott mezője kódot tartalmaz
prózában — 3-ban explicit kivétellel („…MEGENGEDETT"). Ez az LLM-pontozókkal
működött; determinisztikus CI-hez strukturált mező kell.
→ *`Elvárt kötelező kódok` és `Tiltott kódok` relációként; a próza marad
magyarázatnak. Az `Elvárt jelek` reláció 108/150 sornál már megvan — az utat
csak végig kell vezetni.*

**3. Az „Állapot" mezőnév két különböző dolgot jelent.** A Szabálytárban és az
Elvárás-listában adatéletciklus (Aktív / Karantén / Visszavont). A Technikatárban
tartalmi minősítés (Aktív 28 · Vitatott 55 · **Kerülendő 25**): a TK-001 „Hamis
visszaszámláló" azért Kerülendő, mert a technika kerülendő — az adat teljesen
érvényes, és pont ezt kell detektálni. Aki karanténnak veszi, kizárja a sötét
mintákat a felismerési körből.
→ *A Technikatár mezőjét átnevezni (pl. „Használati minősítés"), vagy az
elhatárolást a Kódkönyvben rögzíteni.*

## P1 — a minőséget közvetlenül korlátozó hiányok

**4. 77 kétértelmű jel diszkrimináns teszt nélkül.** 96 jel `Kétértelmű`, a
D-tárban 20 teszt van. A Constitution szerint kétértelmű jelnél teszt kell,
különben „nem eldönthető". A D-tár a legkisebb és legkevésbé fejlett tár —
miközben éppen ez választja szét az álpozitívot a valódi találattól.

**5. Az MVP-mag technika-lefedettsége 58%.** A 736 jeles MVP-szabályból 425 van
technikához kötve, 469-nél van kötelező kontextus (64%). Mindkét KPI küszöbe
100%. Technika nélkül a riport nem tud ügyfél-érthető nevet adni.

**6. 872 aktív, artefaktum-hatókörű szabály jel nélkül (I8).** A 2 058-ból. Élőnek
látszanak, de semmi nem hívja elő őket — némán kiesnek. (A Baseline 1 251-es
számához képest javulás.)

**7. Az Elvárás-lista 69%-a nincs jelhez kötve.** 59/86 sornál üres a `Hiány-jel`,
50/86-nál a `Tükör-szabály`. A „pozitívan hiányzó" detekció így szövegértelmezésre
szorul ott, ahol relációval determinisztikus lehetne.

**8. A Kombináció-tár 10 soros.** Az erősítő/kioltó párok MVP-funkciók („vezesd be
együtt" csomagok). 10 pár 275 jelre kevés — a riport e szekciója üres marad.

## P2 — olcsón javítható

- **103 jel (37%) nincs technikához kötve**; 6 jel egyetlen szabályt sem vált ki;
  36-nál nincs álpozitív-kockázat leírás.
- **30 jelnél nincs `Megfigyelés időbelisége`** — pedig ez dönti el, hogy
  pillanatképből tényként állítható-e. A bizonyíték-fegyelem alapja.
- **222 szabálynál nincs Beavatkozási arány, 147-nél Bizonyítékerő.** A kettő
  szorzata a rangsor — nélkülük a top-5 sorrendje nem számolható.
- **18 gold-sor „levezetett" jelöléssel**, Albert megerősítése nélkül.

## Amit nem kell javítani

Érdemes rögzíteni, mi van rendben, mert ez szokatlanul jó:

- **Jeltár**: 275/275 megnevezés és megfigyelési módszer kitöltve, 0 hiány.
- **Technikatár**: 108/108 sornál kitöltve a meghatározás, a sötét és a legitim
  változat **és** a kettő közti választóvonal.
- **Elvárás-lista**: 86/86 sornál kitöltve a „Mit kell tartalmaznia", a „Hogyan
  ellenőrizhető" **és** a „Mikor NEM elvárás". A kizáró feltétel megléte ritka
  fegyelem.
- **Aranystandard**: 150/150 Aktív, 0 hiányzó befagyasztott tartalom, kötelező
  elvárás, tiltott találat, sikerkritérium vagy kontextus.
- **Hatásossági szabályok**: 2 464-ből csak 4-nél hiányzik a „Rossz → jó".

## Javasolt sorrend

1. `MVP-státusz` feltöltése — a nézet adattá tétele. Feloldja a P0/1-et.
2. Gold strukturált mezők + a 150 sor átvezetése. A legnagyobb tétel, de ez nyitja
   meg a determinisztikus CI-t.
3. D-tár feltöltése a 77 kétértelmű jelre. A legnagyobb minőségi hozam.
4. MVP-mag technika- (311 sor) és kontextus-kötése (267 sor).
5. Kódkönyv: az „Állapot" elhatárolás rögzítése; a D-tár és a jogi tétű technikák
   számának javítása a Baseline-ban.
