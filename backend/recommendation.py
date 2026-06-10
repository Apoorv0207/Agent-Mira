"""
recommendation.py
=================
Property recommendation system using Google Gemini embeddings.
"""

from __future__ import annotations

import os, logging
from typing import List

from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from pymongo import MongoClient

load_dotenv()
logger = logging.getLogger(__name__)

GEMINI_API_KEY        = os.environ["GEMINI_API_KEY"]
os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY
MONGO_URI             = os.environ["MONGO_URI"]
MONGO_DB_NAME         = os.environ.get("MONGO_DB_NAME",         "agent_mira_db")
MONGO_COLLECTION_NAME = os.environ.get("MONGO_COLLECTION_NAME", "property_docs")
ATLAS_VECTOR_INDEX    = os.environ.get("ATLAS_VECTOR_INDEX_NAME","vector_index")

_client:     MongoClient                  | None = None
_embeddings: GoogleGenerativeAIEmbeddings | None = None


def _get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = GoogleGenerativeAIEmbeddings(
            model="gemini-embedding-001",
        )
    return _embeddings


def _get_collection():
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI)
    return _client[MONGO_DB_NAME][MONGO_COLLECTION_NAME]


def recommend_properties(preferences: str, top_k: int = 5) -> List[dict]:
    """Return top_k document chunks most similar to the preference string."""
    logger.info("Generating recommendations for: %s", preferences)

    query_vector = _get_embeddings().embed_query(preferences)
    col          = _get_collection()

    pipeline = [
        {
            "$vectorSearch": {
                "index":         ATLAS_VECTOR_INDEX,
                "path":          "embedding",
                "queryVector":   query_vector,
                "numCandidates": top_k * 10,
                "limit":         top_k,
            }
        },
        {
            "$project": {
                "_id":         0,
                "text":        1,
                "source_file": "$metadata.source_file",
                "page":        "$metadata.page",
                "score":       {"$meta": "vectorSearchScore"},
            }
        },
    ]

    results = list(col.aggregate(pipeline))
    logger.info("Found %d recommendations", len(results))

    return [
        {
            "text":        r.get("text", ""),
            "source_file": r.get("source_file", "unknown"),
            "page":        r.get("page", "?"),
            "score":       round(r.get("score", 0.0), 4),
        }
        for r in results
    ]