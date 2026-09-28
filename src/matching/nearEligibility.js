import { NEAR_ELIGIBILITY } from './config'

function numericNearMiss(patientValue, min, max, tolerance) {
  if (patientValue >= min && patientValue <= max) return false
  if (patientValue < min) return min - patientValue <= tolerance
  return patientValue - max <= tolerance
}

export function evaluateNearEligibility(criteriaResults, options = NEAR_ELIGIBILITY) {
  const failed = Object.entries(criteriaResults).filter(([, result]) => result.status === 'FAIL')
  if (failed.length === 0) {
    return { nearEligible: false, failedCount: 0, nearMisses: [] }
  }
  if (failed.length > options.maxFailedCriteria) {
    return { nearEligible: false, failedCount: failed.length, nearMisses: [] }
  }

  const nearMisses = []
  const allFailedAreNearNumeric = failed.every(([key, result]) => {
    if (key === 'hba1c') {
      const max = Number(String(result.required).replace(/[^\d.]/g, ''))
      const close = numericNearMiss(result.patient_value, -Infinity, max, options.hba1cTolerance)
      if (close) nearMisses.push(key)
      return close
    }
    if (key === 'bmi' || key === 'age') {
      const [min, max] = String(result.required).split('-').map(Number)
      const tolerance = key === 'bmi' ? options.bmiTolerance : options.ageTolerance
      const close = numericNearMiss(result.patient_value, min, max, tolerance)
      if (close) nearMisses.push(key)
      return close
    }
    return false
  })

  return {
    nearEligible: allFailedAreNearNumeric && nearMisses.length === failed.length,
    failedCount: failed.length,
    nearMisses,
  }
}
