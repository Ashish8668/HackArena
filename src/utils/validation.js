export function validatePatient(values, options = {}) {
  const errors = {}
  if (options.requireContact) {
    if (!values.name?.trim()) errors.name = 'Name is required.'
    if (!values.email?.trim()) errors.email = 'Email is required for coordinator communication.'
  }
  if (!options.hidePatientId && !values.patient_id?.trim()) errors.patient_id = 'Patient ID is required.'
  if (values.age === '' || values.age === null || Number.isNaN(Number(values.age))) {
    errors.age = 'Age must be a valid number.'
  } else if (Number(values.age) < 0 || Number(values.age) > 120) {
    errors.age = 'Age must be between 0 and 120.'
  }
  if (!values.gender) errors.gender = 'Gender is required.'
  if (!values.condition?.trim()) errors.condition = 'Condition is required.'
  if (values.hba1c === '' || Number.isNaN(Number(values.hba1c))) {
    errors.hba1c = 'HbA1c must be numeric.'
  }
  if (values.bmi === '' || Number.isNaN(Number(values.bmi))) {
    errors.bmi = 'BMI must be numeric.'
  }
  if (!values.current_medicine?.trim()) errors.current_medicine = 'Current medicine is required.'
  return errors
}

export function validateTrial(values) {
  const errors = {}
  if (!values.trial_id?.trim()) errors.trial_id = 'Trial ID is required.'
  if (!values.title?.trim()) errors.title = 'Title is required.'
  if (!values.condition?.trim()) errors.condition = 'Condition is required.'
  const minAge = Number(values.min_age)
  const maxAge = Number(values.max_age)
  const minBmi = Number(values.min_bmi)
  const maxBmi = Number(values.max_bmi)
  const maxHba1c = Number(values.max_hba1c)

  if (values.min_age === '' || Number.isNaN(minAge)) errors.min_age = 'Minimum age must be numeric.'
  if (values.max_age === '' || Number.isNaN(maxAge)) errors.max_age = 'Maximum age must be numeric.'
  if (!errors.min_age && !errors.max_age && minAge > maxAge) {
    errors.max_age = 'Maximum age must be greater than or equal to minimum age.'
  }
  if (!values.gender) errors.gender = 'Gender is required.'
  if (values.max_hba1c === '' || Number.isNaN(maxHba1c)) errors.max_hba1c = 'Maximum HbA1c must be numeric.'
  if (values.min_bmi === '' || Number.isNaN(minBmi)) errors.min_bmi = 'Minimum BMI must be numeric.'
  if (values.max_bmi === '' || Number.isNaN(maxBmi)) errors.max_bmi = 'Maximum BMI must be numeric.'
  if (!errors.min_bmi && !errors.max_bmi && minBmi > maxBmi) {
    errors.max_bmi = 'Maximum BMI must be greater than or equal to minimum BMI.'
  }
  if (!values.excluded_medicine?.trim()) errors.excluded_medicine = 'Excluded medicine is required. Use None if not applicable.'
  return errors
}

export const PATIENT_FIELDS = [
  'patient_id',
  'name',
  'email',
  'age',
  'gender',
  'condition',
  'hba1c',
  'bmi',
  'current_medicine',
]

export const TRIAL_FIELDS = [
  'trial_id',
  'title',
  'condition',
  'min_age',
  'max_age',
  'gender',
  'max_hba1c',
  'min_bmi',
  'max_bmi',
  'excluded_medicine',
]
