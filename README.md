# Meggyőzés szoftver

Meggyőzés-technikai audit és javaslatlista weboldalról, landingről, checkoutról és
cookie-folyamatról. A rendszer felismeri, mely technikák dolgoznak a felületen és
miért, mi működik jól és mi nem, és konkrét, bemásolható szövegmintával megmondja,
mitől győzne meg nagyobb valószínűséggel.

**Mérvadó dokumentumok (Notion):** 📜 Product Constitution v1.0 · 🧭 Current Execution
Baseline v2.0 · 🛠️ Szoftver-réteg fejlesztői specifikáció v1.0 · 🔁 Kód-ekvivalencia
térkép v4 · 🏅 Aranystandard v1.0 (150 teszt).

## Hol tart a kód

Ez a repó a fejlesztői specifikáció **C** (tudásbázis-szinkron) és **E**
(kalibrációs/QA-modul) komponensét tartalmazza. Ez a két réteg készült el először,
szándékosan:

- a tudásbázis Notionben él, ami futásidejű lekérdezésre alkalmatlan (lassú,
  rate-limitelt, és a 100 soros lapkorlát pontosan itt okozta a történelmi
  csonkulási hibát) — amíg nincs verziózott lokális pillanatkép, semmi más nem
  építhető rá megbízhatóan;
- a 150 tesztes aranystandard mint CI teszi objektíven mérhetővé az összes további
  változtatást (prompt, modellváltás, DET-szabály, új szabálytömeg). Ha ez később
  készülne el, a mért 90%-os PASS-arányt bármikor észrevétlenül elveszítenénk.

| Komponens | Állapot |
|---|---|
| A — bemeneti réteg (URL / képernyőkép / szöveg) | nincs |
| B — elemző mag (LLM + determinisztikus ellenőrző) | nincs |
| **C — tudásbázis-szinkron** | **kész** |
| D — riport-generátor | nincs |
| **E — kalibrációs / QA-modul** | **kész (pontozó + kapuk)** |
| F — ügyfél-felület | nincs |

## Csomagok

- **`packages/core`** — a kódnyelvtan (J/TK/S/D/EL/K kódok elemzése, normalizálása,
  szabad szövegből való kinyerése) és a domain típusok. Minden pontozás, dedup és
  determinisztikus ellenőrzés kódösszehasonlításon áll, ezért ez a legalsó réteg.
- **`packages/kb-sync`** — Notion → verziózott pillanatkép. Teljes lapozás,
  reláció-feloldás kódokra, konzisztencia-ellenőrzés (I8, I12, karantén, árva
  reláció, MVP-lefedettség), előhívási index a P7 lépéshez.
- **`packages/kalibracio`** — a Kód-ekvivalencia térkép futásidejű alakja, az
  aranystandard-pontozó a 8 pontozási szabállyal, a release-kapuk és a
  regresszió-riasztás.

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
