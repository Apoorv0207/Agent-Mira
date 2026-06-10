"""
main.py
=======
FastAPI application.

Endpoints
---------
POST /api/chat          — Agentic RAG with memory (LangGraph)
POST /api/upload        — PDF ingestion
POST /api/recommend     — Property recommendations
GET  /api/memory/{sid}  — Fetch session history
DELETE /api/memory/{sid}— Clear session history
GET  /api/health        — Liveness probe
"""

from __future__ import annotations

import shutil, tempfile, logging
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agent import run_agent
from rag_engine import ingest_pdf
from memory_store import load_history, clear_session
from recommendation import recommend_properties

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Agent Mira — AI Real-Estate Assistant API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://agent-mira-sable.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question:   str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(default="default_session", max_length=128)

class ChatResponse(BaseModel):
    answer:     str
    tools_used: list[str]
    sources:    list[dict]
    session_id: str

class UploadResponse(BaseModel):
    message:       str
    chunks_stored: int
    filename:      str

class RecommendRequest(BaseModel):
    preferences: str = Field(..., min_length=3, max_length=500)
    top_k:       int = Field(default=5, ge=1, le=20)

class RecommendResponse(BaseModel):
    recommendations: list[dict]

class HealthResponse(BaseModel):
    status: str

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse, tags=["Utility"])
async def health():
    return HealthResponse(status="ok")


@app.post("/api/chat", response_model=ChatResponse, tags=["Agent"])
async def chat(req: ChatRequest):
    """LangGraph ReAct agent with MongoDB-backed conversation memory."""
    try:
        result = run_agent(req.question, req.session_id)
    except Exception as exc:
        logger.exception("Agent error")
        raise HTTPException(status_code=500, detail=str(exc))

    return ChatResponse(
        answer=result["answer"],
        tools_used=result.get("tools_used", []),
        sources=result.get("sources", []),
        session_id=req.session_id,
    )


@app.post("/api/upload", response_model=UploadResponse, tags=["Documents"])
async def upload(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted.")
    tmp = tempfile.mkdtemp()
    try:
        path = Path(tmp) / file.filename
        path.write_bytes(await file.read())
        chunks = ingest_pdf(str(path))
    except Exception as exc:
        logger.exception("Ingestion error")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return UploadResponse(
        message="Document ingested successfully.",
        chunks_stored=chunks,
        filename=file.filename,
    )


@app.post("/api/recommend", response_model=RecommendResponse, tags=["Recommendations"])
async def recommend(req: RecommendRequest):
    """Content-based property recommendation via vector similarity."""
    try:
        recs = recommend_properties(req.preferences, req.top_k)
    except Exception as exc:
        logger.exception("Recommendation error")
        raise HTTPException(status_code=500, detail=str(exc))
    return RecommendResponse(recommendations=recs)


@app.get("/api/memory/{session_id}", tags=["Memory"])
async def get_memory(session_id: str):
    history = load_history(session_id)
    return {"session_id": session_id, "messages": history}


@app.delete("/api/memory/{session_id}", tags=["Memory"])
async def delete_memory(session_id: str):
    clear_session(session_id)
    return {"session_id": session_id, "cleared": True}
