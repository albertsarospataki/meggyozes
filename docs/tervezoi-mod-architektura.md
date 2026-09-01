# Tervezői mód — funkció-architektúra (v2)

*2026-09-01 · a v1 központi állítását ez a változat javítja, a Cursor párhuzamos
javaslatával összevetve és élő lekérdezésekkel ellenőrizve*

Vizuális változat: [Tervezői mód](https://claude.ai/code/artifact/655d41d6-0373-4882-b9d7-f3416f1dcb0a)

## Amit a v1 félreírt

A v1 azt állította: a lánc jelekre van kulcsolva, egy tervnek nincs jele, tehát kell
egy hídtábla — és *ez az egyetlen valódi akadály*. Az utolsó tagmondat téves.

**Két előhívási út van, és a második már ma is működik.** A Szabálytár
`Kiváltó feltétel` mezője **4 378 szabálynál (98,7%)** ki van töltve, és a tervezési
szabályoknál nem megfigyelést ír le, hanem szándékot:

```
S-126-1
  Kiváltó feltétel:   "hűségprogramot indítasz"
  Szabály:            HA hűségprogramot indítasz → AKKOR először ellenőrizd a vásárlási
                      gyakoriságot (kávé, drogéria, üzemanyag: igen; bútor, ingatlan,
                      autó: nem), és ha indul, a haladás legyen mindig látható
                      · MERT M05 + M32 mellett a haladás láthatósága (M85) hajtja
  Kiváltó jelek:      nincs
  Automatizálhatóság: Emberi
```

Kész tervezési tanács, jel nélkül. A jel-úton soha nem hívható elő — és nem is kell.

## A két út

```
AUDIT          Artefaktum ──> P2 jel-detektálás ──> Jelek ──┐
                                                            ├──> P7 szabály-előhívás
TERVEZŐI  ┌──> T1 elem-bontás ──> KE-tár ──tervezett jelek──┘    P8 kombináció
  Szándék ┤                                                      P9–P11 riport
          └──────── KON-típus → Kiváltó feltétel ──────────────>  [változatlan]
                    (ma is működik, csak címke kell)
```

A két út **különböző szabályokat ér el**. Az alsó azokat, amiknek a kiváltója egy
döntés; a felső azokat, amiknek a kiváltója egy megfigyelhető jel.

## Ami már megvan (élő mérés, 2026-09-01)

| Mutató | Érték | Miért számít |
|---|---|---|
| Kiváltó feltétel kitöltve | **4 378 (98,7%)** | Az alsó út alapja |
| „Előírás" típusú szabály | **1 806** | + 457 feltételes, 844 eljárási |
| Küszöb / paraméter · Ellenjavallat | **3 868 (87%) · 3 965 (89%)** | A beállítandó szám, és hogy mikor NE |
| Emberi + jel nélküli artefaktum-szabály | **569** | Az auditláncnak örökre láthatatlan |
| Kombináció-sor | **112** | „Ha ezt a kettőt együtt tervezed, kioltják egymást" |
| Marketingestől kérhető bemenetkérő kérdés | **31 / 86** | A párbeszéd kérdésbankja |
| Preskriptív technika (TK-109…TK-150) | **42** | Az előző kör „héj"-lelete — tervezési technikák |

## A mód nem detektál, hanem kérdez

A „HA … indítasz" alakú szabályok fele **Emberi** automatizálhatóságú (51 az 51+48-ból),
és 55-nek nincs jele. Az S-126-1 sem ellenőrizhető gépileg: a „milyen gyakran vásárol a
tipikus vevőd" kérdésre csak a cég tud válaszolni.

Ebből következik, hogy a **Bemenetkérő-tár nem kiegészítő, hanem a végrehajtó motor**:
a szabály feltételét kérdéssé fordítja, a választ visszavezeti a szabályhoz.

A hiányzó huzalozás: **4 437 szabályból 117** van kérdéshez kötve, a 86 kérdésből
**26 nincs egyetlen szabályhoz sem** kötve, és a belépő szinten **8 kérdés** áll.

## Amit építeni kell — javított sorrend

1. **KON-típus címke a meglévő szabályokon.** `KON-HUS` · `KON-AKC` · `KON-ARA` ·
   `KON-KAM` · `KON-WEB` · `KON-KOM`. A `Kiváltó feltétel` szabad szöveg; egy szándékot
   4 378 szabad szöveges feltételhez illeszteni pontosan az a homályos előhívás, amit a
   projekt fegyelme tilt. A címke a determinisztikus kulcs. **Nulla új tartalom, több
   száz tervezési szabály elérhetővé válik** — ezért került az első helyre.
2. **Intent — verziózott szándék-objektum.** Típus, cél, közönség, mechanika, ígéret,
   csatorna, időtartam, korlát. A verziózás nem kényelem: „mi van, ha ajándék, nem
   százalék?" új verzió, és a **különbséget** kell mutatni, nem új riportot.
3. **„Tervezett" bizonyíték-fokozat.** Ugyanaz a J-kód, más szint: tény / **tervezett**
   / gyanú / nem eldönthető. A tervezett soha nem számít bizonyított problémának.
   Olcsó: a kód már ismeri a fokozatot, egy értékkel bővül.
4. **Technika-szerep mező** (Detektálási | Tervezési | Mindkettő). Az `Állapot` a
   legitimitást jelöli, nem a szerepet. Ezzel a 42 „héj-technika" lelete besorolás lesz,
   nem hiba.
5. **1C belépő kérdéscsomagok** típusonként 6–10 kérdés + a `Feloldott szabályok`
   reláció. Konkrét hiány: a vásárlási gyakoriság kérdése nincs meg, enélkül az S-126-1
   nem futtatható.
6. **KE-tár** — csak a felső úthoz, és későbbre. Valós igény („visszaszámláló a
   landingen" → J-001, J-011), de nem ez nyitja meg a funkciót.

## Egy döntés, ami nem halasztható

A Constitution §4: a KO-sávot érintő javaslat kimegy, **mellette** figyelmeztetéssel.
Ez egy *meglévő* oldal auditjára jó döntés.

A tervezői módban a rendszer azt mondja meg, **mit építsenek**. Az aszimmetria a
következmény oldalán van: **egy audit, ami elnéz valamit, egy elmaradt javítást ér; egy
tanács, ami sötét mintát javasol, létrehozza a kárt.**

*Javaslat:* a KO-sáv itt **kemény kapu a javaslat előtt**, nem megjegyzés mellette. A
MELLETT-elv változatlan marad az auditban. **Ez Constitution-módosítás — Albert
döntése.**

## Építési sorrend

| Mikor | Mit |
|---|---|
| **0.** | A KO-kapu döntése — ez határozza meg, mit adhat ki a mód |
| **S0** | Címkézés, új szöveg nélkül: KON-típus · Technika-szerep · Intent-séma · 1C csomagok · 15 terv-gold váza |
| **M1** | Két gomb a pulton: Audit / Tanács. A Tanács először csak a szándékot menti és kérdez |
| **M2** | Élő tanács az **alsó úton**, 15 gold-teszttel. KE-tár még nem kell |
| **M3** | „Mi van, ha…" iteráció, brief-csatolás, KE-tár az első konstrukció-típusra |

A **15 terv-aranystandard a kiadás feltétele**, nem utómunka. Köztük 4–5 olyan brief,
amire a helyes válasz „ezt ne építsd meg" — ez a mód kontroll-mintája. És mivel ez a
gold *most* épül, itt ingyen orvosolható az előző kör lelete: **vágjuk eleve tanuló és
held-out részre.**

## Amit ne csináljunk

- **Ne írjunk új szabálytömeget hozzá** — másik bejárat kell, nem több tudás.
- **Ne legyen szabad LLM-chat a DET-réteg megkerülésével.** A beszélgetés kötött.
- **Ne írjon kampányt helyettük, és ne találjon ki százalékot.** Gyakran a helyes
  válasz az, hogy előbb kontrollcsoport kell.
- **Ne legyen külön termék.** Egy motor, két bemenet.

---

*Forrás-elhatárolás: a KON-típus, az Intent-verziózás, a tervezett-jel fokozat, a
Technika-szerep és az S0/M1–M3 ütemezés a Cursor párhuzamos javaslatából való; a két út
szétválasztása, a kérdező-motor következtetés, a Kombináció-tár szerepe, a held-out
bontás és a KO-kapu kérdése innen. Minden ellenőrizhető állítás élő lekérdezéssel
igazolva.*
