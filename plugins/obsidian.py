import os
import subprocess
import urllib.parse

PLUGIN_INFO = {
    "name":        "Obsidian",
    "version":     "1.0.0",
    "description": "Create, open and search notes in an Obsidian vault",
    "author":      "otomato",
    "tools": [
        "obsidian_list_vaults",
        "obsidian_create_note",
        "obsidian_open_note",
        "obsidian_search",
    ],
}

_OBSIDIAN_JSON = os.path.expanduser(
    "~/Library/Application Support/obsidian/obsidian.json"
)

_SCAN_ROOTS = [
    os.path.expanduser("~/Documents"),
    os.path.expanduser("~/Desktop"),
    os.path.expanduser("~/Library/Mobile Documents/iCloud~md~obsidian/Documents"),
    os.path.expanduser("~"),
]

def _registered_vaults() -> list[dict]:
    seen: dict[str, dict] = {}

    try:
        import json
        with open(_OBSIDIAN_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
        for v in data.get("vaults", {}).values():
            if "path" in v and os.path.isdir(v["path"]):
                key = v["path"]
                seen[key] = {"name": os.path.basename(v["path"]), "path": v["path"]}
    except Exception:
        pass

    for root in _SCAN_ROOTS:
        if not os.path.isdir(root):
            continue
        try:
            for entry in os.listdir(root):
                full = os.path.join(root, entry)
                if full not in seen and os.path.isdir(full) and os.path.isdir(os.path.join(full, ".obsidian")):
                    seen[full] = {"name": entry, "path": full}
        except Exception:
            pass

    return list(seen.values())


def _vault_root(vault: str) -> str:
    for v in _registered_vaults():
        if v["name"].lower() == vault.lower():
            return v["path"]

    candidates = [os.path.join(root, vault) for root in _SCAN_ROOTS]
    for c in candidates:
        if os.path.isdir(c):
            return c
    return os.path.expanduser(f"~/Documents/{vault}")


async def obsidian_list_vaults() -> dict:
    try:
        vaults = _registered_vaults()
        return {"vaults": vaults, "count": len(vaults)}
    except Exception as ex:
        return {"error": str(ex)}


def _open_uri(uri: str) -> None:
    subprocess.Popen(["open", uri], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

async def obsidian_create_note(vault: str, path: str, content: str = "") -> dict:
    try:
        if not path.endswith(".md"):
            path = path + ".md"

        root      = _vault_root(vault)
        note_path = os.path.join(root, path)
        os.makedirs(os.path.dirname(os.path.abspath(note_path)), exist_ok=True)

        with open(note_path, "w", encoding="utf-8") as f:
            f.write(content)
        uri = "obsidian://open?vault={}&file={}".format(
            urllib.parse.quote(vault, safe=""),
            urllib.parse.quote(path.removesuffix(".md"), safe="/"),
        )
        _open_uri(uri)

        return {
            "created":            note_path,
            "opened_in_obsidian": True,
            "bytes_written":      len(content.encode()),
        }
    except Exception as ex:
        return {"error": str(ex)}


async def obsidian_open_note(vault: str, path: str) -> dict:
    try:
        file_arg = path.removesuffix(".md")
        uri = "obsidian://open?vault={}&file={}".format(
            urllib.parse.quote(vault, safe=""),
            urllib.parse.quote(file_arg, safe="/"),
        )
        _open_uri(uri)
        return {"opened": path, "vault": vault}
    except Exception as ex:
        return {"error": str(ex)}


async def obsidian_search(vault: str, query: str) -> dict:
    try:
        uri = "obsidian://search?vault={}&query={}".format(
            urllib.parse.quote(vault, safe=""),
            urllib.parse.quote(query, safe=""),
        )
        _open_uri(uri)
        return {"searching_for": query, "vault": vault}
    except Exception as ex:
        return {"error": str(ex)}
