import { describe, expect, it } from 'vitest'
import {
  evaluateAge,
  evaluateBmi,
  evaluateGender,
  evaluateHba1c,
  evaluateMedicine,
  isPotentialMatch,
  overallLabel,
} from '../matching/eligibilityEngine'
import { evaluateNearEligibility } from '../matching/nearEligibility'
import { canonicalizeCondition, canonicalizeMedicine } from '../semantic/normalization'
import { cosineSimilarity } from '../semantic/cosineSimilarity'
import { validatePatient, validateTrial } from '../utils/validation'
import { generateSyntheticPatients } from '../data/patients'
import { SYNTHETIC_TRIALS } from '../data/trials'

describe('deterministic eligibility rules', () => {
  it('passes age inside range and fails outside', () => {
    expect(evaluateAge(45, 30, 65).status).toBe('PASS')
    expect(evaluateAge(70, 30, 65).status).toBe('FAIL')
  })

  it('treats trial gender Any as pass', () => {
    expect(evaluateGender('Male', 'Any').status).toBe('PASS')
    expect(evaluateGender('Male', 'Female').status).toBe('FAIL')
  })

  it('applies HbA1c and BMI thresholds deterministically', () => {
    expect(evaluateHba1c(7.2, 8.0).status).toBe('PASS')
    expect(evaluateHba1c(8.2, 8.0).status).toBe('FAIL')
    expect(evaluateBmi(28, 18, 35).status).toBe('PASS')
    expect(evaluateBmi(36, 18, 35).status).toBe('FAIL')
  })

  it('fails only when current medicine matches excluded medicine', () => {
    expect(evaluateMedicine('Metformin', 'Insulin').status).toBe('PASS')
    expect(evaluateMedicine('Insulin', 'Insulin').status).toBe('FAIL')
    expect(evaluateMedicine('Insulin', 'insulin').status).toBe('FAIL')
    expect(evaluateMedicine('Metformin', 'None').status).toBe('PASS')
    expect(evaluateMedicine('Metformin', 'Metformin HCl').status).toBe('FAIL')
    expect(evaluateMedicine('Aspirin', 'acetylsalicylic acid').status).toBe('FAIL')
    expect(evaluateMedicine('Aspirin', 'Insulin').status).toBe('PASS')
  })
})

describe('semantic cannot override structured rules', () => {
  it('marks ineligible when age fails even if all other criteria pass', () => {
    const match = {
      eligible: false,
      near_eligible: false,
      criteria_results: {
        age: evaluateAge(70, 30, 65),
        gender: evaluateGender('Male', 'Any'),
        condition: { status: 'PASS', semantic_similarity: 1 },
        hba1c: evaluateHba1c(7.2, 8.0),
        bmi: evaluateBmi(28, 18, 35),
        medicine: evaluateMedicine('Metformin', 'Insulin'),
      },
    }
    const failCount = Object.values(match.criteria_results).filter((item) => item.status === 'FAIL').length
    expect(failCount).toBe(1)
    expect(overallLabel(match)).toBe('NOT A MATCH')
  })

  it('marks ineligible when HbA1c exceeds the structured maximum', () => {
    const hba1c = evaluateHba1c(9.2, 8.0)
    expect(hba1c.status).toBe('FAIL')
    expect(overallLabel({ eligible: false, near_eligible: false })).toBe('NOT A MATCH')
  })
})

describe('near eligibility', () => {
  it('flags a close HbA1c miss as near eligible, not eligible', () => {
    const criteria_results = {
      age: { status: 'PASS', patient_value: 52, required: '30-65' },
      gender: { status: 'PASS', patient_value: 'Female', required: 'Any' },
      condition: { status: 'PASS' },
      hba1c: { status: 'FAIL', patient_value: 8.2, required: '<= 8.0' },
      bmi: { status: 'PASS', patient_value: 27, required: '18-35' },
      medicine: { status: 'PASS' },
    }
    const near = evaluateNearEligibility(criteria_results)
    expect(near.nearEligible).toBe(true)
    expect(near.failedCount).toBe(1)
    expect(overallLabel({ eligible: false, near_eligible: near.nearEligible })).toBe('NEAR MATCH')
    expect(overallLabel({ eligible: true, near_eligible: false })).toBe('POTENTIAL MATCH')
    expect(isPotentialMatch({ eligible: true, near_eligible: false })).toBe(true)
    expect(isPotentialMatch({ eligible: false, near_eligible: true })).toBe(true)
    expect(isPotentialMatch({ eligible: false, near_eligible: false })).toBe(false)
  })

  it('does not treat excluded-medicine failures as near eligible', () => {
    const criteria_results = {
      age: { status: 'PASS', patient_value: 48, required: '30-65' },
      gender: { status: 'PASS', patient_value: 'Male', required: 'Any' },
      condition: { status: 'PASS' },
      hba1c: { status: 'PASS', patient_value: 7.1, required: '<= 8.0' },
      bmi: { status: 'PASS', patient_value: 29, required: '18-35' },
      medicine: { status: 'FAIL', patient_value: 'Insulin', excluded_medicine: 'Insulin' },
    }
    expect(evaluateNearEligibility(criteria_results).nearEligible).toBe(false)
  })
})

describe('condition normalization', () => {
  it('maps T2DM variants onto the same canonical term', () => {
    expect(canonicalizeCondition('T2DM')).toBe('type_2_diabetes')
    expect(canonicalizeCondition('Type 2 Diabetes Mellitus')).toBe('type_2_diabetes')
    expect(canonicalizeCondition('Type II Diabetes')).toBe('type_2_diabetes')
    expect(canonicalizeCondition('HTN')).toBe(canonicalizeCondition('High Blood Pressure'))
    expect(canonicalizeCondition('COPD')).toBe(canonicalizeCondition('Chronic Obstructive Pulmonary Disease'))
    expect(canonicalizeCondition('Type 2 diabetes')).toBe(canonicalizeCondition('T2DM'))
  })
})

describe('medicine synonyms', () => {
  it('maps salt and chemical names onto the same canonical medicine', () => {
    expect(canonicalizeMedicine('Metformin')).toBe(canonicalizeMedicine('Metformin HCl'))
    expect(canonicalizeMedicine('Aspirin')).toBe(canonicalizeMedicine('acetylsalicylic acid'))
  })
})

describe('cosine similarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 1], [1, 0, 1])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
    expect(cosineSimilarity([], [1])).toBe(0)
  })
})

describe('form validation', () => {
  it('requires patient fields and numeric labs', () => {
    const errors = validatePatient({
      patient_id: '',
      age: 'abc',
      gender: '',
      condition: '',
      hba1c: '',
      bmi: '',
      current_medicine: '',
    })
    expect(Object.keys(errors).length).toBeGreaterThan(0)
    expect(
      validatePatient({
        patient_id: 'P001',
        age: 45,
        gender: 'Male',
        condition: 'T2DM',
        hba1c: 7.2,
        bmi: 28,
        current_medicine: 'Metformin',
      }),
    ).toEqual({})
  })

  it('rejects inverted trial numeric ranges', () => {
    const errors = validateTrial({
      trial_id: 'T001',
      title: 'Demo',
      condition: 'T2DM',
      min_age: 65,
      max_age: 30,
      gender: 'Any',
      max_hba1c: 8,
      min_bmi: 35,
      max_bmi: 18,
      excluded_medicine: 'Insulin',
    })
    expect(errors.max_age).toBeTruthy()
    expect(errors.max_bmi).toBeTruthy()
  })
})

describe('synthetic dataset', () => {
  it('creates 200 patients and 10 trials including demo cases', () => {
    const patients = generateSyntheticPatients()
    expect(patients).toHaveLength(200)
    expect(SYNTHETIC_TRIALS).toHaveLength(10)
    expect(patients[0]).toMatchObject({
      patient_id: 'P001',
      condition: 'Type 2 Diabetes Mellitus',
      hba1c: 7.2,
    })
    expect(patients.find((item) => item.patient_id === 'P002').hba1c).toBe(8.2)
    expect(new Set(patients.map((item) => item.patient_id)).size).toBe(200)
  })
})
