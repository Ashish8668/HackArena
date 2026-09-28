"""Shared Groq call. Reads VITE_GROQ_API_KEY from .env. Never prints the key."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "openai/gpt-oss-20b"


def load_groq_key() -> str:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return ""
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("VITE_GROQ_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    return ""


def groq_answer(question: str, context: str, top_p: float = 0.9) -> str:
    key = load_groq_key()
    if not key:
        return ""
    body = json.dumps(
        {
            "model": GROQ_MODEL,
            "temperature": 0.1,
            "top_p": top_p,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Answer only from the trial text. If it is not in the text, say it is not in this trial record. "
                        "Do not give medical advice or eligibility decisions."
                    ),
                },
                {"role": "user", "content": f"Trial text:\n{context}\n\nQuestion: {question}"},
            ],
        }
    ).encode()
    req = urllib.request.Request(
        GROQ_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as res:
            data = json.loads(res.read().decode())
        return str(data.get("choices", [{}])[0].get("message", {}).get("content", "")).strip()
    except urllib.error.HTTPError as exc:
        try:
            payload = json.loads(exc.read().decode("utf-8", "replace"))
            message = payload.get("error", {}).get("message", "")
        except Exception:
            message = ""
        if not message and exc.code == 403:
            message = "chat completion forbidden; check API key project, billing, and inference permissions"
        detail = f": {message}" if message else ""
        return f"[groq http {exc.code}{detail}]"
    except Exception as exc:
        return f"[groq unavailable: {type(exc).__name__}]"
