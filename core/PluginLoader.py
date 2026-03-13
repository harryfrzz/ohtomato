import importlib.util
import inspect
import os
import sys
from typing import Any, Optional

PLUGINS_DIR = os.path.join(os.path.dirname(__file__), "plugins")

_loaded_plugins: list[dict] = []
_plugin_tools:   list[Any]  = []


def _load_plugin(filepath: str) -> Optional[dict]:
    """Import one plugin file and return its registry entry, or None on failure."""
    name = os.path.splitext(os.path.basename(filepath))[0]
    spec = importlib.util.spec_from_file_location(f"automato_plugin_{name}", filepath)
    if spec is None or spec.loader is None:
        return None

    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)  # type: ignore[union-attr]
    except Exception as exc:
        print(f"[plugins] ERROR loading {filepath}: {exc}", file=sys.stderr)
        return None

    info: dict = getattr(module, "PLUGIN_INFO", None)  # type: ignore[assignment]
    if not isinstance(info, dict):
        print(f"[plugins] SKIP {filepath}: missing PLUGIN_INFO dict", file=sys.stderr)
        return None

    required = {"name", "version", "description", "tools"}
    missing  = required - info.keys()
    if missing:
        print(f"[plugins] SKIP {filepath}: PLUGIN_INFO missing keys {missing}", file=sys.stderr)
        return None

    tools: list[Any] = []
    for fn_name in info["tools"]:
        fn = getattr(module, fn_name, None)
        if fn is None:
            print(f"[plugins] WARN {filepath}: tool '{fn_name}' not found", file=sys.stderr)
            continue
        if not inspect.iscoroutinefunction(fn):
            print(f"[plugins] WARN {filepath}: '{fn_name}' is not async — skipped", file=sys.stderr)
            continue
        tools.append(fn)

    if not tools:
        print(f"[plugins] WARN {filepath}: no valid tools found, plugin skipped", file=sys.stderr)
        return None

    return {
        "info":   info,
        "file":   filepath,
        "module": module,
        "tools":  tools,
    }


def _load_all() -> None:
    global _loaded_plugins, _plugin_tools
    _loaded_plugins = []
    _plugin_tools   = []

    if not os.path.isdir(PLUGINS_DIR):
        return

    for fname in sorted(os.listdir(PLUGINS_DIR)):
        if not fname.endswith(".py") or fname.startswith("_"):
            continue
        entry = _load_plugin(os.path.join(PLUGINS_DIR, fname))
        if entry:
            _loaded_plugins.append(entry)
            _plugin_tools.extend(entry["tools"])
            print(
                f"[plugins] Loaded '{entry['info']['name']}' "
                f"v{entry['info']['version']} "
                f"({len(entry['tools'])} tool(s))"
            )


def reload_plugins() -> list[dict]:
    _load_all()
    return list_plugins()


def list_plugins() -> list[dict]:
    """Return a serialisable summary of all loaded plugins."""
    return [
        {
            "name":        e["info"]["name"],
            "version":     e["info"]["version"],
            "description": e["info"]["description"],
            "file":        os.path.basename(e["file"]),
            "tools":       [fn.__name__ for fn in e["tools"]],
        }
        for e in _loaded_plugins
    ]


def get_plugin_tools() -> list[Any]:
    return list(_plugin_tools)


_load_all()
