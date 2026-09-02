#!/bin/bash
#
# Convictly — indítás egy dupla kattintással (macOS).
#
# Miért shell-szkript és nem telepítő-alkalmazás: a rendszer a saját gépeden fut, a
# saját adataiddal, és semmit nem küld el. Ez a szkript nem telepít semmit a
# rendszeredbe — mindent a projekt mappáján belülre tesz, és bármikor törölhető a
# mappa törlésével.
#
# Amit csinál: ellenőrzi a Node.js-t, letölti a függőségeket, letölti a böngészőt az
# URL-auditokhoz, lefordítja az alkalmazást, elindítja, és megnyitja a böngésződben.

set -u

cd "$(dirname "$0")/.." || exit 1
GYOKER="$(pwd)"

kek()  { printf "\033[1;34m%s\033[0m\n" "$1"; }
halk() { printf "\033[2m%s\033[0m\n" "$1"; }
hiba() { printf "\033[1;31m%s\033[0m\n" "$1"; }

echo
kek "Convictly"
halk "$GYOKER"
echo

# ---- 1. Node.js -------------------------------------------------------------

if ! command -v node > /dev/null 2>&1; then
  hiba "Nincs telepítve a Node.js."
  echo
  echo "Ez az egyetlen dolog, amit kézzel kell telepíteni:"
  echo "  1. Nyisd meg:  https://nodejs.org/en/download"
  echo "  2. Töltsd le a macOS telepítőt (LTS változat), és kattints végig rajta."
  echo "  3. Zárd be ezt az ablakot, és indítsd újra ezt a fájlt."
  echo
  read -r -p "Nyomj Entert a bezáráshoz."
  exit 1
fi

FO_VERZIO="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$FO_VERZIO" -lt 22 ]; then
  hiba "A Node.js verziója túl régi: $(node -v). A rendszernek 22-es vagy újabb kell."
  echo "Telepítsd újra innen: https://nodejs.org/en/download"
  echo
  read -r -p "Nyomj Entert a bezáráshoz."
  exit 1
fi

halk "Node.js $(node -v) rendben."

PNPM="npx --yes pnpm@10.33.0"

# ---- 2. Függőségek ----------------------------------------------------------

echo
kek "1/4 · Függőségek letöltése"
halk "Első alkalommal néhány percig tart; utána másodpercek."
if ! $PNPM install; then
  hiba "A függőségek letöltése nem sikerült. Ellenőrizd az internetkapcsolatot, és próbáld újra."
  read -r -p "Nyomj Entert a bezáráshoz."
  exit 1
fi

# ---- 3. Böngésző az URL-auditokhoz -----------------------------------------

echo
kek "2/4 · Böngésző letöltése az URL-auditokhoz"
halk "Ez az a böngésző, amivel a rendszer betölti az auditálandó oldalt (kb. 150 MB)."
if ! npx --yes playwright@1.62.1 install chromium; then
  hiba "A böngésző letöltése nem sikerült."
  halk "A rendszer ettől még elindul: a Szöveg ajtó (beillesztett szöveg) működni fog,"
  halk "az URL-audit viszont nem, amíg ez le nem fut."
fi

# ---- 4. Fordítás ------------------------------------------------------------

echo
kek "3/4 · Alkalmazás összeállítása"
if ! $PNPM app:build; then
  hiba "Az összeállítás nem sikerült. Küldd el a fenti hibaüzenetet, és megnézzük."
  read -r -p "Nyomj Entert a bezáráshoz."
  exit 1
fi

# ---- 5. Indítás -------------------------------------------------------------

echo
kek "4/4 · Indítás"

# A meghívó-kód és a havi keret az alfa beállítása (brief 7.2). Ha nincs .env fájl,
# az elsô indításkor létrehozzuk, hogy a kód ne csak ebben a szkriptben létezzen.
if [ ! -f "$GYOKER/.env" ]; then
  {
    echo "# Convictly — helyi beállítások"
    echo "ALFA_MEGHIVO=convictly"
    echo "ALFA_HAVI_KREDIT=1200"
    echo "ADATBAZIS_UTVONAL=.adat/convictly.sqlite"
  } > "$GYOKER/.env"
  halk "Létrehoztam a .env fájlt. A belépő kód: convictly"
fi

set -a
# shellcheck disable=SC1091
. "$GYOKER/.env"
set +a

halk "A böngésző mindjárt megnyílik. A belépő kód: ${ALFA_MEGHIVO}"
halk "Leállítás: zárd be ezt az ablakot, vagy nyomj Ctrl+C-t."
echo

# A böngésző megnyitása macOS-en; máshol csendben kimarad.
( sleep 4 && open "http://localhost:3000" >/dev/null 2>&1 ) &

$PNPM app:start
