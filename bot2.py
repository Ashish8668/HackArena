"""PDF RAG demo: chunk protocols, retrieve top-k, send only those chunks to Groq.

  python bot2.py T001 "What medicine is excluded?"
  python bot2.py --all "age range"

Uses FAISS IndexFlatIP when faiss + sentence-transformers are installed.
Otherwise uses a cosine vector index with the same top-k printout.
"""

from __future__ import annotations

import math
import re
import sys
from dataclasses import dataclass

from bot import full_context, get_trial
from groq_client import groq_answer
from pdf_text import extract_pdf_text, list_trial_pdfs

CHUNK_WORDS = 90
CHUNK_OVERLAP = 25
TOP_K = 4
TOP_P = 0.9


@dataclass
class Chunk:
    trial_id: str
    chunk_id: int
    source: str
    text: str


def chunk_text(text: str, size: int = CHUNK_WORDS, overlap: int = CHUNK_OVERLAP) -> list[str]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        piece = " ".join(words[start : start + size]).strip()
        if piece:
            chunks.append(piece)
        start += max(1, size - overlap)
        if start >= len(words):
            break
    return chunks


def load_chunks(trial_filter: str | None) -> list[Chunk]:
    out: list[Chunk] = []
    files = list_trial_pdfs()
    if trial_filter:
        files = [path for path in files if path.stem.upper() == trial_filter.upper()]
    for path in files:
        text = extract_pdf_text(path)
        for index, piece in enumerate(chunk_text(text)):
            out.append(Chunk(trial_id=path.stem.upper(), chunk_id=index, source=path.name, text=piece))
    return out


def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def cosine(a: dict[str, float], b: dict[str, float]) -> float:
    keys = set(a) | set(b)
    dot = sum(a.get(k, 0.0) * b.get(k, 0.0) for k in keys)
    mag_a = math.sqrt(sum(v * v for v in a.values()))
    mag_b = math.sqrt(sum(v * v for v in b.values()))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def bag(text: str) -> dict[str, float]:
    counts: dict[str, float] = {}
    for token in tokenize(text):
        counts[token] = counts.get(token, 0.0) + 1.0
    return counts


def retrieve_cosine(question: str, chunks: list[Chunk], k: int = TOP_K) -> list[tuple[float, Chunk]]:
    query = bag(question)
    ranked = [(cosine(query, bag(chunk.text)), chunk) for chunk in chunks]
    ranked.sort(key=lambda item: item[0], reverse=True)
    return [(score, chunk) for score, chunk in ranked if score > 0][:k]


def retrieve_faiss(question: str, chunks: list[Chunk], k: int = TOP_K) -> list[tuple[float, Chunk]]:
    import faiss
    import numpy as np
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer("all-MiniLM-L6-v2")
    texts = [chunk.text for chunk in chunks]
    matrix = np.asarray(model.encode(texts, normalize_embeddings=True), dtype="float32")
    index = faiss.IndexFlatIP(matrix.shape[1])
    index.add(matrix)
    query = np.asarray(model.encode([question], normalize_embeddings=True), dtype="float32")
    scores, ids = index.search(query, min(k, len(chunks)))
    hits = []
    for score, idx in zip(scores[0], ids[0]):
        if idx < 0:
            continue
        hits.append((float(score), chunks[int(idx)]))
    return hits


def ask(question: str, trial_id: str | None = None) -> str:
    chunks = load_chunks(trial_id)
    if not chunks:
        return "No PDFs in uploads/. Run: python scripts/generate_trial_pdfs.py"

    print(
        f"[bot2.py] documents={len({c.source for c in chunks})} chunks={len(chunks)} "
        f"retrieval_top_k={TOP_K} groq_top_p={TOP_P}"
    )
    print("[bot2.py] chunk size=" + str(CHUNK_WORDS) + " words, overlap=" + str(CHUNK_OVERLAP))

    engine = "cosine-fallback"
    try:
        hits = retrieve_faiss(question, chunks, TOP_K)
        engine = "FAISS IndexFlatIP + MiniLM"
    except Exception as exc:
        print(f"[bot2.py] FAISS unavailable ({type(exc).__name__}); using cosine fallback")
        hits = retrieve_cosine(question, chunks, TOP_K)

    print(f"[bot2.py] retrieve={engine}")
    if not hits:
        return "No matching chunks."

    print("[bot2.py] semantic evidence selected from PDF chunks:")
    for rank, (score, chunk) in enumerate(hits, start=1):
        preview = chunk.text[:90].replace("\n", " ")
        print(f"  {rank}. {chunk.source}#chunk{chunk.chunk_id}  score={score:.3f}  {preview}...")

    selected_trial_id = trial_id.upper() if trial_id else hits[0][1].trial_id
    trial = get_trial(selected_trial_id)
    if not trial:
        return "Unknown trial. Use T001 to T010."
    context = full_context(trial)
    print(f"[bot2.py] answer source: bot.py hardcoded prompt for {selected_trial_id}")
    print(f"[bot2.py] Groq context: full selected-trial prompt ({len(context)} chars)")
    answer = groq_answer(question, context, top_p=TOP_P)
    if not answer or answer.startswith("[groq"):
        return context + "\n" + (answer or "Groq unavailable.")
    return answer


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print('Usage: python bot2.py T001 "What is excluded medicine?"')
        print('       python bot2.py --all "visit schedule"')
        return
    if args[0] == "--all":
        print(ask(" ".join(args[1:])))
        return
    if len(args) >= 2:
        print(ask(" ".join(args[1:]), args[0]))
        return
    print(ask(args[0]))


if __name__ == "__main__":
    main()
