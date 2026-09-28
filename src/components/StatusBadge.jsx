const styles = {
  'POTENTIAL MATCH': 'bg-emerald-100 text-emerald-800',
  'NEAR MATCH': 'bg-amber-100 text-amber-800',
  'NOT A MATCH': 'bg-rose-100 text-rose-800',
  PASS: 'bg-emerald-100 text-emerald-800',
  FAIL: 'bg-rose-100 text-rose-700',
  Applied: 'bg-amber-100 text-amber-800',
  Identified: 'bg-sky-100 text-sky-800',
  Contacted: 'bg-indigo-100 text-indigo-800',
  Screened: 'bg-violet-100 text-violet-800',
  Enrolled: 'bg-teal-100 text-teal-800',
}

export default function StatusBadge({ value }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value] || 'bg-slate-100 text-slate-700'}`}>
      {value}
    </span>
  )
}
