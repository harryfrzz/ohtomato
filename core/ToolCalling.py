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
import PluginLoader

OLLAMA_HOST = "http://localhost:11434"
_client = AsyncClient(host=OLLAMA_HOST)


def _resolve(path: str) -> str:
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


async def read_file(path: str, start_line: int = 0, end_line: int = 0) -> dict:
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
    p = _resolve(path)
    try:
        os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
        with open(p, "w") as f:
            f.write(content)
        return {"path": p, "bytes_written": len(content.encode())}
    except Exception as ex:
        return {"error": str(ex)}


async def append_file(path: str, content: str) -> dict:
    p = _resolve(path)
    try:
        os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
        with open(p, "a") as f:
            f.write(content)
        return {"path": p, "bytes_appended": len(content.encode())}
    except Exception as ex:
        return {"error": str(ex)}


async def patch_file(path: str, old_string: str, new_string: str, replace_all: bool = False) -> dict:
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
    p = _resolve(path)
    try:
        os.remove(p)
        return {"deleted": p}
    except Exception as ex:
        return {"error": str(ex)}


async def move_file(source: str, destination: str) -> dict:
    src = _resolve(source)
    dst = _resolve(destination)
    try:
        os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
        shutil.move(src, dst)
        return {"moved": src, "to": dst}
    except Exception as ex:
        return {"error": str(ex)}


async def copy_file(source: str, destination: str) -> dict:
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
    p = _resolve(path)
    try:
        os.makedirs(p, exist_ok=True)
        return {"created": p}
    except Exception as ex:
        return {"error": str(ex)}


async def delete_directory(path: str) -> dict:
    p = _resolve(path)
    try:
        shutil.rmtree(p)
        return {"deleted": p}
    except Exception as ex:
        return {"error": str(ex)}


async def find_files(directory: str, pattern: str, max_results: int = 50) -> dict:
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
    return {k: os.environ.get(k) for k in keys}


async def get_clipboard() -> dict:
    try:
        r = subprocess.run(["pbpaste"], capture_output=True, text=True)
        return {"clipboard": r.stdout}
    except Exception as ex:
        return {"error": str(ex)}


async def set_clipboard(text: str) -> dict:
    try:
        subprocess.run(["pbcopy"], input=text, text=True, check=True)
        return {"copied": True, "length": len(text)}
    except Exception as ex:
        return {"error": str(ex)}


async def open_url(url: str) -> dict:
    try:
        subprocess.Popen(["open", url])
        return {"opened": url}
    except Exception as ex:
        return {"error": str(ex)}


async def open_app(name: str) -> dict:
    try:
        subprocess.Popen(["open", "-a", name])
        return {"opened": name}
    except Exception as ex:
        return {"error": str(ex)}


async def http_request(url: str, method: str = "GET", headers: Optional[dict] = None, body: Optional[str] = None) -> dict:
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
            return {"status_code": resp.status_code, "body": resp.text[:10000]}
    except Exception as ex:
        return {"error": str(ex)}


async def search_web(query: str, max_results: int = 5) -> dict:
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as hc:
            resp = await hc.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_redirect": "1", "no_html": "1"},
                headers={"User-Agent": "Ohtomato/2.0"},
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
    import httpx
    fmt = "m" if unit == "celsius" else "u"
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as hc:
            resp = await hc.get(
                f"https://wttr.in/{location}",
                params={"format": "j1", fmt: ""},
                headers={"User-Agent": "Ohtomato/2.0"},
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

_BUILTIN_TOOL_MAP: dict[str, Any] = {fn.__name__: fn for fn in ALL_TOOLS}


def _all_tools() -> list[Any]:
    """Return built-in tools plus any currently loaded plugin tools."""
    return ALL_TOOLS + PluginLoader.get_plugin_tools()


def _tool_map() -> dict[str, Any]:
    """Return a merged name→callable map including plugin tools."""
    m = dict(_BUILTIN_TOOL_MAP)
    for fn in PluginLoader.get_plugin_tools():
        m[fn.__name__] = fn
    return m


def get_tools_list() -> list[dict]:
    """Return tool schemas as dicts (for /tools endpoint)."""
    from ollama._utils import convert_function_to_tool  # type: ignore[import]
    return [convert_function_to_tool(fn).model_dump(exclude_none=True) for fn in _all_tools()]


async def execute_tool(name: str, args: dict) -> dict:
    """Dispatch a tool call by name."""
    fn = _tool_map().get(name)
    if fn is None:
        return {"error": f"Unknown tool '{name}'. Available: {sorted(_tool_map().keys())}"}
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
    try:
        await load_model(tool_model)
    except Exception:
        pass
    prior_turns = [
        m for m in messages
        if m.get("role") in ("user", "assistant")
    ]
    tool_history: list[dict] = [
        {"role": "system", "content": _AGENTIC_SYSTEM},
        *prior_turns,
    ]

    tool_steps: list[dict] = []

    def _real_content_from_steps(write_content: str) -> str:
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

    for _iteration in range(max_iterations):
        try:
            response = await _client.chat(
                model=tool_model,
                messages=tool_history,
                tools=_all_tools(),   # includes plugin tools
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

    reply_messages = [
        m for m in messages
        if m.get("role") in ("user", "assistant", "system")
        and m.get("content", "").find("All tool calls have been executed") == -1
    ]
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
