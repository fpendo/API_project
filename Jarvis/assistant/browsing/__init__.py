"""Self-learning agentic web browsing.

Jarvis can browse any website with a real headless browser, learn how to
perform a task on it, store that knowledge as a replayable "skill"
(a generated Playwright script + metadata), and self-heal when sites change.

Layout:
    engine.py       - browser-use Agent wrapper (Sonnet-powered exploration)
    skills.py       - skill library: find/replay/save, self-heal escalation
    codegen.py      - turn a successful action log into a Playwright script
    hitl.py         - human-in-the-loop bridge (Telegram prompt + wait)
    credentials.py  - per-site credential store, injected via sensitive_data
"""
