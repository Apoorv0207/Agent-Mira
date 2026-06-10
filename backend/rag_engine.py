"""
rag_engine.py
=============
Core RAG logic using Google Gemini (langchain-google-genai v2.x compatible)
"""

from __future__ import annotations

import os, logging
from pathlib import Path
from typing import List

from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_core.prompts import PromptTemplate
from langchain_core.documents import Document
from pymongo import MongoClient

load_dotenv()
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
GEMINI_API_KEY        = os.environ["GEMINI_API_KEY"]
MONGO_URI             = os.environ["MONGO_URI"]
MONGO_DB_NAME         = os.environ.get("MONGO_DB_NAME",         "agent_mira_db")
MONGO_COLLECTION_NAME = os.environ.get("MONGO_COLLECTION_NAME", "property_docs")
ATLAS_VECTOR_INDEX    = os.environ.get("ATLAS_VECTOR_INDEX_NAME","vector_index")

# Push key into env so google-genai SDK picks it up automatically
os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY

# ── Singletons ────────────────────────────────────────────────────────────────
_embeddings   = None
_vector_store = None
_mongo_client = None


def _get_embeddings() -> GoogleGenerativeAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = GoogleGenerativeAIEmbeddings(
            model="gemini-embedding-001",
        )
    return _embeddings


def _get_mongo_client() -> MongoClient:
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = MongoClient(MONGO_URI)
    return _mongo_client


def _get_vector_store() -> MongoDBAtlasVectorSearch:
    global _vector_store
    if _vector_store is None:
        col = _get_mongo_client()[MONGO_DB_NAME][MONGO_COLLECTION_NAME]
        _vector_store = MongoDBAtlasVectorSearch(
            collection=col,
            embedding=_get_embeddings(),
            index_name=ATLAS_VECTOR_INDEX,
            text_key="text",
            embedding_key="embedding",
        )
    return _vector_store


# ── Ingestion ─────────────────────────────────────────────────────────────────
def ingest_pdf(pdf_path: str) -> int:
    logger.info("Ingesting PDF: %s", pdf_path)
    pages: List[Document] = PyPDFLoader(pdf_path).load()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, chunk_overlap=200, add_start_index=True
    )
    chunks = splitter.split_documents(pages)
    source_name = Path(pdf_path).name
    for c in chunks:
        c.metadata["source_file"] = source_name
    _get_vector_store().add_documents(chunks)
    logger.info("Stored %d chunks for %s", len(chunks), source_name)
    return len(chunks)


# ── RAG Prompt ────────────────────────────────────────────────────────────────
RAG_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template="""You are Mira, an expert AI real-estate assistant.
Use ONLY the context below to answer. If it is insufficient, say so clearly.

CONTEXT:
{context}

QUESTION: {question}

Give a clear, structured answer based solely on the context.""",
)


def retrieve_and_answer(question: str, k: int = 3) -> dict:
    docs = _get_vector_store().as_retriever(
        search_type="similarity", search_kwargs={"k": k}
    ).invoke(question)

    if not docs:
        return {
            "answer": "No relevant documents found. Please upload a property document first.",
            "sources": [],
        }

    context = "\n\n".join(
        f"[Chunk {i+1}]\n{d.page_content}" for i, d in enumerate(docs)
    )
    sources = [
        {"source_file": d.metadata.get("source_file", "?"),
         "page":        d.metadata.get("page", "?")}
        for d in docs
    ]

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.2,
    )

    chain  = RAG_PROMPT | llm
    result = chain.invoke({"context": context, "question": question})
    return {"answer": result.content.strip(), "sources": sources}