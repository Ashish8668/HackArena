export const SIMILARITY_THRESHOLD = 0.75

export const NEAR_ELIGIBILITY = {
  maxFailedCriteria: 1,
  hba1cTolerance: 0.5,
  bmiTolerance: 2.0,
  ageTolerance: 3.0,
}

export const RECRUITMENT_STATUSES = ['Identified', 'Contacted', 'Screened', 'Enrolled']

export const GENDER_OPTIONS = ['Male', 'Female', 'Any']

export const PATIENT_GENDERS = ['Male', 'Female']

export const MEDICINE_EXCLUSION_SCOPES = [
  { id: 'exact_drug', label: 'Exact Drug Only', description: 'Excludes only the exact chemical entity or brand name' },
  { id: 'same_class', label: 'Same Pharmacological Class', description: 'Excludes any drug sharing the pharmacological class (e.g. all ACE inhibitors)' },
  { id: 'same_effect', label: 'Same Therapeutic Mechanism', description: 'Excludes any drug sharing biological pathway or mechanism' },
]

export const DECISION_PATHS = {
  ELIGIBLE: 'ELIGIBLE',
  NEAR_MISS: 'NEAR_MISS',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
}
