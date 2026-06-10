"""
memory_store.py
===============
Persistent conversation memory backed by MongoDB.
Each session_id maps to an ordered list of {role, content} messages.
The agent uses this to maintain context across turns.
"""

from __future__ import annotations

import os, logging
from datetime import datetime, timezone
from typing import List

from pymongo import MongoClient, ASCENDING
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

MONGO_URI        = os.environ["MONGO_URI"]
MONGO_DB_NAME    = os.environ.get("MONGO_DB_NAME",         "agent_mira_db")
MEMORY_COLL_NAME = os.environ.get("MONGO_MEMORY_COLLECTION","chat_memory")

_client: MongoClient | None = None


def _get_collection():
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI)
    col = _client[MONGO_DB_NAME][MEMORY_COLL_NAME]
    # TTL index: auto-delete sessions older than 7 days
    col.create_index(
        [("created_at", ASCENDING)],
        expireAfterSeconds=604800,
        background=True,
    )
    return col


def load_history(session_id: str) -> List[dict]:
    """Return all messages for *session_id* in order."""
    doc = _get_collection().find_one({"session_id": session_id})
    if doc:
        return doc.get("messages", [])
    return []


def append_message(session_id: str, role: str, content: str) -> None:
    """Append one message to the session's history (upsert)."""
    col = _get_collection()
    col.update_one(
        {"session_id": session_id},
        {
            "$push": {"messages": {"role": role, "content": content}},
            "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
        },
        upsert=True,
    )


def clear_session(session_id: str) -> None:
    """Delete all history for *session_id*."""
    _get_collection().delete_one({"session_id": session_id})


def list_sessions() -> List[str]:
    """Return all active session IDs."""
    return [d["session_id"] for d in _get_collection().find({}, {"session_id": 1})]
