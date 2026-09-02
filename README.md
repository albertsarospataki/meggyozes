# Convictly — meggyőzés-technikai szakértő

Meggyőzés-technikai audit és javaslatlista weboldalról, landingről, checkoutról és
cookie-folyamatról. A rendszer felismeri, mely technikák dolgoznak a felületen és
miért, mi működik jól és mi nem, és konkrét, bemásolható szövegmintával megmondja,
mitől győzne meg nagyobb valószínűséggel.

**Mérvadó dokumentumok (Notion):** 📜 Product Constitution v1.0 · 🧭 Current Execution
Baseline v2.0 · 🛠️ Szoftver-réteg fejlesztői specifikáció v1.0 · 🔁 Kód-ekvivalencia
térkép v4 · 🏅 Aranystandard v1.0 (150 teszt) · 📄 Szoftver-brief v2.0 (három üzemmód,
brand-memória, kredit-alapú előfizetés).

A v2.0 brief leképezése kódra — és ami szándékosan kimaradt — a
[docs/brief-v2-terkep.md](docs/brief-v2-terkep.md) fájlban.

## Hol tart a kód

Ez a repó a **döntési és szerződéses réteget** tartalmazza: a tudásbázis-szinkront, a
kalibrációs CI-t, és a v2.0 brief termék-rétegét (brand-memória, szervezet és kredit,
projekt, a három üzemmód szabályai, tanulási hurok). Közös bennük, hogy tiszta logika:
LLM, adatbázis, Stripe és böngésző nélkül futtatható, mérhető és tesztelhető.

A C és E réteg készült el elsőként, szándékosan:

- a tudásbázis Notionben él, ami futásidejű lekérdezésre alkalmatlan (lassú,
  rate-limitelt, és a 100 soros lapkorlát pontosan itt okozta a történelmi
  csonkulási hibát) — amíg nincs verziózott lokális pillanatkép, semmi más nem
  építhető rá megbízhatóan;
- a 150 tesztes aranystandard mint CI teszi objektíven mérhetővé az összes további
  változtatást (prompt, modellváltás, DET-szabály, új szabálytömeg). Ha ez később
  készülne el, a mért 90%-os PASS-arányt bármikor észrevétlenül elveszítenénk.

| Komponens | Állapot |
|---|---|
| A — bemeneti réteg (URL / képernyőkép / szöveg / videó) | nincs |
| B — elemző mag (LLM + determinisztikus ellenőrző) | nincs |
| **C — tudásbázis-szinkron** | **kész** |
| D — riport-generátor | nincs (a riport szerkezete típusban áll) |
| **E — kalibrációs / QA-modul** | **kész (pontozó + kapuk három módra)** |
| F — ügyfél-felület | nincs |
| **G — szervezet, szerep, előfizetés, kredit** | **kész (üzleti logika; Stripe nincs)** |
| **H — tenant-szigetelés** | **kész (döntési réteg; RLS nincs)** |
| **I — brand-memória** | **kész** |
| J — visszakereső (RAG-index) | szűrés és őrök készen, index nincs |
| **K — tanulási hurok** | **kész** |
| L — média-feldolgozó (ASR, kulcskép, OCR) | nincs |

## Csomagok

- **`packages/core`** — a kódnyelvtan (J/TK/S/D/EL/K kódok elemzése, normalizálása,
  szabad szövegből való kinyerése) és a domain típusok. Minden pontozás, dedup és
  determinisztikus ellenőrzés kódösszehasonlításon áll, ezért ez a legalsó réteg.
- **`packages/kb-sync`** — Notion → verziózott pillanatkép. Teljes lapozás,
  reláció-feloldás kódokra, konzisztencia-ellenőrzés (I8, I12, karantén, árva
  reláció, MVP-lefedettség), előhívási index a P7 lépéshez.
- **`packages/kalibracio`** — a Kód-ekvivalencia térkép futásidejű alakja, az
  aranystandard-pontozó a 8 pontozási szabállyal, a release-kapuk és a
  regresszió-riasztás; a Tanács, a Kérdezz és a brand-őr kapui, tanuló/held-out
  kettős számmal.
- **`packages/brand`** — az I komponens: brand-profil séma, készültség 0–5, és a
  brand-őr (DET 8. szabálycsoport) a rendszer saját kimenetére.
- **`packages/szervezet`** — csomagkorlátok, kredit-árlista, tételes kredit-főkönyv,
  szerep-mátrix és adatszigetelés.
- **`packages/projekt`** — az adatmodell, a projekt-idővonal, a köteg és az
  előtte/utána összehasonlítás a megvalósítási aránnyal.
- **`packages/tanacs`** — a hét konstrukció-típus, a verziózott Intent, az 1C belépő
  kérdéscsomagok, a §4/b kemény KO-kapu és a brief-generátor.
- **`packages/kerdezz`** — kérdés-osztályozás, visszakeresés-szűrés karantén-tilalommal
  és relevancia-küszöbbel, a hat blokkos válasz-kártya négy őrrel.
- **`packages/tanulas`** — visszajelzés → anonimizált tanulási jelölt, held-out
  fegyelem, heti kurátori csomag.
- **`packages/folyamat`** — a rétegek összekötése: indítás négy kapuval (jogosultság →
  csomagkorlát → kredit → terhelés) és lezárás (HUM-kapu, brand-őr, visszaírás).

## Az alkalmazás

**Nem fejlesztőknek:** [docs/telepites.md](docs/telepites.md) — Node.js telepítése, a
projekt letöltése, majd Terminálban `bash ` + a `scripts/convictly-inditas.command`
fájl behúzása. (A dupla kattintás azért nem elsődleges út, mert a ZIP-ből letöltött
szkript futtatási jogát a macOS nem adja meg.)

```bash
pnpm install
pnpm app:build          # a csomagok + a Next.js alkalmazás
ALFA_MEGHIVO=alfa pnpm app:start     # http://localhost:3000
```

Belépés a meghívó-kóddal (`ALFA_MEGHIVO`, alapértelmezés: `alfa`). Az alfa nem
csomag, hanem állapot: Pro-képességek kártya nélkül, a havi keret az
`ALFA_HAVI_KREDIT` változóból. Az adatbázis SQLite, alapból `.adat/convictly.sqlite`.

Az URL-ajtó valódi böngészőt indít (Playwright). Ahol a Chromium már ott van a gépen,
a `CHROMIUM_UTVONAL` felülírja a keresést.

Az arculat a **Convictly brandbook v2.0** tokenjeire épül
(`apps/web/app/globals.css`): a forrás a brandbook, a tokenfájl belőle készül.

| Oldal | Mit ad |
|---|---|
| Vezérlőpult | aktív brand készültsége, következő lépés, kredit, legutóbbi riportok |
| Brandek | brand-profil kérdőív, bizonyíték-tár, tiltólista és hangnem, készültség-tábla |
| Audit | négy ajtóból kettő élesben (URL, szöveg), P0 kontextus, kredit-előnézet |
| Riport | összefoglaló, korlátok elöl, négy sáv, pozitív visszaigazolás, top-5, brand-egyezés, szakértői tábla, tisztázó kérdések |
| Tanács | konstrukció-felismerés, egyenkénti bekérés, Intent-panel, előzetes validáció építési sorrenddel |
| Kérdezz | hat blokkos válasz-kártya, forrás-kötelezettséggel és hiány-ággal |
| Előfizetés | csomagkorlátok, kredit-árlista, tételes kredit-történet |
| Admin | HUM-kapu sor, tudásbázis-állapot, CI-kapuk, kurátori csomag |

## A szabályok működés közben

A döntési réteg egy oldalon kipróbálható: a panelek a `packages/` moduljait futtatják a
böngészőben, változtatás nélkül.

```bash
pnpm demo:build     # demo/dist/meggyozes-demo.html — egyetlen, önálló fájl
```

A köteg beágyazva utazik (nulla hálózati függés), a forrás a `demo/` mappában van.
Publikált változat: <https://claude.ai/code/artifact/99313b00-657f-4a5c-8c78-daa59aac5217>

## Indulás

```bash
pnpm install
pnpm ellenoriz          # typecheck + teljes tesztkészlet
```

Szinkronhoz Notion integrációs token kell:

```bash
cp .env.example .env    # töltsd ki a NOTION_TOKEN-t
pnpm kb:sync
```

Az integrációt a Notion **Settings → Connections** alatt kell létrehozni (csak
olvasás), majd meg kell osztani vele mind a hét tárat. A `packages/kb-sync/src/forrasok.ts`
tartalmazza a data source ID-ket.

## Két elv, ami minden döntést felülír

**Nulla álpozitív.** Technikamentes oldalon a nulla találat az elvárt, HELYES kimenet.
A legitim technikahasználat pozitív visszaigazolást kap, nem kifogást. Hat kalibrációs
futáson át 222/222 kontroll igazolta, hogy ez elérhető — a szoftver ezt nem rontja el.
Egyetlen kontroll-álpozitív azonnali release-blokk.

**A hiba legyen hangos.** A rendszer legdrágább hibái nem hibaüzenetként, hanem
HIÁNYZÓ MEGÁLLAPÍTÁSKÉNT jelennének meg az ügyfél riportjában: egy jel nélküli
szabály, egy feloldhatatlan reláció, egy lapozásnál levágott lekérdezés. A kód ezért
minden ilyen helyen inkább leáll vagy jelez, mint hogy csendben kevesebbet adjon.

## Release-kapuk

Minden detektor-változat élesítése előtt kötelező vak futás a 150 tesztes
aranystandardon. A kapuk (Product Constitution §6, kalibrált mércék 2026-08-29):

| Kapu | Küszöb | #6 futás mért értéke |
|---|---|---|
| PASS-arány | ≥ 85% | 90,0% |
| Kötelező kód-recall | ≥ 92% | 96,7% |
| Kontroll-álpozitív | = 0 | 0 |
| Tiltott találat | ≤ 1% | 0,7% |

A v2.0 két új üzemmódot és egy új őrt hoz, mindegyiket **saját bázissal** — közös
átlag helyett, mert egy összevont szám elrejtené, ha a Kérdezz mód forrás nélküli
állítást enged ki, miközben az audit szépen teljesít. Minden kapu **két számot** mutat,
tanuló és held-out bontásban, és csak akkor élesíthető, ha mindkettő zöld.

| Kapu | Mérce | Bázis |
|---|---|---|
| Tanács | PASS ≥ 85% · fordított kontrollon lebeszélés 100% · saját javaslat KO-sértés = 0 | 30 terv-gold |
| Kérdezz | forrás nélküli állítás = 0 · hiány-kimondás a kontrollokon 100% · küszöb alatti forrásból épült válasz = 0 | 40 Q&A-gold (30/10) |
| Brand-őr | tiltott kifejezés = 0 · nem igazolt szám = 0 | 20 brand-teszt |

## Három elv, ami a v2.0 rétegben ismétlődik

**A rendszer saját kimenete szigorúbb mérce alá esik, mint az ügyfélé.** Az auditban a
nulla álpozitív elv miatt inkább nem állítunk valamit; a saját javaslatnál fordítva —
inkább visszaküldjük, mint hogy tiltott kifejezés vagy kitalált szám menjen ki az
ügyfél nevében. Egy audit, ami elnéz valamit, egy elmaradt javítást ér; egy tanács,
ami sötét mintát javasol, létrehozza a kárt.

**A hiány kimondása válasz, nem kudarc.** Ha a tudásbázisban nincs mért eredmény, a
Kérdezz mód ezt mondja ki, és megmondja, mit lehetne megmérni hozzá. A magabiztos
válasz küszöb alatti forrásokból a legveszélyesebb kimenet.

**A tanulás jelöltekkel megy, nem önmódosítással.** A Notion a szerkesztőségi igazság,
a runtime soha nem ír vissza. A hurok anonimizált jelölteket termel, ember dönt, és
held-out készletből soha nem lesz szabály — különben a mérce a saját tanulóanyagává
válna.
