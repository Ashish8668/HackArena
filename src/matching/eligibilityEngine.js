import { DECISION_PATHS, SIMILARITY_THRESHOLD } from './config'
import { evaluateNearEligibility } from './nearEligibility'
import { calculatePriorityScore } from './priorityScoring'
import { semanticSimilarity } from '../semantic/embeddingService'
import { evaluateMedicineConflict } from '../services/aiMedicineHelper'
import { normalizeMedicineName } from '../data/drugKnowledgeBase'

function medicinesMatchSimple(patientMedicine, excludedMedicine) {
  const current = normalizeMedicineName(patientMedicine)
  const excluded = normalizeMedicineName(excludedMedicine)
  if (!excluded || excluded === 'none' || excluded === 'na' || excluded === 'nil') return false
  if (!current || current === 'none' || current === 'na' || current === 'nil') return false
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
  const pass = !trialGender || trialGender === 'Any' || patientGender === trialGender
  return {
    status: pass ? 'PASS' : 'FAIL',
    patient_value: patientGender,
    required: trialGender || 'Any',
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

export function evaluateMedicine(patientMedicine, excludedMedicine, scope = 'exact_drug') {
  const isExcluded = medicinesMatchSimple(patientMedicine, excludedMedicine)
  return {
    status: isExcluded ? 'FAIL' : 'PASS',
    patient_value: patientMedicine,
    excluded_medicine: excludedMedicine || 'None',
    scope,
  }
}

function failReason(key, result) {
  if (key === 'age') return `Patient age (${result.patient_value} yr) is outside the trial window (${result.required} yr).`
  if (key === 'gender') return `Patient gender (${result.patient_value}) does not match protocol requirement (${result.required}).`
  if (key === 'condition') {
    return 'Condition terminology does not match protocol indication closely enough. Clinical review required.'
  }
  if (key === 'hba1c') return `Patient HbA1c (${result.patient_value}%) exceeds the trial limit (${result.required}%).`
  if (key === 'bmi') return `Patient BMI (${result.patient_value}) is outside the acceptable range (${result.required}).`
  if (key === 'medicine') {
    return result.explanation || `Patient medication (${result.patient_value}) matches excluded drug (${result.excluded_medicine}).`
  }
  return 'Criterion did not meet protocol requirement.'
}

export async function evaluatePatientTrial(patient, trial, options = {}) {
  // Use AI medicine helper with trial's configured medicine_scope
  const medScope = trial.medicine_scope || 'exact_drug'
  let medResult
  try {
    const medAnalysis = await evaluateMedicineConflict({
      patientMedicine: patient.current_medicine,
      excludedMedicine: trial.excluded_medicine,
      scope: medScope,
      allowAi: options.allowAi !== false,
    })
    medResult = {
      status: medAnalysis.conflict ? 'FAIL' : 'PASS',
      patient_value: patient.current_medicine,
      excluded_medicine: trial.excluded_medicine || 'None',
      scope: medScope,
      classification: medAnalysis.classification,
      explanation: medAnalysis.explanation,
      evidence: medAnalysis.evidence,
      source: medAnalysis.source,
    }
  } catch {
    medResult = evaluateMedicine(patient.current_medicine, trial.excluded_medicine, medScope)
  }

  const criteria_results = {
    age: evaluateAge(Number(patient.age), Number(trial.min_age), Number(trial.max_age)),
    gender: evaluateGender(patient.gender, trial.gender),
    condition: await evaluateCondition(patient.condition, trial.condition),
    hba1c: evaluateHba1c(Number(patient.hba1c), Number(trial.max_hba1c)),
    bmi: evaluateBmi(Number(patient.bmi), Number(trial.min_bmi), Number(trial.max_bmi)),
    medicine: medResult,
  }

  // Populate clear medical reasons for any failure
  Object.entries(criteria_results).forEach(([key, res]) => {
    if (res.status === 'FAIL') {
      res.reason = failReason(key, res)
    }
  })

  const passCount = Object.values(criteria_results).filter((item) => item.status === 'PASS').length
  const failedEntries = Object.entries(criteria_results).filter(([, item]) => item.status === 'FAIL')
  const failCount = failedEntries.length

  const eligible = failCount === 0
  const near = evaluateNearEligibility(criteria_results)
  const near_eligible = !eligible && near.nearEligible

  // Path 1 (YES - Eligible)
  // Path 2 (ALMOST - Near-Miss)
  // Path 3 (NO - Ineligible)
  let decisionPath = DECISION_PATHS.NOT_ELIGIBLE
  if (eligible) decisionPath = DECISION_PATHS.ELIGIBLE
  else if (near_eligible) decisionPath = DECISION_PATHS.NEAR_MISS

  // Priority Score (0-100) for eligible patients
  const priority = eligible ? calculatePriorityScore(patient, trial, criteria_results) : null

  // Rejection bottlenecks for Path 3
  const bottlenecks = failedEntries.map(([criterionKey, res]) => ({
    key: criterionKey,
    label: criterionKey.toUpperCase(),
    patientValue: res.patient_value,
    required: res.required || res.excluded_medicine,
    reason: res.reason,
  }))

  return {
    patient_id: patient.patient_id,
    trial_id: trial.trial_id,
    title: trial.title,
    condition: trial.condition,
    site_location: trial.site_location || 'City Clinical Research Center, Site A',
    eligible,
    near_eligible,
    decisionPath,
    priority_score: priority ? priority.total : null,
    priority_breakdown: priority ? priority.breakdown : null,
    priority_tier: priority ? priority.tier : null,
    gap_details: near.gapDetails,
    bottlenecks,
    criteria_results,
    passCount,
    failCount,
    createdAt: new Date().toISOString(),
  }
}

export async function matchPatientToTrials(patient, trials, options = {}) {
  const results = []
  for (const trial of trials) {
    results.push(await evaluatePatientTrial(patient, trial, options))
  }
  return results.sort((a, b) => {
    // 1. Eligible first (Path 1)
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1
    // Within eligible, sort by priority score descending!
    if (a.eligible && b.eligible) {
      return (b.priority_score || 0) - (a.priority_score || 0)
    }
    // 2. Near-eligible next (Path 2)
    if (a.near_eligible !== b.near_eligible) return a.near_eligible ? -1 : 1
    // 3. Ineligible sorted by highest passCount
    return b.passCount - a.passCount
  })
}

export function overallLabel(match) {
  if (match.eligible) return 'POTENTIAL MATCH'
  if (match.near_eligible) return 'NEAR MATCH'
  return 'NOT A MATCH'
}

export function patientFacingLabel(match) {
  if (match.eligible) return 'Eligible Study'
  if (match.near_eligible) return 'Near-Miss (Under Review)'
  return 'Not Eligible'
}
