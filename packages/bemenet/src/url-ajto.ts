/**
 * URL-ajtó (A komponens).
 *
 * A brief W2 3. lépése: DOM + szöveg + teljes képernyőkép + árak/CTA/űrlapok +
 * consent-banner az ELSŐ betöltéskor. A sorrend lényeges: a consent-bannert csak az
 * első képernyő mutatja, és pont az a jel, amit a legkönnyebb elveszíteni — ha előbb
 * kattintanánk el, a megállapítás soha nem születne meg.
 *
 * A hibát emberi nyelven adjuk vissza, ajánlattal (10. nem-funkcionális követelmény):
 * a robots.txt-tiltás vagy a render-hiba nem stack trace, hanem „illeszd be a szöveget".
 */

import { existsSync } from "node:fs";
import { chromium, type Browser, type LaunchOptions } from "playwright";
import { szovegetNormalizal, type ArtefaktumObjektum, type Blokk, type BlokkSzerep } from "./artefaktum-objektum.js";

/**
 * Böngésző-útvonal.
 *
 * A Playwright a saját verziójához tartozó build-számot keresi. Ahol a böngésző a
 * gépen már ott van (konténer-image, CI-cache), a verzió-egyezés nem garantált — és
 * ilyenkor egy futásra kész Chromium mellett hasalna el az audit. A `CHROMIUM_UTVONAL`
 * ezért felülírja a keresést; ha nincs megadva, a Playwright saját letöltése fut.
 */
function inditasiBeallitas(): LaunchOptions {
  const alap: LaunchOptions = { args: ["--no-sandbox"] };
  const utvonal = process.env.CHROMIUM_UTVONAL ?? "/opt/pw-browsers/chromium";
  return existsSync(utvonal) ? { ...alap, executablePath: utvonal } : alap;
}

export interface UrlAjtoBeallitas {
  readonly url: string;
  readonly rogzitve: string;
  /** Ha megadod, ide készül a teljes oldal képe. */
  readonly kepernyokepUtvonal?: string;
  readonly idokorlatMs?: number;
}

export class BemenetiHiba extends Error {
  constructor(
    message: string,
    readonly ajanlat: string,
  ) {
    super(message);
    this.name = "BemenetiHiba";
  }
}

const SZEREP_TERKEP: Readonly<Record<string, BlokkSzerep>> = {
  h1: "cim",
  h2: "alcim",
  h3: "alcim",
  h4: "alcim",
  p: "bekezdes",
  li: "lista",
  button: "gomb",
  a: "link",
  blockquote: "idezet",
  label: "urlap",
};

/** A böngészőben futó gyűjtés. Egyetlen menetben olvassuk ki, amit a DOM tud. */
const GYUJTO = `() => {
  const chromeSzulok = ["header", "nav", "footer", "aside"];
  const siteChrome = (el) => chromeSzulok.some((s) => el.closest(s) !== null);
  const lathato = (el) => {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none";
  };
  const valogatas = [...document.querySelectorAll("h1,h2,h3,h4,p,li,button,a,blockquote,label,[role=button]")];
  const blokkok = [];
  let n = 0;
  for (const el of valogatas) {
    if (!lathato(el)) continue;
    const szoveg = (el.innerText || el.textContent || "").replace(/\\s+/g, " ").trim();
    if (szoveg === "" || szoveg.length > 600) continue;
    n += 1;
    blokkok.push({
      azonosito: "b-" + n,
      cimke: el.tagName.toLowerCase(),
      szoveg,
      hely: el.tagName.toLowerCase() + (el.id ? "#" + el.id : ""),
      siteChrome: siteChrome(el),
    });
  }
  const banner = [...document.querySelectorAll("div,section,dialog")].find((el) => {
    const t = (el.innerText || "").toLowerCase();
    return lathato(el) && t.length < 900 && (t.includes("cookie") || t.includes("süti") || t.includes("consent"));
  });
  return {
    cim: document.title,
    szoveg: document.body ? document.body.innerText : "",
    blokkok,
    gombok: blokkok.filter((b) => b.cimke === "button" || b.cimke === "a").map((b) => b.szoveg).slice(0, 60),
    linkek: [...document.querySelectorAll("a[href]")].slice(0, 120).map((a) => ({
      szoveg: (a.innerText || "").replace(/\\s+/g, " ").trim(),
      cel: a.getAttribute("href") || "",
    })),
    urlapMezok: [...document.querySelectorAll("input,select,textarea")].slice(0, 60).map((el) =>
      (el.getAttribute("name") || el.getAttribute("placeholder") || el.getAttribute("type") || "mező"),
    ),
    consentBanner: banner ? (banner.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 600) : null,
  };
}`;

const AR_MINTA = /(\d[\d  .,]*)\s?(Ft|HUF|EUR|€|\$|USD)/gi;

export async function urlAjto(b: UrlAjtoBeallitas): Promise<ArtefaktumObjektum> {
  let bongeszo: Browser | undefined;
  try {
    bongeszo = await chromium.launch(inditasiBeallitas());
  } catch (hiba) {
    throw new BemenetiHiba(
      `A böngésző nem indult el: ${(hiba as Error).message}`,
      "Illeszd be az oldal szövegét a Szöveg ajtón — a szöveges megállapítások ugyanúgy elkészülnek.",
    );
  }

  try {
    const oldal = await bongeszo.newPage({ viewport: { width: 1440, height: 900 } });
    const valasz = await oldal.goto(b.url, { waitUntil: "domcontentloaded", timeout: b.idokorlatMs ?? 30_000 });

    if (valasz !== null && valasz.status() >= 400) {
      throw new BemenetiHiba(
        `Az oldal ${valasz.status()} státusszal válaszolt.`,
        "Ellenőrizd a címet, vagy illeszd be az oldal szövegét a Szöveg ajtón.",
      );
    }

    // A consent-banner az első képernyőn él; a kép és a gyűjtés is ELŐBB fut,
    // mint bármi, ami elkattinthatná.
    await oldal.waitForTimeout(1200);

    if (b.kepernyokepUtvonal !== undefined) {
      await oldal.screenshot({ path: b.kepernyokepUtvonal, fullPage: true });
    }

    // Kifejezésként adjuk át (azonnal meghívott függvény): a Playwright a puszta
    // függvény-forrást kifejezésnek olvasná, és magát a függvényt adná vissza.
    const nyers = (await oldal.evaluate(`(${GYUJTO})()`)) as {
      cim: string;
      szoveg: string;
      blokkok: { azonosito: string; cimke: string; szoveg: string; hely: string; siteChrome: boolean }[];
      gombok: string[];
      linkek: { szoveg: string; cel: string }[];
      urlapMezok: string[];
      consentBanner: string | null;
    };

    const szoveg = szovegetNormalizal(nyers.szoveg);
    const blokkok: Blokk[] = nyers.blokkok.map((x) => ({
      azonosito: x.azonosito,
      szerep: SZEREP_TERKEP[x.cimke] ?? "egyeb",
      szoveg: x.szoveg,
      hely: x.hely,
      siteChrome: x.siteChrome,
    }));

    return {
      ajto: "url",
      forras: b.url,
      cim: nyers.cim === "" ? undefined : nyers.cim,
      szoveg,
      blokkok,
      gombok: [...new Set(nyers.gombok)].filter((g) => g !== ""),
      linkek: nyers.linkek,
      arak: [...new Set([...szoveg.matchAll(AR_MINTA)].map((m) => m[0].trim()))],
      urlapMezok: nyers.urlapMezok,
      consentBanner: nyers.consentBanner ?? undefined,
      kepernyokep: b.kepernyokepUtvonal,
      rogzitve: b.rogzitve,
      korlatok: [
        "Egyetlen pillanatkép: a kattintásra megjelenő és az időzített elemek nem látszanak.",
        "A kétidőpontos jelek (ár változása, visszaszámláló lejárta) csak második megfigyeléssel dönthetők el.",
      ],
    };
  } catch (hiba) {
    if (hiba instanceof BemenetiHiba) throw hiba;
    throw new BemenetiHiba(
      `Nem sikerült betölteni az oldalt: ${(hiba as Error).message}`,
      "Ellenőrizd a címet, vagy illeszd be az oldal szövegét a Szöveg ajtón.",
    );
  } finally {
    await bongeszo.close();
  }
}
