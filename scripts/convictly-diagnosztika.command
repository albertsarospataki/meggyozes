#!/bin/bash
#
# Convictly — diagnosztika.
#
# Nem indít el semmit, nem tölt le semmit, nem módosít semmit. Csak összeszedi,
# hogy mi van a gépen, és kiír egy fájlt az Asztalra. Azt az egy fájlt kell
# elküldeni, ha az indítás elakad.

set -u

cd "$(dirname "$0")/.." 2>/dev/null || true
GYOKER="$(pwd)"
KIMENET="$HOME/Desktop/convictly-diagnosztika.txt"

{
  echo "Convictly diagnosztika — $(date '+%Y-%m-%d %H:%M')"
  echo

  echo "[gép]"
  sw_vers 2>/dev/null || uname -a
  echo "processzor: $(uname -m)"
  echo

  echo "[Node.js]"
  if command -v node > /dev/null 2>&1; then
    echo "node: $(node -v)   ($(command -v node))"
  else
    echo "node: NINCS TELEPÍTVE"
  fi
  if command -v npm > /dev/null 2>&1; then
    echo "npm:  $(npm -v)"
  else
    echo "npm:  NINCS"
  fi
  echo

  echo "[projekt mappa]"
  echo "$GYOKER"
  for F in package.json pnpm-lock.yaml apps/web/package.json scripts/convictly-inditas.command; do
    if [ -e "$GYOKER/$F" ]; then echo "  megvan: $F"; else echo "  HIÁNYZIK: $F"; fi
  done
  if [ -d "$GYOKER/node_modules" ]; then echo "  megvan: node_modules"; else echo "  nincs még: node_modules (a függőségek nem töltődtek le)"; fi
  if [ -d "$GYOKER/apps/web/.next" ]; then echo "  megvan: apps/web/.next (az alkalmazás össze van állítva)"; else echo "  nincs még: apps/web/.next"; fi
  if [ -f "$GYOKER/.adat/convictly.sqlite" ]; then echo "  megvan: .adat/convictly.sqlite ($(du -h "$GYOKER/.adat/convictly.sqlite" | cut -f1))"; fi
  echo

  echo "[hálózat]"
  if curl -s -o /dev/null -m 10 -w "registry.npmjs.org: %{http_code}\n" https://registry.npmjs.org/ 2>/dev/null; then :; else echo "registry.npmjs.org: NEM ÉRHETŐ EL"; fi
  echo

  echo "[fut-e már valami a 3000-es porton]"
  lsof -i :3000 -sTCP:LISTEN 2>/dev/null || echo "a 3000-es port szabad"
  echo

  echo "[az utolsó indítás naplója]"
  if [ -f "$GYOKER/convictly-naplo.txt" ]; then
    tail -n 60 "$GYOKER/convictly-naplo.txt"
  else
    echo "nincs napló — az indító még nem futott le"
  fi
} > "$KIMENET" 2>&1

echo
printf "\033[1;34m%s\033[0m\n" "Kész."
echo "A jelentés itt van az Asztalodon:"
echo "  $KIMENET"
echo
echo "Ezt az egy fájlt küldd el, és megmondom, hol akadt el."
echo
read -r -p "Nyomj Entert a bezáráshoz."
