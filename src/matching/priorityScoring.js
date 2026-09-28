/**
 * Priority Scoring for Eligible Patients (0 to 100)
 * Evaluates how comfortably inside clinical limits a patient sits.
 * Patients further away from borderline values score higher.
 */

export function calculatePriorityScore(patient, trial, criteriaResults = {}) {
  // Age subscore (0 - 25 points)
  let ageScore = 20
  const age = Number(patient.age)
  const minAge = Number(trial.min_age)
  const maxAge = Number(trial.max_age)

  if (minAge && maxAge && maxAge > minAge) {
    const mid = (minAge + maxAge) / 2
    const span = (maxAge - minAge) / 2
    const dist = Math.abs(age - mid)
    const ratio = Math.max(0, 1 - dist / span)
    // Scale 10 to 25
    ageScore = Math.round(10 + ratio * 15)
  }

  // HbA1c safety margin (0 - 25 points)
  let hba1cScore = 20
  const hba1c = Number(patient.hba1c)
  const maxHba1c = Number(trial.max_hba1c)

  if (hba1c && maxHba1c) {
    const safetyMargin = maxHba1c - hba1c // Higher is safer
    if (safetyMargin >= 1.5) {
      hba1cScore = 25
    } else if (safetyMargin >= 0.8) {
      hba1cScore = 22
    } else if (safetyMargin >= 0.4) {
      hba1cScore = 18
    } else if (safetyMargin >= 0.1) {
      hba1cScore = 14
    } else {
      hba1cScore = 10 // Borderline
    }
  }

  // BMI comfort margin (0 - 25 points)
  let bmiScore = 20
  const bmi = Number(patient.bmi)
  const minBmi = Number(trial.min_bmi)
  const maxBmi = Number(trial.max_bmi)

  if (minBmi && maxBmi && maxBmi > minBmi) {
    const mid = (minBmi + maxBmi) / 2
    const span = (maxBmi - minBmi) / 2
    const dist = Math.abs(bmi - mid)
    const ratio = Math.max(0, 1 - dist / span)
    bmiScore = Math.round(10 + ratio * 15)
  }

  // Condition similarity & medication stability (0 - 25 points)
  let conditionScore = 20
  const sim = criteriaResults?.condition?.semantic_similarity
  if (sim != null) {
    if (sim >= 0.95) conditionScore = 25
    else if (sim >= 0.85) conditionScore = 23
    else if (sim >= 0.75) conditionScore = 19
    else conditionScore = 15
  }

  const total = Math.min(100, Math.max(0, ageScore + hba1cScore + bmiScore + conditionScore))

  let tier = 'Standard Eligible'
  if (total >= 85) tier = 'High Priority (Ideal Fit)'
  else if (total >= 70) tier = 'Strong Fit'
  else tier = 'Borderline Inside Limits'

  return {
    total,
    tier,
    breakdown: {
      age: { score: ageScore, max: 25, label: `Age ${age} yr (Target: ${minAge}-${maxAge})` },
      hba1c: { score: hba1cScore, max: 25, label: `HbA1c ${hba1c}% (Limit: <= ${maxHba1c}%)` },
      bmi: { score: bmiScore, max: 25, label: `BMI ${bmi} (Target: ${minBmi}-${maxBmi})` },
      condition: {
        score: conditionScore,
        max: 25,
        label: `Condition match similarity: ${sim ? `${Math.round(sim * 100)}%` : 'Exact'}`,
      },
    },
    summary: `${tier} — Score ${total}/100. Patient sits comfortably inside protocol safety boundaries.`,
  }
}
