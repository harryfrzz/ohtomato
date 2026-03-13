# Ohtomato

A local AI automation agent that uses tool-calling LLMs to get real work done — run commands, manage files, browse the web, control apps, and more. Runs entirely on your machine with Ollama. No cloud, no API keys.

Supports speech input via on-device Whisper.

---

## Requirements

- macOS
- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com)

---

## Quick Start

```bash
git clone https://github.com/harryfrz/automato.git
cd automato
./install.sh
./run.sh
```

---

## Tested On

- MacBook Air M2 (16GB) — tool calling works perfectly with `ministral-3:3b`

---

## What Works / What Not

**Works:**
- Opening applications
- Creating, modifying, and editing Obsidian files
- Web search
- File system actions
- Almost everything works....

**Not working:**
- None yet — if you find issues, please post them

---

## Features

- **Commands:** `/models`, `/asr`, `/plugins`, `/automate`, `/clear`, `/help`
- **Tools:** file ops, run commands, clipboard, web search, weather, and more
- **Plugins:** drop `.py` files in `plugins/` — includes Obsidian integration
- **Voice:** press `/asr` to record voice and transcribe with Whisper

---

## Contributing

Contributions are always welcome! Drop a `.py` file in `plugins/` to add new tools.
