import asyncio
from typing import AsyncGenerator, Optional
from ollama import AsyncClient

OLLAMA_HOST = "http://localhost:11434"
_client = AsyncClient(host=OLLAMA_HOST)

async def list_local_models() -> list[dict]:
    try:
        response = await _client.list()
        return [
            {
                "name":        m.model,
                "size":        m.size,
                "digest":      m.digest,
                "modified_at": m.modified_at.isoformat() if m.modified_at else None,
                "details": {
                    "family":               m.details.family if m.details else None,
                    "parameter_size":       m.details.parameter_size if m.details else None,
                    "quantization_level":   m.details.quantization_level if m.details else None,
                } if m.details else {},
            }
            for m in response.models
        ]
    except Exception as e:
        raise RuntimeError(f"Failed to list models: {e}") from e


async def pull_model_stream(model_name: str) -> AsyncGenerator[dict, None]:
    try:
        async for progress in await _client.pull(model_name, stream=True):
            data: dict = {
                "status":    progress.status,
                "digest":    progress.digest or "",
                "total":     progress.total or 0,
                "completed": progress.completed or 0,
                "percent":   0,
            }
            if data["total"] > 0:
                data["percent"] = round((data["completed"] / data["total"]) * 100, 2)
            yield data
    except Exception as e:
        yield {"status": "error", "error": str(e)}


async def delete_model(model_name: str) -> dict:
    try:
        await _client.delete(model_name)
        return {"success": True, "model": model_name}
    except Exception as e:
        raise RuntimeError(f"Failed to delete '{model_name}': {e}") from e


async def get_running_models() -> list[dict]:
    try:
        response = await _client.ps()
        return [
            {
                "name":       m.model,
                "size":       m.size,
                "size_vram":  m.size_vram,
                "expires_at": m.expires_at.isoformat() if m.expires_at else None,
            }
            for m in response.models
        ]
    except Exception as e:
        raise RuntimeError(f"Failed to get running models: {e}") from e


async def load_model(model_name: str) -> dict:
    try:
        await _client.generate(model=model_name, prompt="", keep_alive=-1)
        return {"success": True, "model": model_name, "status": "loaded"}
    except Exception as e:
        raise RuntimeError(f"Failed to load '{model_name}': {e}") from e


async def unload_model(model_name: str) -> dict:
    try:
        await _client.generate(model=model_name, prompt="", keep_alive=0)
        return {"success": True, "model": model_name, "status": "unloaded"}
    except Exception as e:
        raise RuntimeError(f"Failed to unload '{model_name}': {e}") from e

async def chat_stream(
    model: str,
    messages: list[dict],
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
) -> AsyncGenerator[str, None]:
    full: list[dict] = []
    if system_prompt:
        full.append({"role": "system", "content": system_prompt})
    full.extend(messages)
    try:
        async for chunk in await _client.chat(
            model=model,
            messages=full,
            stream=True,
            options={"temperature": temperature},
            keep_alive=-1,
        ):
            if chunk.message and chunk.message.content:
                yield chunk.message.content
    except Exception as e:
        yield f"\n[Error: {e}]"


async def chat_with_tools(
    model: str,
    messages: list[dict],
    tools: list[dict],
    temperature: float = 0.0,
) -> object:
    return await _client.chat(
        model=model,
        messages=messages,
        tools=tools,
        stream=False,
        options={"temperature": temperature},
        keep_alive=-1,
    )


async def generate_stream(
    model: str,
    prompt: str,
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
) -> AsyncGenerator[str, None]:
    """Stream a raw generate completion."""
    try:
        async for chunk in await _client.generate(
            model=model,
            prompt=prompt,
            system=system_prompt or "",
            stream=True,
            options={"temperature": temperature},
            keep_alive=-1,
        ):
            if chunk.response:
                yield chunk.response
    except Exception as e:
        yield f"\n[Error: {e}]"


# ── Model catalogue (Ollama hub has no public search API) ──────────────────────

async def search_available_models(query: str = "") -> list[dict]:
    """Return a curated catalogue of popular Ollama models."""
    catalogue = [
        {"name": "llama3.2",           "description": "Meta Llama 3.2 3B — tool-capable",        "size": "2.0 GB"},
        {"name": "llama3.2:1b",        "description": "Meta Llama 3.2 1B — tool-capable",        "size": "1.3 GB"},
        {"name": "llama3.1",           "description": "Meta Llama 3.1 8B — tool-capable",        "size": "4.7 GB"},
        {"name": "llama3.1:70b",       "description": "Meta Llama 3.1 70B — tool-capable",       "size": "40 GB"},
        {"name": "qwen2.5",            "description": "Alibaba Qwen 2.5 7B — tool-capable",      "size": "4.7 GB"},
        {"name": "qwen2.5:3b",         "description": "Alibaba Qwen 2.5 3B — tool-capable",      "size": "1.9 GB"},
        {"name": "qwen2.5:0.5b",       "description": "Alibaba Qwen 2.5 0.5B — tool-capable",   "size": "397 MB"},
        {"name": "mistral",            "description": "Mistral 7B — tool-capable",               "size": "4.1 GB"},
        {"name": "mistral-nemo",       "description": "Mistral Nemo 12B — tool-capable",         "size": "7.1 GB"},
        {"name": "phi4",               "description": "Microsoft Phi-4 14B — tool-capable",      "size": "9.1 GB"},
        {"name": "phi3.5",             "description": "Microsoft Phi-3.5 3.8B — tool-capable",   "size": "2.2 GB"},
        {"name": "deepseek-r1",        "description": "DeepSeek R1 7B",                           "size": "4.7 GB"},
        {"name": "deepseek-r1:1.5b",   "description": "DeepSeek R1 1.5B",                        "size": "1.1 GB"},
        {"name": "gemma3",             "description": "Google Gemma 3 4B — tool-capable",        "size": "3.3 GB"},
        {"name": "gemma3:1b",          "description": "Google Gemma 3 1B — tool-capable",        "size": "815 MB"},
        {"name": "gemma3:12b",         "description": "Google Gemma 3 12B — tool-capable",       "size": "8.1 GB"},
        {"name": "codellama",          "description": "Meta Code Llama 7B",                       "size": "3.8 GB"},
        {"name": "nomic-embed-text",   "description": "Nomic Embed Text (embeddings)",            "size": "274 MB"},
    ]
    if query:
        q = query.lower()
        return [m for m in catalogue if q in m["name"].lower() or q in m["description"].lower()]
    return catalogue
