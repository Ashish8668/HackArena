const TERMINOLOGY_MAP = {
  t2dm: 'type_2_diabetes',
  'type 2 diabetes mellitus': 'type_2_diabetes',
  'type 2 diabetes': 'type_2_diabetes',
  'type ii diabetes': 'type_2_diabetes',
  'type ii diabetes mellitus': 'type_2_diabetes',
  'niddm': 'type_2_diabetes',
  t1dm: 'type_1_diabetes',
  'type 1 diabetes mellitus': 'type_1_diabetes',
  'type 1 diabetes': 'type_1_diabetes',
  'type i diabetes': 'type_1_diabetes',
  htn: 'hypertension',
  'high blood pressure': 'hypertension',
  hypertension: 'hypertension',
  copd: 'chronic_obstructive_pulmonary_disease',
  'chronic obstructive pulmonary disease': 'chronic_obstructive_pulmonary_disease',
  'heart failure': 'heart_failure',
  chf: 'heart_failure',
  'congestive heart failure': 'heart_failure',
  ckd: 'chronic_kidney_disease',
  'chronic kidney disease': 'chronic_kidney_disease',
  obesity: 'obesity',
  'obesity disorder': 'obesity',
  asthma: 'asthma',
}

export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function mapTerminology(value) {
  const normalized = normalizeText(value)
  return TERMINOLOGY_MAP[normalized] || normalized
}

export function canonicalizeCondition(value) {
  return mapTerminology(normalizeText(value))
}
