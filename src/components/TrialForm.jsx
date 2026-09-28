import { useState } from 'react'
import Field, { inputClass } from './Field'
import { GENDER_OPTIONS } from '../matching/config'
import { validateTrial } from '../utils/validation'

const emptyTrial = {
  trial_id: '',
  title: '',
  condition: '',
  min_age: '',
  max_age: '',
  gender: 'Any',
  max_hba1c: '',
  min_bmi: '',
  max_bmi: '',
  excluded_medicine: 'None',
}

export default function TrialForm({ initialValue, onSubmit, submitLabel, lockId }) {
  const [values, setValues] = useState(initialValue || emptyTrial)
  const [errors, setErrors] = useState({})

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validateTrial(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit(values)
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <Field label="Trial ID" error={errors.trial_id}>
        <input className={inputClass} value={values.trial_id} disabled={lockId} onChange={(e) => update('trial_id', e.target.value)} />
      </Field>
      <Field label="Title" error={errors.title}>
        <input className={inputClass} value={values.title} onChange={(e) => update('title', e.target.value)} />
      </Field>
      <Field label="Condition" error={errors.condition}>
        <input className={inputClass} value={values.condition} onChange={(e) => update('condition', e.target.value)} />
      </Field>
      <Field label="Gender" error={errors.gender}>
        <select className={inputClass} value={values.gender} onChange={(e) => update('gender', e.target.value)}>
          {GENDER_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </Field>
      <Field label="Minimum Age" error={errors.min_age}>
        <input className={inputClass} type="number" value={values.min_age} onChange={(e) => update('min_age', e.target.value)} />
      </Field>
      <Field label="Maximum Age" error={errors.max_age}>
        <input className={inputClass} type="number" value={values.max_age} onChange={(e) => update('max_age', e.target.value)} />
      </Field>
      <Field label="Maximum HbA1c" error={errors.max_hba1c}>
        <input className={inputClass} type="number" step="0.1" value={values.max_hba1c} onChange={(e) => update('max_hba1c', e.target.value)} />
      </Field>
      <Field label="Minimum BMI" error={errors.min_bmi}>
        <input className={inputClass} type="number" step="0.1" value={values.min_bmi} onChange={(e) => update('min_bmi', e.target.value)} />
      </Field>
      <Field label="Maximum BMI" error={errors.max_bmi}>
        <input className={inputClass} type="number" step="0.1" value={values.max_bmi} onChange={(e) => update('max_bmi', e.target.value)} />
      </Field>
      <Field label="Excluded Medicine" error={errors.excluded_medicine}>
        <input className={inputClass} value={values.excluded_medicine} onChange={(e) => update('excluded_medicine', e.target.value)} />
      </Field>
      <div className="md:col-span-2">
        <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
