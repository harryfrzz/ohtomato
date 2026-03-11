import json
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from LLMInference import (
    list_local_models,
    pull_model_stream,
    delete_model,
    chat_stream,
    generate_stream,
    get_running_models,
    load_model,
    unload_model,
)
from ASR import (
    transcribe_audio_bytes,
    start_recording,
    stop_recording,
    is_recording,
    get_loaded_models as get_whisper_models,
    set_default_model as set_whisper_model,
)
from ToolCalling import (
    execute_tool,
    run_agentic_loop,
    get_tools_list,
)


app = FastAPI(
    title="Automato API",
    description="LLM automation backend powered by Ollama",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    model: str
    messages: list[ChatMessage]
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    stream: bool = True


class AgenticChatRequest(BaseModel):
    model: str
    messages: list[ChatMessage]
    system_prompt: Optional[str] = None
    temperature: float = 0.7


class GenerateRequest(BaseModel):
    model: str
    prompt: str
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    stream: bool = True


class ExecuteToolRequest(BaseModel):
    tool_name: str
    arguments: dict


class LoadModelRequest(BaseModel):
    model: str



@app.get("/", tags=["health"])
async def root():
    return {"service": "Automato", "version": "2.0.0", "status": "ok"}


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}



@app.get("/models", tags=["models"])
async def list_models():
    try:
        models = await list_local_models()
        return {"models": models, "count": len(models)}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/models/running", tags=["models"])
async def running_models():
    try:
        models = await get_running_models()
        return {"models": models, "count": len(models)}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/models/pull", tags=["models"])
async def pull_model(model: str = Query(..., description="Model name to pull")):
    async def event_generator():
        async for progress in pull_model_stream(model):
            data = json.dumps(progress)
            yield f"data: {data}\n\n"
        yield "data: {\"status\": \"done\"}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.delete("/models/{model_name}", tags=["models"])
async def remove_model(model_name: str):
    try:
        result = await delete_model(model_name)
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/models/load", tags=["models"])
async def load_model_endpoint(req: LoadModelRequest):
    try:
        result = await load_model(req.model)
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/models/unload", tags=["models"])
async def unload_model_endpoint(req: LoadModelRequest):
    try:
        result = await unload_model(req.model)
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/models/unload-all", tags=["models"])
async def unload_all_models():
    try:
        running = await get_running_models()
        results = []
        for m in running:
            try:
                r = await unload_model(m["name"])
                results.append(r)
            except Exception:
                pass  # best-effort; ignore individual failures
        return {"unloaded": len(results), "models": [r.get("model") for r in results]}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))



@app.post("/chat", tags=["inference"])
async def chat(req: ChatRequest):
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    if req.stream:
        async def event_generator():
            async for token in chat_stream(
                req.model, messages, req.system_prompt, req.temperature
            ):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    else:
        full_text = ""
        async for token in chat_stream(
            req.model, messages, req.system_prompt, req.temperature
        ):
            full_text += token
        return {"response": full_text, "model": req.model}


@app.post("/chat/agentic", tags=["inference"])
async def chat_agentic(req: AgenticChatRequest):
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    if req.system_prompt:
        messages = [{"role": "system", "content": req.system_prompt}] + messages

    async def event_generator():
        async for event in run_agentic_loop(
            tool_model=req.model,
            reply_model=req.model,
            messages=messages,
            temperature=req.temperature,
        ):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/generate", tags=["inference"])
async def generate(req: GenerateRequest):
    if req.stream:
        async def event_generator():
            async for token in generate_stream(
                req.model, req.prompt, req.system_prompt, req.temperature
            ):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    else:
        full_text = ""
        async for token in generate_stream(
            req.model, req.prompt, req.system_prompt, req.temperature
        ):
            full_text += token
        return {"response": full_text, "model": req.model}



@app.post("/asr/transcribe", tags=["asr"])
async def transcribe_upload(
    file: UploadFile = File(...),
    language: Optional[str] = Form(default=None),
    model_size: Optional[str] = Form(default=None),
):
    audio_bytes = await file.read()
    try:
        result = await transcribe_audio_bytes(
            audio_bytes,
            filename=file.filename or "audio.wav",
            language=language,
            model_size=model_size,  # type: ignore[arg-type]
        )
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/asr/record/start", tags=["asr"])
async def start_mic_recording():
    try:
        result = start_recording()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/asr/record/stop", tags=["asr"])
async def stop_mic_recording(language: Optional[str] = Query(default=None)):
    try:
        wav_bytes = stop_recording()
        result = await transcribe_audio_bytes(wav_bytes, language=language)
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/asr/record/status", tags=["asr"])
async def recording_status():
    return {"recording": is_recording()}


@app.get("/asr/models", tags=["asr"])
async def whisper_models():
    return {"loaded_models": get_whisper_models()}


@app.post("/asr/model", tags=["asr"])
async def set_whisper_model_endpoint(
    model_size: str = Query(..., description="tiny|base|small|medium|large|large-v2|large-v3"),
):
    """Set the default on-device Whisper model size."""
    valid = {"tiny", "base", "small", "medium", "large", "large-v2", "large-v3"}
    if model_size not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid model size. Choose from: {valid}")
    set_whisper_model(model_size)  # type: ignore[arg-type]
    return {"default_model": model_size}



@app.get("/tools", tags=["tools"])
async def list_tools():
    tools = get_tools_list()
    return {"tools": tools, "count": len(tools)}


@app.post("/tools/execute", tags=["tools"])
async def execute_tool_endpoint(req: ExecuteToolRequest):
    try:
        result = await execute_tool(req.tool_name, req.arguments)
        return {"tool": req.tool_name, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
