"""Local speech-to-text using faster-whisper.

The model is loaded once and reused. faster-whisper bundles its own audio
decoding (via PyAV), so Telegram's OGG/Opus voice notes can be transcribed
without a separate ffmpeg install.
"""

from __future__ import annotations

from functools import lru_cache

from faster_whisper import WhisperModel

from assistant.core.config import Config


@lru_cache(maxsize=1)
def _get_model(model_size: str, device: str, compute_type: str) -> WhisperModel:
    return WhisperModel(model_size, device=device, compute_type=compute_type)


# Always-on hints to bias the decoder toward names the user commonly uses.
# Extra terms from STT_VOCABULARY are appended to this.
_BASE_VOCABULARY = "St Austell, Carlyon Bay, Cornwall, Truro"


def _initial_prompt(config: Config) -> str:
    vocab = _BASE_VOCABULARY
    if config.stt_vocabulary:
        vocab = f"{vocab}, {config.stt_vocabulary}"
    return f"Transcript of a voice note. Place names and terms that may appear: {vocab}."


def transcribe_file(config: Config, audio_path: str) -> str:
    model = _get_model(
        config.whisper_model, config.whisper_device, config.whisper_compute_type
    )
    segments, _info = model.transcribe(
        audio_path,
        language=config.stt_language or None,
        beam_size=1,
        vad_filter=True,
        condition_on_previous_text=False,
        initial_prompt=_initial_prompt(config),
    )
    return "".join(segment.text for segment in segments).strip()
