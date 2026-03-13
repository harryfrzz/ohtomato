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
