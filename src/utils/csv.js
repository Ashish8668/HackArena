import Papa from 'papaparse'
import { PATIENT_FIELDS, TRIAL_FIELDS, validatePatient, validateTrial } from './validation'

function parseRows(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(result.data),
      error: reject,
    })
  })
}

function pickFields(row, fields) {
  const record = {}
  fields.forEach((field) => {
    record[field] = row[field] ?? row[field.toUpperCase()] ?? ''
  })
  return record
}

export async function parsePatientCsv(file) {
  const rows = await parseRows(file)
  const valid = []
  const invalid = []
  rows.forEach((row, index) => {
    const record = pickFields(row, PATIENT_FIELDS)
    const errors = validatePatient(record)
    if (Object.keys(errors).length) invalid.push({ index: index + 2, errors, record })
    else valid.push(record)
  })
  return { valid, invalid }
}

export async function parseTrialCsv(file) {
  const rows = await parseRows(file)
  const valid = []
  const invalid = []
  rows.forEach((row, index) => {
    const record = pickFields(row, TRIAL_FIELDS)
    const errors = validateTrial(record)
    if (Object.keys(errors).length) invalid.push({ index: index + 2, errors, record })
    else valid.push(record)
  })
  return { valid, invalid }
}
