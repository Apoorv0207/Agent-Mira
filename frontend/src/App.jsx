import React, { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import {
  Send, Upload, Bot, User, FileText, Loader2, CheckCircle2,
  AlertCircle, Home, Search, Trash2, Wrench, ChevronDown,
  Sparkles, Calculator, BookOpen, MessageSquare,
} from 'lucide-react'

// ── helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9)

const WELCOME = {
  id: 'welcome', role: 'assistant', timestamp: new Date(),
  text: "Hello, I'm **Mira** — your AI real-estate assistant.\n\nI can:\n• Answer questions from uploaded property documents\n• Calculate mortgage payments\n• Recommend properties based on your preferences\n\nI can:\n• Answer questions from uploaded documents\n\nStart by uploading a PDF in the sidebar, then ask me anything.",
  tools_used: [], sources: [],
}

// ── sub-components ────────────────────────────────────────────────────────────
function Dots() {
  return (
    <div className="flex items-end gap-2 animate-fade-up">
      <div className="w-8 h-8 rounded-full bg-mira-600 flex items-center justify-center flex-shrink-0">
        <Bot size={15} className="text-white" />
      </div>
      <div className="bubble-ai flex items-center gap-1.5 py-3.5 px-5">
        {[0,1,2].map(i => (
          <span key={i} className="w-2 h-2 rounded-full bg-mira-400 inline-block animate-dot-pulse"
            style={{ animationDelay: `${i*0.16}s` }} />
        ))}
      </div>
    </div>
  )
}

function renderText(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2,-2)}</strong>
      : p.split('\n').map((line, j, arr) => (
          <React.Fragment key={`${i}-${j}`}>{line}{j < arr.length-1 && <br/>}</React.Fragment>
        ))
  )
}

function ToolBadge({ name }) {
  const icons = { search_property_docs: <BookOpen size={10}/>, calculate_mortgage: <Calculator size={10}/> }
  const labels = { search_property_docs: 'Doc Search', calculate_mortgage: 'Mortgage Calc' }
  return (
    <span className="tool-badge">
      {icons[name] ?? <Wrench size={10}/>}
      {labels[name] ?? name}
    </span>
  )
}

function MortgageCard({ text }) {
  let data = null
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) data = JSON.parse(match[0])
  } catch (_) {}
  if (!data || !data.monthly_payment) return null
  const fmt = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:0 })}`
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
      {[
        ['Monthly Payment', fmt(data.monthly_payment)],
        ['Loan Amount',     fmt(data.loan_amount)],
        ['Total Payment',   fmt(data.total_payment)],
        ['Total Interest',  fmt(data.total_interest)],
      ].map(([label, val]) => (
        <div key={label} className="bg-mira-50 rounded-lg px-3 py-2 border border-mira-100">
          <p className="text-mira-500 font-medium">{label}</p>
          <p className="text-mira-800 font-semibold text-sm mt-0.5">{val}</p>
        </div>
      ))}
      <div className="col-span-2 text-slate-400 text-xs mt-0.5">
        {data.term_years}yr @ {data.annual_rate_pct}% annual rate
      </div>
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  const hasMortgage = msg.tools_used?.includes('calculate_mortgage')
  return (
    <div className={`flex items-end gap-2.5 animate-fade-up ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-slate-300' : 'bg-mira-600'}`}>
        {isUser ? <User size={15} className="text-slate-600"/> : <Bot size={15} className="text-white"/>}
      </div>
      <div className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={isUser ? 'bubble-user' : 'bubble-ai'}>
          <p className="text-sm leading-relaxed">{renderText(msg.text)}</p>
          {hasMortgage && <MortgageCard text={msg.text} />}
        </div>
        {!isUser && msg.tools_used?.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {msg.tools_used.map(t => <ToolBadge key={t} name={t}/>)}
          </div>
        )}
        {!isUser && msg.sources?.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {msg.sources.map((s,i) => (
              <span key={i} className="source-badge">
                <FileText size={10}/> {s.source_file} p.{s.page}
              </span>
            ))}
          </div>
        )}
        <span className="text-xs text-slate-400 px-1">
          {msg.timestamp.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
        </span>
      </div>
    </div>
  )
}

function RecommendPanel({ sessionId }) {
  const [prefs, setPrefs]     = useState('')
  const [topK, setTopK]       = useState(5)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const run = async () => {
    if (!prefs.trim()) return
    setLoading(true); setError(null)
    try {
      const { data } = await axios.post('/api/recommend', { preferences: prefs, top_k: topK })
      setResults(data.recommendations)
    } catch (e) {
      setError(e.response?.data?.detail || 'Recommendation failed.')
    } finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto px-1">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Describe your ideal property
        </label>
        <textarea
          value={prefs}
          onChange={e => setPrefs(e.target.value)}
          rows={3}
          className="input-base resize-none text-sm"
          placeholder="e.g. 3-bedroom house near good schools, garden, under $600k in a quiet neighbourhood"
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="text-xs text-slate-500 flex-shrink-0">Top results</label>
        <input type="range" min={1} max={10} value={topK}
          onChange={e => setTopK(+e.target.value)} className="flex-1 accent-mira-600"/>
        <span className="text-xs font-semibold text-mira-600 w-4 text-right">{topK}</span>
      </div>
      <button onClick={run} disabled={!prefs.trim() || loading} className="btn-primary w-full">
        {loading ? <Loader2 size={15} className="animate-spin"/> : <Search size={15}/>}
        {loading ? 'Searching…' : 'Find Matches'}
      </button>
      {error && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5"/> {error}
        </div>
      )}
      {results.length > 0 && (
        <div className="flex flex-col gap-3 pb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {results.length} match{results.length !== 1 ? 'es' : ''} found
          </p>
          {results.map((r, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="source-badge"><FileText size={10}/>{r.source_file} p.{r.page}</span>
                <span className="text-xs font-semibold text-mira-600">
                  {Math.round(r.score * 100)}% match
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{r.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]             = useState('chat')       // 'chat' | 'recommend'
  const [messages, setMessages]   = useState([WELCOME])
  const [input, setInput]         = useState('')
  const [thinking, setThinking]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState(null)
  const [docs, setDocs]           = useState([])
  const [sessionId]               = useState(() => `session_${uid()}`)

  const endRef    = useRef(null)
  const taRef     = useRef(null)
  const fileRef   = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])
  useEffect(() => {
    const ta = taRef.current; if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 150)}px`
  }, [input])
  useEffect(() => {
    if (!uploadMsg) return
    const t = setTimeout(() => setUploadMsg(null), 4500)
    return () => clearTimeout(t)
  }, [uploadMsg])

  const send = useCallback(async () => {
    const q = input.trim(); if (!q || thinking) return
    setMessages(p => [...p, { id: uid(), role:'user', text:q, timestamp:new Date() }])
    setInput(''); setThinking(true)
    try {
      const { data } = await axios.post('/api/chat', { question:q, session_id:sessionId })
      setMessages(p => [...p, {
        id: uid(), role:'assistant', timestamp: new Date(),
        text: data.answer, tools_used: data.tools_used, sources: data.sources,
      }])
    } catch (e) {
      setMessages(p => [...p, {
        id:uid(), role:'assistant', timestamp:new Date(),
        text:`⚠️ ${e.response?.data?.detail || 'Something went wrong. Is the backend running?'}`,
        tools_used:[], sources:[],
      }])
    } finally { setThinking(false) }
  }, [input, thinking, sessionId])

  const onKey = e => { if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send() } }

  const onFile = async e => {
    const f = e.target.files?.[0]; if (!f) return
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setUploadMsg({ type:'error', text:'Only PDF files accepted.' }); return
    }
    setUploading(true); setUploadMsg(null)
    const fd = new FormData(); fd.append('file', f)
    try {
      const { data } = await axios.post('/api/upload', fd)
      setUploadMsg({ type:'success', text:`"${data.filename}" — ${data.chunks_stored} chunks stored.` })
      setDocs(p => [{ name:data.filename, chunks:data.chunks_stored }, ...p])
    } catch (e) {
      setUploadMsg({ type:'error', text: e.response?.data?.detail || 'Upload failed.' })
    } finally { setUploading(false); e.target.value = '' }
  }

  const clearChat = async () => {
    try { await axios.delete(`/api/memory/${sessionId}`) } catch(_){}
    setMessages([WELCOME])
  }

  return (
    <div className="flex h-screen bg-estate-warm overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="flex flex-col w-64 bg-white border-r border-slate-200 flex-shrink-0 shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-mira-600 flex items-center justify-center shadow-sm">
            <Home size={18} className="text-white"/>
          </div>
          <div>
            <p className="font-display text-base font-semibold text-estate-dark leading-tight">Agent Mira</p>
            <p className="text-xs text-estate-stone">AI Real-Estate Assistant</p>
          </div>
        </div>

        {/* Nav tabs */}
        <div className="flex gap-1 px-3 py-3 border-b border-slate-100">
          <button onClick={() => setTab('chat')}
            className={`tab-btn flex-1 flex items-center justify-center gap-1.5 ${tab==='chat'?'tab-active':'tab-inactive'}`}>
            <MessageSquare size={13}/> Chat
          </button>
          <button onClick={() => setTab('recommend')}
            className={`tab-btn flex-1 flex items-center justify-center gap-1.5 ${tab==='recommend'?'tab-active':'tab-inactive'}`}>
            <Sparkles size={13}/> Match
          </button>
        </div>

        {/* Upload */}
        <div className="px-3 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Documents</p>
          <input ref={fileRef} type="file" accept=".pdf" onChange={onFile} className="hidden"/>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed
                       border-slate-300 hover:border-mira-400 text-sm text-slate-500 hover:text-mira-600
                       transition-colors duration-150 disabled:opacity-50">
            {uploading ? <Loader2 size={15} className="animate-spin text-mira-500"/> : <Upload size={15}/>}
            {uploading ? 'Uploading…' : 'Upload PDF'}
          </button>
          {uploadMsg && (
            <div className={`mt-2 flex items-start gap-2 px-3 py-2 rounded-lg text-xs animate-fade-in ${
              uploadMsg.type==='success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-600 border border-red-200'}`}>
              {uploadMsg.type==='success'
                ? <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5"/>
                : <AlertCircle  size={13} className="flex-shrink-0 mt-0.5"/>}
              {uploadMsg.text}
            </div>
          )}
        </div>

        {/* Docs list */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {docs.length === 0
            ? <p className="text-xs text-slate-400 text-center mt-6 px-2 leading-relaxed">
                No documents yet. Upload a property PDF to get started.
              </p>
            : <ul className="space-y-1.5">
                {docs.map((d,i) => (
                  <li key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <FileText size={13} className="text-mira-500 flex-shrink-0 mt-0.5"/>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-700">{d.name}</p>
                      <p className="text-slate-400">{d.chunks} chunks indexed</p>
                    </div>
                  </li>
                ))}
              </ul>
          }
        </div>

        {/* Session info */}
        <div className="px-4 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400 truncate">Session: <span className="font-mono">{sessionId.slice(0,20)}…</span></p>
        </div>
      </aside>

      {/* ── MAIN PANEL ── */}
      <main className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div>
            <h1 className="font-display text-lg font-semibold text-estate-dark">
              {tab === 'chat' ? 'Chat with Mira' : 'Property Matcher'}
            </h1>
            <p className="text-xs text-estate-stone mt-0.5">
              {tab === 'chat'
                ? (docs.length === 0 ? 'No documents loaded' : `${docs.length} document${docs.length!==1?'s':''} loaded`)
                : 'Semantic property recommendations'}
            </p>
          </div>
          {tab === 'chat' && (
            <button onClick={clearChat} className="btn-ghost text-xs">
              <Trash2 size={13}/> Clear
            </button>
          )}
        </header>

        {/* Body */}
        {tab === 'recommend' ? (
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-2xl mx-auto">
              <RecommendPanel sessionId={sessionId}/>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="flex flex-col gap-5 max-w-3xl mx-auto">
                {messages.map(m => <Message key={m.id} msg={m}/>)}
                {thinking && <Dots/>}
                <div ref={endRef}/>
              </div>
            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-slate-200">
              <div className="flex items-end gap-3 max-w-3xl mx-auto">
                <textarea
                  ref={taRef} value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKey} rows={1}
                  disabled={thinking}
                  placeholder="Ask about a property, request a mortgage calc, or describe what you're looking for…"
                  className="input-base resize-none"
                  style={{ minHeight:'44px' }}
                />
                <button onClick={send} disabled={!input.trim()||thinking} className="btn-primary px-4 py-3 flex-shrink-0">
                  {thinking
                    ? <Loader2 size={17} className="animate-spin"/>
                    : <Send size={17}/>}
                </button>
              </div>
              <p className="text-center text-xs text-slate-400 mt-2">
                Powered by LangGraph agent · MongoDB Atlas Vector Search · Gemini
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
