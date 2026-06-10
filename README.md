

# 🏠 Agent Mira — AI Real Estate Assistant

### A production-ready RAG application powered by LangGraph, MongoDB Atlas Vector Search, and Google Gemini

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![LangChain](https://img.shields.io/badge/LangChain-0.3+-1C3C3C?style=for-the-badge&logo=chainlink&logoColor=white)](https://langchain.com)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-Vector_Search-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com/atlas)
[![Gemini](https://img.shields.io/badge/Google_Gemini-1.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)


[Home Page](screenshots/mira1.png)
[Match](screenshots/mira2.png)

**Upload any property document → Ask questions in plain English → Get grounded AI answers**

[🚀 Live Demo](https://urlofproject.com) 

---

## 📋 Table of Contents

- [Overview](#-overview)
- [✨ Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [📸 Screenshots](#-screenshots)
- [🏗 Architecture](#-architecture)
- [📁 File Structure](#-file-structure)
- [⚙️ Local Setup](#-local-setup)
- [🔧 Configuration](#-configuration)
- [📡 API Reference](#-api-reference)
- [⚖️ Tradeoffs & Design Decisions](#-tradeoffs--design-decisions)
- [🗺 Roadmap](#-roadmap)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🔍 Overview

**Agent Mira** is a full-stack, production-ready AI application built for the real estate industry. It combines **Retrieval-Augmented Generation (RAG)** with an **agentic AI architecture** to let users upload property documents (PDFs) and have intelligent, context-aware conversations about them.

Unlike a generic chatbot, Agent Mira:
- **Only answers from your documents** — no hallucinations about properties that don't exist
- **Remembers your conversation** — follow-up questions work naturally across turns
- **Reasons about which tool to use** — it decides whether to search documents, calculate a mortgage, or do both
- **Recommends properties semantically** — finds the best matches based on what you describe, not just keywords

This project was built to demonstrate real-world AI engineering skills including agentic architectures, vector databases, persistent memory systems, and recommendation engines — all in a single cohesive application.

---

## ✨ Features

### 🤖 Agentic AI (LangGraph ReAct Agent)
The core intelligence is a **LangGraph ReAct agent** that doesn't just retrieve and answer — it *reasons* about what to do. Given a question, it decides which tool to invoke, calls it, observes the result, and may call another tool before producing a final answer. This is what separates a true AI agent from a simple chatbot.

### 📄 RAG Pipeline (Retrieval-Augmented Generation)
Upload any PDF and the system:
1. Parses the document page by page
2. Splits it into overlapping 1000-character chunks (with 200-character overlap for context continuity)
3. Embeds each chunk using Google's `gemini-embedding-001` model (3072 dimensions)
4. Stores the vectors in MongoDB Atlas for persistent, scalable semantic search
5. At query time, retrieves the top-3 most relevant chunks and generates a grounded answer

### 🧠 Persistent Conversation Memory
Every conversation is stored in MongoDB with a unique `session_id`. The agent loads the full history on each turn, enabling natural multi-turn dialogue:
> *"Tell me about the Maple Street listing"* → *"What's the mortgage on that?"*
The second question works because the agent remembers what "that" refers to. Sessions auto-expire after 7 days via a MongoDB TTL index.

### 🏦 Built-in Mortgage Calculator Tool
Ask in plain English: *"Calculate the mortgage for $450,000 at 6.5% over 30 years with $90k down"* — the agent detects this intent and invokes a deterministic calculator tool, returning a visual card with monthly payment, total interest, and loan breakdown. No AI guesswork — pure math.

### 🔍 Semantic Property Recommendation Engine
The **Match tab** uses vector similarity search to find the most relevant document excerpts based on a natural language description. Describe your ideal property — *"3 bedroom near good schools, garden, quiet street under $500k"* — and the system returns ranked results with percentage match scores, powered entirely by semantic understanding, not keyword matching.

### 💬 Beautiful Chat Interface
- ChatGPT-style scrollable message history
- Tool usage badges (shows which tools the agent invoked)
- Source attribution badges (document name + page number)
- Auto-resizing textarea (Shift+Enter for newline, Enter to send)
- Typing indicator with animated dots
- Mortgage results displayed as a visual card
- Sidebar with document management and session info

---

## 🛠 Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.10+ | Core language |
| **FastAPI** | 0.115+ | Async REST API framework |
| **LangChain** | 0.3+ | LLM orchestration, chains, prompts |
| **LangGraph** | 0.2+ | ReAct agent graph with tool-calling |
| **langchain-google-genai** | 2.0+ | Gemini LLM + embedding integration |
| **langchain-mongodb** | 0.2+ | MongoDB Atlas Vector Search integration |
| **Motor** | 3.6+ | Async MongoDB driver |
| **PyMongo** | 4.9+ | Sync MongoDB driver (used by vector store) |
| **Uvicorn** | 0.30+ | ASGI server |
| **Pydantic** | 2.9+ | Data validation and serialisation |
| **pypdf** | 4.3+ | PDF parsing |
| **python-dotenv** | 1.0+ | Environment variable management |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.3+ | UI framework |
| **Vite** | 5.2+ | Build tool and dev server |
| **Tailwind CSS** | 3.4+ | Utility-first CSS framework |
| **Axios** | 1.7+ | HTTP client |
| **Lucide React** | 0.396+ | Icon library |

### Infrastructure & AI
| Service | Purpose |
|---|---|
| **MongoDB Atlas** | Vector storage, conversation memory, TTL-based session expiry |
| **Google Gemini 1.5 Flash** | LLM for answer generation and agent reasoning |
| **Google gemini-embedding-001** | Text embeddings (3072 dimensions) |
| **Google AI Studio** | API key management |

---


## 🏗 Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (React + Vite)                      │
│                                                                       │
│   ┌──────────────┐    ┌──────────────────────────────────────────┐  │
│   │   Sidebar    │    │              Chat Window                  │  │
│   │              │    │                                           │  │
│   │ • Upload PDF │    │  User Message ──────────────────────────▶│  │
│   │ • Doc list   │    │                                           │  │
│   │ • Match tab  │    │  AI Response ◀──────────────────────────  │  │
│   └──────────────┘    │  [Tool badges] [Source badges]           │  │
│                       └──────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP (proxied via Vite)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend (Port 8000)                      │
│                                                                       │
│   POST /api/chat ──────────▶ LangGraph ReAct Agent                  │
│                                    │                                  │
│                           ┌────────┴─────────┐                       │
│                           ▼                  ▼                       │
│               search_property_docs    calculate_mortgage             │
│                    Tool                    Tool                      │
│                      │                     │                         │
│                      ▼                     ▼                         │
│               RAG Engine            Pure Math (no AI)               │
│               (rag_engine.py)                                        │
│                      │                                               │
│   POST /api/upload ──▶ ingest_pdf()                                  │
│   POST /api/recommend ▶ recommend_properties()                       │
│   GET  /api/memory ───▶ load_history()                               │
└──────────┬──────────────────────────┬───────────────────────────────┘
           │                          │
           ▼                          ▼
┌──────────────────┐      ┌──────────────────────────┐
│   Google Gemini  │      │      MongoDB Atlas        │
│                  │      │                           │
│ • gemini-1.5-    │      │  property_docs collection │
│   flash (LLM)   │      │  • Text chunks            │
│                  │      │  • Vector embeddings      │
│ • gemini-        │      │  • Source metadata        │
│   embedding-001  │      │                           │
│   (Embeddings)   │      │  chat_memory collection   │
└──────────────────┘      │  • Session history        │
                          │  • TTL auto-expiry (7d)   │
                          │                           │
                          │  Atlas Vector Search      │
                          │  • Cosine similarity      │
                          │  • 3072 dimensions        │
                          └──────────────────────────┘
```

### RAG Pipeline (Document Ingestion)

```
PDF File
   │
   ▼
PyPDFLoader (page-by-page parsing)
   │
   ▼
RecursiveCharacterTextSplitter
   chunk_size=1000, overlap=200
   │
   ▼
[chunk_1, chunk_2, ... chunk_n]  +  metadata {source_file, page}
   │
   ▼
gemini-embedding-001
   │ (3072-dimensional vectors)
   ▼
MongoDB Atlas  →  property_docs collection
   {text, embedding, metadata}
```

### RAG Pipeline (Query Time)

```
User Question
   │
   ▼
gemini-embedding-001  (embed the question)
   │
   ▼
MongoDB Atlas Vector Search  (cosine similarity, top-3)
   │
   ▼
[chunk_1, chunk_2, chunk_3]  (most relevant excerpts)
   │
   ▼
PromptTemplate  {context + question}
   │
   ▼
gemini-1.5-flash  (generates grounded answer)
   │
   ▼
Answer + Source Citations
```

### LangGraph Agent Flow

```
User Question + Conversation History
          │
          ▼
   ┌─────────────┐
   │    Agent    │  ← gemini-1.5-flash with bound tools
   │  (Reasons)  │
   └──────┬──────┘
          │
    Has tool_calls?
     /           \
   YES             NO
    │               │
    ▼               ▼
┌────────┐     Final Answer
│ Tools  │
│  Node  │
└───┬────┘
    │
 calls one or both:
  ├── search_property_docs(query)
  │        └── rag_engine.retrieve_and_answer()
  └── calculate_mortgage(principal, rate, term, down)
           └── pure Python math
    │
    ▼
 Observation (tool result)
    │
    ▼
 Back to Agent  (may call more tools or produce final answer)
```

---

## 📁 File Structure

```
agent_mira_rag/
│
├── backend/                          # Python FastAPI backend
│   ├── main.py                       # API entry point, routes, CORS config
│   ├── agent.py                      # LangGraph ReAct agent + tool definitions
│   ├── rag_engine.py                 # PDF ingestion, chunking, embedding, retrieval
│   ├── memory_store.py               # MongoDB-backed conversation memory
│   ├── recommendation.py             # Vector similarity recommendation engine
│   ├── requirements.txt              # Python dependencies
│   ├── .env.example                  # Environment variable template
│   └── .env                          # Your actual secrets (git-ignored)
│
├── frontend/                         # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx                   # Main application component (entire UI)
│   │   ├── main.jsx                  # React DOM entry point
│   │   └── index.css                 # Tailwind directives + custom components
│   ├── index.html                    # HTML shell
│   ├── vite.config.js                # Vite config + API proxy to :8000
│   ├── tailwind.config.js            # Tailwind theme (custom colors, fonts, animations)
│   ├── postcss.config.js             # PostCSS config for Tailwind
│   └── package.json                  # Node dependencies
│
├── .gitignore                        # Git ignore rules
└── README.md                         # This file
```

### Key File Responsibilities

| File | What it owns |
|---|---|
| `main.py` | HTTP layer — routes, request/response schemas, error handling, CORS |
| `agent.py` | AI reasoning layer — LangGraph graph, tool definitions, tool execution |
| `rag_engine.py` | Data layer — PDF parsing, vector storage, semantic retrieval, answer generation |
| `memory_store.py` | Persistence layer — conversation history CRUD, TTL management |
| `recommendation.py` | Search layer — raw vector similarity pipeline, aggregation query |
| `App.jsx` | Presentation layer — all UI components, state management, API calls |

---

## ⚙️ Local Setup

### Prerequisites

Make sure the following are installed on your machine:

| Tool | Version | Check |
|---|---|---|
| Python | 3.10+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 8+ | `npm --version` |
| Git | any | `git --version` |

### Step 1 — Clone the repository

```bash
git clone https://github.com/yourusername/agent-mira-rag.git
cd agent-mira-rag
```

### Step 2 — Get your API keys

**Google Gemini API Key (free)**
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click **Get API Key** → **Create API key**
3. Copy the key (starts with `AIzaSy...`)

**MongoDB Atlas (free tier)**
1. Sign up at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a free M0 cluster
3. Create a database user with a password
4. Allow network access from `0.0.0.0/0`
5. Get connection string from **Connect → Drivers → Python**

### Step 3 — Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Mac/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your environment file
cp .env.example .env
```

Open `.env` and fill in your values:

```env
GEMINI_API_KEY=AIzaSy...your_key_here

MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority

MONGO_DB_NAME=agent_mira_db
MONGO_COLLECTION_NAME=property_docs
ATLAS_VECTOR_INDEX_NAME=vector_index
MONGO_MEMORY_COLLECTION=chat_memory
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

Verify it's running: open [http://localhost:8000/api/health](http://localhost:8000/api/health) — you should see `{"status":"ok"}`.

### Step 4 — MongoDB Atlas Vector Search Index

This step is **required** for the AI search to work.

1. In Atlas, go to your cluster → **Browse Collections**
2. Click the **Atlas Search** tab
3. Click **Create Search Index**
4. Choose **Atlas Vector Search** (not plain Search)
5. Click **JSON Editor**
6. Select database `agent_mira_db`, collection `property_docs`
7. Paste this JSON and name the index `vector_index`:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 3072,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "source_file"
    }
  ]
}
```

8. Click **Create** and wait ~1 minute for it to become Active.

> ⚠️ `numDimensions` must be **3072** — this matches the `gemini-embedding-001` model output size.

### Step 5 — Frontend setup

Open a new terminal (keep the backend running):

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Step 6 — Test the application

1. Click **Upload PDF** in the sidebar and upload any property-related PDF
2. Wait for the green success message showing chunks stored
3. Type a question in the chat and press Enter
4. Switch to the **Match** tab and describe a property to see semantic recommendations

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google AI Studio API key for Gemini LLM and embeddings |
| `MONGO_URI` | ✅ | MongoDB Atlas connection string including credentials |
| `MONGO_DB_NAME` | ✅ | Database name (default: `agent_mira_db`) |
| `MONGO_COLLECTION_NAME` | ✅ | Collection for document vectors (default: `property_docs`) |
| `ATLAS_VECTOR_INDEX_NAME` | ✅ | Name of the Atlas Vector Search index (default: `vector_index`) |
| `MONGO_MEMORY_COLLECTION` | ✅ | Collection for chat history (default: `chat_memory`) |

### Chunking Configuration

In `rag_engine.py`, the text splitter is configured as:

```python
RecursiveCharacterTextSplitter(
    chunk_size=1000,    # Characters per chunk
    chunk_overlap=200,  # Overlap between consecutive chunks
)
```

Adjust these values based on your document type:
- **Larger chunks** → more context per retrieval, higher token cost
- **Smaller chunks** → more precise retrieval, less context
- **More overlap** → better continuity across chunk boundaries

---

## 📡 API Reference

### `POST /api/chat`
Run the LangGraph agent with conversation memory.

**Request:**
```json
{
  "question": "What is the price of the Maple Street property?",
  "session_id": "user_abc_123"
}
```

**Response:**
```json
{
  "answer": "The Maple Street property is listed at $485,000...",
  "tools_used": ["search_property_docs"],
  "sources": [
    { "source_file": "maple_street_listing.pdf", "page": 2 }
  ],
  "session_id": "user_abc_123"
}
```

---

### `POST /api/upload`
Upload and ingest a PDF document.

**Request:** `multipart/form-data` with field `file` (PDF only)

**Response:**
```json
{
  "message": "Document ingested successfully.",
  "chunks_stored": 47,
  "filename": "property_listing.pdf"
}
```

---

### `POST /api/recommend`
Get semantic property recommendations.

**Request:**
```json
{
  "preferences": "3 bedroom with garden near schools under $500k",
  "top_k": 5
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "text": "This charming 3-bedroom property...",
      "source_file": "listings.pdf",
      "page": 4,
      "score": 0.9231
    }
  ]
}
```

---

### `GET /api/memory/{session_id}`
Retrieve conversation history for a session.

### `DELETE /api/memory/{session_id}`
Clear conversation history for a session.

### `GET /api/health`
Liveness probe. Returns `{"status": "ok"}`.

---

## ⚖️ Tradeoffs & Design Decisions

### 1. Google Gemini over OpenAI
**Decision:** Use Gemini 1.5 Flash + gemini-embedding-001 instead of GPT-4 + text-embedding-3-small.

**Why:** Gemini API has a generous free tier which makes this project accessible without billing setup. Gemini 1.5 Flash is fast, capable, and well-suited for document Q&A tasks.

**Tradeoff:** GPT-4o has slightly stronger reasoning on complex multi-step questions. If moving to production with heavy usage, OpenAI may offer more predictable latency SLAs.

---

### 2. MongoDB Atlas as both Vector Store and Memory Store
**Decision:** Use a single MongoDB Atlas cluster for both vector embeddings and conversation history.

**Why:** Reduces infrastructure complexity. One database connection, one billing account, one monitoring dashboard. MongoDB Atlas Vector Search is production-grade and scales well.

**Tradeoff:** Dedicated vector databases like Pinecone or Weaviate offer more advanced ANN indexing algorithms (HNSW) and may outperform Atlas at very large scale (millions of vectors). For typical document Q&A use cases (thousands to low millions of vectors), Atlas is sufficient.

---

### 3. LangGraph ReAct Agent over a Simple Chain
**Decision:** Use a LangGraph stateful agent instead of a linear RAG chain.

**Why:** A simple chain always retrieves and answers. An agent can decide to use the mortgage calculator instead of (or in addition to) the search tool, enabling richer interactions. The graph architecture also makes it easy to add new tools later.

**Tradeoff:** Agents are slower than chains due to multiple LLM calls (one to reason, one per tool, one to synthesise). For simple Q&A, a chain would be faster and cheaper. The agent overhead is worth it here because of the multi-tool requirement.

---

### 4. Synchronous PyMongo for Vector Store, Async Motor for Memory
**Decision:** Use synchronous PyMongo for `MongoDBAtlasVectorSearch` (required by LangChain) and async Motor for the memory store.

**Why:** `langchain-mongodb` internally uses the synchronous PyMongo driver — we cannot change this. For the memory store (which we wrote ourselves), we use Motor for proper async behaviour in FastAPI.

**Tradeoff:** PDF ingestion blocks the event loop briefly because of the synchronous PyMongo calls inside `add_documents()`. In a high-concurrency production environment, this should be moved to a background task queue (e.g. Celery or FastAPI's `BackgroundTasks`).

---

### 5. Session-based Memory (not User-based)
**Decision:** Conversation history is tied to a `session_id` generated on page load, not a persistent user account.

**Why:** Keeps the architecture simple — no authentication system required. Each browser session gets a fresh session ID, but it persists across page refreshes within the same session.

**Tradeoff:** If the user closes and reopens the browser, they get a new session and lose context. For production, this should be replaced with proper user authentication (JWT/OAuth) and user-scoped memory.

---

### 6. Chunk Size 1000 / Overlap 200
**Decision:** Split documents into 1000-character chunks with 200-character overlap.

**Why:** This is the widely-accepted baseline for document Q&A RAG pipelines. 1000 characters gives enough context for a meaningful answer while staying well within the LLM's context window even when 3 chunks are concatenated.

**Tradeoff:** For dense technical documents (legal contracts, financial reports), larger chunks (1500-2000) may preserve more semantic meaning per retrieval. For short-form content, smaller chunks (500) improve precision. This should be tuned per document type in production.

---

## 🗺 Roadmap

- [ ] **User authentication** — JWT-based login so memory is persistent per user, not per session
- [ ] **Multi-file management** — delete individual uploaded documents, view chunk counts per file
- [ ] **Streaming responses** — stream the AI answer token-by-token like ChatGPT using Server-Sent Events
- [ ] **MCP integration** — Model Context Protocol server for external tool connectivity
- [ ] **Multimodal support** — process property images and floor plans alongside text PDFs
- [ ] **Export conversations** — download chat history as PDF or markdown
- [ ] **Comparative analysis** — ask the agent to compare two uploaded property documents
- [ ] **Docker Compose setup** — single command to spin up the entire stack

---

## 🤝 Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add: your feature description'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please ensure your code follows the existing style and that all Python files pass `python -m py_compile` without errors.

---

## 👨‍💻 Author

**Apoorv**
- GitHub: [@Apoorv0207](https://github.com/Apoorv0207)
- LinkedIn: [Apoorv Gautam](https://linkedin.com/in/apoorv-gtm/)
- Email: apoorvgtm@gmail.com

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [LangChain](https://langchain.com) — LLM orchestration framework
- [LangGraph](https://langchain-ai.github.io/langgraph/) — Agent graph framework
- [MongoDB Atlas](https://mongodb.com/atlas) — Vector search and database
- [Google AI Studio](https://aistudio.google.com) — Gemini API
- [FastAPI](https://fastapi.tiangolo.com) — Modern Python API framework
- [Tailwind CSS](https://tailwindcss.com) — Utility-first CSS

---



**Built with ❤️ to demonstrate production-ready AI engineering**

⭐ Star this repo if you found it useful


