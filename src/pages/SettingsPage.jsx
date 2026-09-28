import { useState } from 'react'
import { seedSyntheticDataset, uploadSourceFile } from '../firebase/seed'
import { parsePatientCsv, parseTrialCsv } from '../utils/csv'
import { upsertPatient } from '../firebase/patients'
import { upsertTrial } from '../firebase/trials'

export default function SettingsPage() {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function seed() {
    setBusy(true)
    setMessage('')
    try {
      const result = await seedSyntheticDataset()
      setMessage(`Loaded ${result.patientCount} synthetic patients and ${result.trialCount} fictional trials.`)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function importFile(event, kind) {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true)
    setMessage('')
    try {
      await uploadSourceFile(file).catch(() => null)
      const parsed = kind === 'patients' ? await parsePatientCsv(file) : await parseTrialCsv(file)
      if (kind === 'patients') {
        await Promise.all(parsed.valid.map((record) => upsertPatient(record)))
      } else {
        await Promise.all(parsed.valid.map((record) => upsertTrial(record)))
      }
      setMessage(
        `Imported ${parsed.valid.length} ${kind}. ${parsed.invalid.length} row(s) failed schema validation and were skipped.`,
      )
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data setup</h1>
        <p className="mt-1 text-sm text-slate-500">
          Seed the hackathon demo dataset or import CSV files. All records are synthetic. No real patient data.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Synthetic demo dataset</h2>
        <p className="mt-2 text-sm text-slate-600">
          Creates about 200 fictional patients and 10 fictional trials, including eligible, ineligible, near-eligible, and terminology-variant examples.
        </p>
        <button
          type="button"
          onClick={seed}
          disabled={busy}
          className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? 'Working...' : 'Seed 200 patients + 10 trials'}
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Import patients CSV</h2>
          <p className="mt-2 text-sm text-slate-600">
            Columns: patient_id, name, email, age, gender, condition, hba1c, bmi, current_medicine
          </p>
          <input className="mt-4 text-sm" type="file" accept=".csv" onChange={(e) => importFile(e, 'patients')} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Import trials CSV</h2>
          <p className="mt-2 text-sm text-slate-600">
            Columns: trial_id, title, condition, min_age, max_age, gender, max_hba1c, min_bmi, max_bmi, excluded_medicine
          </p>
          <input className="mt-4 text-sm" type="file" accept=".csv" onChange={(e) => importFile(e, 'trials')} />
        </div>
      </section>

      {message ? <p className="rounded-lg bg-slate-900 px-4 py-3 text-sm text-white">{message}</p> : null}
    </div>
  )
}
