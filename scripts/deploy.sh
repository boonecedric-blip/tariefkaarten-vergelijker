#!/usr/bin/env bash
# Auto-deploy script — gebruikt door Claude vanuit de Cowork sandbox.
# Vereist VERCEL_TOKEN in .env.local of als env var.
set -euo pipefail

cd "$(dirname "$0")/.."

# Laad token uit .env.local indien aanwezig
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs -d '\n')
fi

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "❌ VERCEL_TOKEN niet gevonden. Zet hem in .env.local of als env var."
  exit 1
fi

# Argument: --prod (default) of --preview
TARGET="${1:---prod}"

echo "🚀 Deploying naar Vercel ($TARGET)..."
npx --yes vercel@latest deploy "$TARGET" --token="$VERCEL_TOKEN" --yes
