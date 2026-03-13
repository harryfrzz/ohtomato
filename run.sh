#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$ROOT/.venv"
TERMINAL="$ROOT/terminal"
LOG_DIR="$ROOT/.logs"

mkdir -p "$LOG_DIR"

_pids=()
cleanup() {
  for pid in "${_pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

status() { printf '\033[1;32m✓\033[0m %s\n' "$1"; }
error()  { printf '\033[1;31m✗\033[0m %s\n' "$1" >&2; exit 1; }

[[ -f "$VENV/bin/activate" ]] || error "Python venv not found at $VENV — run install.sh first"
[[ -d "$TERMINAL/node_modules" ]] || error "Node modules not found — run install.sh first"
command -v ollama >/dev/null 2>&1 || error "ollama not found — run install.sh first"

if curl -sf http://localhost:11434 >/dev/null 2>&1; then
  status "Ollama already running"
else
  ollama serve >"$LOG_DIR/ollama.log" 2>&1 &
  _pids+=($!)
  for i in $(seq 1 10); do
    curl -sf http://localhost:11434 >/dev/null 2>&1 && break
    sleep 0.5
  done
  status "Ollama started"
fi

source "$VENV/bin/activate"
cd "$ROOT"
uvicorn main:app --host 0.0.0.0 --port 8000 >"$LOG_DIR/backend.log" 2>&1 &
_pids+=($!)

for i in $(seq 1 10); do
  curl -sf http://localhost:8000/health >/dev/null 2>&1 && break
  sleep 0.5
done
curl -sf http://localhost:8000/health >/dev/null 2>&1 || error "Backend failed to start — check $LOG_DIR/backend.log"
status "Backend started  (http://localhost:8000)"

status "Launching Ohtomato…"
sleep 0.3

cd "$TERMINAL"
./node_modules/.bin/esbuild src/index.tsx \
  --bundle --platform=node --format=esm \
  --external:ink --external:react --external:ink-text-input \
  --external:ink-select-input --external:ink-spinner --external:node-fetch \
  --loader:.tsx=tsx --loader:.ts=ts \
  --outfile=dist/index.mjs \
  --log-level=silent

printf '\033[2J\033[3J\033[H'
exec node dist/index.mjs
