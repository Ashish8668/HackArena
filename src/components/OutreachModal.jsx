import { useEffect, useState } from 'react'
import { Check, Copy, Globe, Mail, MessageSquare, Send, Sparkles, X } from 'lucide-react'
import { generateOutreachMessage } from '../services/geminiService'
import { upsertRecruitment } from '../firebase/recruitment'
import { logAuditEvent } from '../services/dataStore'

export default function OutreachModal({
  isOpen,
  onClose,
  patient,
  trial,
  onStatusUpdated,
}) {
  const [language, setLanguage] = useState('en') // 'en' | 'hi' | 'mr'
  const [format, setFormat] = useState('email') // 'email' | 'sms'
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sentSuccess, setSentSuccess] = useState(false)
  const [source, setSource] = useState('template')

  useEffect(() => {
    if (!isOpen || !patient || !trial) return
    draftMessage()
  }, [isOpen, patient, trial, language, format])

  async function draftMessage() {
    setLoading(true)
    setSentSuccess(false)
    try {
      const res = await generateOutreachMessage({
        trialTitle: trial.title || trial.trial_id,
        patientName: patient.name || patient.patient_id,
        siteLocation: trial.site_location || 'City Medical Research Center (Site A)',
        condition: trial.condition || patient.condition,
        language,
        format,
        coordinatorName: 'Clinical Research Coordinator',
      })
      setSubject(res.subject || '')
      setBody(res.body || '')
      setSource(res.source)
    } catch (err) {
      console.error('Failed to generate outreach message:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendOutreach() {
    if (!patient || !trial) return
    try {
      await upsertRecruitment({
        patient_id: patient.patient_id,
        trial_id: trial.trial_id,
        status: 'Contacted',
        approved_by_coordinator: true,
        outreach_sent: true,
        outreach_language: language,
        outreach_text: body,
        contactedAt: new Date().toISOString(),
      })
      logAuditEvent('OUTREACH_SENT', {
        patient_id: patient.patient_id,
        trial_id: trial.trial_id,
        language,
        format,
      })
      setSentSuccess(true)
      if (onStatusUpdated) onStatusUpdated('Contacted')
    } catch (err) {
      alert('Error updating recruitment record: ' + err.message)
    }
  }

  function handleCopy() {
    const textToCopy = format === 'email' ? `Subject: ${subject}\n\n${body}` : body
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openMailClient() {
    if (!patient?.email) return
    const mailto = `mailto:${patient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailto, '_blank')
    handleSendOutreach()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Coordinator Outreach Draft</h2>
            <p className="text-xs text-slate-500">
              Personalized invitation for {patient?.name || patient?.patient_id} · Trial {trial?.trial_id}
            </p>
          </div>
        </div>

        {/* Language & Format Controls */}
        <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <Globe className="h-3.5 w-3.5 text-teal-600" />
              Language (भाषा)
            </label>
            <div className="mt-1.5 flex rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex-1 rounded-md py-1 text-xs font-medium transition ${
                  language === 'en' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`flex-1 rounded-md py-1 text-xs font-medium transition ${
                  language === 'hi' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                हिंदी (Hindi)
              </button>
              <button
                type="button"
                onClick={() => setLanguage('mr')}
                className={`flex-1 rounded-md py-1 text-xs font-medium transition ${
                  language === 'mr' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                मराठी (Marathi)
              </button>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <MessageSquare className="h-3.5 w-3.5 text-teal-600" />
              Delivery Format
            </label>
            <div className="mt-1.5 flex rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setFormat('email')}
                className={`flex-1 rounded-md py-1 text-xs font-medium transition ${
                  format === 'email' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setFormat('sms')}
                className={`flex-1 rounded-md py-1 text-xs font-medium transition ${
                  format === 'sms' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                SMS (Short)
              </button>
            </div>
          </div>
        </div>

        {/* Message Editor Area */}
        <div className="mt-4 space-y-3">
          {format === 'email' && (
            <div>
              <label className="text-xs font-medium text-slate-700">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-hidden"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">
                Message Body ({format.toUpperCase()})
              </label>
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <Sparkles className="h-3 w-3 text-amber-500" />
                {source === 'gemini_llm' ? 'Synthesized via Gemini AI' : 'Clinical Template Engine'}
              </span>
            </div>
            <textarea
              rows={format === 'email' ? 7 : 4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={loading}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed text-slate-800 focus:border-teal-600 focus:outline-hidden"
            />
          </div>
        </div>

        {sentSuccess && (
          <div className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800">
            ✓ Outreach recorded! Recruitment stage updated to <strong>Contacted</strong>.
          </div>
        )}

        {/* Modal Actions */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
            <button
              type="button"
              onClick={draftMessage}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-600" />
              {loading ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {patient?.email && format === 'email' && (
              <button
                type="button"
                onClick={openMailClient}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-800 hover:bg-teal-100"
              >
                <Mail className="h-3.5 w-3.5" />
                Open Email Client
              </button>
            )}
            <button
              type="button"
              onClick={handleSendOutreach}
              disabled={sentSuccess}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {sentSuccess ? 'Outreach Recorded' : 'Mark as Contacted'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
