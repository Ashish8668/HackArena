import {
  storeListPatients,
  storeGetPatient,
  storeUpsertPatient,
  storeDeletePatient,
} from '../services/dataStore'

export async function listPatients() {
  return storeListPatients()
}

export async function getPatient(patientId) {
  return storeGetPatient(patientId)
}

export async function getPatientByUid(uid) {
  const all = await storeListPatients()
  return all.find((p) => p.uid === uid) || all[0] || null
}

export function isProfileComplete(patient) {
  if (!patient) return false
  return Boolean(
    patient.name &&
      patient.email &&
      patient.age !== '' &&
      patient.age != null &&
      !Number.isNaN(Number(patient.age)) &&
      patient.gender &&
      patient.condition &&
      patient.hba1c !== '' &&
      patient.hba1c != null &&
      !Number.isNaN(Number(patient.hba1c)) &&
      patient.bmi !== '' &&
      patient.bmi != null &&
      !Number.isNaN(Number(patient.bmi)) &&
      patient.current_medicine,
  )
}

export async function upsertPatient(patient) {
  return storeUpsertPatient(patient)
}

export async function updatePatient(patientId, updates) {
  const existing = await storeGetPatient(patientId)
  if (existing) {
    return storeUpsertPatient({ ...existing, ...updates })
  }
}

export async function deletePatient(patientId) {
  return storeDeletePatient(patientId)
}
