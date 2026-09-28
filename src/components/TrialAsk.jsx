import { useState } from 'react'
import { askTrialQuestion } from '../ask/askTrial'

export default function TrialAsk({ trial }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleAsk(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await askTrialQuestion(trial, question)
      setAnswer(result.answer)
    } catch (error) {
      setAnswer(error.message)
    } finally {
      setBusy(false)
    }
  }

  if (!trial) return null

  return (
    <form className="mt-4 border-t border-slate-100 pt-4" onSubmit={handleAsk}>
      <div className="flex flex-col gap-2 md:flex-row">
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask"
        />
        <button type="submit" disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-60">
          {busy ? '...' : 'Ask'}
        </button>
      </div>
      {answer ? <p className="mt-3 text-sm text-slate-700">{answer}</p> : null}
    </form>
  )
}
