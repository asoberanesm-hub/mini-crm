import { useState, useRef, useEffect } from 'react'
import { fetchApi } from '../lib/api'

export default function Chatbot() {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState([
    { role: 'assistant', content: 'Hola. Soy el asistente de Aysa. ¿En qué puedo ayudarte a navegar?' },
  ])
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [mensajes])

  const enviar = async () => {
    const texto = input.trim()
    if (!texto || enviando) return
    setInput('')
    setMensajes((prev) => [...prev, { role: 'user', content: texto }])
    setEnviando(true)
    try {
      const res = await fetchApi('/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: texto,
          conversationId,
          history: mensajes.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      const reply = res.reply ?? 'No pude generar una respuesta.'
      if (res.conversationId) setConversationId(res.conversationId)
      setMensajes((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      const texto = e.message?.includes('OPENAI') || e.message?.includes('API') ? e.message : `No se pudo conectar con el asistente. ${e.message}`
      setMensajes((prev) => [...prev, { role: 'assistant', content: texto }])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        type="button"
        onClick={() => setAbierto((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
        aria-label="Abrir chat"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Panel del chat */}
      {abierto && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[380px] flex-col rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-800 px-4 py-3 text-white rounded-t-xl">
            <span className="font-semibold">Asistente Aysa</span>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded p-1 hover:bg-slate-600"
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Área de mensajes */}
          <div
            ref={listRef}
            className="flex min-h-[280px] max-h-[360px] flex-col gap-3 overflow-y-auto p-4 bg-slate-50"
          >
            {mensajes.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}
            {enviando && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white border border-slate-200 px-4 py-2.5 text-sm text-slate-500">
                  Escribiendo…
                </div>
              </div>
            )}
          </div>

          {/* Barra de mensaje y botón */}
          <div className="flex gap-2 border-t border-slate-200 p-3 bg-white rounded-b-xl">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && enviar()}
              placeholder="Escribe tu mensaje..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              disabled={enviando}
            />
            <button
              type="button"
              onClick={enviar}
              disabled={enviando || !input.trim()}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
