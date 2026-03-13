<img width="1280" height="274" alt="logo-ohtomato" src="https://github.com/user-attachments/assets/33f6a1d2-32dc-4223-b3c8-e06e4d9ad04d" />
A local AI automation agent that uses tool-calling LLMs to get real work done — run commands, manage files, browse the web, control apps, and more. Runs entirely on your machine with Ollama. No cloud, no API keys. Supports speech input (ASR) via on-device Whisper.

## Requirements

- Currently supports macOS only
- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com)


## Quick Start

```bash
git clone https://github.com/harryfrz/automato.git
cd automato
./install.sh
./run.sh
```

## Tested On

- MacBook Air M2 (16GB) — tool calling works perfectly with `ministral-3:3b`

## What Works / What Not

**Works:**
- Opening applications
- Creating, modifying, and editing Obsidian files
- Web search
- File system actions
- Almost everything works....

**Not working:**
- None yet — if you find issues, please post them

## Features

- **Commands:** `/models`, `/asr`, `/plugins`, `/automate`, `/clear`, `/help`
- **Tools:** file ops, run commands, clipboard, web search, weather, and more
- **Plugins:** drop `.py` files in `plugins/`
- **Voice:** press `/asr` to record voice and transcribe with Whisper

## Plugins available
- Obsidian
- More coming soon...!!
  
## Contributing

Contributions are always welcome! Drop a `.py` file in `plugins/` to add new tools.
