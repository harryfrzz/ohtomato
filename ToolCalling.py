"""
ToolCalling.py
Tool registry and agentic loop using Ollama's native callable-tool API.

Each tool is a plain Python async function with a Google-style docstring.
Ollama's client extracts the JSON schema automatically — no manual schema dicts.

run_agentic_loop() drives the tool-calling loop:
  1. Call tool_model with tools=[...all callables...]
  2. Model requests tool calls → execute each callable, feed results back
  3. Repeat until model returns plain text
  4. reply_model streams the final conversational response
"""

import asyncio
import fnmatch
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import zipfile
from typing import Any, AsyncGenerator, Optional

from ollama import AsyncClient

from LLMInference import chat_stream, load_model

OLLAMA_HOST = "http://localhost:11434"
_client = AsyncClient(host=OLLAMA_HOST)


# ── Path resolver ──────────────────────────────────────────────────────────────

_DIR_ALIASES: dict[str, str] = {
    "home":         "~",
    "~":            "~",
    "desktop":      "~/Desktop",
    "downloads":    "~/Downloads",
    "documents":    "~/Documents",
    "pictures":     "~/Pictures",
    "photos":       "~/Pictures",
    "music":        "~/Music",
    "movies":       "~/Movies",
    "videos":       "~/Movies",
    "library":      "~/Library",
    "applications": "~/Applications",
    "public":       "~/Public",
    "sites":        "~/Sites",
    "tmp":          "/tmp",
    "temp":         "/tmp",
}


def _resolve(path: str) -> str:
    """Expand aliases, ~, and case-fold path components (macOS)."""
    alias = _DIR_ALIASES.get(path.strip().lower().rstrip("/"))
    if alias:
        path = alias

    if path.startswith("~"):
        resolved = os.path.expanduser(path)
    elif not os.path.isabs(path):
        resolved = os.path.join(os.path.expanduser("~"), path)
    else:
        resolved = path

    resolved = os.path.normpath(resolved)
    parts    = resolved.split(os.sep)
    corrected = parts[0]

    for part in parts[1:]:
        parent    = corrected or os.sep
        candidate = os.path.join(parent, part)
        if os.path.exists(candidate):
            corrected = candidate
        else:
            try:
                entries = os.listdir(parent)
                match   = next((e for e in entries if e.lower() == part.lower()), None)
                corrected = os.path.join(parent, match if match else part)
            except OSError:
                corrected = candidate

    return corrected


# ── Tool functions ─────────────────────────────────────────────────────────────
# Each function must have a Google-style docstring so Ollama can auto-generate
# the JSON schema. Args section describes parameters.

async def read_file(path: str, start_line: int = 0, end_line: int = 0) -> dict:
    """Read the full text content of a file.

    Args:
        path: Absolute path, ~/relative, or a name like 'home', 'downloads'.
        start_line: 1-indexed first line to read (0 = from start).
        end_line: Last line to include (0 = to end).

    Returns:
        dict with keys: path, content, lines.
    """
    p = _resolve(path)
    try:
        with open(p, "r", errors="replace") as f:
            all_lines = f.readlines()
        if start_line or end_line:
            s = (start_line - 1) if start_line else 0
            e = end_line if end_line else len(all_lines)
            all_lines = all_lines[s:e]
        content = "".join(all_lines)
        return {"path": p, "content": content, "lines": len(all_lines)}
    except Exception as ex:
        return {"error": str(ex)}


async def write_file(path: str, content: str) -> dict:
    """Write (overwrite) a file with the given content. Creates parent dirs.

    Args:
        path: File path to write.
        content: Full content to write to the file.

    Returns:
        dict with keys: path, bytes_written.
    """
    p = _resolve(path)
    try:
        os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
        with open(p, "w") as f:
            f.write(content)
        return {"path": p, "bytes_written": len(content.encode())}
    except Exception as ex:
        return {"error": str(ex)}


async def append_file(path: str, content: str) -> dict:
    """Append text to the end of a file without overwriting.

    Args:
        path: File path to append to.
        content: Text to append.

    Returns:
        dict with keys: path, bytes_appended.
    """
    p = _resolve(path)
    try:
        os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
        with open(p, "a") as f:
            f.write(content)
        return {"path": p, "bytes_appended": len(content.encode())}
    except Exception as ex:
        return {"error": str(ex)}


async def patch_file(path: str, old_string: str, new_string: str, replace_all: bool = False) -> dict:
    """Find-and-replace text inside a file.

    Args:
        path: File path to edit.
        old_string: Exact text to find.
        new_string: Replacement text.
        replace_all: Replace every occurrence if True, else only the first.

    Returns:
        dict with keys: path, replacements.
    """
    p = _resolve(path)
    try:
        with open(p, "r", errors="replace") as f:
            original = f.read()
        if old_string not in original:
            return {"error": f"String not found in {p}"}
        count   = original.count(old_string)
        updated = original.replace(old_string, new_string) if replace_all \
                  else original.replace(old_string, new_string, 1)
        with open(p, "w") as f:
            f.write(updated)
        return {"path": p, "replacements": count if replace_all else 1}
    except Exception as ex:
        return {"error": str(ex)}


async def delete_file(path: str) -> dict:
    """Permanently delete a file.

    Args:
        path: Path to the file to delete.

    Returns:
        dict with key: deleted.
    """
    p = _resolve(path)
    try:
        os.remove(p)
        return {"deleted": p}
    except Exception as ex:
        return {"error": str(ex)}


async def move_file(source: str, destination: str) -> dict:
    """Move or rename a file or directory.

    Args:
        source: Source path.
        destination: Destination path.

    Returns:
        dict with keys: moved, to.
    """
    src = _resolve(source)
    dst = _resolve(destination)
    try:
        os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
        shutil.move(src, dst)
        return {"moved": src, "to": dst}
    except Exception as ex:
        return {"error": str(ex)}


async def copy_file(source: str, destination: str) -> dict:
    """Copy a file or directory to a new location.

    Args:
        source: Source path.
        destination: Destination path.

    Returns:
        dict with keys: copied, to.
    """
    src = _resolve(source)
    dst = _resolve(destination)
    try:
        os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
        return {"copied": src, "to": dst}
    except Exception as ex:
        return {"error": str(ex)}


async def list_directory(path: str, details: bool = False) -> dict:
    """List files and folders in a directory.

    Args:
        path: Directory path, or an alias like 'home', 'downloads', 'desktop'.
        details: Include size and type for each entry if True.

    Returns:
        dict with keys: path, entries, count, listing (newline-separated text).
    """
    p = _resolve(path)
    try:
        raw = os.listdir(p)
        if details:
            entries: Any = []
            lines: list[str] = []
            for e in sorted(raw):
                full = os.path.join(p, e)
                stat = os.stat(full)
                kind = "dir" if os.path.isdir(full) else "file"
                entries.append({"name": e, "type": kind, "size": stat.st_size})
                lines.append(f"{e}  [{kind}, {stat.st_size} bytes]")
        else:
            entries = sorted(raw)
            lines   = list(entries)
        listing = "\n".join(lines)
        return {"path": p, "entries": entries, "count": len(raw), "listing": listing}
    except Exception as ex:
        return {"error": str(ex)}


async def create_directory(path: str) -> dict:
    """Create a directory including any missing parent directories.

    Args:
        path: Directory path to create.

    Returns:
        dict with key: created.
    """
    p = _resolve(path)
    try:
        os.makedirs(p, exist_ok=True)
        return {"created": p}
    except Exception as ex:
        return {"error": str(ex)}


async def delete_directory(path: str) -> dict:
    """Recursively delete a directory and all its contents.

    Args:
        path: Directory path to delete.

    Returns:
        dict with key: deleted.
    """
    p = _resolve(path)
    try:
        shutil.rmtree(p)
        return {"deleted": p}
    except Exception as ex:
        return {"error": str(ex)}


async def find_files(directory: str, pattern: str, max_results: int = 50) -> dict:
    """Find files matching a glob pattern inside a directory tree.

    Args:
        directory: Root directory to search in.
        pattern: Glob pattern e.g. '*.py' or '**/*.ts'.
        max_results: Maximum number of results to return.

    Returns:
        dict with keys: directory, pattern, matches, count.
    """
    d       = _resolve(directory)
    matches: list[str] = []
    try:
        for root, dirs, files in os.walk(d):
            dirs[:] = [x for x in dirs if not x.startswith(".")]
            for fname in files:
                if fnmatch.fnmatch(fname, pattern.split("/")[-1]):
                    matches.append(os.path.join(root, fname))
                    if len(matches) >= max_results:
                        break
            if len(matches) >= max_results:
                break
        return {"directory": d, "pattern": pattern, "matches": matches, "count": len(matches)}
    except Exception as ex:
        return {"error": str(ex)}


async def search_in_files(directory: str, pattern: str, file_pattern: str = "*", max_results: int = 50) -> dict:
    """Search for a text pattern or regex inside files in a directory.

    Args:
        directory: Root directory to search in.
        pattern: Text or regex to search for.
        file_pattern: Limit to files matching this glob e.g. '*.py'.
        max_results: Maximum number of matches to return.

    Returns:
        dict with keys: results, count.
    """
    d       = _resolve(directory)
    results: list[dict] = []
    try:
        regex = re.compile(pattern)
    except re.error:
        regex = re.compile(re.escape(pattern))
    try:
        for root, dirs, files in os.walk(d):
            dirs[:] = [x for x in dirs if not x.startswith(".")]
            for fname in files:
                if not fnmatch.fnmatch(fname, file_pattern):
                    continue
                fpath = os.path.join(root, fname)
                try:
                    with open(fpath, "r", errors="replace") as f:
                        for lineno, line in enumerate(f, 1):
                            if regex.search(line):
                                results.append({"file": fpath, "line": lineno, "match": line.rstrip()})
                                if len(results) >= max_results:
                                    return {"results": results, "count": len(results), "truncated": True}
                except OSError:
                    pass
        return {"results": results, "count": len(results)}
    except Exception as ex:
        return {"error": str(ex)}


async def run_command(command: str, workdir: str = "~", timeout: int = 30, background: bool = False) -> dict:
    """Run a shell command and return stdout, stderr, and exit code.

    Args:
        command: Shell command to run.
        workdir: Working directory (defaults to home).
        timeout: Timeout in seconds.
        background: Run in background without waiting for output.

    Returns:
        dict with keys: stdout, stderr, returncode, command.
    """
    cwd = _resolve(workdir)
    try:
        if background:
            subprocess.Popen(
                command, shell=True, cwd=cwd,
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            return {"status": "started_in_background", "command": command}
        result = subprocess.run(
            command, shell=True, cwd=cwd,
            capture_output=True, text=True, timeout=timeout,
        )
        return {
            "stdout":     result.stdout[:4000],
            "stderr":     result.stderr[:2000],
            "returncode": result.returncode,
            "command":    command,
        }
    except subprocess.TimeoutExpired:
        return {"error": f"Command timed out after {timeout}s", "command": command}
    except Exception as ex:
        return {"error": str(ex)}


async def run_python(code: str, timeout: int = 15) -> dict:
    """Execute a Python code snippet and return stdout and stderr.

    Args:
        code: Python source code to execute.
        timeout: Timeout in seconds.

    Returns:
        dict with keys: stdout, stderr, returncode.
    """
    try:
        result = subprocess.run(
            [sys.executable, "-c", code],
            capture_output=True, text=True, timeout=timeout,
        )
        return {
            "stdout":     result.stdout[:4000],
            "stderr":     result.stderr[:2000],
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"error": f"Python execution timed out after {timeout}s"}
    except Exception as ex:
        return {"error": str(ex)}


async def zip_files(output_path: str, paths: list) -> dict:
    """Create a zip archive from a list of files or directories.

    Args:
        output_path: Path for the output .zip file.
        paths: List of file or directory paths to include.

    Returns:
        dict with keys: created, files_added.
    """
    out   = _resolve(output_path)
    srcs  = [_resolve(p) for p in paths]
    try:
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
            for p in srcs:
                if os.path.isdir(p):
                    for root, _, files in os.walk(p):
                        for fname in files:
                            full = os.path.join(root, fname)
                            zf.write(full, os.path.relpath(full, os.path.dirname(p)))
                else:
                    zf.write(p, os.path.basename(p))
        return {"created": out, "files_added": len(srcs)}
    except Exception as ex:
        return {"error": str(ex)}


async def unzip_file(zip_path: str, output_dir: str) -> dict:
    """Extract a zip archive into a directory.

    Args:
        zip_path: Path to the .zip file.
        output_dir: Directory to extract into.

    Returns:
        dict with keys: extracted_to, files, count.
    """
    zp  = _resolve(zip_path)
    out = _resolve(output_dir)
    try:
        os.makedirs(out, exist_ok=True)
        with zipfile.ZipFile(zp, "r") as zf:
            zf.extractall(out)
            names = zf.namelist()
        return {"extracted_to": out, "files": names[:50], "count": len(names)}
    except Exception as ex:
        return {"error": str(ex)}


async def get_system_info() -> dict:
    """Return OS, CPU, memory, disk, and Python version info.

    Returns:
        dict with system information.
    """
    try:
        import psutil
        mem  = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        return {
            "os":              platform.system(),
            "os_version":      platform.version(),
            "machine":         platform.machine(),
            "python_version":  platform.python_version(),
            "cpu_count":       psutil.cpu_count(),
            "cpu_percent":     psutil.cpu_percent(interval=0.5),
            "memory_total_gb": round(mem.total  / 1e9, 2),
            "memory_used_gb":  round(mem.used   / 1e9, 2),
            "memory_percent":  mem.percent,
            "disk_total_gb":   round(disk.total / 1e9, 2),
            "disk_used_gb":    round(disk.used  / 1e9, 2),
            "disk_percent":    disk.percent,
        }
    except ImportError:
        return {
            "os":             platform.system(),
            "os_version":     platform.version(),
            "machine":        platform.machine(),
            "python_version": platform.python_version(),
            "note":           "Install psutil for CPU/memory/disk info",
        }
    except Exception as ex:
        return {"error": str(ex)}


async def get_env(keys: list) -> dict:
    """Read one or more environment variables.

    Args:
        keys: List of environment variable names to read.

    Returns:
        dict mapping each key to its value or None.
    """
    return {k: os.environ.get(k) for k in keys}


async def get_clipboard() -> dict:
    """Read the current contents of the system clipboard.

    Returns:
        dict with key: clipboard.
    """
    try:
        r = subprocess.run(["pbpaste"], capture_output=True, text=True)
        return {"clipboard": r.stdout}
    except Exception as ex:
        return {"error": str(ex)}


async def set_clipboard(text: str) -> dict:
    """Write text to the system clipboard.

    Args:
        text: Text to copy to clipboard.

    Returns:
        dict with keys: copied, length.
    """
    try:
        subprocess.run(["pbcopy"], input=text, text=True, check=True)
        return {"copied": True, "length": len(text)}
    except Exception as ex:
        return {"error": str(ex)}


async def open_url(url: str) -> dict:
    """Open a URL in the default web browser.

    Args:
        url: URL to open.

    Returns:
        dict with key: opened.
    """
    try:
        subprocess.Popen(["open", url])
        return {"opened": url}
    except Exception as ex:
        return {"error": str(ex)}


async def open_app(name: str) -> dict:
    """Launch an application by name on macOS.

    Args:
        name: Application name e.g. 'Safari', 'Calculator'.

    Returns:
        dict with key: opened.
    """
    try:
        subprocess.Popen(["open", "-a", name])
        return {"opened": name}
    except Exception as ex:
        return {"error": str(ex)}


async def http_request(url: str, method: str = "GET", headers: Optional[dict] = None, body: Optional[str] = None) -> dict:
    """Make an HTTP request and return the response.

    Args:
        url: Request URL.
        method: HTTP method: GET, POST, PUT, DELETE, or PATCH.
        headers: Request headers as key-value pairs.
        body: Request body string.

    Returns:
        dict with keys: status_code, json or body.
    """
    import httpx
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as hc:
            resp = await hc.request(
                method.upper(), url,
                headers=headers or {},
                content=body.encode() if body else None,
            )
        try:
            return {"status_code": resp.status_code, "json": resp.json()}
        except Exception:
            return {"status_code": resp.status_code, "body": resp.text[:3000]}
    except Exception as ex:
        return {"error": str(ex)}


async def search_web(query: str, max_results: int = 5) -> dict:
    """Search the web using DuckDuckGo and return top results.

    Args:
        query: Search query string.
        max_results: Number of results to return.

    Returns:
        dict with keys: query, results, count.
    """
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as hc:
            resp = await hc.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_redirect": "1", "no_html": "1"},
                headers={"User-Agent": "Automato/2.0"},
            )
        data    = resp.json()
        results = []
        if data.get("AbstractText"):
            results.append({
                "title":   data.get("Heading", "Summary"),
                "snippet": data["AbstractText"],
                "url":     data.get("AbstractURL", ""),
            })
        for topic in data.get("RelatedTopics", [])[:max_results]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append({
                    "title":   topic.get("Text", "")[:80],
                    "snippet": topic.get("Text", ""),
                    "url":     topic.get("FirstURL", ""),
                })
                if len(results) >= max_results:
                    break
        return {"query": query, "results": results, "count": len(results)}
    except Exception as ex:
        return {"error": str(ex)}


async def get_weather(location: str, unit: str = "celsius") -> dict:
    """Get current weather for a location.

    Args:
        location: City name or coordinates.
        unit: Temperature unit, either 'celsius' or 'fahrenheit'.

    Returns:
        dict with weather details.
    """
    import httpx
    fmt = "m" if unit == "celsius" else "u"
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as hc:
            resp = await hc.get(
                f"https://wttr.in/{location}",
                params={"format": "j1", fmt: ""},
                headers={"User-Agent": "Automato/2.0"},
            )
        data    = resp.json()
        current = data["current_condition"][0]
        area    = data["nearest_area"][0]
        return {
            "location":    f"{area['areaName'][0]['value']}, {area['country'][0]['value']}",
            "temperature": f"{current['temp_C']}°C" if unit == "celsius" else f"{current['temp_F']}°F",
            "feels_like":  f"{current['FeelsLikeC']}°C" if unit == "celsius" else f"{current['FeelsLikeF']}°F",
            "condition":   current["weatherDesc"][0]["value"],
            "humidity":    f"{current['humidity']}%",
            "wind":        f"{current['windspeedKmph']} km/h {current['winddir16Point']}",
            "visibility":  f"{current['visibility']} km",
        }
    except Exception as ex:
        return {"error": str(ex)}


# ── Tool registry ──────────────────────────────────────────────────────────────

# All callable tools — passed directly to Ollama's tools= parameter.
# Ollama reads the Google-style docstrings to build the JSON schema.
ALL_TOOLS: list = [
    read_file,
    write_file,
    append_file,
    patch_file,
    delete_file,
    move_file,
    copy_file,
    list_directory,
    create_directory,
    delete_directory,
    find_files,
    search_in_files,
    run_command,
    run_python,
    zip_files,
    unzip_file,
    get_system_info,
    get_env,
    get_clipboard,
    set_clipboard,
    open_url,
    open_app,
    http_request,
    search_web,
    get_weather,
]

# Name → callable map for dispatch
_TOOL_MAP: dict[str, Any] = {fn.__name__: fn for fn in ALL_TOOLS}


def get_tools_list() -> list[dict]:
    """Return tool schemas as dicts (for /tools endpoint)."""
    from ollama._utils import convert_function_to_tool  # type: ignore[import]
    return [convert_function_to_tool(fn).model_dump(exclude_none=True) for fn in ALL_TOOLS]


async def execute_tool(name: str, args: dict) -> dict:
    """Dispatch a tool call by name."""
    fn = _TOOL_MAP.get(name)
    if fn is None:
        return {"error": f"Unknown tool '{name}'. Available: {sorted(_TOOL_MAP.keys())}"}
    try:
        result = await fn(**args)
        return result if isinstance(result, dict) else {"result": result}
    except Exception as ex:
        return {"error": str(ex)}


# ── Agentic loop ───────────────────────────────────────────────────────────────

_AGENTIC_SYSTEM = (
    "You are an autonomous assistant with access to tools. "
    "Rules you MUST follow:\n"
    "1. Always call read/list tools BEFORE writing anything — get real data first.\n"
    "2. When list_directory returns a result, it includes a 'listing' field which is "
    "a newline-separated string of all filenames. Use that 'listing' string as the "
    "content when writing to a file.\n"
    "3. When read_file returns a result, use the 'content' field verbatim.\n"
    "4. NEVER invent or summarise file contents — copy the exact field values from "
    "the tool results into write_file.\n"
    "5. NEVER write placeholder text like '[list of files]' or '0 files found' unless "
    "the tool result genuinely returned an empty list."
)


async def run_agentic_loop(
    tool_model: str,
    reply_model: str,
    messages: list[dict],
    temperature: float = 0.7,
    max_iterations: int = 10,
) -> AsyncGenerator[dict, None]:
    """
    Agentic loop using Ollama's native callable-tool API.

    tool_model drives all tool calls (list, read, write, etc.).
    reply_model streams the final conversational response.

    Yielded event shapes:
        {"type": "tool_call",   "name": str,  "arguments": dict}
        {"type": "tool_result", "tool": str,  "result": dict}
        {"type": "token",       "token": str}
        {"type": "done"}
        {"type": "error",       "message": str}
    """
    # Pre-load tool model to avoid cold-start latency
    try:
        await load_model(tool_model)
    except Exception:
        pass

    # Tool model only sees the latest user message — not full history.
    # Sending full history causes small models to reuse stale results.
    latest_user_msg = next(
        (m for m in reversed(messages) if m.get("role") == "user"), None
    )
    tool_history: list[dict] = (
        [{"role": "system", "content": _AGENTIC_SYSTEM}, latest_user_msg]
        if latest_user_msg
        else [{"role": "system", "content": _AGENTIC_SYSTEM}] + list(messages)
    )

    tool_steps: list[dict] = []

    def _real_content_from_steps(write_content: str) -> str:
        """Replace placeholder write content with real gathered data."""
        if not tool_steps:
            return write_content
        _PLACEHOLDERS = ("[list", "[file", "[content", "[data", "0 files", "placeholder")
        looks_bad = (
            len(write_content.strip()) < 30
            or any(p in write_content.lower() for p in _PLACEHOLDERS)
        )
        if not looks_bad:
            return write_content
        for step in reversed(tool_steps):
            res = step["result"]
            if step["tool"] == "list_directory" and "listing" in res:
                return res["listing"]
            if step["tool"] == "read_file" and "content" in res:
                return res["content"]
            if step["tool"] == "find_files" and "matches" in res:
                return "\n".join(res["matches"])
            if step["tool"] == "search_in_files" and "results" in res:
                return "\n".join(
                    f"{r['file']}:{r['line']}: {r['match']}" for r in res["results"]
                )
            if step["tool"] == "run_command" and "stdout" in res:
                return res["stdout"]
        return write_content

    # ── Tool loop ──────────────────────────────────────────────────────────────
    for _iteration in range(max_iterations):
        try:
            response = await _client.chat(
                model=tool_model,
                messages=tool_history,
                tools=ALL_TOOLS,          # pass callables directly
                stream=False,
                options={"temperature": 0.0},
                keep_alive=-1,
            )
        except Exception as e:
            yield {"type": "error", "message": f"Tool model error: {e}"}
            return

        msg        = response.message
        tool_calls = getattr(msg, "tool_calls", None)

        if not tool_calls:
            break

        tool_history.append({
            "role":    "assistant",
            "content": getattr(msg, "content", "") or "",
            "tool_calls": [
                {"function": {"name": tc.function.name, "arguments": dict(tc.function.arguments)}}
                for tc in tool_calls
            ],
        })

        for tc in tool_calls:
            tool_name = tc.function.name
            tool_args = dict(tc.function.arguments)

            # Guard: replace placeholder write content with real gathered data
            if tool_name in ("write_file", "append_file") and "content" in tool_args:
                tool_args["content"] = _real_content_from_steps(tool_args["content"])

            yield {"type": "tool_call", "name": tool_name, "arguments": tool_args}

            result = await execute_tool(tool_name, tool_args)

            yield {"type": "tool_result", "tool": tool_name, "result": result}

            tool_steps.append({"tool": tool_name, "args": tool_args, "result": result})

            tool_history.append({
                "role":    "tool",
                "content": json.dumps(result, ensure_ascii=False),
                "name":    tool_name,
            })

    # ── Reply model streams the final response ─────────────────────────────────
    reply_messages = list(messages)
    if tool_steps:
        summary_parts = [
            f"Tool `{s['tool']}` called with {json.dumps(s['args'])}:\n"
            + json.dumps(s["result"], ensure_ascii=False)
            for s in tool_steps
        ]
        reply_messages.append({
            "role": "system",
            "content": (
                "All tool calls have been executed. Results:\n\n"
                + "\n\n---\n\n".join(summary_parts)
                + "\n\n---\n\nSummarise what was done concisely. No placeholders."
            ),
        })

    try:
        async for token in chat_stream(
            model=reply_model,
            messages=reply_messages,
            temperature=temperature,
        ):
            yield {"type": "token", "token": token}
    except Exception as e:
        yield {"type": "error", "message": f"Reply model error: {e}"}
        return

    yield {"type": "done"}
