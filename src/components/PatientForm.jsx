import { useState } from 'react'
import Field, { inputClass } from './Field'
import { PATIENT_GENDERS } from '../matching/config'
import { validatePatient } from '../utils/validation'

const emptyPatient = {
  patient_id: '',
  name: '',
  email: '',
  age: '',
  gender: 'Male',
  condition: '',
  hba1c: '',
  bmi: '',
  current_medicine: '',
}

export default function PatientForm({ initialValue, onSubmit, submitLabel, lockId, mode = 'coordinator' }) {
  const [values, setValues] = useState({ ...emptyPatient, ...initialValue })
  const [errors, setErrors] = useState({})
  const isPatient = mode === 'patient'

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validatePatient(values, {
      hidePatientId: isPatient,
      requireContact: isPatient || true,
    })
    if (!isPatient && !values.patient_id?.trim()) {
      nextErrors.patient_id = 'Patient ID is required.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit(values)
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      {!isPatient ? (
        <Field label="Patient ID" error={errors.patient_id}>
          <input className={inputClass} value={values.patient_id} disabled={lockId} onChange={(e) => update('patient_id', e.target.value)} />
        </Field>
      ) : null}
      <Field label="Full name" error={errors.name}>
        <input className={inputClass} value={values.name || ''} onChange={(e) => update('name', e.target.value)} />
      </Field>
      <Field label="Email" error={errors.email}>
        <input
          className={inputClass}
          type="email"
          value={values.email || ''}
          disabled={isPatient}
          onChange={(e) => update('email', e.target.value)}
        />
      </Field>
      <Field label="Age" error={errors.age}>
        <input className={inputClass} type="number" value={values.age} onChange={(e) => update('age', e.target.value)} />
      </Field>
      <Field label="Gender" error={errors.gender}>
        <select className={inputClass} value={values.gender} onChange={(e) => update('gender', e.target.value)}>
          {PATIENT_GENDERS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </Field>
      <Field label="Condition" error={errors.condition}>
        <input className={inputClass} value={values.condition} onChange={(e) => update('condition', e.target.value)} />
      </Field>
      <Field label="HbA1c" error={errors.hba1c}>
        <input className={inputClass} type="number" step="0.1" value={values.hba1c} onChange={(e) => update('hba1c', e.target.value)} />
      </Field>
      <Field label="BMI" error={errors.bmi}>
        <input className={inputClass} type="number" step="0.1" value={values.bmi} onChange={(e) => update('bmi', e.target.value)} />
      </Field>
      <Field label="Current Medicine" error={errors.current_medicine}>
        <input className={inputClass} value={values.current_medicine} onChange={(e) => update('current_medicine', e.target.value)} />
      </Field>
      <div className="md:col-span-2">
        <p className="mb-3 text-xs text-slate-500">
          Name and email are for identity and communication only. Matching uses age, gender, condition, HbA1c, BMI, and current medicine.
        </p>
        <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
