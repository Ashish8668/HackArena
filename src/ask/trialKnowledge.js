export const TRIAL_KNOWLEDGE = {
  T001: {
    purpose: 'Oral medicine study for type 2 diabetes. Not a diagnosis tool.',
    visits: 'Clinic visits for blood sugar and safety checks.',
  },
  T002: {
    purpose: 'Study of tighter blood sugar control in type 2 diabetes.',
    visits: 'Regular glucose and HbA1c checks.',
  },
  T003: {
    purpose: 'Outcomes study for high blood pressure.',
    visits: 'Blood pressure and lab visits.',
  },
  T004: {
    purpose: 'Lifestyle study for high blood pressure in women.',
    visits: 'Diet, activity, and blood pressure follow-up.',
  },
  T005: {
    purpose: 'Inhaler study for COPD.',
    visits: 'Lung function and inhaler checks.',
  },
  T006: {
    purpose: 'Pulmonary rehabilitation study for COPD.',
    visits: 'Exercise and breathing sessions.',
  },
  T007: {
    purpose: 'Device study for heart failure.',
    visits: 'Heart checks and device follow-up.',
  },
  T008: {
    purpose: 'Weight management study for obesity.',
    visits: 'Weight, labs, and visit schedule.',
  },
  T009: {
    purpose: 'Closed-loop insulin study for type 1 diabetes.',
    visits: 'Device training and glucose follow-up.',
  },
  T010: {
    purpose: 'Kidney function study for CKD.',
    visits: 'Kidney labs and clinic visits.',
  },
}

export function defaultKnowledgeText(trialId) {
  const extra = TRIAL_KNOWLEDGE[trialId]
  if (!extra) return ''
  return `${extra.purpose}\n${extra.visits}`
}
