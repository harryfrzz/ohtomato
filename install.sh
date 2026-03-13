#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

status() { printf '\033[1;32m✓\033[0m %s\n' "$1"; }
info()   { printf '\033[1;34m→\033[0m %s\n' "$1"; }
error()  { printf '\033[1;31m✗\033[0m %s\n' "$1" >&2; exit 1; }

echo ""
echo "  Ohtomato — dependency installer"
echo "  ================================"
echo ""

command -v python3 >/dev/null 2>&1 || error "python3 not found — install Python 3.10+ from https://python.org"
command -v node    >/dev/null 2>&1 || error "node not found — install Node.js 18+ from https://nodejs.org"
command -v npm     >/dev/null 2>&1 || error "npm not found — install Node.js 18+ from https://nodejs.org"

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PYTHON_MINOR=$(python3 -c 'import sys; print(sys.version_info.minor)')
PYTHON_MAJOR=$(python3 -c 'import sys; print(sys.version_info.major)')
if [[ "$PYTHON_MAJOR" -lt 3 || ( "$PYTHON_MAJOR" -eq 3 && "$PYTHON_MINOR" -lt 10 ) ]]; then
  error "Python 3.10+ required — found $PYTHON_VERSION"
fi
status "Python $PYTHON_VERSION"
status "Node $(node --version)"

if command -v ollama >/dev/null 2>&1; then
  status "Ollama already installed ($(ollama --version 2>/dev/null | head -1 || echo 'unknown version'))"
else
  info "Installing Ollama…"
  curl -fsSL https://ollama.com/install.sh | sh
  status "Ollama installed"
fi

VENV="$ROOT/.venv"
if [[ ! -d "$VENV" ]]; then
  info "Creating Python virtual environment…"
  python3 -m venv "$VENV"
  status "Virtual environment created at .venv"
else
  status "Virtual environment already exists"
fi

info "Installing Python dependencies…"
"$VENV/bin/pip" install --quiet --upgrade pip
"$VENV/bin/pip" install --quiet -r "$ROOT/requirements.txt"
status "Python dependencies installed"

info "Installing Node dependencies…"
cd "$ROOT/terminal"
npm install --silent
status "Node dependencies installed"

info "Building terminal UI…"
npm run build --silent
status "Terminal UI built"

chmod +x "$ROOT/run.sh"
chmod +x "$ROOT/install.sh"
status "Scripts are executable"

echo ""
echo "  All done. Run Ohtomato with:"
echo ""
echo "    ./run.sh"
echo ""
