import { describe, expect, it } from 'vitest'
import {
  evaluatePatientTrial,
  evaluateAge,
  evaluateHba1c,
  evaluateBmi,
} from '../matching/eligibilityEngine'
import { calculatePriorityScore } from '../matching/priorityScoring'
import {
  normalizeMedicineName,
  lookupDrugInKnowledgeBase,
} from '../data/drugKnowledgeBase'
import { evaluateMedicineConflict } from '../services/aiMedicineHelper'
import { evaluateNearEligibility } from '../matching/nearEligibility'
import { generateOutreachMessage } from '../services/geminiService'
import { searchTrialsByQuery } from '../semantic/trialSearch'

describe('Path 1: Priority Scoring (0-100)', () => {
  it('gives higher priority score to patients comfortably inside clinical limits', () => {
    const trial = {
      trial_id: 'T001',
      title: 'T2DM Study',
      min_age: 30,
      max_age: 70,
      max_hba1c: 8.0,
      min_bmi: 20,
      max_bmi: 35,
    }

    // Patient A is comfortably in the center (Age 50, HbA1c 6.5, BMI 27)
    const patientComfortable = {
      age: 50,
      hba1c: 6.5,
      bmi: 27,
    }

    // Patient B is borderline near boundaries (Age 68, HbA1c 7.9, BMI 34)
    const patientBorderline = {
      age: 68,
      hba1c: 7.9,
      bmi: 34,
    }

    const scoreA = calculatePriorityScore(patientComfortable, trial)
    const scoreB = calculatePriorityScore(patientBorderline, trial)

    expect(scoreA.total).toBeGreaterThan(scoreB.total)
    expect(scoreA.total).toBeGreaterThanOrEqual(80)
    expect(scoreB.total).toBeLessThan(75)
    expect(scoreA.breakdown).toBeDefined()
  })
})

describe('Path 2: Near-Miss Rescue & What-If gap calculation', () => {
  it('detects single small numeric gap for HbA1c within 0.5% tolerance', () => {
    const criteriaResults = {
      age: { status: 'PASS', patient_value: 50, required: '30-65' },
      gender: { status: 'PASS', patient_value: 'Male', required: 'Any' },
      condition: { status: 'PASS' },
      hba1c: { status: 'FAIL', patient_value: 8.2, required: '<= 8.0' },
      bmi: { status: 'PASS', patient_value: 26, required: '18-35' },
      medicine: { status: 'PASS' },
    }

    const near = evaluateNearEligibility(criteriaResults)
    expect(near.nearEligible).toBe(true)
    expect(near.nearMisses).toEqual(['hba1c'])
    expect(near.gapDetails).toBeDefined()
    expect(near.gapDetails.gap).toBe(0.2)
    expect(near.gapDetails.unit).toBe('%')
  })

  it('rejects patients with more than 1 failed criterion from near-miss (routes to Path 3)', () => {
    const criteriaResults = {
      age: { status: 'FAIL', patient_value: 75, required: '30-65' },
      gender: { status: 'PASS', patient_value: 'Male', required: 'Any' },
      condition: { status: 'PASS' },
      hba1c: { status: 'FAIL', patient_value: 8.3, required: '<= 8.0' },
      bmi: { status: 'PASS', patient_value: 26, required: '18-35' },
      medicine: { status: 'PASS' },
    }

    const near = evaluateNearEligibility(criteriaResults)
    expect(near.nearEligible).toBe(false)
    expect(near.failedCount).toBe(2)
  })
})

describe('AI Medicine Helper & Drug Knowledge Base (RAG)', () => {
  it('normalizes brand dosages and forms to canonical generic entities', () => {
    expect(normalizeMedicineName('Metformin 500mg tablet')).toBe('metformin')
    expect(normalizeMedicineName('Insulin 10 units injection')).toBe('insulin')
    expect(normalizeMedicineName('Lisinopril 20 mg oral')).toBe('lisinopril')
  })

  it('recognizes brand aliases in knowledge base', () => {
    const drug1 = lookupDrugInKnowledgeBase('Glucophage')
    expect(drug1).not.toBeNull()
    expect(drug1.name).toBe('Metformin')
    expect(drug1.class).toBe('Biguanide')

    const drug2 = lookupDrugInKnowledgeBase('Lantus')
    expect(drug2).not.toBeNull()
    expect(drug2.name).toBe('Insulin')
  })

  it('detects conflicts under exact_drug scope', async () => {
    const check1 = await evaluateMedicineConflict({
      patientMedicine: 'Metformin 500mg',
      excludedMedicine: 'Insulin',
      scope: 'exact_drug',
    })
    expect(check1.conflict).toBe(false)

    const check2 = await evaluateMedicineConflict({
      patientMedicine: 'Lantus 10u',
      excludedMedicine: 'Insulin',
      scope: 'exact_drug',
    })
    expect(check2.conflict).toBe(true)
    expect(check2.status).toBe('CONFLICT')
  })

  it('detects class conflicts under same_class scope', async () => {
    const check = await evaluateMedicineConflict({
      patientMedicine: 'Humalog',
      excludedMedicine: 'Insulin',
      scope: 'same_class',
    })
    expect(check.conflict).toBe(true)
  })
})

describe('Multilingual Outreach Message Generator', () => {
  it('generates outreach messages in English, Hindi, and Marathi', async () => {
    const trial = { title: 'Diabetes Prevention Study', site_location: 'Mumbai Clinic' }

    const en = await generateOutreachMessage({
      trialTitle: trial.title,
      patientName: 'Ramesh',
      siteLocation: trial.site_location,
      language: 'en',
      format: 'email',
    })
    expect(en.body).toContain('Diabetes Prevention Study')
    expect(en.body).toContain('Mumbai Clinic')

    const hi = await generateOutreachMessage({
      trialTitle: trial.title,
      patientName: 'रमेश',
      siteLocation: trial.site_location,
      language: 'hi',
      format: 'sms',
    })
    expect(hi.body).toContain('Diabetes Prevention Study')
    expect(hi.body).toContain('स्क्रीनिंग')

    const mr = await generateOutreachMessage({
      trialTitle: trial.title,
      patientName: 'रमेश',
      siteLocation: trial.site_location,
      language: 'mr',
      format: 'email',
    })
    expect(mr.body).toContain('Diabetes Prevention Study')
    expect(mr.body).toContain('संशोधन')
  })
})

describe('Refined Hybrid Trial Search', () => {
  it('instantly retrieves matching trials based on query keywords', async () => {
    const dummyTrials = [
      { trial_id: 'T001', title: 'Type 2 Diabetes Drug Trial', condition: 'T2DM' },
      { trial_id: 'T003', title: 'Hypertension Outcomes Trial', condition: 'HTN' },
      { trial_id: 'T005', title: 'COPD Inhaler Study', condition: 'COPD' },
    ]

    const results = await searchTrialsByQuery('diabetes', dummyTrials)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].trial_id).toBe('T001')
  })
})
