function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick(random, list) {
  return list[Math.floor(random() * list.length)]
}

function range(random, min, max, decimals = 0) {
  const value = min + random() * (max - min)
  return Number(value.toFixed(decimals))
}

const CONDITION_VARIANTS = [
  ['Type 2 Diabetes Mellitus', 'Type 2 Diabetes', 'T2DM', 'Type II Diabetes'],
  ['Hypertension', 'HTN', 'High Blood Pressure'],
  ['COPD', 'Chronic Obstructive Pulmonary Disease'],
  ['Type 1 Diabetes', 'T1DM', 'Type 1 Diabetes Mellitus'],
  ['Heart Failure', 'CHF', 'Congestive Heart Failure'],
  ['Obesity', 'Obesity Disorder'],
  ['CKD', 'Chronic Kidney Disease'],
  ['Asthma'],
]

const MEDICINES = [
  'Metformin',
  'Insulin',
  'Lisinopril',
  'Amlodipine',
  'Albuterol',
  'Prednisone',
  'Furosemide',
  'Semaglutide',
  'Atorvastatin',
  'Empagliflozin',
  'Digoxin',
  'Ibuprofen',
  'None',
]

function withContact(patient) {
  return {
    ...patient,
    name: `Synthetic ${patient.patient_id}`,
    email: `${patient.patient_id.toLowerCase()}@synthetic.local`,
    source: 'seed',
  }
}

const SPECIAL_PATIENTS = [
  {
    patient_id: 'P001',
    age: 45,
    gender: 'Male',
    condition: 'Type 2 Diabetes Mellitus',
    hba1c: 7.2,
    bmi: 28,
    current_medicine: 'Metformin',
  },
  {
    patient_id: 'P002',
    age: 52,
    gender: 'Female',
    condition: 'T2DM',
    hba1c: 8.2,
    bmi: 27,
    current_medicine: 'Metformin',
  },
  {
    patient_id: 'P003',
    age: 70,
    gender: 'Male',
    condition: 'Type 2 Diabetes',
    hba1c: 7.4,
    bmi: 26,
    current_medicine: 'Metformin',
  },
  {
    patient_id: 'P004',
    age: 48,
    gender: 'Male',
    condition: 'Type II Diabetes',
    hba1c: 7.1,
    bmi: 29,
    current_medicine: 'Insulin',
  },
  {
    patient_id: 'P005',
    age: 41,
    gender: 'Male',
    condition: 'High Blood Pressure',
    hba1c: 6.4,
    bmi: 26,
    current_medicine: 'Amlodipine',
  },
  {
    patient_id: 'P006',
    age: 38,
    gender: 'Female',
    condition: 'HTN',
    hba1c: 6.8,
    bmi: 24,
    current_medicine: 'Amlodipine',
  },
  {
    patient_id: 'P007',
    age: 61,
    gender: 'Male',
    condition: 'COPD',
    hba1c: 6.2,
    bmi: 22,
    current_medicine: 'Albuterol',
  },
  {
    patient_id: 'P008',
    age: 58,
    gender: 'Female',
    condition: 'Chronic Obstructive Pulmonary Disease',
    hba1c: 6.5,
    bmi: 33.5,
    current_medicine: 'Albuterol',
  },
  {
    patient_id: 'P009',
    age: 33,
    gender: 'Female',
    condition: 'Type 1 Diabetes Mellitus',
    hba1c: 8.1,
    bmi: 23,
    current_medicine: 'Insulin',
  },
  {
    patient_id: 'P010',
    age: 49,
    gender: 'Male',
    condition: 'Obesity Disorder',
    hba1c: 7.4,
    bmi: 36,
    current_medicine: 'Atorvastatin',
  },
]

export function generateSyntheticPatients() {
  const random = mulberry32(20260928)
  const patients = SPECIAL_PATIENTS.map(withContact)

  for (let i = patients.length + 1; i <= 200; i += 1) {
    const variants = pick(random, CONDITION_VARIANTS)
    patients.push(
      withContact({
        patient_id: `P${String(i).padStart(3, '0')}`,
        age: range(random, 18, 84, 0),
        gender: pick(random, ['Male', 'Female']),
        condition: pick(random, variants),
        hba1c: range(random, 5.2, 11.4, 1),
        bmi: range(random, 17, 46, 1),
        current_medicine: pick(random, MEDICINES),
      }),
    )
  }

  return patients
}
