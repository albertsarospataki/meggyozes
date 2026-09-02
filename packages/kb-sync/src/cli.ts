/**
 * Tudásbázis-szinkron parancssor.
 *
 *   NOTION_TOKEN=ntn_… pnpm kb:sync
 *
 * Kimenet: verziózott pillanatkép a PILLANATKEP_DIR alatt + konzisztencia-jelentés.
 * A hiba szintű leletek nem állítják meg az írást — a pillanatkép manifestje jelöli
 * «nem élesíthető»-nek, hogy a hiba látható és javítható legyen, ne néma.
 */
import process from "node:process";
import { NotionKliens } from "./notion-kliens";
import { kovetkezoVerzio, pillanatkepetIr } from "./pillanatkep";
import { szinkronizal } from "./szinkron";

async function fo(): Promise<void> {
  const token = process.env["NOTION_TOKEN"];
  if (!token) {
    console.error("Hiányzik a NOTION_TOKEN. Másold a .env.example-t .env-be és töltsd ki.");
    process.exitCode = 1;
    return;
  }
  const gyoker = process.env["PILLANATKEP_DIR"] ?? "./pillanatkepek";
  const notionVersion = process.env["NOTION_VERSION"];

  const kliens = new NotionKliens(
    notionVersion === undefined ? { token } : { token, notionVersion },
  );
  const verzio = await kovetkezoVerzio(gyoker);

  console.log(`Szinkron indul → ${verzio}`);
  const eredmeny = await szinkronizal(kliens, { verzio });
  const manifest = await pillanatkepetIr(
    gyoker,
    eredmeny.pillanatkep,
    eredmeny.leletek,
    eredmeny.elesitheto,
  );

  console.log(`\nPillanatkép: ${verzio} (ujjlenyomat ${manifest.ujjlenyomat})`);
  for (const [tar, db] of Object.entries(manifest.darabszamok)) console.log(`  ${tar}: ${db}`);

  for (const uzenet of eredmeny.darabszamEltéresek) console.error(`\n⚠ ${uzenet}`);

  console.log("\nKonzisztencia-jelentés:");
  if (eredmeny.leletek.length === 0) console.log("  nincs lelet");
  for (const l of eredmeny.leletek) {
    const jel = l.sulyossag === "hiba" ? "✖" : l.sulyossag === "figyelmeztetes" ? "⚠" : "ℹ";
    console.log(`  ${jel} [${l.azonosito}] ${l.uzenet}`);
  }

  console.log(
    eredmeny.elesitheto
      ? "\n✔ A pillanatkép élesíthető — de tudásbázis-változás után KÖTELEZŐ a kalibrációs futás."
      : "\n✖ A pillanatkép NEM élesíthető: előbb a hiba szintű leleteket kell javítani.",
  );
  if (!eredmeny.elesitheto) process.exitCode = 1;
}

fo().catch((hiba: unknown) => {
  console.error(hiba);
  process.exitCode = 1;
});
