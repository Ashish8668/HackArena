import { useState, useMemo } from 'react'
import { AlertCircle, Calendar, CheckCircle2, RotateCcw, Sliders, X } from 'lucide-react'
import { evaluatePatientTrial } from '../matching/eligibilityEngine'
import { upsertPatient } from '../firebase/patients'
import { runAndPersistMatching } from '../services/runMatching'
import { logAuditEvent } from '../services/dataStore'

export default function WhatIfSimulatorModal({
  isOpen,
  onClose,
  patient,
  trial,
  match,
  onReEvaluated,
}) {
  const [simHba1c, setSimHba1c] = useState(patient?.hba1c ?? 8.0)
  const [simBmi, setSimBmi] = useState(patient?.bmi ?? 28)
  const [simAge, setSimAge] = useState(patient?.age ?? 45)
  const [simMedicine, setSimMedicine] = useState(patient?.current_medicine ?? 'None')
  const [retestDate, setRetestDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })
  const [watchNotes, setWatchNotes] = useState(
    `Re-test scheduled for HbA1c / metabolic panel. If <= ${trial?.max_hba1c || 8.0}%, enroll immediately.`
  )
  const [savedSuccess, setSavedSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  // Live simulation calculation
  const simResult = useMemo(() => {
    if (!patient || !trial) return null
    const simulatedPatient = {
      ...patient,
      hba1c: Number(simHba1c),
      bmi: Number(simBmi),
      age: Number(simAge),
      current_medicine: simMedicine,
    }
    // Synchronous evaluation preview
    const hba1cPass = Number(simHba1c) <= Number(trial.max_hba1c)
    const bmiPass = Number(simBmi) >= Number(trial.min_bmi) && Number(simBmi) <= Number(trial.max_bmi)
    const agePass = Number(simAge) >= Number(trial.min_age) && Number(simAge) <= Number(trial.max_age)
    const medPass = simMedicine.toLowerCase() !== String(trial.excluded_medicine || '').toLowerCase()

    const allPass = hba1cPass && bmiPass && agePass && medPass
    const simulatedScore = allPass ? Math.min(95, Math.max(65, Math.round(90 - Math.abs(Number(simHba1c) - 6.5) * 5))) : 0

    return {
      allPass,
      simulatedScore,
      hba1cPass,
      bmiPass,
      agePass,
      medPass,
    }
  }, [patient, trial, simHba1c, simBmi, simAge, simMedicine])

  if (!isOpen || !patient || !trial) return null

  function resetToOriginal() {
    setSimHba1c(patient.hba1c)
    setSimBmi(patient.bmi)
    setSimAge(patient.age)
    setSimMedicine(patient.current_medicine)
  }

  async function handleAddToWatchlist() {
    setBusy(true)
    try {
      await upsertPatient({
        ...patient,
        watch_list: true,
        retest_date: retestDate,
        watch_notes: watchNotes,
        near_miss_trial_id: trial.trial_id,
      })
      logAuditEvent('PATIENT_ADDED_TO_WATCHLIST', {
        patient_id: patient.patient_id,
        trial_id: trial.trial_id,
        retest_date: retestDate,
      })
      setSavedSuccess('Patient saved to Near-Miss Watch-List with re-screen date!')
      setTimeout(() => {
        if (onReEvaluated) onReEvaluated()
      }, 1200)
    } catch (err) {
      alert('Failed to save to watchlist: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleApplyNewDataAndReEvaluate() {
    setBusy(true)
    try {
      // 1. Update patient with the simulated/re-tested values
      const updatedPatient = {
        ...patient,
        hba1c: Number(simHba1c),
        bmi: Number(simBmi),
        age: Number(simAge),
        current_medicine: simMedicine,
        watch_list: false, // Graduated from watch-list
        retest_date: null,
      }
      await upsertPatient(updatedPatient)

      // 2. Re-run Step 3 matching engine
      const freshMatches = await runAndPersistMatching(updatedPatient)

      logAuditEvent('PATIENT_RESCUED_VIA_RETEST', {
        patient_id: patient.patient_id,
        trial_id: trial.trial_id,
        new_hba1c: simHba1c,
        new_bmi: simBmi,
      })

      setSavedSuccess('Re-test recorded! Match engine re-run. Patient has advanced to Path 1 (Eligible)!')
      setTimeout(() => {
        if (onReEvaluated) onReEvaluated(freshMatches)
        onClose()
      }, 1500)
    } catch (err) {
      alert('Error updating patient re-test: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  const gap = match?.gap_details

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Near-Miss Rescue & What-If Simulator</h2>
            <p className="text-xs text-slate-500">
              Simulate clinical metric adjustments to rescue {patient.name || patient.patient_id} for Trial {trial.trial_id}
            </p>
          </div>
        </div>

        {/* Near-Miss Gap Banner */}
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5">
          <div className="flex items-start gap-2 text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="text-xs">
              <span className="font-semibold">Near-Miss Identified: </span>
              {gap?.message || `Current HbA1c is ${patient.hba1c}% vs Trial limit of <= ${trial.max_hba1c}%.`}
              <div className="mt-1 font-medium text-amber-800">{gap?.suggestion}</div>
            </div>
          </div>
        </div>

        {/* Live Simulation Status Banner */}
        <div
          className={`mt-4 rounded-xl border p-4 transition ${
            simResult?.allPass
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {simResult?.allPass ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <Sliders className="h-5 w-5 text-slate-400" />
              )}
              <span className="text-sm font-bold">
                {simResult?.allPass ? 'Simulation Result: ELIGIBLE (YES PATH)' : 'Simulation Result: STILL INELIGIBLE'}
              </span>
            </div>
            {simResult?.allPass && (
              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                Projected Priority Score: {simResult.simulatedScore}/100
              </span>
            )}
          </div>
          <p className="mt-1 text-xs">
            {simResult?.allPass
              ? `With these adjustments, the patient qualifies across all 6 criteria and is ready for Coordinator Review.`
              : 'Adjust the sliders below to see what clinical threshold is needed to qualify this patient.'}
          </p>
        </div>

        {/* Sliders and Controls */}
        <div className="mt-5 space-y-4 rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Simulate Lab & Biometric Values</h3>
            <button
              type="button"
              onClick={resetToOriginal}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
            >
              <RotateCcw className="h-3 w-3" /> Reset to Actual
            </button>
          </div>

          {/* HbA1c Slider */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">
                HbA1c (%): <strong className="text-teal-700">{simHba1c}%</strong> (Actual: {patient.hba1c}%)
              </span>
              <span className={`text-[11px] ${simResult?.hba1cPass ? 'text-emerald-600 font-semibold' : 'text-rose-600'}`}>
                {simResult?.hba1cPass ? '✓ Passes' : `✕ Exceeds ceiling (<= ${trial.max_hba1c}%)`}
              </span>
            </div>
            <input
              type="range"
              min="5.0"
              max="12.0"
              step="0.1"
              value={simHba1c}
              onChange={(e) => setSimHba1c(e.target.value)}
              className="mt-1.5 w-full accent-teal-700"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>5.0%</span>
              <span className="font-semibold text-amber-700">Limit: {trial.max_hba1c}%</span>
              <span>12.0%</span>
            </div>
          </div>

          {/* BMI Slider */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">
                BMI: <strong className="text-teal-700">{simBmi}</strong> (Actual: {patient.bmi})
              </span>
              <span className={`text-[11px] ${simResult?.bmiPass ? 'text-emerald-600 font-semibold' : 'text-rose-600'}`}>
                {simResult?.bmiPass ? '✓ Passes' : `✕ Outside window (${trial.min_bmi}-${trial.max_bmi})`}
              </span>
            </div>
            <input
              type="range"
              min="16.0"
              max="50.0"
              step="0.5"
              value={simBmi}
              onChange={(e) => setSimBmi(e.target.value)}
              className="mt-1.5 w-full accent-teal-700"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>16.0</span>
              <span className="font-semibold text-amber-700">Target: {trial.min_bmi} - {trial.max_bmi}</span>
              <span>50.0</span>
            </div>
          </div>

          {/* Medicine Selection */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Current Medicine:</span>
              <span className={`text-[11px] ${simResult?.medPass ? 'text-emerald-600 font-semibold' : 'text-rose-600'}`}>
                {simResult?.medPass ? '✓ Non-conflicting' : `✕ Excluded: ${trial.excluded_medicine}`}
              </span>
            </div>
            <select
              value={simMedicine}
              onChange={(e) => setSimMedicine(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 p-2 text-xs"
            >
              <option value="None">None (Discontinued / Washout)</option>
              <option value="Metformin">Metformin</option>
              <option value="Insulin">Insulin</option>
              <option value="Lisinopril">Lisinopril</option>
              <option value="Amlodipine">Amlodipine</option>
              <option value="Semaglutide">Semaglutide</option>
              <option value="Empagliflozin">Empagliflozin</option>
              <option value="Albuterol">Albuterol</option>
              <option value="Atorvastatin">Atorvastatin</option>
            </select>
          </div>
        </div>

        {/* Watch-List Management */}
        <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-teal-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900">Near-Miss Watch-List Action</h3>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-700">Target Re-Test Date</label>
              <input
                type="date"
                value={retestDate}
                onChange={(e) => setRetestDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Watch-List Clinical Notes</label>
              <input
                type="text"
                value={watchNotes}
                onChange={(e) => setWatchNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
              />
            </div>
          </div>
        </div>

        {savedSuccess && (
          <div className="mt-3 rounded-lg bg-emerald-100 p-2.5 text-xs font-medium text-emerald-800">
            ✓ {savedSuccess}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddToWatchlist}
              disabled={busy}
              className="rounded-lg border border-amber-500 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              Add to Watch-List
            </button>

            <button
              type="button"
              onClick={handleApplyNewDataAndReEvaluate}
              disabled={busy || !simResult?.allPass}
              className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 disabled:opacity-50"
            >
              {busy ? 'Re-evaluating...' : 'Log Re-Test & Advance to Yes Path'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
