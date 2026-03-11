#!/usr/bin/env sh
# Resolve the directory this script lives in so it can be run from anywhere
DIR="$(cd "$(dirname "$0")" && pwd)"

# Silent build
"$DIR/node_modules/.bin/esbuild" "$DIR/src/index.tsx" \
  --bundle --platform=node --format=esm \
  --external:ink --external:react --external:ink-text-input \
  --external:ink-select-input --external:ink-spinner --external:node-fetch \
  --loader:.tsx=tsx --loader:.ts=ts \
  --outfile="$DIR/dist/index.mjs" \
  --log-level=silent

# Clear the terminal so only the app is visible
printf '\033[2J\033[3J\033[H'
exec node "$DIR/dist/index.mjs"
