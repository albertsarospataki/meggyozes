# Szoftver-brief v2.0 → kód: mi épült meg, mi nem, és miért

*2026-09-02 · a `Szoftver-brief v2.0 — Meggyőzés szoftver` alapján*

Ez a leképezés azt rögzíti, hogy a brief melyik fejezetének mi felel meg a repóban,
és — ami fontosabb — mi az, ami szándékosan **nem** készült el. A brief maga is
így épül: az M0 a terv, az S1–M6 az ütemezés.

## A választott szelet

A v2.0 három üzemmódot (Audit / Tanács / Kérdezz), egy brand-memóriát, egy
előfizetési modult és egy tanulási hurkot ír le. Ebből ez a kör a **döntési és
szerződéses réteget** építette meg: azt, ami tiszta logika, és amit LLM, adatbázis,
Stripe és böngésző nélkül is lehet futtatni, mérni és tesztelni.

Az indok gyakorlati: a brief minden kritikus szabálya (mit nem adhat ki a rendszer,
mikor kér kreditet, mit lát egy szerep, mikor kell ember) eldönthető ezen a rétegen.
Ha ez a réteg helyes, az infrastruktúra rácsatolható; fordítva nem igaz — egy
felület, ami a szabályokat a komponensekbe szórja szét, nem mérhető és nem védhető.

## Fejezetről fejezetre

| Brief | Hol van a kódban | Állapot |
|---|---|---|
| 2.4 nem-alkuképes elvek | a modulok fejlécei; a kapuk és őrök | kód |
| 3.3 riport-anatómia — brand-blokk | `packages/brand/src/egyezes.ts` | kód |
| 3.4 „mindig van következő lépés” | `packages/projekt/src/idovonal.ts` | kód |
| 4.1 entitás-hierarchia | `packages/projekt/src/modell.ts` | típusok |
| 4.2 brand-profil séma + készültség | `packages/brand/src/{profil,keszultseg}.ts` | kód |
| 4.3 kredit-tranzakció típusok | `packages/szervezet/src/{ar,fokonyv}.ts` | kód |
| W2 audit — indítás, HUM-kapu, visszaírás | `packages/folyamat/src/{inditas,lezaras}.ts` | kód |
| W3 tanács — KON, Intent, §4/b, brief | `packages/tanacs/*` | kód |
| W4 kérdezz — visszakeresés, válasz-kártya, őrök | `packages/kerdezz/*` | kód |
| W6 előtte/utána, megvalósítási arány | `packages/projekt/src/osszehasonlitas.ts` | kód |
| W8 tudásbázis-szinkron, snapshot | `packages/kb-sync/*` (korábbi kör) | kód |
| W9 tanulási hurok | `packages/tanulas/*` | kód |
| 6.1–6.2 szerepek, szigetelés | `packages/szervezet/src/hozzaferes.ts` | kód |
| 7.2–7.4 csomagok, árlista, kredit-szabályok | `packages/szervezet/src/{csomag,ar,fokonyv}.ts` | kód |
| 8.1 I komponens (brand-memória) | `packages/brand/*` | kód |
| 9. minőségkapuk három módra | `packages/kalibracio/src/mod-kapuk.ts` | kód |

## Amit szándékosan nem építettünk meg

Ezek nem elmaradt munkák, hanem **későbbi mérföldkövek** — a brief 11. fejezetének
sorrendjét követik. Mindegyiknél megvan, mihez csatlakozik majd.

| Komponens | Miért nem most | Mihez csatlakozik |
|---|---|---|
| **A — bemeneti réteg** (Playwright, DOM, képernyőkép) | külső futtatókörnyezet kell hozzá; a döntési réteg nem függ tőle | `Artefaktum` a projekt-modellben |
| **B — elemző mag** (LLM-hívás, P1–P11) | modell- és prompt-verzióhoz kötött; a DET-őrök és a pontozó viszont már állnak | `Megallapitas`, `Javaslat`, a kapuk |
| **D — riport-generátor** (web, PDF) | megjelenítés; a riport szerkezete és szabályai már típusban vannak | `Riport` + brand-egyezés blokk |
| **F — felület** (Next.js, menük) | a 3.1–3.2 menüstruktúra a döntési réteg fölé kerül | minden csomag |
| **G infrastruktúra** (Clerk, Stripe, Postgres) | a kredit-logika szándékosan nem Stripe-ban él, ezért külön köthető rá | `fokonyv.ts`, `hozzaferes.ts` |
| **J — visszakereső index** (pgvector, embedding) | a szűrés, a küszöb és a karantén-tilalom viszont már kód | `forrasokatSzur` |
| **L — média-feldolgozó** (ffmpeg, ASR, OCR) | M4 mérföldkő; a csomagkorlát (videóhossz) már ellenőrizhető | `auditIndithato` |
| **Gold-készletek** (30 terv, 40 Q&A, 20 brand) | tartalom, nem kód — Notionben készül (N2–N4, N9) | `mod-kapuk.ts` értékelői |

## A tudástár-oldali pótlások (N1–N10)

A brief 1.4 tíz Notion-munkát sorol. Ezek **nem kódfeladatok**: címkézés, séma és
teszt. A kód annyit tesz, hogy a helyüket kimondja — például a `BrandProfil` séma az
N1-hez, a `belepoCsomag` az 1C/1D csomagokhoz, a `bazisLelet` pedig ahhoz, hogy egy
épülő gold-készleten a mérés fusson, de látszódjon: a szám még nem a teljes bázison
áll.

## Nyitott döntések, amiket a kód feltételez

A brief 12. fejezete nyolc kérdést tesz fel Albertnek. Kettőnél a kód már felvett egy
alapértelmezést, mert nélküle nem lett volna mit építeni — mindkettő egy sorban
visszafordítható:

1. **KON-CIK hetedik konstrukció-típus** — felvéve (`konstrukcio.ts`). Ha kimarad, a
   típus és a hozzá tartozó kérdéscsomag törlendő; más nem függ tőle.
2. **A „kredit” szó a felületen** (a „token” helyett) — a kód végig kreditet mond.

A többi hat (csomagnevek, keretméretek, videóhossz-korlátok, a Kérdezz mód elve, a
brand-tanítás forrásai, a tanulási részvétel alapértelmezése) konstansként vagy
paraméterként él, és egy helyen állítható.
