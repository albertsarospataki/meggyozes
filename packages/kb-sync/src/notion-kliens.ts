/**
 * Notion-olvasó a tudásbázis-tárakhoz.
 *
 * A LEGFONTOSABB szolgáltatása a TELJES lapozás. A projekt történelmi hibája az volt,
 * hogy egy 100 soros lapkorlát némán levágta a szabály-előhívást — a hiányzó szabályok
 * nem hibaüzenetként, hanem hiányzó megállapításként jelentek meg. Ezért a lapozás itt
 * nem opció, hanem az egyetlen elérhető művelet, és a végén ellenőrizzük, hogy a
 * ciklus tényleg kimerítette-e a forrást.
 */

export interface NotionOldal {
  readonly id: string;
  readonly url: string;
  readonly properties: Record<string, unknown>;
  readonly archived?: boolean;
  readonly in_trash?: boolean;
}

/** A leképezés és a konzisztencia-ellenőrzés ezen az interfészen át tesztelhető hálózat nélkül. */
export interface NotionForras {
  osszesOldal(dataSourceId: string): Promise<NotionOldal[]>;
}

export interface NotionKliensOpciok {
  readonly token: string;
  readonly notionVersion?: string;
  readonly baseUrl?: string;
  /** Lapméret; a Notion maximuma 100. */
  readonly lapMeret?: number;
  /** Két kérés közti minimális szünet ms-ban — a Notion ~3 kérés/mp-et enged. */
  readonly keresKozottMs?: number;
  readonly maxUjraprobalkozas?: number;
  readonly fetchImpl?: typeof fetch;
}

interface LapValasz {
  readonly results: NotionOldal[];
  readonly has_more: boolean;
  readonly next_cursor: string | null;
}

/** Felső korlát a lapozási ciklusra: 100 000 sor felett biztosan hibás állapot van. */
const MAX_LAP = 1000;

export class NotionHiba extends Error {
  constructor(
    message: string,
    readonly statusz?: number,
  ) {
    super(message);
    this.name = "NotionHiba";
  }
}

const varj = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class NotionKliens implements NotionForras {
  readonly #token: string;
  readonly #version: string;
  readonly #baseUrl: string;
  readonly #lapMeret: number;
  readonly #keresKozottMs: number;
  readonly #maxUjraprobalkozas: number;
  readonly #fetch: typeof fetch;

  constructor(o: NotionKliensOpciok) {
    if (!o.token) throw new NotionHiba("Hiányzik a NOTION_TOKEN.");
    this.#token = o.token;
    this.#version = o.notionVersion ?? "2025-09-03";
    this.#baseUrl = o.baseUrl ?? "https://api.notion.com";
    this.#lapMeret = Math.min(o.lapMeret ?? 100, 100);
    this.#keresKozottMs = o.keresKozottMs ?? 350;
    this.#maxUjraprobalkozas = o.maxUjraprobalkozas ?? 4;
    this.#fetch = o.fetchImpl ?? fetch;
  }

  async #keres(dataSourceId: string, cursor: string | undefined): Promise<LapValasz> {
    const url = `${this.#baseUrl}/v1/data_sources/${dataSourceId}/query`;
    const test = JSON.stringify(
      cursor === undefined
        ? { page_size: this.#lapMeret }
        : { page_size: this.#lapMeret, start_cursor: cursor },
    );

    let utolsoHiba: unknown;
    for (let probalkozas = 0; probalkozas <= this.#maxUjraprobalkozas; probalkozas++) {
      try {
        const valasz = await this.#fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.#token}`,
            "Notion-Version": this.#version,
            "Content-Type": "application/json",
          },
          body: test,
        });

        // 429 és 5xx: exponenciális visszalépés. A Retry-After-t tiszteletben tartjuk.
        if (valasz.status === 429 || valasz.status >= 500) {
          const retryAfter = Number(valasz.headers.get("retry-after") ?? 0);
          const varakozas = retryAfter > 0 ? retryAfter * 1000 : 2 ** probalkozas * 1000;
          utolsoHiba = new NotionHiba(`Notion ${valasz.status}`, valasz.status);
          await varj(varakozas);
          continue;
        }
        if (!valasz.ok) {
          throw new NotionHiba(
            `Notion ${valasz.status} a ${dataSourceId} lekérdezésén: ${await valasz.text()}`,
            valasz.status,
          );
        }
        return (await valasz.json()) as LapValasz;
      } catch (hiba) {
        if (hiba instanceof NotionHiba && hiba.statusz !== undefined && hiba.statusz < 500) throw hiba;
        utolsoHiba = hiba;
        await varj(2 ** probalkozas * 1000);
      }
    }
    throw new NotionHiba(
      `A ${dataSourceId} lekérdezése ${this.#maxUjraprobalkozas} újrapróbálkozás után sem sikerült: ${String(utolsoHiba)}`,
    );
  }

  /**
   * Végiglapozza a teljes adatforrást. A ciklus CSAK akkor áll meg, ha a Notion
   * has_more=false-t adott — csonkolt eredmény nem hagyhatja el ezt a függvényt.
   */
  async osszesOldal(dataSourceId: string): Promise<NotionOldal[]> {
    const oldalak: NotionOldal[] = [];
    let cursor: string | undefined;
    let lap = 0;

    for (;;) {
      const valasz = await this.#keres(dataSourceId, cursor);
      oldalak.push(...valasz.results);
      lap++;

      if (!valasz.has_more) break;
      if (valasz.next_cursor === null) {
        throw new NotionHiba(
          `A ${dataSourceId} has_more=true-t adott next_cursor nélkül — a lapozás csonkulna.`,
        );
      }
      if (lap >= MAX_LAP) {
        throw new NotionHiba(`A ${dataSourceId} lapozása ${MAX_LAP} lap után sem ért véget.`);
      }
      cursor = valasz.next_cursor;
      await varj(this.#keresKozottMs);
    }

    // A törölt/archivált sorok nem részei a tudásbázisnak.
    return oldalak.filter((o) => o.archived !== true && o.in_trash !== true);
  }
}
