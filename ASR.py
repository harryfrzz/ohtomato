import io
import asyncio
import tempfile
import os
from pathlib import Path
from typing import Optional, Literal
import numpy as np
import sounddevice as sd
from scipy.io import wavfile
import whisper

WhisperModelSize = Literal["tiny", "base", "small", "medium", "large", "large-v2", "large-v3"]

_loaded_models: dict[str, whisper.Whisper] = {}
_default_model_size: WhisperModelSize = "base"

_recording = False
_audio_frames: list = []
_stream = None

SAMPLE_RATE = 16000
CHANNELS = 1


def get_model(size: WhisperModelSize = _default_model_size) -> whisper.Whisper:
    if size not in _loaded_models:
        _loaded_models[size] = whisper.load_model(size)
    return _loaded_models[size]


def set_default_model(size: WhisperModelSize) -> None:
    global _default_model_size
    _default_model_size = size


def get_loaded_models() -> list[str]:
    return list(_loaded_models.keys())


def _transcribe_numpy(
    audio_np: np.ndarray,
    model_size: WhisperModelSize,
    language: Optional[str],
    task: str,
) -> dict:
    model = get_model(model_size)
    # Ensure 1-D float32 in [-1, 1]
    audio = audio_np.flatten().astype(np.float32)
    if audio.max() > 1.0:
        audio = audio / 32768.0

    kwargs: dict = {"task": task}
    if language:
        kwargs["language"] = language

    result = model.transcribe(audio, **kwargs)

    segments = [
        {
            "id": seg.get("id"),
            "start": seg.get("start"),
            "end": seg.get("end"),
            "text": seg.get("text", "").strip(),
        }
        for seg in result.get("segments", [])
    ]
    return {
        "text": result.get("text", "").strip(),
        "language": result.get("language"),
        "segments": segments,
    }


def _transcribe_file_sync(
    file_path: str,
    model_size: WhisperModelSize,
    language: Optional[str],
    task: str,
) -> dict:
    model = get_model(model_size)
    kwargs: dict = {"task": task}
    if language:
        kwargs["language"] = language
    result = model.transcribe(file_path, **kwargs)
    segments = [
        {
            "id": seg.get("id"),
            "start": seg.get("start"),
            "end": seg.get("end"),
            "text": seg.get("text", "").strip(),
        }
        for seg in result.get("segments", [])
    ]
    return {
        "text": result.get("text", "").strip(),
        "language": result.get("language"),
        "segments": segments,
    }


async def transcribe_audio_file(
    file_path: str,
    language: Optional[str] = None,
    model_size: Optional[WhisperModelSize] = None,
    task: str = "transcribe",
) -> dict:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    size = model_size or _default_model_size
    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(
            None, _transcribe_file_sync, str(path), size, language, task
        )
    except Exception as e:
        raise RuntimeError(f"Transcription failed: {e}")


async def transcribe_audio_bytes(
    audio_bytes: bytes,
    filename: str = "audio.wav",
    language: Optional[str] = None,
    model_size: Optional[WhisperModelSize] = None,
    task: str = "transcribe",
) -> dict:
    size = model_size or _default_model_size
    suffix = Path(filename).suffix or ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(
            None, _transcribe_file_sync, tmp_path, size, language, task
        )
    except Exception as e:
        raise RuntimeError(f"Transcription failed: {e}")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


async def record_and_transcribe(
    duration: float = 5.0,
    language: Optional[str] = None,
    model_size: Optional[WhisperModelSize] = None,
) -> dict:
    loop = asyncio.get_event_loop()

    def _record() -> np.ndarray:
        audio = sd.rec(
            int(duration * SAMPLE_RATE),
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            dtype="float32",
        )
        sd.wait()
        return audio

    audio_data = await loop.run_in_executor(None, _record)
    size = model_size or _default_model_size

    return await loop.run_in_executor(
        None, _transcribe_numpy, audio_data, size, language, "transcribe"
    )


def start_recording() -> dict:
    global _recording, _audio_frames, _stream
    if _recording:
        return {"status": "already_recording"}

    _recording = True
    _audio_frames = []

    def _callback(indata, frames, time, status):
        if _recording:
            _audio_frames.append(indata.copy())

    _stream = sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype="float32",
        callback=_callback,
    )
    _stream.start()
    return {"status": "recording", "sample_rate": SAMPLE_RATE}


def stop_recording() -> bytes:
    global _recording, _stream
    if not _recording:
        raise RuntimeError("Not currently recording")

    _recording = False
    if _stream:
        _stream.stop()
        _stream.close()
        _stream = None

    if not _audio_frames:
        raise RuntimeError("No audio captured")

    audio_data = np.concatenate(_audio_frames, axis=0)
    audio_int16 = (audio_data * 32767).astype(np.int16)

    buf = io.BytesIO()
    wavfile.write(buf, SAMPLE_RATE, audio_int16)
    return buf.getvalue()


def is_recording() -> bool:
    return _recording
