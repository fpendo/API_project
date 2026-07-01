"""Browser voice interface for the assistant.

A small FastAPI app that reuses the same agent, Whisper transcription and
edge-TTS as the Telegram bot, but delivers a ChatGPT-style, auto-playing
voice conversation in the browser. Runs as its own process (jarvis-web
service) and shares the on-disk conversation memory and vault with the bot.
"""
