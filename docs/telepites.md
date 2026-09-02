# Telepítés — lépésről lépésre, fejlesztői tudás nélkül

A Convictly a **saját gépeden** fut. Nincs felhő, nincs regisztráció, és semmilyen
adat nem hagyja el a gépet: a brand-profil, az auditált oldalak és a riportok egy
fájlban maradnak a projekt mappáján belül.

Egyszer kell végigmenni rajta. Utána egy bemásolt sor elindítja.

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
2. Ennyi. **Hagyd a Letöltések mappában** — a következő lépés magától kicsomagolja a
   Dokumentumok mappába.

Ha már kicsomagoltad, vagy máshová tetted (Asztal, Dokumentumok), az is jó: a
következő lépés ott is megtalálja.

---

## 3. lépés — Az indítás (első alkalommal 15 perc)

**Egyetlen sort kell bemásolnod.** Nem kell mappát keresned, fájlt behúznod, elérési
utat begépelned: a sor magától megtalálja a projektet — és ha még csak a ZIP van meg
a Letöltésekben, azt is kicsomagolja.

1. Nyisd meg a **Terminál** alkalmazást:
   `Cmd + Szóköz`, írd be: `terminál`, Enter.
   (Egy fekete vagy fehér ablak nyílik meg egy szöveges sorral. Ez normális.)

2. Másold ki az alábbi sort **egészben**, illeszd be a Terminálba (`Cmd + V`), és
   nyomj **Entert**:

   ```
   P=$(find "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents" -maxdepth 6 -name "convictly-inditas.command" 2>/dev/null | head -1); if [ -z "$P" ]; then Z=$(find "$HOME/Downloads" -maxdepth 1 -name "meggyozes*.zip" 2>/dev/null | head -1); if [ -n "$Z" ]; then echo "Kicsomagolom: $Z"; unzip -q -o "$Z" -d "$HOME/Documents" && P=$(find "$HOME/Documents" -maxdepth 6 -name "convictly-inditas.command" 2>/dev/null | head -1); fi; fi; if [ -n "$P" ]; then bash "$P"; else echo "Nem találom a Convictly mappát — töltsd le a ZIP-et a 2. lépés szerint."; fi
   ```

   A Terminál nem mutatja, hogy a beillesztés sikerült-e szépen — nem baj, elég ha az
   Enter után elindul.

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

> **Miért nem dupla kattintás?** Az internetről letöltött szkriptekre a macOS nem ad
> futtatási jogot, ezért a `.command` fájlon a dupla kattintás (és a jobb gomb →
> Megnyitás is) gyakran nem csinál semmit, vagy TextEditben nyitja meg a fájlt. A
> Terminálból indítva ez a korlátozás nem érvényes.

---

## Naponta: hogyan indítod újra

Ugyanaz az egy sor, ugyanoda. Ilyenkor már gyors: 15–20 másodperc.

A Terminálban a **felfelé nyíl** előhozza az előző parancsot — elég Entert nyomni.

**Leállítás:** zárd be a Terminál-ablakot. (Amíg nyitva van, a rendszer fut.)

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

**Küldd el a diagnosztikát — ebből látszik, hol áll meg.**
Illeszd be ezt az egy sort a Terminálba, és nyomj Entert:

```
D=$(find "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents" -maxdepth 6 -name "convictly-diagnosztika.command" 2>/dev/null | head -1); if [ -n "$D" ]; then bash "$D"; else { echo "macOS: $(sw_vers -productVersion 2>/dev/null)"; echo "processzor: $(uname -m)"; echo "node: $(node -v 2>/dev/null || echo NINCS)"; echo "mappa: $(find "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents" -maxdepth 6 -name "convictly-inditas.command" 2>/dev/null | head -3)"; echo "zip: $(find "$HOME/Downloads" -maxdepth 1 -name "meggyozes*.zip" 2>/dev/null | head -1)"; } | tee "$HOME/Desktop/convictly-diagnosztika.txt"; fi
```

Az Asztalodra kerül egy **`convictly-diagnosztika.txt`** fájl. Azt küldd el — nem
tartalmaz jelszót és személyes adatot, csak azt, hogy mi van telepítve és hol tart a
projekt.

Az indító a saját naplóját is elmenti: a projekt mappájában **`convictly-naplo.txt`**
néven, minden indításkor felülírva.

---

**A Terminál semmit nem ír ki, csak visszaugrik a promptra.**
A beillesztett sor csonka lett. Törölj mindent (`Ctrl + U`), és másold be újra —
a sor hosszú, de **egy** sor, tördelés nélkül.

**„Nem találom a Convictly mappát".**
A 2. lépés maradt ki, vagy a ZIP nem a Letöltésekbe került. Töltsd le újra, és hagyd
a Letöltésekben — a sor onnan magától kicsomagolja.

**„Nincs telepítve a Node.js."**
Az 1. lépés kimaradt. Telepítsd a nodejs.org oldaláról, **zárd be a Terminál-ablakot**,
nyiss egy újat, és illeszd be újra a sort. (Az új ablak kell: a régi még nem tud a
frissen telepített Node-ról.)

**Dupla kattintással próbáltam, és nem történt semmi (vagy TextEdit nyílt meg).**
Ez a várható viselkedés, lásd a 3. lépés alatti magyarázatot. A beillesztett sor
ezt kerüli meg.

**A böngésző „Nem érhető el az oldal"-t ír.**
A rendszernek pár másodperc kell az indulás után. Frissíts rá, vagy írd be kézzel:
`http://localhost:3000`

**„Port 3000 is in use" vagy hasonló.**
Már fut egy példány. Vagy nyisd meg egyszerűen a `http://localhost:3000` címet, vagy
zárd be a korábbi Terminál-ablakot, és indítsd újra.

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
