# Notion-tudástár audit — a szoftverépítés szemszögéből

*2026-08-30 · élő SQL-lekérdezések a hét tár ellen + a Kódkönyv teljes szövege*

Ez az audit két kérdést tesz fel minden tárra: **mi akadályozza, hogy egy
determinisztikus szoftver megbízhatóan használja**, és **hol kevés az anyag ahhoz,
hogy az audit jó legyen**. A tárak tartalmi minősége kiemelkedő — a hiányok nem ott
vannak, ahol keresnénk őket.

A szerkezeti leletek gépi megfelelője a `packages/kb-sync/src/konzisztencia.ts`:
minden ott ellenőrzésként is szerepel, hogy a szinkron a jövőben magától jelezze.

Vizuális összefoglaló: [A tudástár készültsége](https://claude.ai/code/artifact/514227e6-193f-4ec6-a86d-3bca1963c696)

## Hivatalos számok — mért állapot

| Tár | Dokumentált | Mért | Eltérés |
|---|---|---|---|
| ⚙️ Szabálytár | 4 453 | 4 453 (4 434 aktív, 19 karantén) | ✓ |
| 🔦 Jeltár | 275 | 275 | ✓ |
| 🎭 Technikatár | 108 | 108 | ✓ |
| ✅ Elvárás-lista | 86 | 86 | ✓ |
| 🏅 Aranystandard | 150 | 150 (mind Aktív) | ✓ |
| 🔬 Diszkrimináns-tár | 35 | **20** | **−15** |
| Jogi tétű technika | 14 | **21** | **+7** |
| MVP-mag (futtatható) | 860 | **908** | **+48** |
| 🔗 Kombináció-tár | — | 10 | nincs cél |

A D-tár kódjai D-001…D-035-ig futnak, de hézagosan (D-006–009, D-014–019,
D-025–029 nem létezik). A dokumentált „35" a legmagasabb kódszám, nem a sorszám.
A jogi tétű technikáknál fordított a helyzet: 14 helyett 21 van, ezért az
aranystandard „14/14 jogi tétű technika fedett" állítását újra kell mérni — hét
technika lefedettsége ismeretlen.

## P0 — a legnagyobb lelet: két V1 hatókörnek nincs taxonómiája

A Product Constitution szerint a V1 négy artefaktumot vizsgál: weboldal/webshop,
landing, **checkout** és **cookie/hozzájárulási felület**. A Szabálytár
`Artefaktum-osztály` mezőjében viszont nincs „Checkout" és nincs „Cookie banner"
érték — a lekérdezés mindkettőre **0 szabályt** ad. A `Felület` dimenzió sem
pótolja: az F01–F17 kódlistában nincs checkout és nincs hozzájárulási felület.

A Kódkönyv teljes szövegében (211 512 karakter) a „checkout", „kosár", „pénztár",
„cookie", „süti", „hozzájárulás" és „consent" szó **nullaszor** fordul elő.

| V1 artefaktum-osztály | Szabály | Gold-teszt |
|---|---|---|
| Weboldal / webshop | 1 560 | 47 |
| Landing oldal | 553 | 23 |
| **Checkout** | **0** | 13 |
| **Cookie banner** | **0** | 9 |

Az aranystandardban 22 olyan teszt van, amelynek artefaktum-osztályára a
szabály-előhívás nem tud szűrni.

→ *Két új `Artefaktum-osztály` érték és két új F-kód (checkout / fizetési folyamat;
hozzájárulási és adatkezelési felület), majd a meglévő szabályok átcímkézése. A
jelanyag részben megvan: a Jeltár „8 Adatkezelési" osztálya 8 jelet tartalmaz — ez
viszont a legkisebb jelosztály, és egy egész V1 artefaktum-osztályt kellene
kiszolgálnia.*

## P0 — szerkezeti blokkolók

**1. Az MVP-mag nem adat, csak nézet.** Az `MVP-státusz` mező mind a 4 434 aktív
szabálynál üres. A 860-as szám egy Notion-nézet szűrőjéből származik. A szűrőt
reprodukálva (web/landing · Sáv 3 · Gépi+Félgépi) 908 sort kapok, jellel 736-ot —
a dokumentált 860 / 608 helyett. A szoftver így nem tudja megkérdezni, mi az
MVP-mag, és bármikor másképp válaszolhat, mint a nézet.
→ *Az `MVP-státusz` select feltöltése: a nézet szűrőjét adattá írni.*

**2. A gold elvárás-mezői emberi prózák.** A 150 sor tartalmilag hiánytalan, de a
kötelező elvárások szabad szövegben állnak, három géppel kétértelmű konstrukcióval:
37 sorban zárójeles kód (kontextus vagy kötelező tétel?), 21 sorban per-jeles
alternatíva kiírt VAGY nélkül, 114 sor tiltott mezője kódot tartalmaz prózában —
3-ban explicit kivétellel („…MEGENGEDETT"). Ez az LLM-pontozókkal működött;
determinisztikus CI-hez strukturált mező kell.
→ *`Elvárt kötelező kódok` és `Tiltott kódok` relációként; a próza marad
magyarázatnak. Az `Elvárt jelek` reláció 108/150 sornál már megvan — az utat csak
végig kell vezetni.*

**3. Az „Állapot" mezőnév két különböző dolgot jelent.** A Szabálytárban és az
Elvárás-listában adatéletciklus (Aktív / Karantén / Visszavont). A Technikatárban
tartalmi minősítés (Aktív 28 · Vitatott 55 · **Kerülendő 25**): a TK-001 „Hamis
visszaszámláló" azért Kerülendő, mert a technika kerülendő — az adat teljesen
érvényes, és pont ezt kell detektálni. Aki karanténnak veszi, kizárja a sötét
mintákat a felismerési körből.
→ *A Technikatár mezőjét átnevezni (pl. „Használati minősítés"), vagy az
elhatárolást a Kódkönyvben rögzíteni, ahogy az I12-elv is ki lett mondva.*

## Tartalmi bővítés — hol kevés az anyag

Nem szerkezeti hibák, hanem hiányzó anyag. Ezek határozzák meg, mennyire lesz jó az
audit, ha minden más működik.

**A Diszkrimináns-tár 20 teszttel szolgál ki 96 kétértelmű jelet.** 77 kétértelmű
jelhez nem tartozik teszt. A Constitution szerint kétértelmű jelnél diszkrimináns-
tesztet kell futtatni, és ha az nem dönthető, a riport „nem eldönthető"-t ír — teszt
nélkül minden ilyen jel automatikusan ide fut ki. A kétértelműség eloszlása megmondja,
hol kezdjük: a „6 Nyelvi minta" osztály 60 jeléből **32 kétértelmű**, ez a legnagyobb
egybefüggő csomó. (A „9 Fordulóközi minta" 14 jeléből 12 kétértelmű, de az V2-hatókör.)

**A Kombináció-tár 10 soros.** Az erősítő/kioltó párok MVP-funkciót szolgálnak ki: a
„vezesd be együtt" csomagok és a riportsablon külön szekciója épül rájuk. 10 pár 275
jelre és 108 technikára azt jelenti, hogy a szekció a legtöbb auditon üres marad. A tár
szerkezetileg hibátlan — mind a 10 sornál ki van töltve a viszony, a hatás iránya és az
együttálló jelek —, egyszerűen kevés. Kiindulás: a két próba-audit (Billingo, Zenon) 27
és 31 észlelt jele közti valós együttállások. Cél nagyságrendileg 40–60 pár.

**Három jelosztály alulméretezett.** Eloszlás: 6 Nyelvi minta 60 · 2 Hiány 59 ·
1 Jelenlét 48 · 3 Mennyiség 30 · **4 Elrendezés 21** · **7 Vizuális minta 20** ·
5 Időzítés 15 · 9 Fordulóközi 14 · **8 Adatkezelési 8**. A „2 Hiány" osztály 59 jele
jó hír — a kalibrációs futások fő vakfoltja a hiány-típusú jelek felismerése volt, és a
szótár nem szűkös. A gond máshol van: az elrendezés (hajtás feletti pozíció, vizuális
súly) a weboldal-auditok gerince, a vizuális minta a V1.5 képernyőkép-ágának teljes
alapja, az adatkezelés pedig egy egész V1 artefaktum-osztályé.

**Az aranystandard 85%-a szintetikus.** 128 teszt fiktív márkával készült, 22 él valódi
befagyasztott artefaktumból. A szintetikus mintának megvan a helye — célzottan fedi a
ritka jeleket és a tükörpárokat —, de azt kódolja, amit már tudunk. A valódi oldalak
mutatnak olyat, amire nem számítottunk: a két próba-audit minden rendszer-tanulsága
(dedup-réteg, „kié a határidő" diszkrimináns, belső ellentmondás jel) élő oldalról jött.
Élő minta eloszlása: weboldal 13, landing 4, cikk 4, checkout 1. **Cookie banner,
hirdetés, e-mail, chat, videó és csomagolás: nulla élő minta.**

**30 technikának legfeljebb egy jele van** (2-nek nulla, 28-nak pontosan egy). A
determinisztikus kódkiadás-ellenőrző első szabálycsoportja épp a jelpár-teljesség
(TK-066→J-239, TK-061→J-174 és társaik): egyetlen jellel nincs mit ellenőrizni, és a
technika kiadása egyetlen megfigyelésen áll. **Hat jogi tétű technikának van legfeljebb
egy jele** — ezek azok, ahol a téves kiadás jogi állítást visz ki az ügyfélhez.

## P1 — kötések, amik nem érnek össze

**Az MVP-mag technika-lefedettsége 58%.** A 736 jeles MVP-szabályból 425 van
technikához kötve, 469-nél van kötelező kontextus (64%). Mindkét KPI küszöbe 100%. A
technika a riport nyelve: nélküle a megállapítás csak szabálykódot tud mondani ott,
ahol a Constitution szerint úgy kellene beszélnie, hogy „itt társas bizonyíték hiányzik
a döntési pont mellett". A kontextus pedig azt dönti el, mikor NEM érvényes a szabály.

**872 aktív, artefaktum-hatókörű szabály jel nélkül (I8).** A 2 058-ból. Élőnek
látszanak, de semmi nem hívja elő őket — némán kiesnek. (A Baseline 1 251-es számához
képest javulás.) Egy részük szándékosan emberi (a dokumentált 42 valóban emberi
szabály); a többinél a jel hiánya nem döntés, hanem elmaradás — és a kettő ma nem
különböztethető meg. Érdemes a szándékosan emberi sorokat megjelölni, hogy a mérés
tisztuljon.

**Az Elvárás-lista 69%-a nincs jelhez kötve.** 59/86 sornál üres a `Hiány-jel`, 50/86-nál
a `Tükör-szabály`. A szöveges mezők közben hiánytalanok — az anyag megvan, csak nincs
jelhez kötve, így a hiány-ellenőrzés minden körben újraértelmezi ugyanazt a szöveget.

**1 156 szabálynál (26%) nincs Mechanizmus-kód.** Ez a kimenet öt kötelező kérdésének a
másodika: miért pont ezek a technikák hatnak itt. A hiánya nem tiltó (jelölni kell), de
a javaslat magyarázó ereje nélküle sokkal kisebb — ez teszi az auditot tanácsadói
anyaggá a checklist helyett.

## P2 — olcsón javítható

- **103 jel (37%) nincs technikához kötve**; 6 jel egyetlen szabályt sem vált ki;
  36-nál nincs álpozitív-kockázat leírás.
- **30 jelnél nincs `Megfigyelés időbelisége`** — pedig ez dönti el, hogy
  pillanatképből tényként állítható-e. A bizonyíték-fegyelem alapja.
- **222 szabálynál nincs Beavatkozási arány, 147-nél Bizonyítékerő.** A kettő szorzata
  a rangsor — nélkülük a top-5 sorrendje nem számolható.
- **820 aktív szabálynál nincs Artefaktum-osztály.**
- **18 gold-sor „levezetett" jelöléssel**, Albert megerősítése nélkül.

## Amit nem kell javítani

Érdemes rögzíteni, mi van rendben, mert ez szokatlanul jó — és mert ez adja meg,
mennyi maradt hátra.

- **Jeltár**: 275/275 megnevezés és megfigyelési módszer kitöltve, 0 hiány.
- **Technikatár**: 108/108 sornál kitöltve a meghatározás, a sötét és a legitim
  változat **és** a kettő közti választóvonal.
- **Elvárás-lista**: 86/86 sornál kitöltve a „Mit kell tartalmaznia", a „Hogyan
  ellenőrizhető" **és** a „Mikor NEM elvárás". A kizáró feltétel következetes megléte
  ritka fegyelem.
- **Aranystandard**: 150/150 Aktív, 0 hiányzó befagyasztott tartalom, kötelező elvárás,
  tiltott találat, sikerkritérium vagy kontextus.
- **Hatásossági szabályok**: 2 464-ből csak 4-nél hiányzik a „Rossz → jó".
- **Diszkrimináns-tár**: 20/20 tesztnél ott az IGEN ág, a NEM ág és a „ha nem
  eldönthető" válasz. Kevés van belőlük, de amelyik van, az teljes.

## Javasolt sorrend

Nem fontosság szerint, hanem aszerint, hogy mi nyit meg mit.

1. **Checkout és cookie taxonómia felvétele.** Két `Artefaktum-osztály` érték, két
   F-kód, Kódkönyv-bővítés. Enélkül a V1 fele nem auditálható, és a 22 meglévő
   gold-teszt vakon fut.
2. **`MVP-státusz` feltöltése.** A nézet szűrőjét adattá tenni. Egy munkamenet, és
   utána minden lefedettségi mérés ugyanazt a halmazt nézi.
3. **A gold strukturált mezői.** A legnagyobb kézi tétel, de ez nyitja meg a
   determinisztikus CI-t.
4. **Diszkrimináns-tesztek a 32 kétértelmű nyelvi jelre.** A legnagyobb minőségi hozam
   egyetlen körben: minden elkészült teszt egy „nem eldönthető" válasz helyére tesz
   állítást.
5. **Adatkezelési és elrendezés-jelek bővítése**, a cookie-taxonómiával együtt.
6. **MVP-mag technika- (311 sor) és kontextus-kötése (267 sor).** Mechanikus munka, de
   a zárt alfa KPI-ja mindkettőre 100%.
7. **Élő checkout- és cookie-minták befagyasztása a goldba.** 8–10 valódi folyamat; a
   cookie-banner külön lekéréssel (első betöltés, süti nélkül).
8. **Kombináció-tár bővítése 40–60 párra.**
9. **Kódkönyv:** az „Állapot" elhatárolás rögzítése; a Diszkrimináns-tár és a jogi tétű
   technikák számának javítása a Baseline-ban.
