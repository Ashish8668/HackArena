import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import PatientForm from '../../components/PatientForm'
import { getPatientByUid, upsertPatient } from '../../firebase/patients'
import { runAndPersistMatching } from '../../services/runMatching'

export default function PatientProfilePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    getPatientByUid(user.uid).then(setPatient)
  }, [user])

  async function handleSave(values) {
    setBusy(true)
    setMessage('')
    try {
      const record = {
        ...values,
        patient_id: profile.patient_id,
        uid: user.uid,
        email: user.email,
        name: values.name,
        source: 'self',
      }
      await upsertPatient(record)
      await runAndPersistMatching(record)
      setMessage('Saved.')
      navigate('/app')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <div className="mt-6">
        <PatientForm
          key={patient?.patient_id || user?.uid || 'profile'}
          mode="patient"
          initialValue={{
            name: patient?.name || profile?.name || '',
            email: user?.email || '',
            age: patient?.age || '',
            gender: patient?.gender || 'Male',
            condition: patient?.condition || '',
            hba1c: patient?.hba1c || '',
            bmi: patient?.bmi || '',
            current_medicine: patient?.current_medicine || '',
          }}
          submitLabel={busy ? 'Saving...' : 'Save'}
          onSubmit={handleSave}
        />
      </div>
      {message ? <p className="mt-4 text-sm text-slate-600">{message}</p> : null}
    </div>
  )
}
