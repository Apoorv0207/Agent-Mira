"""
agent.py
========
LangGraph ReAct agent — langchain-google-genai v2.x compatible
"""

from __future__ import annotations

import json, logging, os
from typing import Annotated, TypedDict, Sequence

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langchain_core.messages import (
    BaseMessage, HumanMessage, AIMessage, SystemMessage
)
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from rag_engine import retrieve_and_answer
from memory_store import load_history, append_message

load_dotenv()
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY


# ── Tools ─────────────────────────────────────────────────────────────────────

@tool
def search_property_docs(query: str) -> str:
    """Search uploaded real-estate documents (PDFs) for information relevant
    to the query. Use this for questions about specific properties, listings,
    contracts, reports, or any document content."""
    result  = retrieve_and_answer(query, k=3)
    sources = result["sources"]
    src_str = ", ".join(
        f"{s['source_file']} p.{s['page']}" for s in sources
    ) if sources else "no sources"
    return f"{result['answer']}\n\n[Sources: {src_str}]"


@tool
def calculate_mortgage(
    principal: float,
    annual_rate_percent: float,
    term_years: int,
    down_payment: float = 0.0,
) -> str:
    """Calculate monthly mortgage payment, total payment, and total interest.

    Args:
        principal: Total property price in USD.
        annual_rate_percent: Annual interest rate as a percentage (e.g. 6.5).
        term_years: Loan term in years (e.g. 30).
        down_payment: Down payment amount in USD (default 0).
    """
    loan = principal - down_payment
    if loan <= 0:
        return json.dumps({"error": "Down payment exceeds or equals property price."})
    monthly_rate = annual_rate_percent / 100 / 12
    n = term_years * 12
    if monthly_rate == 0:
        monthly = loan / n
    else:
        monthly = loan * (monthly_rate * (1 + monthly_rate) ** n) / \
                  ((1 + monthly_rate) ** n - 1)
    total    = monthly * n
    interest = total - loan
    return json.dumps({
        "loan_amount":     round(loan, 2),
        "monthly_payment": round(monthly, 2),
        "total_payment":   round(total, 2),
        "total_interest":  round(interest, 2),
        "term_years":      term_years,
        "annual_rate_pct": annual_rate_percent,
    })


TOOLS = [search_property_docs, calculate_mortgage]


# ── LangGraph state ───────────────────────────────────────────────────────────

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]


SYSTEM_PROMPT = """You are Mira, an expert AI real-estate assistant built by Agent Mira.

You have two tools:
1. search_property_docs  — answers questions from uploaded property documents
2. calculate_mortgage    — computes mortgage payments

Rules:
- Use search_property_docs for any question about a property or document.
- Use calculate_mortgage when asked about monthly payments or affordability.
- Chain both tools if the question needs both.
- Be concise, factual, and professional.
- If you cannot answer confidently, say so."""


def _build_graph():
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.2,
    ).bind_tools(TOOLS)

    def should_continue(state: AgentState) -> str:
        last = state["messages"][-1]
        if hasattr(last, "tool_calls") and last.tool_calls:
            return "tools"
        return END

    def call_model(state: AgentState) -> AgentState:
        return {"messages": [llm.invoke(state["messages"])]}

    graph = StateGraph(AgentState)
    graph.add_node("agent", call_model)
    graph.add_node("tools", ToolNode(TOOLS))
    graph.set_entry_point("agent")
    graph.add_conditional_edges(
        "agent", should_continue, {"tools": "tools", END: END}
    )
    graph.add_edge("tools", "agent")
    return graph.compile()


_graph = None


def _get_graph():
    global _graph
    if _graph is None:
        _graph = _build_graph()
    return _graph


def run_agent(question: str, session_id: str) -> dict:
    history_raw  = load_history(session_id)
    messages: list[BaseMessage] = [SystemMessage(content=SYSTEM_PROMPT)]

    for msg in history_raw:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=question))

    result       = _get_graph().invoke({"messages": messages})
    all_messages = result["messages"]
    final_ai_msg = None
    tools_used   = []

    for m in all_messages:
        if isinstance(m, AIMessage):
            final_ai_msg = m
            if hasattr(m, "tool_calls") and m.tool_calls:
                for tc in m.tool_calls:
                    tools_used.append(tc["name"])

    answer_text = ""
    if final_ai_msg:
        if isinstance(final_ai_msg.content, str):
            answer_text = final_ai_msg.content
        elif isinstance(final_ai_msg.content, list):
            for block in final_ai_msg.content:
                if isinstance(block, dict) and block.get("type") == "text":
                    answer_text += block["text"]

    append_message(session_id, "user",      question)
    append_message(session_id, "assistant", answer_text)

    return {
        "answer":     answer_text.strip(),
        "tools_used": list(dict.fromkeys(tools_used)),
        "sources":    [],
    }