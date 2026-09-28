import { Check, X } from 'lucide-react'

export default function CriterionRow({ name, result, expanded }) {
  const pass = result.status === 'PASS'
  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {pass ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-rose-600" />}
          <span className="font-medium capitalize">{name === 'hba1c' ? 'HbA1c' : name}</span>
        </div>
        <span className={pass ? 'text-sm font-semibold text-emerald-700' : 'text-sm font-semibold text-rose-700'}>
          {pass ? '✓ PASS' : '✗ FAIL'}
        </span>
      </div>
      {expanded || !pass ? (
        <div className="mt-2 grid gap-1 text-sm text-slate-600 md:grid-cols-2">
          <p>
            Patient value: <span className="font-medium text-slate-900">{String(result.patient_value)}</span>
          </p>
          <p>
            {result.required !== undefined ? (
              <>
                Required: <span className="font-medium text-slate-900">{result.required}</span>
              </>
            ) : null}
            {result.trial_value !== undefined ? (
              <>
                Trial value: <span className="font-medium text-slate-900">{result.trial_value}</span>
              </>
            ) : null}
            {result.excluded_medicine !== undefined ? (
              <>
                Excluded: <span className="font-medium text-slate-900">{result.excluded_medicine}</span>
              </>
            ) : null}
          </p>
          {result.semantic_similarity !== undefined ? (
            <p>
              Semantic similarity: <span className="font-medium">{result.semantic_similarity}</span>
            </p>
          ) : null}
          {result.reason ? <p className="md:col-span-2">Reason: {result.reason}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
