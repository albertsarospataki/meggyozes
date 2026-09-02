# Telepítés — lépésről lépésre, fejlesztői tudás nélkül

A Convictly a **saját gépeden** fut. Nincs felhő, nincs regisztráció, és semmilyen
adat nem hagyja el a gépet: a brand-profil, az auditált oldalak és a riportok egy
fájlban maradnak a projekt mappáján belül.

Egyszer kell végigmenni rajta. Utána egy dupla kattintás elindítja.

---

## Amire szükséged van

- Egy Mac (macOS 13 vagy újabb).
- Kb. 20 perc az első alkalommal, ebből 15 perc várakozás.
- Kb. 1,5 GB szabad hely.

---

## 1. lépés — Node.js telepítése (egyszer, 3 perc)

Ez az egyetlen dolog, amit kézzel kell telepíteni. A Node.js az a futtatókörnyezet,
amiben a rendszer dolgozik — olyasmi, mint a böngésző a weboldalaknak.

1. Nyisd meg: **https://nodejs.org/en/download**
2. Válaszd a **macOS** telepítőt, az **LTS** (hosszú távon támogatott) változatot.
3. Töltsd le, dupla kattintás, és kattints végig a telepítőn (mindenre „Folytatás",
   a végén „Telepítés").

Ha nem vagy biztos benne, hogy megvan-e: nem baj, a következő lépésben az indító
megmondja.

---

## 2. lépés — A projekt letöltése (2 perc)

1. Nyisd meg: **https://github.com/albertsarospataki/meggyozes/archive/refs/heads/claude/brief-szoftver-fejlesztese-qdz2fd.zip**
   (Ez egy ZIP-fájl, azonnal letöltődik.)
2. A Letöltések mappában dupla kattintás a ZIP-re — kicsomagolódik egy mappába.
3. Húzd át ezt a mappát oda, ahol tartani szeretnéd (pl. Dokumentumok).
   **Ne hagyd a Letöltések mappában**, mert onnan a macOS néha törli.

---

## 3. lépés — Az indítás (első alkalommal 15 perc)

A szkriptet a Terminálból indítjuk. Ez a megbízható út: nem függ attól, hogy a ZIP
megőrizte-e a futtatási jogot, és a macOS biztonsági blokkolása sem áll az útjába.
**Nem kell semmit begépelned a fájl elérési útjából — a fájlt behúzod az ablakba.**

1. Nyisd meg a **Terminál** alkalmazást:
   `Cmd + Szóköz`, írd be: `terminál`, Enter.
   (Egy fekete vagy fehér ablak nyílik meg szöveges sorral. Ez normális.)

2. Az ablakba írd be ezt a négy betűt és **egy szóközt** — a szóköz fontos:

   ```
   bash 
   ```

3. Nyisd meg a Finderben a kicsomagolt projekt mappáját, azon belül a **`scripts`**
   mappát.

4. **Húzd rá** a `convictly-inditas.command` fájlt a Terminál ablakára, és engedd el.
   A fájl elérési útja magától beíródik a `bash ` után.

5. Nyomj **Entert**.

Ennyi. Az ablak elkezd dolgozni, és négy lépést fogsz látni:

```
1/4 · Függőségek letöltése
2/4 · Böngésző letöltése az URL-auditokhoz
3/4 · Alkalmazás összeállítása
4/4 · Indítás
```

Az első két lépés tart sokáig (letöltés, összesen kb. 10–15 perc).
**Ne zárd be az ablakot.**

Amikor kész, magától megnyílik a böngésződ ezen a címen:
**http://localhost:3000**

A belépő kód: **`convictly`**

Kész. Ez a rendszer, futásban.

---

## Naponta: hogyan indítod újra

Ugyanígy: Terminál → `bash ` → fájl behúzása → Enter. Ilyenkor már gyors, 15–20
másodperc.

**Leállítás:** zárd be a Terminál-ablakot. (Amíg nyitva van, a rendszer fut.)

**Ha egyszerűbbet szeretnél:** miután egyszer lefutott, a Terminálban a **felfelé
nyíl** előhozza az előző parancsot — elég Entert nyomni.

---

## Mit próbálj ki elsőre

1. **Taníts be egy brandet** (Brandek → Új brand). Tíz perc alatt kitöltöd. A
   legfontosabb mezők: fő ígéret, tiltott kifejezések, és a Bizonyíték-tár — abból
   dolgozik a szám-őr és a szuperlatívusz-őr.
2. **Indíts egy auditot** egy saját oldaladra (Audit → URL). Egy-két perc, és kész
   a riport.
3. **Kérdezz valamit** a Kérdezz oldalon.

---

## Ha valami elakad

**Dupla kattintással próbáltam, és nem történt semmi (vagy TextEdit nyílt meg).**
Ez a várható viselkedés: az internetről letöltött szkriptekre a macOS nem ad
futtatási jogot. Ezért indítjuk Terminálból, a 3. lépés szerint — ott ez a
korlátozás nem érvényes.

**„command not found: bash" vagy hasonló.**
Valószínűleg lemaradt a szóköz a `bash` után, vagy a fájl útja nem került be.
Töröld a sort (Ctrl+U), és kezdd újra: `bash `, szóköz, majd húzd be a fájlt.

**„Nincs telepítve a Node.js."**
Az 1. lépés kimaradt. Telepítsd, majd indítsd újra a `.command` fájlt.

**A böngésző „Nem érhető el az oldal"-t ír.**
A rendszernek pár másodperc kell az indulás után. Frissíts rá, vagy írd be kézzel:
`http://localhost:3000`

**Az URL-audit hibaüzenetet ad.**
Van olyan oldal, ami nem engedi be a gépi böngészőt. Ilyenkor másold ki az oldal
szövegét, és használd a **Szöveg** ajtót — a szöveges megállapítások ugyanúgy
elkészülnek.

**Minden összekavarodott, kezdjük elölről.**
Töröld a projekt mappáján belül a `.adat` mappát. Ezzel az összes brand, projekt és
riport törlődik, és a rendszer üresen indul újra.

---

## Amit tudni érdemes

**Az adataid a gépeden maradnak.** Minden a projekt mappáján belüli
`.adat/convictly.sqlite` fájlban van. Ha ezt a fájlt lemented, mindent lementettél;
ha a mappát törlöd, mindent töröltél.

**A tudásbázis most demó.** A valódi szabálytár (4 456 szabály) a Notionben él, és
külön szinkron hozza le. Amíg az nincs meg, a riportok tíz általánosan ismert
mintázatot ismernek fel — a riport ezt az első képernyőn ki is mondja.

**A kredit valódi elszámolás, de nem kerül pénzbe.** Az alfa havi 1 200 kreditet ad,
kártya nélkül. A kredit-történet az Előfizetés oldalon tételesen látszik.

---

## Windows-on?

Ez az indító macOS-re készült. Windowsra ugyanez működik, csak a 3. lépés más
(PowerShell-parancs a `.command` helyett) — szólj, és megírom hozzá.
