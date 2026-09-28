"""Read text from the simple protocol PDFs in uploads/."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
UPLOADS = ROOT / "uploads"


def extract_pdf_text(path: Path) -> str:
    raw = path.read_bytes().decode("latin-1", "replace")
    parts = re.findall(r"\((?:\\.|[^\\)])*\)\s*Tj", raw)
    lines = []
    for part in parts:
        inner = part[1 : part.rfind(")")]
        inner = inner.replace("\\(", "(").replace("\\)", ")").replace("\\\\", "\\")
        lines.append(inner)
    return "\n".join(line for line in lines if line.strip())


def load_trial_pdf(trial_id: str) -> str:
    path = UPLOADS / f"{trial_id.upper()}.pdf"
    if not path.exists():
        return ""
    return extract_pdf_text(path)


def list_trial_pdfs() -> list[Path]:
    if not UPLOADS.exists():
        return []
    return sorted(UPLOADS.glob("T*.pdf"))
