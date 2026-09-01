# Tervezői mód — funkció-architektúra

*2026-09-01 · javaslat a fejlesztői specifikáció v1.0 kiegészítésére*

Vizuális változat: [Tervezői mód](https://claude.ai/code/artifact/655d41d6-0373-4882-b9d7-f3416f1dcb0a)

## A feladat

A szoftver ma azt nézi meg, mi épült meg. A tervezői mód azt nézi meg, mi fog
megépülni: hűségprogramot, akciót, promóciót, árazási konstrukciót, webes
összeállítást, briefet — még mielőtt kimenne. A marketinges beszélgethet vele, és
tanácsot kérhet egy készülő konstrukcióhoz.

## A központi felismerés

A mai lánc **jelekre van kulcsolva**: az artefaktumon megfigyelt jelek hívják elő a
szabályokat. Egy tervnek nincs artefaktuma, tehát nincs jele — a P2 lépésnek nincs
mit néznie. Ez az egyetlen valódi akadály.

A híd egy tábla, ami azt mondja meg: **ez a tervezési döntés ezeket a jeleket fogja
előállítani.** „Lejáró hűségpont" → J-011, J-030, J-033. Ha ez megvan, a terv
leképezhető *várható* jelekre, és onnantól a teljes meglévő lánc változatlanul fut.

```
MAI AUDIT      Artefaktum ──megfigyelés──> P2 jel-detektálás ──┐
                                                               ├──> Jelek ──> P7 szabály-előhívás
TERVEZŐI MÓD   Terv ──> T1 elem-bontás ──> KE-tár ──várható──┘              P8 kombináció
                              [ÚJ]          [ÚJ · A HÍD]     jelek           P9–P11 riport
                                                                             [változatlan]
```

## Ami már megvan (élő mérés, 2026-09-01)

| Mutató | Érték | Miért számít |
|---|---|---|
| „Előírás" típusú szabály | **1 806** | Nem tiltás, hanem előírás: mit tegyél. + 457 feltételes, 844 eljárási |
| Küszöb / paraméter kitöltve | **3 868 (87%)** | A szám, amit a tervben be kell állítani |
| Ellenjavallat kitöltve | **3 965 (89%)** | Mikor NE — tervezői módban ez ér a legtöbbet |
| Folyamat / rendszer hatókörű szabály | **1 255** | Eleve konstrukciókról szólnak, nem oldalakról |
| Kombináció-sor | **112** | Mely elemek erősítik és melyek oltják ki egymást |
| Elvárás | **120** | Ebből lesz a terv-ellenőrzőlista |
| Bemenetkérő kérdés | **86** | „Kitől kérhető" mezőben szerepel *„A cég marketingesétől"* |
| Preskriptív technika (TK-109…TK-150) | **42** | Az előző körben héjként jelölve — most kiderült, mire valók |

A szabályok HA→AKKOR→MERT alakban íródtak, küszöbbel és ellenjavallattal — vagyis
pontosan a tervezési tanács alakjában.

## Amit építeni kell

**1. Konstrukciós elem-tár (KE-kódok) — a híd.** Minden sor egy tervezési döntés
(„a pont 12 hónap után lejár", „az ajánlói jutalom mindkét félnek jár"). Mezők:
KE-kód, konstrukció-típus, mit jelent konkrétan, **várható jelek** (reláció →
Jeltár, ez a híd), kiváltott technikák, kötelező kísérő elem, paraméterek,
alapértelmezett sáv. Egyetlen konstrukció-típussal kezdeni: hűségprogram, 30–40 elem.

**2. Konstrukció-típus mint önálló facett** — nem új artefaktum-osztály. A terv nem
másik *felület*, hanem másik *bemenet-fajta*; egy hűségprogram-terv érinthet webet,
e-mailt és checkoutot egyszerre.

**3. Technika-szerep mező** (*detektálási* vs. *tervezési*) + a 42 preskriptív
technika kitöltése. Ez feloldja az előző kör „héj-technika" leletét: nem külön tárba
kell emelni őket, hanem más mezőkészlet kell hozzájuk. Egy tervezési technikának nem
sötét/legitim párja van, hanem *mikor alkalmazd · mikor ne · mivel jár együtt ·
milyen paraméterrel*.

**4. Bemenetkérő 0. szint: konstrukciós szándék** + a `Feloldott szabályok` reláció
végigvezetése. Ma **4 437-ből 117** szabály van kérdéshez kötve, vagyis a „mit
kérdezzek, hogy eldőljön" út nagyrészt hiányzik. Az auditban a hiányzó kontextus egy
megjegyzés; a tervezői módban a marketinges kérdezni fog.

**5. Konstrukciós gold-teszttípus**: befagyasztott brief + elvárt elemek + elvárt
kockázatok + **tiltott javaslatok**. A kontroll-minta fordított logikájú: olyan
brief, amire a helyes válasz „ezt ne építsd meg". Lehetőség: az előző kör leletét (a
kapu in-sample) itt ingyen orvosolni lehet — a konstrukciós gold *most* épül, eleve
tanuló/held-out bontásban.

**6. Kombináció-tár**: átfordítás nélkül használhatóvá válik, amint a KE-tár leképezi
az elemeket jelekre. Egy hibát javítani kell előtte: **27 sornál csak egyetlen jel
szerepel** az együttállók közt.

## Egy döntés, ami nem halasztható

A Constitution §4 szerint a jogi/etikai KO-sávot érintő javaslat kimegy, **mellette**
figyelmeztetéssel. Ez egy *meglévő* oldal auditjára jó döntés — a technika már ott
van, a feladat a rámutatás.

A tervezői módban a rendszer azt mondja meg, **mit építsenek**. Ha egy javasolt
konstrukció jogi KO-sávba esne, azt nem elég lábjegyzetelni.

Az aszimmetria a következmény oldalán van: **egy audit, ami elnéz valamit, egy
elmaradt javítást ér; egy tanács, ami sötét mintát javasol, létrehozza a kárt.**

*Javaslat:* a KO-sáv a tervezői módban **kemény kapu a javaslat előtt**, nem
megjegyzés mellette — a konstrukció nem kerül be a javasoltak közé, helyette a
rendszer megnevezi, mi ütközik, és felajánlja a nem ütköző változatot. A MELLETT-elv
változatlan marad ott, ahol a helyén van: a meglévő artefaktum auditjában.
**Ez Constitution-módosítás, Albert döntése — nem levezetés.**

## A lánc

| # | Lépés | Állapot |
|---|---|---|
| T0 | Konstrukciós kapu — mit tervezel, kinek, mikor, milyen joghatóság | **új** |
| T1 | Elem-bontás — a brief lebontása KE-kódokra | **új** |
| T2 | Hiány-lista — mely elemek hiányoznak (Elvárás-lista + kötelező kísérő elem) | **új** |
| T3 | Várható jelek — KE → J-kód leképezés, determinisztikus | **új** |
| T4 | Szabály-előhívás | P7 |
| T5 | Kockázati előrejelzés — mely KO-sávok aktiválódnának | sávok |
| T6 | Kombináció-elemzés | P8 |
| T7 | Konstrukció-javaslat paraméterekkel | P10 |
| T8 | Paraméter-bekérő — számot itt sem talál ki | P6/P0 |
| T9 | Brief-kimenet + indulás előtti ellenőrzőlista + mérési terv | P11 |

Két üzemmód, egy lánc: a *validáció* kész briefből indul, a *tervezés* egy
konstrukció-típusból.

## Építési sorrend

1. **A KO-kapu döntése** — ez határozza meg a T5 és T7 viselkedését, tehát a lánc alakját.
2. **Technika-szerep mező + a 42 preskriptív technika kitöltése** (kezdés: TK-140, TK-141 — jogi tétűek).
3. **KE-tár egyetlen konstrukció-típusra** — hűségprogram, 30–40 elem, kitöltött „várható jelek" relációval.
4. **15–20 befagyasztott brief**, eleve tanuló/held-out bontásban, köztük 4–5 „ezt ne építsd meg" kontroll.
5. **T0–T3 kódban**, a T4+ újrahasznosításával.
6. **Bemenetkérő 0. szint + Feloldott szabályok reláció** az MVP-magra.
7. **A következő konstrukció-típus** — promóció vagy árazás; onnantól csak KE-sorok kérdése.

## Amit ne csináljunk

- **Ne írjunk új szabálytömeget hozzá.** A tervezői mód nem több tudást igényel, hanem
  másik bejáratot a meglévőhöz.
- **Ne engedjük improvizálni.** Amire nincs szabály, arra a helyes válasz: „erre nincs
  szabályom" — ez a „nem eldönthető" tervezői megfelelője.
- **Ne legyen külön termék.** Külön lánc + külön tár + külön kalibráció két
  karbantartandó rendszert jelent, amik szét fognak csúszni. Egy motor, két bemenet.
