/**
 * Comprehensive Drug Knowledge Base for TrialMatch Core System
 * Includes generic names, brand aliases, ATC classification codes,
 * pharmacological classes, mechanisms of action, and clinical indications.
 */

export const DRUG_KNOWLEDGE_BASE = [
  {
    id: 'DRUG-001',
    name: 'Metformin',
    aliases: ['Glucophage', 'Fortamet', 'Riomet', 'Glumetza', 'Obimet'],
    class: 'Biguanide',
    atc: 'A10BA02',
    mechanism: 'Decreases hepatic glucose production, decreases intestinal absorption of glucose, improves insulin sensitivity',
    indication: 'Type 2 Diabetes Mellitus',
    category: 'Antidiabetic',
    isExcludedByDefault: false,
  },
  {
    id: 'DRUG-002',
    name: 'Insulin',
    aliases: [
      'Humalog',
      'Lantus',
      'Novolog',
      'Levemir',
      'Tresiba',
      'Toujeo',
      'Apidra',
      'Humulin',
      'Novolin',
      'Insulin Glargine',
      'Insulin Lispro',
      'Insulin Aspart',
    ],
    class: 'Insulins and analogues',
    atc: 'A10A',
    mechanism: 'Stimulates peripheral glucose uptake, inhibits hepatic glucose production, inhibits lipolysis and proteolysis',
    indication: 'Type 1 Diabetes Mellitus, advanced Type 2 Diabetes Mellitus',
    category: 'Antidiabetic',
    isExcludedByDefault: true,
  },
  {
    id: 'DRUG-003',
    name: 'Lisinopril',
    aliases: ['Prinivil', 'Zestril', 'Qbrelis'],
    class: 'ACE inhibitor',
    atc: 'C09AA03',
    mechanism: 'Inhibits Angiotensin-Converting Enzyme, suppressing the renin-angiotensin-aldosterone system (RAAS)',
    indication: 'Hypertension, Heart Failure, Post-Myocardial Infarction',
    category: 'Antihypertensive',
    relatedClasses: ['ARB (Angiotensin II Receptor Blocker)'],
  },
  {
    id: 'DRUG-004',
    name: 'Amlodipine',
    aliases: ['Norvasc', 'Katerzia', 'Amvaz'],
    class: 'Calcium channel blocker (Dihydropyridine)',
    atc: 'C08CA01',
    mechanism: 'Inhibits transmembrane influx of calcium ions into cardiac and vascular smooth muscle',
    indication: 'Hypertension, Coronary Artery Disease, Chronic Stable Angina',
    category: 'Antihypertensive',
  },
  {
    id: 'DRUG-005',
    name: 'Albuterol',
    aliases: ['Salbutamol', 'Ventolin', 'ProAir', 'Proventil', 'AccuNeb', 'Asthalin'],
    class: 'Short-acting Beta-2 Agonist (SABA)',
    atc: 'R03AC02',
    mechanism: 'Relaxes bronchial smooth muscle via selective beta-2 adrenergic receptor stimulation',
    indication: 'Asthma, COPD, Bronchospasm',
    category: 'Respiratory / Bronchodilator',
  },
  {
    id: 'DRUG-006',
    name: 'Prednisone',
    aliases: ['Deltasone', 'Sterapred', 'Rayos', 'Prednisolone'],
    class: 'Systemic Corticosteroid',
    atc: 'H02AB07',
    mechanism: 'Suppresses inflammation and normal immune response through glucocorticoid receptor binding',
    indication: 'COPD Exacerbation, Severe Asthma, Autoimmune disorders, Inflammatory states',
    category: 'Immunosuppressant / Anti-inflammatory',
  },
  {
    id: 'DRUG-007',
    name: 'Furosemide',
    aliases: ['Lasix', 'Frusid'],
    class: 'Loop Diuretic',
    atc: 'C03CA01',
    mechanism: 'Inhibits sodium and chloride reabsorption in the ascending limb of the loop of Henle',
    indication: 'Edema, Congestive Heart Failure, Hepatic Cirrhosis, Renal Disease',
    category: 'Cardiovascular / Diuretic',
  },
  {
    id: 'DRUG-008',
    name: 'Semaglutide',
    aliases: ['Ozempic', 'Wegovy', 'Rybelsus'],
    class: 'GLP-1 Receptor Agonist',
    atc: 'A10BJ06',
    mechanism: 'Increases insulin secretion, decreases glucagon secretion, delays gastric emptying, suppresses appetite',
    indication: 'Type 2 Diabetes Mellitus, Chronic Weight Management (Obesity)',
    category: 'Antidiabetic / Anti-obesity',
  },
  {
    id: 'DRUG-009',
    name: 'Atorvastatin',
    aliases: ['Lipitor', 'Atorva', 'Storvas'],
    class: 'HMG-CoA Reductase Inhibitor (Statin)',
    atc: 'C10AA05',
    mechanism: 'Inhibits 3-hydroxy-3-methylglutaryl-coenzyme A reductase, the rate-limiting enzyme in cholesterol biosynthesis',
    indication: 'Hypercholesterolemia, Primary and Secondary Cardiovascular Prevention',
    category: 'Lipid-lowering',
  },
  {
    id: 'DRUG-010',
    name: 'Empagliflozin',
    aliases: ['Jardiance'],
    class: 'SGLT2 Inhibitor',
    atc: 'A10BK03',
    mechanism: 'Inhibits sodium-glucose co-transporter 2 in the proximal renal tubules, reducing glucose reabsorption',
    indication: 'Type 2 Diabetes Mellitus, Heart Failure, Chronic Kidney Disease',
    category: 'Antidiabetic / Cardiorenal',
  },
  {
    id: 'DRUG-011',
    name: 'Digoxin',
    aliases: ['Lanoxin', 'Cardoxin'],
    class: 'Cardiac Glycoside',
    atc: 'C01AA05',
    mechanism: 'Inhibits sodium-potassium ATPase, increasing intracellular calcium and myocardial contractility',
    indication: 'Heart Failure with reduced ejection fraction, Atrial Fibrillation',
    category: 'Inotropic Agent',
  },
  {
    id: 'DRUG-012',
    name: 'Ibuprofen',
    aliases: ['Advil', 'Motrin', 'Brufen', 'Nurofen'],
    class: 'NSAID (Nonsteroidal Anti-inflammatory)',
    atc: 'M01AE01',
    mechanism: 'Non-selective inhibition of cyclooxygenase-1 and -2 (COX-1 and COX-2) enzymes',
    indication: 'Pain, Inflammation, Osteoarthritis, Rheumatoid Arthritis',
    category: 'Analgesic / Anti-inflammatory',
  },
  {
    id: 'DRUG-013',
    name: 'Spironolactone',
    aliases: ['Aldactone', 'CaroSpir'],
    class: 'Aldosterone Antagonist / Potassium-Sparing Diuretic',
    atc: 'C03DA01',
    mechanism: 'Competitively blocks aldosterone receptors in the late distal tubule and collecting duct',
    indication: 'Heart Failure, Resistant Hypertension, Edema, Primary Hyperaldosteronism',
    category: 'Cardiovascular / Diuretic',
  },
  {
    id: 'DRUG-014',
    name: 'Losartan',
    aliases: ['Cozaar'],
    class: 'ARB (Angiotensin II Receptor Blocker)',
    atc: 'C09CA01',
    mechanism: 'Blocks the vasoconstrictor and aldosterone-secreting effects of angiotensin II at AT1 receptors',
    indication: 'Hypertension, Diabetic Nephropathy',
    category: 'Antihypertensive',
    relatedClasses: ['ACE inhibitor'],
  },
  {
    id: 'DRUG-015',
    name: 'Oxygen',
    aliases: ['Supplemental Oxygen', 'O2 therapy', 'Long-term Oxygen Therapy'],
    class: 'Medical Gas / Respiratory Support',
    atc: 'V03AN01',
    mechanism: 'Increases alveolar oxygen partial pressure and improves tissue oxygenation',
    indication: 'Severe Hypoxemia, Advanced COPD, Respiratory Failure',
    category: 'Respiratory Therapy',
  },
]

/**
 * Clean and normalize a medicine string:
 * - lowercase
 * - remove dosages (e.g. 500mg, 10 units, 20 mcg, 5 ml)
 * - remove dosage forms (tablet, cap, injection, syrup, oral)
 * - strip extra punctuation and whitespace
 */
export function normalizeMedicineName(rawText) {
  if (!rawText) return ''
  let text = String(rawText).trim().toLowerCase()

  // Remove dosage patterns e.g., 500mg, 100 mg, 10units, 20mcg, 5ml, 2.5mg/ml, etc.
  text = text.replace(/\b\d+(\.\d+)?\s*(mg|mcg|g|ml|units?|u|iu|%)\b/gi, '')
  // Remove numbers that might be standalone dosage indications
  text = text.replace(/\b\d+(\.\d+)?\b/g, '')

  // Remove dosage form terms
  const forms = [
    'tablets?',
    'capsules?',
    'injections?',
    'oral',
    'solution',
    'suspension',
    'syrup',
    'inhaler',
    'spray',
    'drops?',
    'ointment',
    'cream',
    'patch',
    'daily',
    'bid',
    'tid',
    'qd',
    'prn',
  ]
  const formsRegex = new RegExp(`\\b(${forms.join('|')})\\b`, 'gi')
  text = text.replace(formsRegex, '')

  // Strip punctuation and excess whitespace
  text = text.replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim()

  return text
}

/**
 * Look up a normalized medicine in the Drug Knowledge Base.
 * Matches by generic name or alias/brand name.
 */
export function lookupDrugInKnowledgeBase(medText) {
  const normalized = normalizeMedicineName(medText)
  if (!normalized || normalized === 'none' || normalized === 'n a' || normalized === 'na') {
    return null
  }

  // Exact generic match
  const exact = DRUG_KNOWLEDGE_BASE.find(
    (d) => d.name.toLowerCase() === normalized
  )
  if (exact) return exact

  // Check aliases
  const aliasMatch = DRUG_KNOWLEDGE_BASE.find((d) =>
    d.aliases.some((alias) => alias.toLowerCase() === normalized)
  )
  if (aliasMatch) return aliasMatch

  // Substring or fuzzy token match
  const partial = DRUG_KNOWLEDGE_BASE.find(
    (d) =>
      d.name.toLowerCase().includes(normalized) ||
      normalized.includes(d.name.toLowerCase()) ||
      d.aliases.some((a) => a.toLowerCase().includes(normalized) || normalized.includes(a.toLowerCase()))
  )
  return partial || null
}

/**
 * Retrieve relevant drug knowledge monographs for RAG prompt augmentation
 */
export function getDrugKnowledgeContext(patientMed, excludedMed) {
  const pDrug = lookupDrugInKnowledgeBase(patientMed)
  const eDrug = lookupDrugInKnowledgeBase(excludedMed)

  const entries = []
  if (pDrug) entries.push(pDrug)
  if (eDrug && (!pDrug || eDrug.id !== pDrug.id)) entries.push(eDrug)

  return {
    patientDrug: pDrug,
    excludedDrug: eDrug,
    monographs: entries.map((d) => ({
      name: d.name,
      aliases: d.aliases.join(', '),
      class: d.class,
      atc: d.atc,
      mechanism: d.mechanism,
      indication: d.indication,
    })),
  }
}
