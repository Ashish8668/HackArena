import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  Database,
  Key,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  Users,
} from 'lucide-react'
import { listTrials, upsertTrial, deleteTrial } from '../firebase/trials'
import { listPatients } from '../firebase/patients'
import { listMatches } from '../firebase/matches'
import { listRecruitment } from '../firebase/recruitment'
import {
  storeListDrugs,
  storeUpsertDrug,
  listAuditLogs,
  logAuditEvent,
} from '../services/dataStore'
import {
  getStoredGeminiKey,
  setStoredGeminiKey,
  testGeminiApiKey,
  hasGeminiKey,
} from '../services/geminiService'
import { MEDICINE_EXCLUSION_SCOPES } from '../matching/config'
import Modal from '../components/Modal'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('trials') // 'trials' | 'drugs' | 'analytics' | 'api_key'
  const [trials, setTrials] = useState([])
  const [patients, setPatients] = useState([])
  const [matches, setMatches] = useState([])
  const [recruitment, setRecruitment] = useState([])
  const [drugs, setDrugs] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)

  // API Key State
  const [apiKeyInput, setApiKeyInput] = useState(() => getStoredGeminiKey())
  const [apiTesting, setApiTesting] = useState(false)
  const [apiStatus, setApiStatus] = useState(null) // { success: boolean, message: string }

  // Trial Edit Modal
  const [trialModalOpen, setTrialModalOpen] = useState(false)
  const [editingTrial, setEditingTrial] = useState(null)

  // Drug Edit Modal
  const [drugModalOpen, setDrugModalOpen] = useState(false)
  const [editingDrug, setEditingDrug] = useState(null)
  const [drugSearch, setDrugSearch] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [t, p, m, r, d] = await Promise.all([
        listTrials(),
        listPatients(),
        listMatches(),
        listRecruitment(),
        storeListDrugs(),
      ])
      setTrials(t)
      setPatients(p)
      setMatches(m)
      setRecruitment(r)
      setDrugs(d)
      setAuditLogs(listAuditLogs())
    } catch (err) {
      console.error('Failed to load admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Gemini API Key Handlers
  async function handleSaveApiKey() {
    setStoredGeminiKey(apiKeyInput)
    setApiStatus({ success: true, message: 'Gemini API key saved to local environment!' })
    logAuditEvent('GEMINI_API_KEY_UPDATED', {})
  }

  async function handleTestApiKey() {
    setApiTesting(true)
    setApiStatus(null)
    const result = await testGeminiApiKey(apiKeyInput)
    setApiTesting(false)
    setApiStatus(result)
  }

  // Trial Handlers
  async function handleSaveTrial(e) {
    e.preventDefault()
    const form = e.target
    const updated = {
      trial_id: form.trial_id.value,
      title: form.title.value,
      condition: form.condition.value,
      min_age: Number(form.min_age.value),
      max_age: Number(form.max_age.value),
      gender: form.gender.value,
      max_hba1c: Number(form.max_hba1c.value),
      min_bmi: Number(form.min_bmi.value),
      max_bmi: Number(form.max_bmi.value),
      excluded_medicine: form.excluded_medicine.value,
      medicine_scope: form.medicine_scope.value,
      site_location: form.site_location.value,
    }
    await upsertTrial(updated)
    logAuditEvent('TRIAL_ADMIN_UPSERT', { trial_id: updated.trial_id })
    setTrialModalOpen(false)
    setEditingTrial(null)
    loadAll()
  }

  // Drug Handlers
  async function handleSaveDrug(e) {
    e.preventDefault()
    const form = e.target
    const newDrug = {
      id: editingDrug?.id || `DRUG-${Date.now().toString().slice(-4)}`,
      name: form.name.value,
      class: form.drug_class.value,
      atc: form.atc.value,
      mechanism: form.mechanism.value,
      indication: form.indication.value,
      aliases: form.aliases.value.split(',').map((s) => s.trim()).filter(Boolean),
    }
    await storeUpsertDrug(newDrug)
    logAuditEvent('DRUG_KB_UPSERT', { drug_name: newDrug.name })
    setDrugModalOpen(false)
    setEditingDrug(null)
    loadAll()
  }

  const filteredDrugs = drugs.filter((d) => {
    const term = drugSearch.toLowerCase()
    return (
      d.name.toLowerCase().includes(term) ||
      d.class.toLowerCase().includes(term) ||
      (d.aliases && d.aliases.some((a) => a.toLowerCase().includes(term)))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-teal-700">
            <Shield className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">System Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Control Center</h1>
          <p className="text-xs text-slate-500">
            Manage protocols, exclusion scopes, Drug Knowledge Base (RAG), Gemini AI settings, and system audit logs.
          </p>
        </div>

        {/* Tab switcher buttons */}
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('trials')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'trials' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Trials & Scopes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('drugs')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'drugs' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Drug Knowledge Base
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('api_key')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'api_key' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            AI & Gemini RAG
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'analytics' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Audit & System Logs
          </button>
        </div>
      </div>

      {/* ================= TAB 1: TRIALS & EXCLUSION SCOPES ================= */}
      {activeTab === 'trials' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Clinical Protocol Management</h2>
            <button
              type="button"
              onClick={() => {
                setEditingTrial(null)
                setTrialModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800"
            >
              <Plus className="h-4 w-4" /> Add Protocol
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Protocol ID</th>
                  <th className="px-4 py-3">Title & Location</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3">Age / Gender</th>
                  <th className="px-4 py-3">HbA1c / BMI</th>
                  <th className="px-4 py-3">Excluded Drug</th>
                  <th className="px-4 py-3">Exclusion Scope</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trials.map((t) => (
                  <tr key={t.trial_id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-teal-800">{t.trial_id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{t.title}</div>
                      <div className="text-[11px] text-slate-400">{t.site_location || 'City Research Site'}</div>
                    </td>
                    <td className="px-4 py-3">{t.condition}</td>
                    <td className="px-4 py-3">{t.min_age}-{t.max_age} yr · {t.gender}</td>
                    <td className="px-4 py-3">&lt;= {t.max_hba1c}% · BMI {t.min_bmi}-{t.max_bmi}</td>
                    <td className="px-4 py-3 font-semibold text-amber-900">{t.excluded_medicine || 'None'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-teal-50 px-2 py-0.5 font-mono text-[10px] font-bold text-teal-800 border border-teal-200">
                        {t.medicine_scope || 'exact_drug'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTrial(t)
                            setTrialModalOpen(true)
                          }}
                          className="font-medium text-teal-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Delete protocol ${t.trial_id}?`)) {
                              await deleteTrial(t.trial_id)
                              loadAll()
                            }
                          }}
                          className="font-medium text-rose-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ================= TAB 2: DRUG KNOWLEDGE BASE ================= */}
      {activeTab === 'drugs' && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Drug Knowledge Base (RAG Source)</h2>
              <p className="text-xs text-slate-500">
                Maintains canonical drug entities, brand aliases, ATC classifications, and mechanisms for AI matching.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search drug names, classes, aliases..."
                  value={drugSearch}
                  onChange={(e) => setDrugSearch(e.target.value)}
                  className="rounded-xl border border-slate-300 py-1.5 pl-8 pr-3 text-xs focus:outline-hidden"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingDrug(null)
                  setDrugModalOpen(true)
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-800"
              >
                <Plus className="h-3.5 w-3.5" /> Add Drug
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Generic Name</th>
                  <th className="px-4 py-3">Brand Aliases</th>
                  <th className="px-4 py-3">Pharmacological Class</th>
                  <th className="px-4 py-3">ATC Code</th>
                  <th className="px-4 py-3">Mechanism of Action</th>
                  <th className="px-4 py-3">Indication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDrugs.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-900">{d.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {Array.isArray(d.aliases) ? d.aliases.join(', ') : d.aliases || '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-teal-800">{d.class}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{d.atc || '—'}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 max-w-xs truncate" title={d.mechanism}>
                      {d.mechanism}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.indication || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ================= TAB 3: AI & GEMINI RAG CONFIG ================= */}
      {activeTab === 'api_key' && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-6 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-teal-950">Google Gemini API & RAG Configuration</h2>
                <p className="text-xs text-teal-800">
                  Power the AI Medicine Helper and Multilingual Outreach Generator in English, Hindi, and Marathi.
                </p>
              </div>
            </div>

            {/* Privacy Compliance Banner */}
            <div className="mt-4 rounded-xl border border-teal-200 bg-white p-3.5 text-xs text-teal-900">
              <span className="font-bold">Strict Privacy Architecture: </span>
              In compliance with clinical privacy standards, only drug names and pharmacological monographs are sent to Gemini AI. Zero patient names, identifiers, or personal clinical details are ever transmitted.
            </div>

            {/* API Key Input Form */}
            <div className="mt-5 space-y-3">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Key className="h-3.5 w-3.5 text-teal-700" />
                Gemini API Key
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter your Gemini API key (e.g. AIzaSy...)"
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-xs focus:border-teal-700 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-800"
                >
                  Save API Key
                </button>
                <button
                  type="button"
                  onClick={handleTestApiKey}
                  disabled={apiTesting || !apiKeyInput}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${apiTesting ? 'animate-spin' : ''}`} />
                  {apiTesting ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Stored safely in your browser session/localStorage. Can also be set in <code className="bg-slate-100 px-1 py-0.5 rounded">.env</code> as <code className="bg-slate-100 px-1 py-0.5 rounded">VITE_GEMINI_API_KEY</code>.
              </p>
            </div>

            {/* Test Status Alert */}
            {apiStatus && (
              <div
                className={`mt-4 rounded-xl border p-3 text-xs font-semibold ${
                  apiStatus.success
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : 'border-rose-300 bg-rose-50 text-rose-900'
                }`}
              >
                {apiStatus.success ? '✓ ' : '✕ '} {apiStatus.message}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================= TAB 4: AUDIT LOGS & ANALYTICS ================= */}
      {activeTab === 'analytics' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Activity & Audit Logs</h2>
              <p className="text-xs text-slate-500">
                Immutable audit trace of all matching runs, outreach drafts, and consent submissions.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action Type</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Event ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-teal-800">{log.action}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      {JSON.stringify(log.details)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{log.id}</td>
                  </tr>
                ))}
                {!auditLogs.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                      No audit events logged yet. Actions like outreach and consent will appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Trial Create/Edit Modal */}
      {trialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              {editingTrial ? `Edit Protocol: ${editingTrial.trial_id}` : 'Create New Protocol'}
            </h2>
            <form onSubmit={handleSaveTrial} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Protocol ID</label>
                  <input
                    name="trial_id"
                    defaultValue={editingTrial?.trial_id || `T${String(trials.length + 1).padStart(3, '0')}`}
                    required
                    readOnly={Boolean(editingTrial)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Condition Indication</label>
                  <input
                    name="condition"
                    defaultValue={editingTrial?.condition || 'Type 2 Diabetes Mellitus'}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Protocol Title</label>
                <input
                  name="title"
                  defaultValue={editingTrial?.title || ''}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Min Age</label>
                  <input
                    type="number"
                    name="min_age"
                    defaultValue={editingTrial?.min_age ?? 30}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Max Age</label>
                  <input
                    type="number"
                    name="max_age"
                    defaultValue={editingTrial?.max_age ?? 65}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Gender Target</label>
                  <select
                    name="gender"
                    defaultValue={editingTrial?.gender || 'Any'}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  >
                    <option value="Any">Any</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Max HbA1c (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="max_hba1c"
                    defaultValue={editingTrial?.max_hba1c ?? 8.0}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Min BMI</label>
                  <input
                    type="number"
                    step="0.5"
                    name="min_bmi"
                    defaultValue={editingTrial?.min_bmi ?? 18}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Max BMI</label>
                  <input
                    type="number"
                    step="0.5"
                    name="max_bmi"
                    defaultValue={editingTrial?.max_bmi ?? 35}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Excluded Medicine</label>
                  <input
                    name="excluded_medicine"
                    defaultValue={editingTrial?.excluded_medicine || 'Insulin'}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Medicine Exclusion Scope</label>
                  <select
                    name="medicine_scope"
                    defaultValue={editingTrial?.medicine_scope || 'exact_drug'}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  >
                    {MEDICINE_EXCLUSION_SCOPES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Site Location</label>
                <input
                  name="site_location"
                  defaultValue={editingTrial?.site_location || 'Memorial Research Hospital, Site A'}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTrialModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800"
                >
                  Save Protocol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drug Knowledge Base Modal */}
      {drugModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Add Drug to Knowledge Base</h2>
            <form onSubmit={handleSaveDrug} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Generic Drug Name</label>
                <input
                  name="name"
                  defaultValue={editingDrug?.name || ''}
                  required
                  placeholder="e.g. Dapagliflozin"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Brand Aliases (comma separated)</label>
                <input
                  name="aliases"
                  defaultValue={editingDrug ? editingDrug.aliases.join(', ') : ''}
                  placeholder="e.g. Farxiga, Forxiga"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Pharmacological Class</label>
                  <input
                    name="drug_class"
                    defaultValue={editingDrug?.class || ''}
                    placeholder="e.g. SGLT2 Inhibitor"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">ATC Code</label>
                  <input
                    name="atc"
                    defaultValue={editingDrug?.atc || ''}
                    placeholder="e.g. A10BK01"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Mechanism of Action</label>
                <textarea
                  name="mechanism"
                  rows={2}
                  defaultValue={editingDrug?.mechanism || ''}
                  placeholder="Describe biological pathway and mechanism..."
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Primary Indication</label>
                <input
                  name="indication"
                  defaultValue={editingDrug?.indication || ''}
                  placeholder="e.g. Type 2 Diabetes, Heart Failure"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDrugModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800"
                >
                  Save Drug
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
