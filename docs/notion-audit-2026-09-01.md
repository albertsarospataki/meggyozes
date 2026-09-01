# Notion-tudástár audit — második mérés

*2026-09-01 · élő SQL-lekérdezések a hét tár ellen, összevetve a [2026-08-30-i első méréssel](./notion-audit-2026-08-30.md)*

Vizuális összefoglaló: [A tudástár készültsége](https://claude.ai/code/artifact/514227e6-193f-4ec6-a86d-3bca1963c696)

## Mi változott

| Mutató | 08-30 | 09-01 | Változás |
|---|---|---|---|
| MVP-státusz kitöltve | 0 | 844 (674 MVP-mag) | **megoldva** |
| 🔗 Kombináció-tár | 10 | 120 → **112 sor, 0 hiányzó mező** | +102 |
| ✅ Elvárás-lista | 86 | 120 | +34 |
| 🎭 Technikatár | 108 | 150 | +42 |
| 🔦 Jeltár | 275 | 282 | +7 |
| 🔁 Ekvivalencia-térkép | 62 tétel / 8 szabály | 85 tétel / 12 szabály | +23 / +4 |
| Gold `Hatókör` mező | nincs | 92 V1 / 58 V2 | új |
| Szabály checkout-osztállyal | 0 | **0** | változatlan |
| Szabály cookie-osztállyal | 0 | **0** | változatlan |
| Gold zárójeles / per-jeles sor | 37 / 21 | **37 / 21** | változatlan |
| Élő (nem szintetikus) gold-teszt | 22 | **22** | változatlan |
| 🔬 Diszkrimináns-tár | 20 | **20** | változatlan |
| Kétértelmű jel teszt nélkül | 77 | **77** | változatlan |
| I8 — aktív szabály jel nélkül | 872 | 856 | −16 |

## A legfontosabb új lelet: a kapu in-sample

A kalibrációs sor: 62,4 → 63,3 → 69,3 → 77,3 → 80,7 → 90,0 → 81,3 → 85,3 → 78,7 → **91,3**.

A térkép minden bővítése az előző futás bukásaiból származik, **ugyanazon a 150
teszten**: v4 (62 tétel) → #7 bukás → v5 (70) → #8 → v6 (77) → #9 bukás → v7 (85) →
#10: 91,3%. A #10 riport már gyűjti a v8-jelölteket a maradék 13 FAIL-ból.

**Nincs kiszorított validációs halmaz** — nincs egyetlen teszt sem, amiből soha nem
származott térkép-tétel vagy checklist-elem.

Ez nem hiba a tételekben: mindegyik önmagában védhető taxonómiai pontosítás, és a
csapat fegyelmezetten kimondta a „gold-illesztés tilalmát" (a #8-at nem pontozták
újra visszamenőleg a v6 tételekkel). Az **összhatás** viszont az, hogy a 91,3% arról
szól, mennyire illeszkedik a térkép ehhez a 150 teszthez.

Két további dolog gyengíti az előrejelző erőt:

- **A futtató nem a szoftver**, hanem 10 vak LLM-köteg + 5 értékelő. A szoftver egy
  erős modellel és a DET-réteggel más profilú lesz; az első szoftveres futás nem
  fogja reprodukálni a 91,3%-ot, és ez normális.
- **Az ingadozás nagyobb, mint a kapu fölötti tartalék**: az utolsó öt futás 90,0 →
  81,3 → 85,3 → 78,7 → 91,3, azaz ±11 pont mozgás egy 6 pontos ráhagyás mellett.

→ *20–30 teszt kiszorítása validációs halmaznak. A legolcsóbb út: a következő körben
felvett ÚJ gold-tesztek legyenek a held-out, és a kapu két számot mutasson — a tanuló
halmazon és a kiszorítotton mértet.*

## A bővítés minősége

**A Technikatár 42 új sora (TK-109…TK-150) héj.** 42-nél hiányzik a sötét változat,
42-nél a legitim változat, 41-nél a választóvonal; **44 sorhoz egyetlen jel sem
tartozik** (korábban 2), 45-nél nincs mechanizmus.

Két következmény: jel nélkül a technika nem detektálható (a P2 jelekből dolgozik),
és legitim változat + választóvonal nélkül nem minősíthető — a nulla álpozitív elve
éppen ezen a megkülönböztetésen áll. **A TK-140 és a TK-141 jogi tétű.**

Jelleg-megfigyelés: az új technikák nagy része preskriptív („Ajándék-keretezés",
„Elképzeltetés-tervezés", „Visszafordíthatóság-csomag") — tervezési technikák, nem
detektálási célpontok. Érdemes eldönteni, ugyanabba a tárba tartoznak-e, vagy egy
javaslat-tárba, amit a P10 használ.

**Az Elvárás-lista 34 új sora egyike sincs jelhez kötve** (`Hiány-jel` üres: 59 → 93).
A szöveges fegyelem viszont tartja magát: mind a 120-nál ki van töltve a „mit kell
tartalmaznia", a „hogyan ellenőrizhető" és a „mikor NEM elvárás".

**A 7 új jelnél (J-500–J-506)** hiányzik a kinyerhetőség, a megfigyelés időbelisége és
az álpozitív-kockázat.

**A Kombináció-tár a kivétel:** 112 sor, egyetlen üres mező nélkül (66 kioltás, 22
erősítés, 13 telítődés, 11 jogi súlyosbítás). Egy apróság: 27 sornál csak egyetlen jel
szerepel az együttállók közt — egy együttállás definíció szerint legalább kettőt köt.

## A két megmaradt blokkoló

**1. Checkout és cookie taxonómia.** Változatlanul 0 szabály, F18/F19 nem született.
Ami élesíti: a gold `Hatókör` mezője 92 tesztet jelöl V1-nek, és ebből **22 (13
checkout + 9 cookie) olyan osztályt mér, amelyre a szabály-előhívás nem tud szűrni**.

**2. A gold elvárás-mezői prózák.** 37 zárójeles + 21 per-jeles sor. Az `Elvárt jelek`
reláció 42 sornál üres, az `Elvárt technikák` 58-nál. Részleges jó hír: a térkép
**11. pontozási szabálya** hivatalosan kimondja, hogy a zárójeles kód-tag nem
feltétele a tétel teljesítésének — pontosan az a döntés, amit a pontozó eddig
feltételezésként kezelt. A per-jeles alak olvasata továbbra sincs rögzítve.

## Két formai dolog, ami drága

**Az ekvivalencia-térkép 85 tétele kétféle alakban áll:** az 1–70. `##` fejlécként, a
71–85. félkövér bekezdésként. Ugyanez a pontozási szabályoknál (1–9 számozott, 10–12
egy blokkba ágyazva). Egy formátumra írt kigyűjtés a másikat némán elveszti — ebbe a
kódfrissítés során magam is beleszaladtam.

**Az Állapot-szótár még nincs kimondva.** A saját korpusz-auditotok megnevezte („az
Aktív szó három különböző dolog"), de nincs átvezetve a Kódkönyvbe. Ez konkrétan
elrontotta a szinkron konzisztencia-ellenőrzőjét (karanténnak vette a Technikatár
„Kerülendő" állapotát); javítva, de a következő fejlesztő ugyanebbe fut bele.

## Javasolt sorrend

1. **Held-out validációs halmaz kijelölése.** Amíg nincs, a 91,3% nem mond semmit egy
   új detektor-változatról — pedig pont ez a kapu dolga.
2. **Checkout és cookie taxonómia.** A V1 CI-bázis 22 tesztje ma szabálykészlet nélkül fut.
3. **A 42 új technika detektálási mezői** — kezdés a két jogi tétűvel (TK-140, TK-141).
4. **A gold strukturált kód-mezői** — a per-jeles alak és a két reláció.
5. **Állapot-szótár a Kódkönyvbe.**
6. **Diszkrimináns-tesztek a 77 kétértelmű jelre** — az első mérés óta változatlan.
7. **Élő checkout- és cookie-minták a goldba** — a held-out halmaz természetes alapanyaga.
