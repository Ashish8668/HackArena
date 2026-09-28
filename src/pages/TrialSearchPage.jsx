import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listTrials } from '../firebase/trials'
import { listPatients } from '../firebase/patients'
import { searchTrialsByQuery } from '../semantic/trialSearch'
import { evaluatePatientTrial, overallLabel } from '../matching/eligibilityEngine'
import StatusBadge from '../components/StatusBadge'
import { warmupEmbeddingModel } from '../semantic/embeddingService'

export default function TrialSearchPage() {
  const [query, setQuery] = useState('')
  const [trials, setTrials] = useState([])
  const [patients, setPatients] = useState([])
  const [results, setResults] = useState([])
  const [patientId, setPatientId] = useState('')
  const [eligibility, setEligibility] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([listTrials(), listPatients(), warmupEmbeddingModel()]).then(([nextTrials, nextPatients]) => {
      setTrials(nextTrials)
      setPatients(nextPatients)
      if (nextPatients[0]) setPatientId(nextPatients[0].patient_id)
    })
  }, [])

  async function handleSearch(event) {
    event.preventDefault()
    setBusy(true)
    setEligibility(null)
    setError('')
    try {
      const ranked = await searchTrialsByQuery(query, trials)
      setResults(ranked)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function runEligibility(trial) {
    const patient = patients.find((item) => item.patient_id === patientId)
    if (!patient) return
    const match = await evaluatePatientTrial(patient, trial)
    setEligibility({ trial, match })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Search</h1>

      <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSearch}>
        <textarea
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          rows={3}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <label className="text-sm text-slate-600">
            Patient
            <select
              className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            >
              {patients.map((patient) => (
                <option key={patient.patient_id} value={patient.patient_id}>
                  {patient.patient_id} — {patient.condition}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={busy} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white">
            {busy ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-4">
        {results.map((trial) => (
          <article key={trial.trial_id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="font-semibold">{trial.title}</h2>
                <p className="text-sm text-slate-500">
                  {trial.trial_id} · {trial.condition}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onClick={() => runEligibility(trial)}
              >
                Match
              </button>
            </div>
          </article>
        ))}
      </div>

      {eligibility ? (
        <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">
              {patientId} / {eligibility.trial.trial_id}
            </h2>
            <StatusBadge value={overallLabel(eligibility.match)} />
          </div>
          <Link className="mt-3 inline-block text-sm text-teal-800" to={`/patients/${patientId}`}>
            Patient
          </Link>
        </section>
      ) : null}
    </div>
  )
}
