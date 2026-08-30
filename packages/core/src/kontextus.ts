/**
 * P0 kontextus-kapu. A Constitution 4. pontja: hiányzó kontextusnál a rendszer
 * NEM találgat, hanem bekéri. Ezért minden mező explicit „nincs megadva" állapotot
 * is felvehet — az alapértelmezés kitalálása tiltott.
 */

export type UzletiModell = "B2B" | "B2C";

/** Az oldal célja — az indító űrlap legördülője. */
export type ArtefaktumCel =
  | "vasarlas"
  | "foglalas"
  | "lead"
  | "feliratkozas"
  | "tajekoztatas";

/** Hol tart a látogató a tölcsérben. */
export type TolcserPozicio = "hideg" | "meleg" | "visszatero";

export interface AuditKontextus {
  readonly uzletiModell: UzletiModell | undefined;
  readonly agazat: string | undefined;
  readonly artefaktumCel: ArtefaktumCel | undefined;
  readonly tolcserPozicio: TolcserPozicio | undefined;
}

export const KONTEXTUS_MEZOK = [
  "uzletiModell",
  "agazat",
  "artefaktumCel",
  "tolcserPozicio",
] as const satisfies readonly (keyof AuditKontextus)[];

/**
 * Megmondja, mely kontextusmezők hiányoznak. A P0 kapu ezek alapján tesz fel
 * kérdést az indító űrlapon — nem tölti ki alapértelmezéssel.
 */
export function hianyzoKontextusMezok(k: AuditKontextus): (keyof AuditKontextus)[] {
  return KONTEXTUS_MEZOK.filter((mezo) => k[mezo] === undefined);
}

export function kontextusTeljes(k: AuditKontextus): boolean {
  return hianyzoKontextusMezok(k).length === 0;
}
