import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Mail } from 'lucide-react'
import CriterionRow from '../components/CriterionRow'
import StatusBadge from '../components/StatusBadge'
import { getPatient } from '../firebase/patients'
import { listMatchesForPatient } from '../firebase/matches'
import { getRecruitment, upsertRecruitment } from '../firebase/recruitment'
import { overallLabel } from '../matching/eligibilityEngine'
import { RECRUITMENT_STATUSES } from '../matching/config'
import { getEmbeddingModelStatus, warmupEmbeddingModel } from '../semantic/embeddingService'
import { contactPatientMailto, runAndPersistMatching } from '../services/runMatching'

export default function PatientDetailsPage() {
  const { patientId } = useParams()
  const [patient, setPatient] = useState(null)
  const [matches, setMatches] = useState([])
  const [expanded, setExpanded] = useState({})
  const [recruitment, setRecruitment] = useState({})
  const [busy, setBusy] = useState(false)
  const [modelStatus, setModelStatus] = useState('idle')
  const [error, setError] = useState('')

  async function loadMatches(nextPatient) {
    const saved = await listMatchesForPatient(nextPatient.patient_id)
    setMatches(saved)
    const nextRecruitment = {}
    await Promise.all(
      saved.map(async (match) => {
        const existing = await getRecruitment(match.patient_id, match.trial_id)
        nextRecruitment[match.trial_id] = existing?.status || ''
      }),
    )
    setRecruitment(nextRecruitment)
  }

  useEffect(() => {
    getPatient(patientId)
      .then(async (nextPatient) => {
        setPatient(nextPatient)
        if (nextPatient) await loadMatches(nextPatient)
      })
      .catch((err) => setError(err.message))
    warmupEmbeddingModel().finally(() => setModelStatus(getEmbeddingModelStatus()))
  }, [patientId])

  async function findMatches() {
    setBusy(true)
    setError('')
    try {
      await warmupEmbeddingModel()
      setModelStatus(getEmbeddingModelStatus())
      const results = await runAndPersistMatching(patient)
      setMatches(results)
      const nextRecruitment = {}
      await Promise.all(
        results.map(async (match) => {
          const existing = await getRecruitment(match.patient_id, match.trial_id)
          nextRecruitment[match.trial_id] = existing?.status || ''
        }),
      )
      setRecruitment(nextRecruitment)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function updateStatus(trialId, status) {
    await upsertRecruitment({ patient_id: patient.patient_id, trial_id: trialId, status })
    setRecruitment((current) => ({ ...current, [trialId]: status }))
  }

  if (!patient) return <p className="text-slate-500">Loading patient...</p>

  const mailHref = contactPatientMailto(patient)

  return (
    <div className="space-y-6">
      <Link to="/patients" className="text-sm text-teal-700">
        Back to participants
      </Link>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{patient.name || patient.patient_id}</h1>
          <p className="mt-1 text-slate-500">
            {patient.patient_id} · {patient.condition}
            {patient.source === 'self' ? ' · self-registered' : ''}
          </p>
          <p className="mt-1 text-sm text-slate-500">{patient.email || 'No email on file'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mailHref ? (
            <a href={mailHref} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium">
              <Mail className="h-4 w-4" />
              Email patient
            </a>
          ) : null}
          <button
            type="button"
            onClick={findMatches}
            disabled={busy}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? 'Matching trials...' : 'Refresh matching'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ['Age', patient.age],
          ['Gender', patient.gender],
          ['HbA1c', patient.hba1c],
          ['BMI', patient.bmi],
          ['Medicine', patient.current_medicine],
          ['Condition', patient.condition],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 font-medium">{String(value)}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Semantic model status: {modelStatus}. A potential match is not medical eligibility. Final screening stays with the study team.
      </p>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="space-y-4">
        {matches.map((match) => {
          const label = overallLabel(match)
          const trialMail = contactPatientMailto(patient, { title: match.title, trial_id: match.trial_id })
          return (
            <article key={match.trial_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{match.title || match.trial_id}</h2>
                  <p className="text-sm text-slate-500">{match.trial_id}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={label} />
                  <span className="text-sm text-slate-500">
                    {Object.values(match.criteria_results || {}).filter((item) => item.status === 'PASS').length} pass /{' '}
                    {Object.values(match.criteria_results || {}).filter((item) => item.status === 'FAIL').length} fail
                  </span>
                </div>
              </div>
              {match.near_eligible ? (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Near match is not eligible. Review the failed numeric criterion before contacting the patient.
                </p>
              ) : null}
              <div className="mt-4">
                {Object.entries(match.criteria_results || {}).map(([name, result]) => (
                  <CriterionRow
                    key={name}
                    name={name}
                    result={result}
                    expanded={expanded[match.trial_id]}
                  />
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <button
                  type="button"
                  className="text-sm font-medium text-teal-700"
                  onClick={() => setExpanded((current) => ({ ...current, [match.trial_id]: !current[match.trial_id] }))}
                >
                  {expanded[match.trial_id] ? 'Hide explanation' : 'View explanation'}
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  {trialMail ? (
                    <a href={trialMail} className="text-sm text-teal-700">
                      Email about this study
                    </a>
                  ) : null}
                  <span className="text-sm text-slate-500">Recruitment</span>
                  <select
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    value={recruitment[match.trial_id] || ''}
                    onChange={(e) => updateStatus(match.trial_id, e.target.value)}
                  >
                    <option value="">Set status</option>
                    {RECRUITMENT_STATUSES.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
