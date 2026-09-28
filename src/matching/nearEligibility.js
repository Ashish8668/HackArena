import { NEAR_ELIGIBILITY } from './config'

function numericNearMiss(patientValue, min, max, tolerance) {
  if (patientValue >= min && patientValue <= max) return { close: false, diff: 0 }
  if (patientValue < min) {
    const diff = min - patientValue
    return { close: diff <= tolerance, diff: Number(diff.toFixed(2)), direction: 'below' }
  }
  const diff = patientValue - max
  return { close: diff <= tolerance, diff: Number(diff.toFixed(2)), direction: 'above' }
}

export function evaluateNearEligibility(criteriaResults, options = NEAR_ELIGIBILITY) {
  const failed = Object.entries(criteriaResults).filter(([, result]) => result.status === 'FAIL')
  if (failed.length === 0) {
    return { nearEligible: false, failedCount: 0, nearMisses: [], gapDetails: null }
  }
  if (failed.length > options.maxFailedCriteria) {
    return { nearEligible: false, failedCount: failed.length, nearMisses: [], gapDetails: null }
  }

  const nearMisses = []
  let gapDetails = null

  const allFailedAreNearNumeric = failed.every(([key, result]) => {
    if (key === 'hba1c') {
      const max = Number(String(result.required).replace(/[^\d.]/g, ''))
      const { close, diff } = numericNearMiss(result.patient_value, -Infinity, max, options.hba1cTolerance)
      if (close) {
        nearMisses.push(key)
        gapDetails = {
          criterion: 'HbA1c',
          key: 'hba1c',
          patientValue: result.patient_value,
          targetValue: max,
          gap: diff,
          unit: '%',
          direction: 'above',
          message: `HbA1c is ${result.patient_value}%, which is only ${diff}% above the protocol ceiling of ${max}%.`,
          suggestion: `A modest ${diff}% reduction (e.g. lifestyle or medication optimization) would achieve eligibility.`,
        }
      }
      return close
    }
    if (key === 'bmi' || key === 'age') {
      const [min, max] = String(result.required).split('-').map(Number)
      const tolerance = key === 'bmi' ? options.bmiTolerance : options.ageTolerance
      const { close, diff, direction } = numericNearMiss(result.patient_value, min, max, tolerance)
      if (close) {
        nearMisses.push(key)
        const target = direction === 'above' ? max : min
        gapDetails = {
          criterion: key.toUpperCase(),
          key,
          patientValue: result.patient_value,
          targetValue: target,
          gap: diff,
          unit: key === 'bmi' ? 'kg/m²' : 'years',
          direction,
          message: `${key.toUpperCase()} is ${result.patient_value}, which is within ${diff} ${key === 'bmi' ? 'kg/m²' : 'years'} of the range (${min}-${max}).`,
          suggestion: `Targeting a ${diff} unit shift towards ${target} would qualify the participant.`,
        }
      }
      return close
    }
    if (options.includeMedicine && key === 'medicine') {
      nearMisses.push(key)
      gapDetails = {
        criterion: 'Current Medicine',
        key: 'medicine',
        patientValue: result.patient_value,
        targetValue: 'Washout / Alternative',
        gap: 0,
        unit: '',
        direction: 'conflict',
        message: `Medicine conflict (${result.patient_value}) matches excluded drug (${result.excluded_medicine}).`,
        suggestion: `Check if protocol permits wash-out period under medical supervision.`,
      }
      return true
    }
    return false
  })

  return {
    nearEligible: allFailedAreNearNumeric && nearMisses.length === failed.length,
    failedCount: failed.length,
    nearMisses,
    gapDetails,
  }
}
