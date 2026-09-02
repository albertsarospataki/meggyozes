import { randomUUID } from "node:crypto";

/**
 * Rövid, olvasható azonosító. Az előtag azért kell, mert az azonosítók a riportban,
 * a naplóban és a kredit-történetben is megjelennek — ott „b-3f2a" többet mond, mint
 * egy nyers UUID, és a hivatkozás típusa ránézésre ellenőrizhető.
 */
export function azonosito(elotag: string): string {
  return `${elotag}-${randomUUID().slice(0, 8)}`;
}

export const most = (): string => new Date().toISOString();
