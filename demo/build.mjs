/**
 * A bemutató-oldal összeállítása: a csomagok egyetlen, beágyazott JS-kötegbe
 * fordulnak, és az oldal HTML-jébe kerülnek.
 *
 * Miért beágyazva: a publikált oldal külső szkriptet nem tölthet be, és a bemutató
 * értéke épp az, hogy a VALÓDI modulok futnak benne — nem egy leegyszerűsített
 * másolat. Egy köteg, egy fájl, nulla hálózati függés.
 */

import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const gyoker = dirname(fileURLToPath(import.meta.url));
const repo = join(gyoker, "..");

const csomagok = ["core", "brand", "szervezet", "projekt", "tanacs", "kerdezz", "tanulas", "folyamat", "kalibracio"];

const eredmeny = await build({
  entryPoints: [join(gyoker, "demo.ts")],
  bundle: true,
  format: "iife",
  target: "es2022",
  platform: "browser",
  write: false,
  alias: Object.fromEntries(
    csomagok.map((nev) => [`@meggyozes/${nev}`, join(repo, "packages", nev, "src", "index.ts")]),
  ),
});

const koteg = eredmeny.outputFiles[0]?.text;
if (koteg === undefined) throw new Error("Az esbuild nem adott kimenetet.");

const sablon = await readFile(join(gyoker, "index.html"), "utf8");
if (!sablon.includes("<!--KOTEG-->")) throw new Error("A sablonból hiányzik a <!--KOTEG--> jelölő.");

const kimenet = sablon.replace("<!--KOTEG-->", `<script>\n${koteg}\n</script>`);
await mkdir(join(gyoker, "dist"), { recursive: true });
await writeFile(join(gyoker, "dist", "meggyozes-demo.html"), kimenet);

const kb = (Buffer.byteLength(kimenet) / 1024).toFixed(0);
console.log(`demo/dist/meggyozes-demo.html — ${kb} kB (köteg: ${(Buffer.byteLength(koteg) / 1024).toFixed(0)} kB)`);
