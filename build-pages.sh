#!/usr/bin/env sh
# Génère docs/index.html (GitHub Pages) à partir de nouvel-an-copenhague.html (page claude.ai).
# Usage : sh build-pages.sh
set -e
cd "$(dirname "$0")"
src=nouvel-an-copenhague.html
out=docs/index.html
mkdir -p docs
marker='<header class="hero">'
grep -q "$marker" "$src" || { echo "marqueur introuvable dans $src" >&2; exit 1; }
{
  printf '%s\n' '<!doctype html>' '<html lang="fr">' '<head>' \
    '<meta charset="utf-8">' \
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' \
    '<meta property="og:title" content="Nouvel An à Copenhague">' \
    '<meta property="og:description" content="Dates, voiture ou avion, logement, budget : donne tes réponses avant le 31 octobre.">' \
    '<meta property="og:type" content="website">' \
    '<style>[hidden]{display:none!important}body{margin:0}img{max-width:100%}</style>'
  awk -v m="$marker" 'index($0, m){exit} {print}' "$src"
  printf '%s\n' '</head>' '<body>'
  awk -v m="$marker" 'index($0, m){f=1} f{print}' "$src"
  printf '%s\n' '</body>' '</html>'
} > "$out"
echo "OK -> $out"
