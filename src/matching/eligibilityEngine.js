import { SIMILARITY_THRESHOLD } from './config'
import { evaluateNearEligibility } from './nearEligibility'
import { semanticSimilarity } from '../semantic/embeddingService'

function medicinesMatch(patientMedicine, excludedMedicine) {
  const current = String(patientMedicine || '').trim().toLowerCase()
  const excluded = String(excludedMedicine || '').trim().toLowerCase()
  if (!excluded || excluded === 'none' || excluded === 'n/a') return false
  return current === excluded
}

export async function evaluateCondition(patientCondition, trialCondition, threshold = SIMILARITY_THRESHOLD) {
  const similarity = await semanticSimilarity(patientCondition, trialCondition)
  return {
    status: similarity >= threshold ? 'PASS' : 'FAIL',
    patient_value: patientCondition,
    trial_value: trialCondition,
    semantic_similarity: Number(similarity.toFixed(2)),
  }
}

export function evaluateAge(age, minAge, maxAge) {
  const pass = age >= minAge && age <= maxAge
  return {
    status: pass ? 'PASS' : 'FAIL',
    patient_value: age,
    required: `${minAge}-${maxAge}`,
  }
}

export function evaluateGender(patientGender, trialGender) {
  const pass = trialGender === 'Any' || patientGender === trialGender
  return {
    status: pass ? 'PASS' : 'FAIL',
    patient_value: patientGender,
    required: trialGender,
  }
}

export function evaluateHba1c(patientValue, maxHba1c) {
  const pass = patientValue <= maxHba1c
  return {
    status: pass ? 'PASS' : 'FAIL',
    patient_value: patientValue,
    required: `<= ${maxHba1c}`,
  }
}

export function evaluateBmi(patientValue, minBmi, maxBmi) {
  const pass = patientValue >= minBmi && patientValue <= maxBmi
  return {
    status: pass ? 'PASS' : 'FAIL',
    patient_value: patientValue,
    required: `${minBmi}-${maxBmi}`,
  }
}

export function evaluateMedicine(patientMedicine, excludedMedicine) {
  const excluded = medicinesMatch(patientMedicine, excludedMedicine)
  return {
    status: excluded ? 'FAIL' : 'PASS',
    patient_value: patientMedicine,
    excluded_medicine: excludedMedicine || 'None',
  }
}

function failReason(key) {
  if (key === 'age') return 'Patient age is outside the trial age range.'
  if (key === 'gender') return 'Patient gender does not match the trial gender requirement.'
  if (key === 'condition') {
    return 'Condition similarity is below the threshold.'
  }
  if (key === 'hba1c') return "Patient HbA1c exceeds the trial's maximum allowed value."
  if (key === 'bmi') return 'Patient BMI is outside the trial BMI range.'
  if (key === 'medicine') return 'Patient current medicine matches the trial excluded medicine.'
  return 'Criterion did not meet the structured trial requirement.'
}

export async function evaluatePatientTrial(patient, trial) {
  const criteria_results = {
    age: evaluateAge(Number(patient.age), Number(trial.min_age), Number(trial.max_age)),
    gender: evaluateGender(patient.gender, trial.gender),
    condition: await evaluateCondition(patient.condition, trial.condition),
    hba1c: evaluateHba1c(Number(patient.hba1c), Number(trial.max_hba1c)),
    bmi: evaluateBmi(Number(patient.bmi), Number(trial.min_bmi), Number(trial.max_bmi)),
    medicine: evaluateMedicine(patient.current_medicine, trial.excluded_medicine),
  }

  Object.entries(criteria_results).forEach(([key, result]) => {
    if (result.status === 'FAIL') {
      result.reason = failReason(key)
    }
  })

  const passCount = Object.values(criteria_results).filter((item) => item.status === 'PASS').length
  const failCount = Object.values(criteria_results).filter((item) => item.status === 'FAIL').length
  const eligible = failCount === 0
  const near = evaluateNearEligibility(criteria_results)

  return {
    patient_id: patient.patient_id,
    trial_id: trial.trial_id,
    title: trial.title,
    eligible,
    near_eligible: !eligible && near.nearEligible,
    criteria_results,
    passCount,
    failCount,
    createdAt: new Date().toISOString(),
  }
}

export async function matchPatientToTrials(patient, trials) {
  const results = []
  for (const trial of trials) {
    results.push(await evaluatePatientTrial(patient, trial))
  }
  return results.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1
    if (a.near_eligible !== b.near_eligible) return a.near_eligible ? -1 : 1
    return b.passCount - a.passCount
  })
}

export function overallLabel(match) {
  if (match.eligible) return 'POTENTIAL MATCH'
  if (match.near_eligible) return 'NEAR MATCH'
  return 'NOT A MATCH'
}

export function patientFacingLabel(match) {
  if (match.eligible) return 'Potential Match'
  if (match.near_eligible) return 'Close possible match'
  return 'Not a current match'
}
