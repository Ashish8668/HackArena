import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  HeartHandshake,
  HeartPulse,
  Mail,
  MapPin,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getPatientByUid, isProfileComplete } from '../../firebase/patients'
import { listMatchesForPatient } from '../../firebase/matches'
import { listTrials } from '../../firebase/trials'
import { listRecruitmentForPatient, upsertRecruitment } from '../../firebase/recruitment'
import { RECRUITMENT_STATUSES } from '../../matching/config'
import StatusBadge from '../../components/StatusBadge'
import { logAuditEvent } from '../../services/dataStore'

export default function PatientHomePage() {
  const { user, profile } = useAuth()
  const [patient, setPatient] = useState(null)
  const [matches, setMatches] = useState([])
  const [trials, setTrials] = useState([])
  const [recruitmentMap, setRecruitmentMap] = useState({})
  const [error, setError] = useState('')
  const [appliedSuccess, setAppliedSuccess] = useState({})
  const [activeConsentTrial, setActiveConsentTrial] = useState(null)

  useEffect(() => {
    if (!user) return
    Promise.all([getPatientByUid(user.uid), listTrials()])
      .then(async ([nextPatient, nextTrials]) => {
        setPatient(nextPatient)
        setTrials(nextTrials)
        if (nextPatient) {
          const [nextMatches, nextRecruitment] = await Promise.all([
            listMatchesForPatient(nextPatient.patient_id),
            listRecruitmentForPatient(nextPatient.patient_id),
          ])

          // Per specification & architecture diagram:
          // "Patient View: Only eligible trials. No near-misses or non-eligible trials."
          const eligibleOnly = nextMatches.filter((item) => item.eligible)
          setMatches(eligibleOnly)

          const rMap = {}
          nextRecruitment.forEach((r) => {
            rMap[r.trial_id] = r
          })
          setRecruitmentMap(rMap)
        }
      })
      .catch((err) => setError(err.message))
  }, [user])

  async function handleApplyForTrial(trialId) {
    if (!patient) return
    try {
      const existing = recruitmentMap[trialId] || {}
      const updated = {
        ...existing,
        patient_id: patient.patient_id,
        trial_id: trialId,
        status: existing.status || 'Identified',
        applied_by_patient: true,
        appliedAt: new Date().toISOString(),
      }
      await upsertRecruitment(updated)
      setRecruitmentMap((prev) => ({ ...prev, [trialId]: updated }))
      setAppliedSuccess((prev) => ({ ...prev, [trialId]: true }))
      logAuditEvent('PATIENT_APPLIED_FOR_TRIAL', {
        patient_id: patient.patient_id,
        trial_id: trialId,
      })
    } catch (err) {
      alert('Application failed: ' + err.message)
    }
  }

  async function handleGrantConsent(trialId) {
    if (!patient) return
    try {
      const existing = recruitmentMap[trialId] || {}
      const updated = {
        ...existing,
        patient_id: patient.patient_id,
        trial_id: trialId,
        status: 'Screened', // Consent advances stage to Screened
        consent_status: 'Granted',
        consent_date: new Date().toISOString(),
      }
      await upsertRecruitment(updated)
      setRecruitmentMap((prev) => ({ ...prev, [trialId]: updated }))
      setActiveConsentTrial(null)
      logAuditEvent('PATIENT_CONSENT_GRANTED', {
        patient_id: patient.patient_id,
        trial_id: trialId,
      })
    } catch (err) {
      alert('Error recording consent: ' + err.message)
    }
  }

  if (!isProfileComplete(patient)) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-8 shadow-xs">
        <div className="flex items-center gap-3 text-amber-900">
          <HeartPulse className="h-6 w-6 text-amber-700" />
          <h1 className="text-xl font-bold">Complete your clinical profile</h1>
        </div>
        <p className="mt-2 text-sm text-amber-900">
          To discover studies you are eligible for, enter your basic health indicators (Age, HbA1c, BMI, and current medication).
        </p>
        <Link
          to="/app/profile"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-800"
        >
          Complete My Profile
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Patient Self Access</span>
            <h1 className="text-2xl font-bold text-slate-900">Eligible Clinical Studies</h1>
            <p className="text-xs text-slate-500">
              Welcome back, <strong>{patient.name}</strong>. Here are the active clinical trials you qualify for based on your clinical profile.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-900">
            <ShieldCheck className="h-4 w-4 text-teal-700" />
            <span>Privacy Secured · Practice Data</span>
          </div>
        </div>

        {/* Profile pills */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700">
            Condition: <strong>{patient.condition}</strong>
          </span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700">
            Age: <strong>{patient.age} yr</strong>
          </span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700">
            HbA1c: <strong>{patient.hba1c}%</strong>
          </span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700">
            BMI: <strong>{patient.bmi}</strong>
          </span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700">
            Medication: <strong>{patient.current_medicine}</strong>
          </span>
        </div>
      </div>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}

      {/* Eligible Trials List */}
      <div className="space-y-4">
        {matches.map((match) => {
          const trial = trials.find((item) => item.trial_id === match.trial_id)
          const record = recruitmentMap[match.trial_id]
          const stage = record?.status || 'Identified'
          const consent = record?.consent_status || 'Pending'
          const hasApplied = record?.applied_by_patient || appliedSuccess[match.trial_id]
          const outreach = record?.outreach_text

          return (
            <article
              key={match.trial_id}
              className="rounded-3xl border border-teal-200 bg-white p-6 shadow-xs transition hover:shadow-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800 border border-emerald-200">
                      {match.trial_id}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">{match.title || trial?.title}</h2>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-teal-700" />
                      {trial?.site_location || 'City Medical Research Center'}
                    </span>
                    <span>·</span>
                    <span>Target Indication: <strong>{trial?.condition}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
                    <Flame className="h-3.5 w-3.5 text-amber-500" />
                    Priority Score: {match.priority_score ?? 88}/100
                  </div>
                  <span className="rounded-xl bg-teal-100 px-3 py-1 text-xs font-bold text-teal-900">
                    Eligible ✓
                  </span>
                </div>
              </div>

              {/* Protocol Details Summary */}
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
                <div className="font-semibold text-slate-800">Study Summary & Inclusion Criteria:</div>
                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4 mt-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Acceptable Age</span>
                    <div className="font-medium text-slate-700">{trial?.min_age} - {trial?.max_age} years</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Target Gender</span>
                    <div className="font-medium text-slate-700">{trial?.gender || 'Any'}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">HbA1c Threshold</span>
                    <div className="font-medium text-slate-700">&lt;= {trial?.max_hba1c}%</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">BMI Limit</span>
                    <div className="font-medium text-slate-700">{trial?.min_bmi} - {trial?.max_bmi}</div>
                  </div>
                </div>
              </div>

              {/* Outreach message from Coordinator if available */}
              {outreach && (
                <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/80 p-4 text-xs">
                  <div className="flex items-center gap-2 font-bold text-teal-950">
                    <Mail className="h-4 w-4 text-teal-700" />
                    Invitation Message from Research Coordinator:
                  </div>
                  <p className="mt-2 whitespace-pre-line font-mono text-[11px] leading-relaxed text-teal-900">
                    {outreach}
                  </p>
                </div>
              )}

              {/* Recruitment Pipeline Progress Bar */}
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    Recruitment Stage: <strong>{stage}</strong>
                  </span>
                  <span className={`font-semibold ${consent === 'Granted' ? 'text-emerald-700' : 'text-slate-500'}`}>
                    Informed Consent: {consent}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  {RECRUITMENT_STATUSES.map((st, i) => {
                    const currentIdx = RECRUITMENT_STATUSES.indexOf(stage)
                    const active = i <= currentIdx
                    return (
                      <div
                        key={st}
                        className={`h-2 flex-1 rounded-full transition-all ${
                          active ? 'bg-emerald-600' : 'bg-slate-200'
                        }`}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Action Buttons: Apply for Trial & Patient Consent */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  {!hasApplied ? (
                    <button
                      type="button"
                      onClick={() => handleApplyForTrial(match.trial_id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Apply for Study / Submit Interest
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> Application Submitted
                    </span>
                  )}

                  {consent !== 'Granted' ? (
                    <button
                      type="button"
                      onClick={() => setActiveConsentTrial(trial || match)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
                    >
                      <HeartHandshake className="h-3.5 w-3.5 text-emerald-700" />
                      Review & Give Consent for Screening
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> Consent Granted ({new Date(record?.consent_date).toLocaleDateString()})
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-slate-400">
                  Participation is 100% voluntary. You may withdraw at any time.
                </span>
              </div>
            </article>
          )
        })}

        {!matches.length && (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
            <HeartPulse className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-base font-bold text-slate-800">No Eligible Trials Found Yet</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Based on the currently recruiting trials, there are no exact matches for your profile at this moment. You can update your clinical information or check back soon as new protocols are registered.
            </p>
            <Link
              to="/app/profile"
              className="mt-4 inline-block rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white"
            >
              Update Profile Details
            </Link>
          </div>
        )}
      </div>

      {/* Informed Consent Modal */}
      {activeConsentTrial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-teal-800">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">Informed Consent for Screening</h2>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-600">
              By consenting, you agree to allow the clinical research coordinator at{' '}
              <strong>{activeConsentTrial.site_location || 'the study site'}</strong> to review your health records and schedule an initial screening conversation for study{' '}
              <strong>"{activeConsentTrial.title}"</strong>.
            </p>

            <ul className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600">
              <li>• Participation is strictly voluntary and will not affect routine medical care.</li>
              <li>• Nobody is enrolled into clinical interventions without in-person informed consent.</li>
              <li>• You can withdraw your consent at any time without penalty.</li>
            </ul>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setActiveConsentTrial(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleGrantConsent(activeConsentTrial.trial_id)}
                className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
              >
                I Agree & Give Consent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
