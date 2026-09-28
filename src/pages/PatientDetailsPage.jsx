import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Mail,
  RefreshCw,
  Sliders,
  Sparkles,
  UserCheck,
  XCircle,
} from 'lucide-react'
import CriterionRow from '../components/CriterionRow'
import StatusBadge from '../components/StatusBadge'
import OutreachModal from '../components/OutreachModal'
import WhatIfSimulatorModal from '../components/WhatIfSimulatorModal'
import { getPatient } from '../firebase/patients'
import { listMatchesForPatient } from '../firebase/matches'
import { getRecruitment, upsertRecruitment } from '../firebase/recruitment'
import { overallLabel } from '../matching/eligibilityEngine'
import { RECRUITMENT_STATUSES } from '../matching/config'
import { contactPatientMailto, runAndPersistMatching } from '../services/runMatching'

export default function PatientDetailsPage() {
  const { patientId } = useParams()
  const [patient, setPatient] = useState(null)
  const [matches, setMatches] = useState([])
  const [expanded, setExpanded] = useState({})
  const [recruitment, setRecruitment] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Modals
  const [activeOutreach, setActiveOutreach] = useState(null)
  const [activeWhatIf, setActiveWhatIf] = useState(null)

  async function loadMatches(nextPatient) {
    const saved = await listMatchesForPatient(nextPatient.patient_id)
    setMatches(saved)
    const nextRecruitment = {}
    await Promise.all(
      saved.map(async (match) => {
        const existing = await getRecruitment(match.patient_id, match.trial_id)
        nextRecruitment[match.trial_id] = existing?.status || 'Identified'
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
  }, [patientId])

  async function findMatches() {
    setBusy(true)
    setError('')
    try {
      const results = await runAndPersistMatching(patient)
      setMatches(results)
      const nextRecruitment = {}
      await Promise.all(
        results.map(async (match) => {
          const existing = await getRecruitment(match.patient_id, match.trial_id)
          nextRecruitment[match.trial_id] = existing?.status || 'Identified'
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

  if (!patient) return <div className="p-8 text-center text-slate-500">Loading patient details...</div>

  // Partition matches into 3 Paths
  const path1Eligible = matches.filter((m) => m.eligible)
  const path2NearMiss = matches.filter((m) => !m.eligible && m.near_eligible)
  const path3Ineligible = matches.filter((m) => !m.eligible && !m.near_eligible)

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb & Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link to="/patients" className="text-xs font-semibold text-teal-700 hover:underline">
            ← Back to participants
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{patient.name || patient.patient_id}</h1>
            {patient.watch_list && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-900">
                <Clock className="h-3 w-3" />
                Near-Miss Watch-List (Re-test: {patient.retest_date || 'Pending'})
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            ID: <strong>{patient.patient_id}</strong> · Condition: <strong>{patient.condition}</strong> · Source: {patient.source || 'coordinator'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/decision-paths?patient=${patient.patient_id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700 bg-white px-3.5 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50"
          >
            <Award className="h-3.5 w-3.5 text-teal-700" />
            3-Path Decision Board
          </Link>

          <button
            type="button"
            onClick={findMatches}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
            {busy ? 'Matching trials...' : 'Re-Run Matching'}
          </button>
        </div>
      </div>

      {/* Patient Clinical Profile Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Age</span>
          <p className="mt-1 text-lg font-bold text-slate-900">{patient.age} yr</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gender</span>
          <p className="mt-1 text-lg font-bold text-slate-900">{patient.gender}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">HbA1c</span>
          <p className="mt-1 text-lg font-bold text-slate-900">{patient.hba1c}%</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">BMI</span>
          <p className="mt-1 text-lg font-bold text-slate-900">{patient.bmi}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Medicine</span>
          <p className="mt-1 text-sm font-bold text-teal-800">{patient.current_medicine || 'None'}</p>
        </div>
      </div>

      {/* 3-Path Eligibility Breakdown Tabs / Cards */}
      <div className="space-y-6">
        {/* ================= PATH 1: YES (ELIGIBLE) ================= */}
        <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                1
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Path 1: Eligible Trials (Yes)</h2>
                <p className="text-xs text-slate-500">
                  Fully meets all 6 criteria · Ranked by Priority Score (0-100)
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
              {path1Eligible.length} Matches
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {path1Eligible.map((match) => {
              const score = match.priority_score ?? 85
              const stage = recruitment[match.trial_id] || 'Identified'
              const isExpanded = expanded[match.trial_id]

              return (
                <article key={match.trial_id} className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-100/60 px-2 py-0.5 rounded-md">
                          {match.trial_id}
                        </span>
                        <h3 className="font-bold text-slate-900">{match.title || match.trial_id}</h3>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{match.condition}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900 border border-emerald-300">
                        <Flame className="h-3.5 w-3.5 text-amber-500" />
                        Priority Score: {score}/100
                      </div>
                      <StatusBadge value="POTENTIAL MATCH" />
                    </div>
                  </div>

                  {/* Criteria Inspection Grid */}
                  <div className="mt-3">
                    {Object.entries(match.criteria_results || {}).map(([name, result]) => (
                      <CriterionRow key={name} name={name} result={result} expanded={isExpanded} />
                    ))}
                  </div>

                  {/* Actions & Stage Progression */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setExpanded((prev) => ({ ...prev, [match.trial_id]: !prev[match.trial_id] }))}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {isExpanded ? 'Hide Detailed Reasoning' : 'View Detailed Reasoning'}
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveOutreach({ patient, trial: match })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Draft Outreach (EN/HI/MR)
                      </button>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">Stage:</span>
                        <select
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800"
                          value={stage}
                          onChange={(e) => updateStatus(match.trial_id, e.target.value)}
                        >
                          {RECRUITMENT_STATUSES.map((st) => (
                            <option key={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}

            {!path1Eligible.length && (
              <p className="text-xs text-slate-400 py-3 text-center">No fully eligible trials for this patient yet.</p>
            )}
          </div>
        </section>

        {/* ================= PATH 2: ALMOST (NEAR-MISS) ================= */}
        <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                2
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Path 2: Near-Miss Rescue (Almost)</h2>
                <p className="text-xs text-slate-500">
                  Rejected by 1 small margin (e.g. HbA1c &le; 0.5%, BMI &le; 2) · What-If Simulator & Watch-List
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-800">
              {path2NearMiss.length} Near-Misses
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {path2NearMiss.map((match) => {
              const gap = match.gap_details
              const isExpanded = expanded[match.trial_id]

              return (
                <article key={match.trial_id} className="rounded-xl border border-amber-200 bg-amber-50/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded-md">
                          {match.trial_id}
                        </span>
                        <h3 className="font-bold text-slate-900">{match.title || match.trial_id}</h3>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{match.condition}</p>
                    </div>

                    <StatusBadge value="NEAR MATCH" />
                  </div>

                  {/* Near-Miss Alert Callout */}
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-start gap-2 text-xs text-amber-900">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div>
                        <span className="font-bold">Rescuable Gap: </span>
                        {gap?.message || `Patient has a minor numeric deviation from protocol limit.`}
                        <div className="mt-1 font-semibold text-amber-800">{gap?.suggestion}</div>
                      </div>
                    </div>
                  </div>

                  {/* Criteria Inspection */}
                  <div className="mt-3">
                    {Object.entries(match.criteria_results || {}).map(([name, result]) => (
                      <CriterionRow key={name} name={name} result={result} expanded={isExpanded} />
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-amber-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setExpanded((prev) => ({ ...prev, [match.trial_id]: !prev[match.trial_id] }))}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {isExpanded ? 'Hide Criteria' : 'Inspect Criteria'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveWhatIf({ patient, trial: match, match })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 shadow-xs"
                    >
                      <Sliders className="h-3.5 w-3.5 text-amber-700" />
                      Open What-If Simulator & Log Re-Test
                    </button>
                  </div>
                </article>
              )
            })}

            {!path2NearMiss.length && (
              <p className="text-xs text-slate-400 py-3 text-center">No near-miss trials for this patient.</p>
            )}
          </div>
        </section>

        {/* ================= PATH 3: NO (INELIGIBLE) ================= */}
        <section className="rounded-2xl border border-rose-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white">
                3
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Path 3: Ineligible Trials (No)</h2>
                <p className="text-xs text-slate-500">Multiple failed criteria or major indication/gender mismatch</p>
              </div>
            </div>
            <span className="rounded-full bg-rose-100 px-3 py-0.5 text-xs font-bold text-rose-800">
              {path3Ineligible.length} Ineligible
            </span>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {path3Ineligible.map((match) => (
              <div key={match.trial_id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-slate-900">{match.title || match.trial_id}</div>
                  <div className="text-[11px] text-slate-500">
                    {match.trial_id} · {match.condition} · {match.failCount} failed criteria
                  </div>
                </div>
                <StatusBadge value="NOT A MATCH" />
              </div>
            ))}

            {!path3Ineligible.length && (
              <p className="text-xs text-slate-400 py-3 text-center">No ineligible trials recorded.</p>
            )}
          </div>
        </section>
      </div>

      {/* Outreach Modal */}
      {activeOutreach && (
        <OutreachModal
          isOpen={Boolean(activeOutreach)}
          onClose={() => setActiveOutreach(null)}
          patient={activeOutreach.patient}
          trial={activeOutreach.trial}
          onStatusUpdated={(status) => {
            setRecruitment((prev) => ({ ...prev, [activeOutreach.trial.trial_id]: status }))
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
            getPatient(patientId).then((np) => {
              setPatient(np)
              if (np) loadMatches(np)
            })
          }}
        />
      )}
    </div>
  )
}
