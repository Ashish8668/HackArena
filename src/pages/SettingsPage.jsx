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
      setMessage(`Loaded ${result.patientCount} patients, ${result.trialCount} trials.`)
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
      setMessage(`Imported ${parsed.valid.length} ${kind}. Skipped ${parsed.invalid.length}.`)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Data</h1>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Load sample data</h2>
        <button
          type="button"
          onClick={seed}
          disabled={busy}
          className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? 'Working...' : 'Load patients and trials'}
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Import patients</h2>
          <input className="mt-4 text-sm" type="file" accept=".csv" onChange={(e) => importFile(e, 'patients')} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Import trials</h2>
          <input className="mt-4 text-sm" type="file" accept=".csv" onChange={(e) => importFile(e, 'trials')} />
        </div>
      </section>

      {message ? <p className="rounded-lg bg-slate-900 px-4 py-3 text-sm text-white">{message}</p> : null}
    </div>
  )
}
