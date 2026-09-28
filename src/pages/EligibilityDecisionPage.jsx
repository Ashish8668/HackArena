import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  HelpCircle,
  Mail,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react'
import { listTrials } from '../firebase/trials'
import { listPatients } from '../firebase/patients'
import { listMatches } from '../firebase/matches'
import { listRecruitment, upsertRecruitment } from '../firebase/recruitment'
import { evaluatePatientTrial } from '../matching/eligibilityEngine'
import StatusBadge from '../components/StatusBadge'
import OutreachModal from '../components/OutreachModal'
import WhatIfSimulatorModal from '../components/WhatIfSimulatorModal'
import BottleneckAnalyzer from '../components/BottleneckAnalyzer'
import { RECRUITMENT_STATUSES } from '../matching/config'

export default function EligibilityDecisionPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTrialId = searchParams.get('trial') || 'T001'
  const initialPatientId = searchParams.get('patient') || ''

  const [trials, setTrials] = useState([])
  const [patients, setPatients] = useState([])
  const [selectedTrialId, setSelectedTrialId] = useState(initialTrialId)
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId)
  const [mode, setMode] = useState('by_trial') // 'by_trial' | 'by_patient'

  const [matches, setMatches] = useState([])
  const [recruitmentMap, setRecruitmentMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState(false)
  const [filterText, setFilterText] = useState('')

  // Modals state
  const [activeOutreach, setActiveOutreach] = useState(null)
  const [activeWhatIf, setActiveWhatIf] = useState(null)
  const [showBottlenecks, setShowBottlenecks] = useState(false)

  // Load baseline data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [nextTrials, nextPatients, nextMatches, nextRecruit] = await Promise.all([
          listTrials(),
          listPatients(),
          listMatches(),
          listRecruitment(),
        ])
        setTrials(nextTrials)
        setPatients(nextPatients)
        setMatches(nextMatches)

        const rMap = {}
        nextRecruit.forEach((r) => {
          rMap[`${r.patient_id}_${r.trial_id}`] = r
        })
        setRecruitmentMap(rMap)

        if (!selectedTrialId && nextTrials.length > 0) {
          setSelectedTrialId(nextTrials[0].trial_id)
        }
      } catch (err) {
        console.error('Failed to load eligibility data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const currentTrial = useMemo(() => {
    return trials.find((t) => t.trial_id === selectedTrialId) || trials[0]
  }, [trials, selectedTrialId])

  const currentPatient = useMemo(() => {
    return patients.find((p) => p.patient_id === selectedPatientId)
  }, [patients, selectedPatientId])

  // Compute evaluations for current trial against all patients
  const evaluatedCohort = useMemo(() => {
    if (!currentTrial || !patients.length) return []

    return patients.map((p) => {
      // Find existing match or compute on-the-fly
      const existing = matches.find((m) => m.patient_id === p.patient_id && m.trial_id === currentTrial.trial_id)
      const recruit = recruitmentMap[`${p.patient_id}_${currentTrial.trial_id}`]

      return {
        patient: p,
        trial: currentTrial,
        match: existing,
        recruit,
      }
    })
  }, [currentTrial, patients, matches, recruitmentMap])

  // Run full evaluation if matches missing
  async function evaluateAllForTrial() {
    if (!currentTrial) return
    setEvaluating(true)
    try {
      const results = []
      for (const p of patients) {
        const result = await evaluatePatientTrial(p, currentTrial)
        results.push(result)
      }
      setMatches((prev) => {
        const other = prev.filter((m) => m.trial_id !== currentTrial.trial_id)
        return [...other, ...results]
      })
    } catch (err) {
      console.error('Batch evaluation error:', err)
    } finally {
      setEvaluating(false)
    }
  }

  // Split into the 3 Paths specified in user prompt:
  // Path 3: No (Ineligible - left side)
  // Path 2: Almost (Near-Miss - middle)
  // Path 1: Yes (Eligible - right side)
  const { path1Eligible, path2NearMiss, path3Ineligible } = useMemo(() => {
    const p1 = []
    const p2 = []
    const p3 = []

    evaluatedCohort.forEach((item) => {
      if (filterText) {
        const term = filterText.toLowerCase()
        const text = `${item.patient.name} ${item.patient.patient_id} ${item.patient.condition} ${item.patient.current_medicine}`.toLowerCase()
        if (!text.includes(term)) return
      }

      const isEligible = item.match ? item.match.eligible : false
      const isNear = item.match ? item.match.near_eligible : false

      if (isEligible) {
        p1.push(item)
      } else if (isNear || item.patient.watch_list) {
        p2.push(item)
      } else {
        p3.push(item)
      }
    })

    // Path 1: Ranked shortlist by priority score descending
    p1.sort((a, b) => (b.match?.priority_score || 0) - (a.match?.priority_score || 0))

    return { path1Eligible: p1, path2NearMiss: p2, path3Ineligible: p3 }
  }, [evaluatedCohort, filterText])

  async function updatePatientStage(patientId, trialId, newStatus) {
    const key = `${patientId}_${trialId}`
    const existing = recruitmentMap[key] || {}
    const updated = {
      ...existing,
      patient_id: patientId,
      trial_id: trialId,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    }
    await upsertRecruitment(updated)
    setRecruitmentMap((prev) => ({ ...prev, [key]: updated }))
  }

  async function handleCoordinatorApproval(item) {
    await updatePatientStage(item.patient.patient_id, item.trial.trial_id, 'Identified')
    // Open outreach draft automatically
    setActiveOutreach(item)
  }

  async function handleGrantConsent(item) {
    const key = `${item.patient.patient_id}_${item.trial.trial_id}`
    const updated = {
      ...(recruitmentMap[key] || {}),
      patient_id: item.patient.patient_id,
      trial_id: item.trial.trial_id,
      status: 'Screened',
      consent_status: 'Granted',
      consent_date: new Date().toISOString(),
    }
    await upsertRecruitment(updated)
    setRecruitmentMap((prev) => ({ ...prev, [key]: updated }))
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Trial Selector */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-teal-700">
            <Award className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Protocol Decision Matrix</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">3-Path Eligibility Engine</h1>
          <p className="text-xs text-slate-500">
            Patients branch into: <strong>Path 3 (No - Ineligible)</strong>, <strong>Path 2 (Almost - Near-Miss Rescue)</strong>, and <strong>Path 1 (Yes - Ranked Shortlist & Outreach)</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 shadow-xs">
            <span className="text-xs font-semibold text-slate-600">Active Protocol:</span>
            <select
              value={selectedTrialId}
              onChange={(e) => setSelectedTrialId(e.target.value)}
              className="bg-transparent text-xs font-bold text-teal-800 focus:outline-hidden"
            >
              {trials.map((t) => (
                <option key={t.trial_id} value={t.trial_id}>
                  {t.trial_id} — {t.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={evaluateAllForTrial}
            disabled={evaluating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${evaluating ? 'animate-spin' : ''}`} />
            {evaluating ? 'Evaluating Cohort...' : 'Re-Evaluate Protocol Cohort'}
          </button>

          <button
            type="button"
            onClick={() => setShowBottlenecks(!showBottlenecks)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
              showBottlenecks
                ? 'border-rose-300 bg-rose-50 text-rose-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-rose-600" />
            {showBottlenecks ? 'Hide Bottleneck Analyzer' : 'View Bottleneck Analyzer'}
          </button>
        </div>
      </div>

      {/* Protocol Summary Card */}
      {currentTrial && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Condition</div>
              <div className="font-semibold text-slate-800">{currentTrial.condition}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Age Window</div>
              <div className="font-semibold text-slate-800">{currentTrial.min_age} - {currentTrial.max_age} yr</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">HbA1c Ceiling</div>
              <div className="font-semibold text-slate-800">&lt;= {currentTrial.max_hba1c}%</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">BMI Window</div>
              <div className="font-semibold text-slate-800">{currentTrial.min_bmi} - {currentTrial.max_bmi}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Excluded Drug</div>
              <div className="font-semibold text-slate-800">{currentTrial.excluded_medicine || 'None'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Exclusion Scope</div>
              <div className="font-semibold text-teal-700">{currentTrial.medicine_scope || 'exact_drug'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Cohort KPIs Banner */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Evaluated Pool</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{evaluatedCohort.length}</div>
          <div className="mt-1 text-[11px] text-slate-500">Registered cohort records</div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">Path 3: Ineligible</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-900">{path3Ineligible.length}</div>
          <div className="mt-1 text-[11px] text-rose-700">Rule mismatches & bottlenecks</div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Path 2: Near-Miss</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">{path2NearMiss.length}</div>
          <div className="mt-1 text-[11px] text-amber-700">Single small gap (rescuable)</div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Path 1: Eligible</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">{path1Eligible.length}</div>
          <div className="mt-1 text-[11px] text-emerald-700">Ranked by Priority Score (0-100)</div>
        </div>
      </div>

      {/* Bottleneck Analyzer Expandable Section */}
      {showBottlenecks && (
        <BottleneckAnalyzer
          trial={currentTrial}
          patients={patients}
          matches={matches}
          onCriteriaRefined={(updatedTrial) => {
            setTrials((prev) => prev.map((t) => (t.trial_id === updatedTrial.trial_id ? updatedTrial : t)))
            evaluateAllForTrial()
          }}
        />
      )}

      {/* Search / Filter Input */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter cohort by patient name, ID, condition, or medication..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
        />
        {filterText && (
          <button type="button" onClick={() => setFilterText('')} className="text-xs text-slate-400 hover:text-slate-600">
            Clear
          </button>
        )}
      </div>

      {/* 3-Column Decision Board */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ================= PATH 3: NO (LEFT SIDE) ================= */}
        <div className="flex flex-col rounded-2xl border border-rose-200 bg-rose-50/30 p-4">
          <div className="flex items-center justify-between border-b border-rose-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white">
                3
              </span>
              <div>
                <h2 className="text-sm font-bold text-rose-950">Path 3: No (Ineligible)</h2>
                <p className="text-[11px] text-rose-700">Multiple failures or major mismatch</p>
              </div>
            </div>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
              {path3Ineligible.length}
            </span>
          </div>

          <div className="mt-3 flex-1 space-y-3 overflow-y-auto max-h-[750px] pr-1">
            {path3Ineligible.map(({ patient, match }) => {
              const bottlenecks = match?.bottlenecks || []
              return (
                <div key={patient.patient_id} className="rounded-xl border border-rose-200 bg-white p-3.5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        to={`/patients/${patient.patient_id}`}
                        className="font-bold text-slate-900 hover:text-teal-700"
                      >
                        {patient.name || patient.patient_id}
                      </Link>
                      <div className="text-[11px] text-slate-500">
                        {patient.patient_id} · {patient.age} yr · {patient.gender} · {patient.condition}
                      </div>
                    </div>
                    <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                      REJECTED
                    </span>
                  </div>

                  <div className="mt-2.5 rounded-lg bg-rose-50/70 p-2 text-xs">
                    <span className="font-semibold text-rose-900">Failed Rules ({bottlenecks.length || match?.failCount || 1}):</span>
                    <ul className="mt-1 space-y-1 text-[11px] text-rose-800">
                      {bottlenecks.length > 0 ? (
                        bottlenecks.map((b) => (
                          <li key={b.key} className="flex items-start gap-1">
                            <span className="font-bold text-rose-950">✕ {b.label}:</span>
                            <span>{b.reason}</span>
                          </li>
                        ))
                      ) : (
                        <li>Criteria limits not met (HbA1c: {patient.hba1c}%, BMI: {patient.bmi})</li>
                      )}
                    </ul>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Current Med: {patient.current_medicine}</span>
                    <Link
                      to={`/patients/${patient.patient_id}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      Patient Record →
                    </Link>
                  </div>
                </div>
              )
            })}

            {!path3Ineligible.length && (
              <div className="py-12 text-center text-xs text-slate-400">
                No patients in Path 3 for this filter.
              </div>
            )}
          </div>
        </div>

        {/* ================= PATH 2: ALMOST (MIDDLE) ================= */}
        <div className="flex flex-col rounded-2xl border border-amber-200 bg-amber-50/30 p-4">
          <div className="flex items-center justify-between border-b border-amber-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                2
              </span>
              <div>
                <h2 className="text-sm font-bold text-amber-950">Path 2: Almost (Near-Miss)</h2>
                <p className="text-[11px] text-amber-700">1 small gap · What-If Simulator & Watch-List</p>
              </div>
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              {path2NearMiss.length}
            </span>
          </div>

          <div className="mt-3 flex-1 space-y-3 overflow-y-auto max-h-[750px] pr-1">
            {path2NearMiss.map((item) => {
              const { patient, match } = item
              const gap = match?.gap_details
              return (
                <div key={patient.patient_id} className="rounded-xl border border-amber-200 bg-white p-3.5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        to={`/patients/${patient.patient_id}`}
                        className="font-bold text-slate-900 hover:text-teal-700"
                      >
                        {patient.name || patient.patient_id}
                      </Link>
                      <div className="text-[11px] text-slate-500">
                        {patient.patient_id} · {patient.age} yr · {patient.condition}
                      </div>
                    </div>
                    {patient.watch_list ? (
                      <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-200">
                        ON WATCH-LIST
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                        NEAR-MISS
                      </span>
                    )}
                  </div>

                  {/* Near-Miss Gap Box */}
                  <div className="mt-2.5 rounded-lg bg-amber-50/80 p-2 text-xs">
                    <div className="font-semibold text-amber-950">Gap Identified:</div>
                    <div className="mt-0.5 text-[11px] text-amber-800">
                      {gap?.message || `Patient HbA1c is ${patient.hba1c}% vs Protocol ceiling of <= ${currentTrial?.max_hba1c}%.`}
                    </div>
                    {patient.retest_date && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-teal-800">
                        <Calendar className="h-3 w-3" />
                        Re-test Target: {patient.retest_date}
                      </div>
                    )}
                  </div>

                  {/* Actions: What-If Simulator & Re-test */}
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveWhatIf(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      <Sliders className="h-3 w-3 text-amber-700" />
                      What-If Simulator
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveWhatIf(item)}
                      className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                    >
                      Log Re-Test
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )
            })}

            {!path2NearMiss.length && (
              <div className="py-12 text-center text-xs text-slate-400">
                No near-miss candidates currently.
              </div>
            )}
          </div>
        </div>

        {/* ================= PATH 1: YES (RIGHT SIDE) ================= */}
        <div className="flex flex-col rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                1
              </span>
              <div>
                <h2 className="text-sm font-bold text-emerald-950">Path 1: Yes (Eligible)</h2>
                <p className="text-[11px] text-emerald-700">Ranked Shortlist · Human Review · Outreach · Consent</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
              {path1Eligible.length}
            </span>
          </div>

          <div className="mt-3 flex-1 space-y-3 overflow-y-auto max-h-[750px] pr-1">
            {path1Eligible.map((item, idx) => {
              const { patient, match, recruit } = item
              const score = match?.priority_score ?? 85
              const stage = recruit?.status || 'Identified'
              const consent = recruit?.consent_status || 'Pending'

              return (
                <div key={patient.patient_id} className="rounded-xl border border-emerald-200 bg-white p-3.5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                          #{idx + 1}
                        </span>
                        <Link
                          to={`/patients/${patient.patient_id}`}
                          className="font-bold text-slate-900 hover:text-teal-700"
                        >
                          {patient.name || patient.patient_id}
                        </Link>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {patient.patient_id} · {patient.age} yr · HbA1c: {patient.hba1c}% · BMI: {patient.bmi}
                      </div>
                    </div>

                    {/* Priority Score Badge */}
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-extrabold text-emerald-900 border border-emerald-300">
                        <Flame className="h-3 w-3 text-amber-500" />
                        Score: {score}/100
                      </div>
                      <div className="text-[9px] font-semibold text-slate-400 mt-0.5">
                        {score >= 85 ? 'Ideal Comfort Fit' : 'Inside Boundaries'}
                      </div>
                    </div>
                  </div>

                  {/* Recruitment Pipeline Progress Bar */}
                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700">Stage: <strong>{stage}</strong></span>
                      <span className={`font-semibold ${consent === 'Granted' ? 'text-emerald-700' : 'text-slate-500'}`}>
                        Consent: {consent}
                      </span>
                    </div>

                    {/* Visual Progress Steps: Identified -> Contacted -> Screened -> Enrolled */}
                    <div className="mt-2 flex items-center gap-1">
                      {RECRUITMENT_STATUSES.map((st, i) => {
                        const currentIdx = RECRUITMENT_STATUSES.indexOf(stage)
                        const active = i <= currentIdx
                        return (
                          <div
                            key={st}
                            className={`h-1.5 flex-1 rounded-full transition-all ${
                              active ? 'bg-emerald-600' : 'bg-slate-200'
                            }`}
                          />
                        )
                      })}
                    </div>
                  </div>

                  {/* Human Coordinator Decision & Actions */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                    <div className="flex items-center gap-1.5">
                      {/* Coordinator Review & Outreach */}
                      <button
                        type="button"
                        onClick={() => handleCoordinatorApproval(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-teal-700 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                      >
                        <Mail className="h-3 w-3 text-teal-700" />
                        Draft Outreach (EN/HI/MR)
                      </button>

                      {/* Consent Agreement */}
                      {consent !== 'Granted' ? (
                        <button
                          type="button"
                          onClick={() => handleGrantConsent(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <UserCheck className="h-3 w-3 text-emerald-600" />
                          Log Consent
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updatePatientStage(patient.patient_id, currentTrial.trial_id, 'Enrolled')}
                          disabled={stage === 'Enrolled'}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {stage === 'Enrolled' ? 'Enrolled ✓' : 'Mark Enrolled'}
                        </button>
                      )}
                    </div>

                    <Link
                      to={`/patients/${patient.patient_id}`}
                      className="text-[11px] font-medium text-teal-700 hover:underline"
                    >
                      Audit Details →
                    </Link>
                  </div>
                </div>
              )
            })}

            {!path1Eligible.length && (
              <div className="py-12 text-center text-xs text-slate-400">
                No eligible patients identified yet for this protocol.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Outreach Modal (Multilingual SMS/Email) */}
      {activeOutreach && (
        <OutreachModal
          isOpen={Boolean(activeOutreach)}
          onClose={() => setActiveOutreach(null)}
          patient={activeOutreach.patient}
          trial={activeOutreach.trial}
          onStatusUpdated={(status) => {
            updatePatientStage(activeOutreach.patient.patient_id, activeOutreach.trial.trial_id, status)
          }}
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
            evaluateAllForTrial()
          }}
        />
      )}
    </div>
  )
}
