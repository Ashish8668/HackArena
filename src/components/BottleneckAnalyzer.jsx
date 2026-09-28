import { useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, CheckCircle2, ChevronRight, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react'
import { upsertTrial } from '../firebase/trials'
import { logAuditEvent } from '../services/dataStore'

export default function BottleneckAnalyzer({
  trial,
  patients = [],
  matches = [],
  onCriteriaRefined,
}) {
  // Simulator adjustments state
  const [simMaxHba1c, setSimMaxHba1c] = useState(trial?.max_hba1c ?? 8.0)
  const [simMinAge, setSimMinAge] = useState(trial?.min_age ?? 30)
  const [simMaxAge, setSimMaxAge] = useState(trial?.max_age ?? 65)
  const [simMaxBmi, setSimMaxBmi] = useState(trial?.max_bmi ?? 35)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  // Calculate actual bottlenecks from existing matches
  const stats = useMemo(() => {
    const trialMatches = matches.filter((m) => m.trial_id === trial?.trial_id)
    const totalEvaluated = trialMatches.length
    const rejectedMatches = trialMatches.filter((m) => !m.eligible)
    const rejectedCount = rejectedMatches.length

    const counts = {
      hba1c: 0,
      age: 0,
      bmi: 0,
      medicine: 0,
      condition: 0,
      gender: 0,
    }

    rejectedMatches.forEach((m) => {
      const cr = m.criteria_results || {}
      if (cr.hba1c?.status === 'FAIL') counts.hba1c += 1
      if (cr.age?.status === 'FAIL') counts.age += 1
      if (cr.bmi?.status === 'FAIL') counts.bmi += 1
      if (cr.medicine?.status === 'FAIL') counts.medicine += 1
      if (cr.condition?.status === 'FAIL') counts.condition += 1
      if (cr.gender?.status === 'FAIL') counts.gender += 1
    })

    const items = [
      { key: 'hba1c', label: 'HbA1c Ceiling', count: counts.hba1c, current: `<= ${trial?.max_hba1c}%` },
      { key: 'age', label: 'Age Window', count: counts.age, current: `${trial?.min_age}-${trial?.max_age} yr` },
      { key: 'bmi', label: 'BMI Limits', count: counts.bmi, current: `${trial?.min_bmi}-${trial?.max_bmi}` },
      { key: 'medicine', label: 'Excluded Medicine', count: counts.medicine, current: trial?.excluded_medicine || 'None' },
      { key: 'condition', label: 'Indication Match', count: counts.condition, current: trial?.condition },
      { key: 'gender', label: 'Gender Target', count: counts.gender, current: trial?.gender || 'Any' },
    ]
      .map((item) => ({
        ...item,
        percent: rejectedCount > 0 ? Math.round((item.count / rejectedCount) * 100) : 0,
        cohortPercent: totalEvaluated > 0 ? Math.round((item.count / totalEvaluated) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    const topBottleneck = items[0]?.count > 0 ? items[0] : null

    return {
      totalEvaluated,
      rejectedCount,
      eligibleCount: totalEvaluated - rejectedCount,
      items,
      topBottleneck,
    }
  }, [trial, matches])

  // Simulate potential rescue impact with adjusted criteria
  const simulation = useMemo(() => {
    if (!trial || !patients.length) return { rescuedCount: 0, newEligibleRate: 0 }

    let count = 0
    patients.forEach((p) => {
      // Check if patient currently fails trial but would pass with simulated criteria
      const hba1cOriginalFail = Number(p.hba1c) > Number(trial.max_hba1c)
      const hba1cSimPass = Number(p.hba1c) <= Number(simMaxHba1c)

      const ageOriginalFail = Number(p.age) < Number(trial.min_age) || Number(p.age) > Number(trial.max_age)
      const ageSimPass = Number(p.age) >= Number(simMinAge) && Number(p.age) <= Number(simMaxAge)

      const bmiOriginalFail = Number(p.bmi) < Number(trial.min_bmi) || Number(p.bmi) > Number(trial.max_bmi)
      const bmiSimPass = Number(p.bmi) >= Number(trial.min_bmi) && Number(p.bmi) <= Number(simMaxBmi)

      // Did relaxing any of these specifically rescue this patient?
      const wasFailingRelaxedRule = hba1cOriginalFail || ageOriginalFail || bmiOriginalFail
      const nowPassesRelaxedRule = hba1cSimPass && ageSimPass && bmiSimPass

      if (wasFailingRelaxedRule && nowPassesRelaxedRule) {
        count += 1
      }
    })

    return {
      rescuedCount: count,
      gainPercent: stats.totalEvaluated > 0 ? Math.round((count / stats.totalEvaluated) * 100) : 0,
    }
  }, [trial, patients, simMaxHba1c, simMinAge, simMaxAge, simMaxBmi, stats.totalEvaluated])

  async function handleApplyAmendment() {
    if (!window.confirm('Confirm protocol criteria refinement? This will update the trial protocol parameters.')) {
      return
    }
    setBusy(true)
    try {
      const updated = {
        ...trial,
        max_hba1c: Number(simMaxHba1c),
        min_age: Number(simMinAge),
        max_age: Number(simMaxAge),
        max_bmi: Number(simMaxBmi),
      }
      await upsertTrial(updated)
      logAuditEvent('TRIAL_CRITERIA_REFINED', {
        trial_id: trial.trial_id,
        new_max_hba1c: simMaxHba1c,
        new_age_window: `${simMinAge}-${simMaxAge}`,
        new_max_bmi: simMaxBmi,
      })
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
      if (onCriteriaRefined) onCriteriaRefined(updated)
    } catch (err) {
      alert('Failed to update trial criteria: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Primary Bottleneck Callout */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cohort Bottleneck Analyzer</h2>
              <p className="text-xs text-slate-500">
                Rule-by-rule rejection statistics across evaluated participants for {trial?.trial_id}
              </p>
            </div>
          </div>
          {stats.topBottleneck && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span>
                Primary Bottleneck: {stats.topBottleneck.label} ({stats.topBottleneck.percent}% of rejections)
              </span>
            </div>
          )}
        </div>

        {/* Funnel Overview */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-[11px] font-medium text-slate-500">Evaluated Cohort</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{stats.totalEvaluated}</div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3">
            <div className="text-[11px] font-medium text-emerald-700">Eligible (Yes)</div>
            <div className="mt-1 text-xl font-bold text-emerald-800">{stats.eligibleCount}</div>
          </div>
          <div className="rounded-xl bg-rose-50 p-3">
            <div className="text-[11px] font-medium text-rose-700">Rejected (No)</div>
            <div className="mt-1 text-xl font-bold text-rose-800">{stats.rejectedCount}</div>
          </div>
          <div className="rounded-xl bg-amber-50 p-3">
            <div className="text-[11px] font-medium text-amber-700">Rejection Rate</div>
            <div className="mt-1 text-xl font-bold text-amber-800">
              {stats.totalEvaluated > 0 ? `${Math.round((stats.rejectedCount / stats.totalEvaluated) * 100)}%` : '0%'}
            </div>
          </div>
        </div>

        {/* Rule Rejection Breakdown Bars */}
        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Failure Distribution by Rule</h3>
          {stats.items.map((item) => (
            <div key={item.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">
                  {item.label}{' '}
                  <span className="font-normal text-slate-500">({item.current})</span>
                </span>
                <span className="font-mono text-[11px] text-slate-600">
                  <strong>{item.count} patients</strong> ({item.percent}% of rejections)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.percent >= 50
                      ? 'bg-rose-600'
                      : item.percent >= 25
                      ? 'bg-amber-500'
                      : 'bg-teal-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(item.percent, item.count > 0 ? 4 : 0))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Refine Trial Criteria Simulator (Trial Head Tool) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-teal-600" />
          <h3 className="text-base font-bold text-slate-900">Refine Trial Criteria (Trial Head Simulator)</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Model what happens if criteria boundaries are adjusted. Helps study leaders understand whether protocol limits are overly restrictive.
        </p>

        {/* Medical Safety Disclaimer Alert */}
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/90 p-4">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="text-xs text-amber-900">
              <span className="font-bold">Medical Safety & Governance Notice: </span>
              This simulator is strictly an advisory tool. Modifying trial criteria is the formal responsibility of the Trial Head and Principal Investigator. Changes require IRB / Ethics review and protocol amendments to guarantee participant safety.
            </div>
          </div>
        </div>

        {/* Interactive Sliders for Simulation */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-3">
            <label className="text-xs font-semibold text-slate-700">
              Max HbA1c Ceiling: <strong className="text-teal-700">{simMaxHba1c}%</strong>
            </label>
            <input
              type="range"
              min="7.0"
              max="11.0"
              step="0.1"
              value={simMaxHba1c}
              onChange={(e) => setSimMaxHba1c(e.target.value)}
              className="mt-2 w-full accent-teal-700"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Current: {trial?.max_hba1c}%</span>
              <span>11.0%</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <label className="text-xs font-semibold text-slate-700">
              Age Window: <strong className="text-teal-700">{simMinAge} - {simMaxAge} yr</strong>
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                value={simMinAge}
                onChange={(e) => setSimMinAge(e.target.value)}
                className="w-16 rounded-md border border-slate-300 p-1 text-xs"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="number"
                value={simMaxAge}
                onChange={(e) => setSimMaxAge(e.target.value)}
                className="w-16 rounded-md border border-slate-300 p-1 text-xs"
              />
            </div>
            <div className="mt-1 text-[10px] text-slate-400">Current: {trial?.min_age}-{trial?.max_age} yr</div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <label className="text-xs font-semibold text-slate-700">
              Max BMI Ceiling: <strong className="text-teal-700">{simMaxBmi}</strong>
            </label>
            <input
              type="range"
              min="30"
              max="45"
              step="1"
              value={simMaxBmi}
              onChange={(e) => setSimMaxBmi(e.target.value)}
              className="mt-2 w-full accent-teal-700"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Current: {trial?.max_bmi}</span>
              <span>45</span>
            </div>
          </div>
        </div>

        {/* Projected Impact Callout */}
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-teal-700" />
            <div>
              <div className="text-xs font-bold text-teal-950">
                Projected Recruitment Yield: +{simulation.rescuedCount} Qualified Patients
              </div>
              <p className="text-[11px] text-teal-800">
                Relaxing these constraints would rescue {simulation.rescuedCount} patients ({simulation.gainPercent}% increase in pool) into eligible status.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyAmendment}
            disabled={busy || simulation.rescuedCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 disabled:opacity-50"
          >
            {savedSuccess ? 'Amendment Applied!' : 'Update Trial Criteria (Admin)'}
          </button>
        </div>

        {savedSuccess && (
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Protocol parameters successfully saved! Matching cohort updated.
          </div>
        )}
      </div>
    </div>
  )
}
