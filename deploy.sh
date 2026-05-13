#!/bin/bash
# Deploy script voor Vlaamse Tarieven Vergelijker
# Vereist: .env.deploy met VERCEL_TOKEN=...
#
# Gebruik:
#   bash deploy.sh           -> preview deploy
#   bash deploy.sh --prod    -> productie deploy

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Laad Vercel-token
if [ ! -f .env.deploy ]; then
  echo "FOUT: .env.deploy ontbreekt. Maak het aan met:" >&2
  echo "  echo 'VERCEL_TOKEN=jouw_token' > .env.deploy" >&2
  exit 1
fi
export $(grep -v '^#' .env.deploy | xargs)

if [ -z "$VERCEL_TOKEN" ]; then
  echo "FOUT: VERCEL_TOKEN niet gezet in .env.deploy" >&2
  exit 1
fi

# Vercel CLI: installeer lokaal in ~/.npm-global als nog niet aanwezig
if ! command -v vercel >/dev/null 2>&1; then
  if [ -x "$HOME/.npm-global/bin/vercel" ]; then
    export PATH="$HOME/.npm-global/bin:$PATH"
  else
    echo "Vercel CLI installeren in ~/.npm-global ..."
    mkdir -p "$HOME/.npm-global"
    npm config set prefix "$HOME/.npm-global"
    npm install -g vercel >/dev/null 2>&1
    export PATH="$HOME/.npm-global/bin:$PATH"
  fi
fi

# Deploy
if [ "$1" == "--prod" ]; then
  echo "Productie-deploy gestart..."
  vercel deploy --prod --token="$VERCEL_TOKEN" --yes
else
  echo "Preview-deploy gestart..."
  vercel deploy --token="$VERCEL_TOKEN" --yes
fi
