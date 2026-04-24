const colours = {
  draft:       'bg-slate-100 text-slate-600',
  scheduled:   'bg-blue-100 text-blue-700',
  dispatched:  'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  on_hold:     'bg-orange-100 text-orange-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
  invoiced:    'bg-purple-100 text-purple-700',
  active:      'bg-yellow-100 text-yellow-700',
  paused:      'bg-orange-100 text-orange-700',
  approved:    'bg-green-100 text-green-700',
  rejected:    'bg-red-100 text-red-600',
  low:         'bg-slate-100 text-slate-600',
  medium:      'bg-blue-100 text-blue-700',
  high:        'bg-orange-100 text-orange-700',
  critical:    'bg-red-100 text-red-700',
}

export default function Badge({ value, label }) {
  const cls = colours[value] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label ?? value?.replace('_', ' ')}
    </span>
  )
}
