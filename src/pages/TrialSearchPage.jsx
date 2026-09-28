import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Filter,
  Flame,
  Mail,
  RotateCcw,
  Search,
  Sliders,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react'
import { listTrials } from '../firebase/trials'
import { listPatients } from '../firebase/patients'
import { searchTrialsByQuery } from '../semantic/trialSearch'
import { evaluatePatientTrial } from '../matching/eligibilityEngine'
import StatusBadge from '../components/StatusBadge'
import OutreachModal from '../components/OutreachModal'
import WhatIfSimulatorModal from '../components/WhatIfSimulatorModal'

export default function TrialSearchPage() {
  const [query, setQuery] = useState('')
  const [trials, setTrials] = useState([])
  const [patients, setPatients] = useState([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Filters
  const [selectedCondition, setSelectedCondition] = useState('All')
  const [selectedGender, setSelectedGender] = useState('All')
  const [maxHba1cFilter, setMaxHba1cFilter] = useState('')
  const [ageFilter, setAgeFilter] = useState('')

  // Evaluated matches for currently selected patient
  const [patientEvaluations, setPatientEvaluations] = useState({})

  // Modals
  const [activeOutreach, setActiveOutreach] = useState(null)
  const [activeWhatIf, setActiveWhatIf] = useState(null)

  // Load trials and patients
  useEffect(() => {
    Promise.all([listTrials(), listPatients()])
      .then(([nextTrials, nextPatients]) => {
        setTrials(nextTrials)
        setPatients(nextPatients)
        if (nextPatients.length > 0) {
          setSelectedPatientId(nextPatients[0].patient_id)
        }
      })
      .catch((err) => setError(err.message))
  }, [])

  const selectedPatient = useMemo(() => {
    return patients.find((p) => p.patient_id === selectedPatientId) || patients[0]
  }, [patients, selectedPatientId])

  // Real-time evaluation against currently selected patient
  useEffect(() => {
    if (!selectedPatient || !trials.length) return
    let isCancelled = false

    async function evaluateCohort() {
      const results = {}
      for (const t of trials) {
        try {
          const res = await evaluatePatientTrial(selectedPatient, t)
          if (!isCancelled) {
            results[t.trial_id] = res
          }
        } catch {
          // ignore
        }
      }
      if (!isCancelled) {
        setPatientEvaluations(results)
      }
    }

    evaluateCohort()
    return () => {
      isCancelled = true
    }
  }, [selectedPatient, trials])

  // Get distinct conditions for filter
  const conditionOptions = useMemo(() => {
    const set = new Set(trials.map((t) => t.condition).filter(Boolean))
    return ['All', ...Array.from(set)]
  }, [trials])

  // Filtered and searched trials
  const filteredTrials = useMemo(() => {
    let result = trials

    // Condition filter
    if (selectedCondition !== 'All') {
      result = result.filter(
        (t) => t.condition.toLowerCase() === selectedCondition.toLowerCase()
      )
    }

    // Gender filter
    if (selectedGender !== 'All') {
      result = result.filter(
        (t) => t.gender === 'Any' || t.gender.toLowerCase() === selectedGender.toLowerCase()
      )
    }

    // Max HbA1c filter
    if (maxHba1cFilter) {
      result = result.filter((t) => Number(t.max_hba1c) >= Number(maxHba1cFilter))
    }

    // Age filter
    if (ageFilter) {
      const ageNum = Number(ageFilter)
      result = result.filter(
        (t) => Number(t.min_age) <= ageNum && Number(t.max_age) >= ageNum
      )
    }

    // Text search query
    if (query.trim()) {
      const term = query.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.trial_id.toLowerCase().includes(term) ||
          t.condition.toLowerCase().includes(term) ||
          (t.excluded_medicine && t.excluded_medicine.toLowerCase().includes(term))
      )
    }

    return result
  }, [trials, query, selectedCondition, selectedGender, maxHba1cFilter, ageFilter])

  function resetFilters() {
    setQuery('')
    setSelectedCondition('All')
    setSelectedGender('All')
    setMaxHba1cFilter('')
    setAgeFilter('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Intelligent Trial Search</h1>
          <p className="text-xs text-slate-500">
            Natural language retrieval, protocol filters, and instant patient eligibility verification.
          </p>
        </div>

        {/* Selected Patient Live Check Selector */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white p-2 shadow-xs">
          <Users className="h-4 w-4 text-teal-700" />
          <span className="text-xs font-semibold text-slate-600">Simulate for Patient:</span>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="bg-transparent text-xs font-bold text-teal-800 focus:outline-hidden"
          >
            {patients.map((p) => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.patient_id} — {p.name || p.condition} (HbA1c: {p.hba1c}%, BMI: {p.bmi})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Bar & Multi-Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        {/* Main Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trials by condition, medication, protocol ID, or keywords (e.g. 'Type 2 Diabetes', 'Metformin', 'Insulin')..."
            className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm text-slate-800 focus:border-teal-600 focus:outline-hidden"
          />
        </div>

        {/* Filter Rows */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Condition</label>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-700"
            >
              {conditionOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Gender</label>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-700"
            >
              <option value="All">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Target Patient Age</label>
            <input
              type="number"
              placeholder="e.g. 50"
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Min Protocol HbA1c</label>
            <input
              type="number"
              step="0.5"
              placeholder="e.g. 8.0"
              value={maxHba1cFilter}
              onChange={(e) => setMaxHba1cFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 p-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </button>
          </div>
        </div>

        {/* Query suggestion pills */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span className="font-semibold">Quick queries:</span>
          {['Type 2 Diabetes', 'Hypertension', 'COPD Inhaler', 'Obesity', 'Insulin Excluded'].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setQuery(tag)}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Patient Live Check Banner */}
      {selectedPatient && (
        <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-xs text-teal-950">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">
              P
            </span>
            <span>
              Evaluating against: <strong>{selectedPatient.name || selectedPatient.patient_id}</strong> · Age {selectedPatient.age} · HbA1c {selectedPatient.hba1c}% · BMI {selectedPatient.bmi} · Med: {selectedPatient.current_medicine}
            </span>
          </div>
          <Link
            to={`/decision-paths?trial=T001&patient=${selectedPatient.patient_id}`}
            className="font-semibold text-teal-800 hover:underline"
          >
            Open 3-Path Decision Board →
          </Link>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Found {filteredTrials.length} clinical trials</span>
      </div>

      {/* Trial Cards Grid */}
      <div className="grid gap-4">
        {filteredTrials.map((trial) => {
          const evalResult = patientEvaluations[trial.trial_id]
          const isEligible = evalResult?.eligible
          const isNear = evalResult?.near_eligible
          const priorityScore = evalResult?.priority_score

          return (
            <article
              key={trial.trial_id}
              className={`rounded-2xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
                isEligible
                  ? 'border-emerald-300 ring-1 ring-emerald-100'
                  : isNear
                  ? 'border-amber-300 ring-1 ring-amber-100'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                      {trial.trial_id}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">{trial.title}</h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Indication: <strong className="text-slate-700">{trial.condition}</strong> · Phase: {trial.phase || 'Phase II/III'} · Site: {trial.site_location || 'City Research Center'}
                  </p>
                </div>

                {/* Patient Live Eligibility Status Badge */}
                {evalResult && (
                  <div className="flex flex-wrap items-center gap-2">
                    {isEligible ? (
                      <div className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>ELIGIBLE (PATH 1)</span>
                        <span className="ml-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white">
                          Score: {priorityScore}/100
                        </span>
                      </div>
                    ) : isNear ? (
                      <div className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span>NEAR-MISS (PATH 2)</span>
                        <span className="ml-1 text-[10px] font-medium text-amber-700">
                          {evalResult.gap_details?.message || 'Close numeric miss'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-900">
                        <XCircle className="h-4 w-4 text-rose-600" />
                        <span>INELIGIBLE (PATH 3)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Protocol Criteria Grid */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-5 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Age Range</span>
                  <div className="font-semibold text-slate-800">{trial.min_age} - {trial.max_age} yr</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Gender</span>
                  <div className="font-semibold text-slate-800">{trial.gender || 'Any'}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Max HbA1c</span>
                  <div className="font-semibold text-slate-800">&lt;= {trial.max_hba1c}%</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">BMI Range</span>
                  <div className="font-semibold text-slate-800">{trial.min_bmi} - {trial.max_bmi}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Excluded Drug</span>
                  <div className="font-semibold text-slate-800">{trial.excluded_medicine || 'None'}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  {isEligible && (
                    <button
                      type="button"
                      onClick={() => setActiveOutreach({ patient: selectedPatient, trial })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                    >
                      <Mail className="h-3.5 w-3.5 text-teal-700" />
                      Draft Outreach (EN/HI/MR)
                    </button>
                  )}

                  {isNear && (
                    <button
                      type="button"
                      onClick={() => setActiveWhatIf({ patient: selectedPatient, trial, match: evalResult })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      <Sliders className="h-3.5 w-3.5 text-amber-600" />
                      What-If Rescue Simulator
                    </button>
                  )}

                  <Link
                    to={`/decision-paths?trial=${trial.trial_id}&patient=${selectedPatient?.patient_id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
                  >
                    View in 3-Path Decision Board →
                  </Link>
                </div>

                <Link
                  to={`/trials/${trial.trial_id}`}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Protocol Details
                </Link>
              </div>
            </article>
          )
        })}

        {!filteredTrials.length && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">No trials match your search criteria</p>
            <p className="mt-1 text-xs text-slate-500">Try broadening your search term or clicking Reset Filters.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Outreach Modal */}
      {activeOutreach && (
        <OutreachModal
          isOpen={Boolean(activeOutreach)}
          onClose={() => setActiveOutreach(null)}
          patient={activeOutreach.patient}
          trial={activeOutreach.trial}
        />
      )}

      {/* What-If Simulator Modal */}
      {activeWhatIf && (
        <WhatIfSimulatorModal
          isOpen={Boolean(activeWhatIf)}
          onClose={() => setActiveWhatIf(null)}
          patient={activeWhatIf.patient}
          trial={activeWhatIf.trial}
          match={activeWhatIf.match}
          onReEvaluated={() => {
            // refresh
          }}
        />
      )}
    </div>
  )
}
