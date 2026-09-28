import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../components/Modal'
import PatientForm from '../components/PatientForm'
import { deletePatient, listPatients, upsertPatient } from '../firebase/patients'

export default function PatientsPage() {
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  async function refresh() {
    setPatients(await listPatients())
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message))
  }, [])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return patients.filter((patient) =>
      [patient.patient_id, patient.name, patient.email, patient.condition, patient.gender, patient.current_medicine]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [patients, search])

  async function handleSave(values) {
    await upsertPatient({ ...values, source: editing?.source || 'coordinator' })
    setOpen(false)
    setEditing(null)
    await refresh()
  }

  async function handleDelete(patientId) {
    if (!window.confirm(`Delete ${patientId}?`)) return
    await deletePatient(patientId)
    await refresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Participants</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white"
        >
          Add patient
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm md:max-w-md"
      />

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Patient ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((patient) => (
              <tr key={patient.patient_id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">
                  <Link className="text-teal-700" to={`/patients/${patient.patient_id}`}>
                    {patient.patient_id}
                  </Link>
                </td>
                <td className="px-4 py-3">{patient.name || '—'}</td>
                <td className="px-4 py-3">{patient.email || '—'}</td>
                <td className="px-4 py-3">{patient.source === 'self' ? 'Registered' : 'Added'}</td>
                <td className="px-4 py-3">{patient.age}</td>
                <td className="px-4 py-3">{patient.condition}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-slate-600"
                      onClick={() => {
                        setEditing(patient)
                        setOpen(true)
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="text-rose-600" onClick={() => handleDelete(patient.patient_id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open ? (
        <Modal title={editing ? 'Edit patient' : 'Add patient'} onClose={() => setOpen(false)}>
          <PatientForm
            initialValue={editing}
            lockId={Boolean(editing)}
            submitLabel={editing ? 'Save changes' : 'Create patient'}
            onSubmit={handleSave}
          />
        </Modal>
      ) : null}
    </div>
  )
}
