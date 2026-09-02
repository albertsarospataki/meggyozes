/**
 * Tárolási séma (brief v2.0 4.1 adatmodell, H komponens).
 *
 * SQLite, mert az alfa egyetlen gépen fut, és a séma így verziózható a repóban.
 * A brief Postgresre + RLS-re megy éles alatt; a repository-réteg ezért nem enged
 * ki egyetlen nyers lekérdezést sem: minden olvasás és írás a tenant-szűrőn megy át
 * (`szervezet_azonosito`, és ahol van, `brand_azonosito`). Amikor a Postgres jön,
 * a policy ugyanazt fogja kikényszeríteni az adatbázisban is — a kód nem változik.
 *
 * Az összetett objektumokat (brand-profil, riport, artefaktum-objektum) JSON-oszlop
 * tárolja. Ezek a domain-csomagok típusai; külön táblákra bontva a séma követné a
 * típusok minden változását, és a migráció lenne a fejlesztés fő költsége.
 */

export const SEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS szervezet (
  azonosito TEXT PRIMARY KEY,
  nev TEXT NOT NULL,
  csomag TEXT NOT NULL,
  letrehozva TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS felhasznalo (
  azonosito TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nev TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tagsag (
  felhasznalo_azonosito TEXT NOT NULL REFERENCES felhasznalo(azonosito),
  szervezet_azonosito TEXT NOT NULL REFERENCES szervezet(azonosito),
  szerep TEXT NOT NULL,
  brand_hozzaferes TEXT NOT NULL,
  kerdezhet INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (felhasznalo_azonosito, szervezet_azonosito)
);

CREATE TABLE IF NOT EXISTS brand (
  azonosito TEXT PRIMARY KEY,
  szervezet_azonosito TEXT NOT NULL REFERENCES szervezet(azonosito),
  nev TEXT NOT NULL,
  profil TEXT NOT NULL,
  letrehozva TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projekt (
  azonosito TEXT PRIMARY KEY,
  szervezet_azonosito TEXT NOT NULL REFERENCES szervezet(azonosito),
  brand_azonosito TEXT NOT NULL REFERENCES brand(azonosito),
  nev TEXT NOT NULL,
  tipus TEXT NOT NULL,
  statusz TEXT NOT NULL,
  letrehozva TEXT NOT NULL,
  utolso_aktivitas TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artefaktum (
  azonosito TEXT PRIMARY KEY,
  szervezet_azonosito TEXT NOT NULL,
  projekt_azonosito TEXT NOT NULL REFERENCES projekt(azonosito),
  ajto TEXT NOT NULL,
  megnevezes TEXT NOT NULL,
  rogzitve TEXT NOT NULL,
  objektum TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS futas (
  azonosito TEXT PRIMARY KEY,
  szervezet_azonosito TEXT NOT NULL,
  brand_azonosito TEXT,
  projekt_azonosito TEXT NOT NULL REFERENCES projekt(azonosito),
  mod TEXT NOT NULL,
  inditotta TEXT NOT NULL,
  inditva TEXT NOT NULL,
  statusz TEXT NOT NULL,
  tudasbazis_verzio TEXT NOT NULL,
  prompt_verzio TEXT NOT NULL,
  det_verzio TEXT NOT NULL,
  modell TEXT NOT NULL,
  kredit_koltseg INTEGER NOT NULL,
  naplo TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS riport (
  azonosito TEXT PRIMARY KEY,
  szervezet_azonosito TEXT NOT NULL,
  brand_azonosito TEXT,
  projekt_azonosito TEXT NOT NULL,
  futas_azonosito TEXT NOT NULL REFERENCES futas(azonosito),
  verzio INTEGER NOT NULL,
  keszult TEXT NOT NULL,
  mod TEXT NOT NULL,
  statusz TEXT NOT NULL,
  tartalom TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS intent (
  azonosito TEXT NOT NULL,
  szervezet_azonosito TEXT NOT NULL,
  projekt_azonosito TEXT NOT NULL,
  verzio INTEGER NOT NULL,
  adat TEXT NOT NULL,
  letrejott TEXT NOT NULL,
  PRIMARY KEY (azonosito, verzio)
);

CREATE TABLE IF NOT EXISTS beszelgetes (
  azonosito TEXT PRIMARY KEY,
  szervezet_azonosito TEXT NOT NULL,
  projekt_azonosito TEXT,
  brand_azonosito TEXT,
  mod TEXT NOT NULL,
  uzenetek TEXT NOT NULL,
  frissitve TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kredit_tranzakcio (
  azonosito TEXT PRIMARY KEY,
  szervezet_azonosito TEXT NOT NULL REFERENCES szervezet(azonosito),
  adat TEXT NOT NULL,
  letrejott TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS visszajelzes (
  azonosito TEXT PRIMARY KEY,
  szervezet_azonosito TEXT NOT NULL,
  riport_azonosito TEXT NOT NULL,
  megallapitas_azonosito TEXT NOT NULL,
  tipus TEXT NOT NULL,
  szoveg TEXT,
  ki TEXT NOT NULL,
  mikor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS megvalositas (
  javaslat_azonosito TEXT PRIMARY KEY,
  szervezet_azonosito TEXT NOT NULL,
  riport_azonosito TEXT NOT NULL,
  statusz TEXT NOT NULL,
  jelolve TEXT,
  jelolte TEXT,
  mert_valtozas TEXT
);

CREATE TABLE IF NOT EXISTS tanulasi_jelolt (
  azonosito TEXT PRIMARY KEY,
  adat TEXT NOT NULL,
  keletkezett TEXT NOT NULL,
  statusz TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projekt_brand ON projekt(szervezet_azonosito, brand_azonosito);
CREATE INDEX IF NOT EXISTS idx_futas_projekt ON futas(szervezet_azonosito, projekt_azonosito);
CREATE INDEX IF NOT EXISTS idx_riport_projekt ON riport(szervezet_azonosito, projekt_azonosito);
CREATE INDEX IF NOT EXISTS idx_kredit_szervezet ON kredit_tranzakcio(szervezet_azonosito, letrejott);
`;
