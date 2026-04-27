import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSchedules, createSchedule, generateWorkOrder, getUpcomingSchedules } from '../../api/maintenance'
import { getClients } from '../../api/clients'
import { getAssets } from '../../api/assets'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { PlusIcon, ArrowPathIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { format, parseISO, isPast } from 'date-fns'

const FREQ_LABEL = {
  weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly',
  quarterly: 'Quarterly', biannual: 'Bi-annual', annual: 'Annual',
}

function NewScheduleForm({ clients, assets, onClose, onSave }) {
  const [form, setForm] = useState({
    client_id: '', asset_id: '', title: '', description: '',
    service_type: 'maintenance', frequency: 'quarterly',
    estimated_hours: '', start_date: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const clientAssets = assets.filter(a => String(a.client_id) === form.client_id)

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      client_id: parseInt(form.client_id),
      asset_id: form.asset_id ? parseInt(form.asset_id) : null,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      start_date: form.start_date || undefined,
    }
    await onSave(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">New Maintenance Schedule</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700">Client *</label>
              <select required className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={form.client_id} onChange={e => set('client_id', e.target.value)}>
                <option value="">Select client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {clientAssets.length > 0 && (
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-700">Asset (optional)</label>
                <select className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={form.asset_id} onChange={e => set('asset_id', e.target.value)}>
                  <option value="">All assets / site</option>
                  {clientAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700">Schedule Title *</label>
              <input required className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Quarterly Preventive Maintenance" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Frequency *</label>
              <select required className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                {Object.entries(FREQ_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Est. Hours</label>
              <input type="number" step="0.5" className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="2.0" value={form.estimated_hours} onChange={e => set('estimated_hours', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700">Start Date</label>
              <input type="date" className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1 justify-center">Create Schedule</Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Maintenance() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => getSchedules(),
  })

  const { data: upcoming = [] } = useQuery({
    queryKey: ['schedules', 'upcoming'],
    queryFn: () => getUpcomingSchedules(30),
  })

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => getClients() })
  const { data: assets = [] }  = useQuery({ queryKey: ['assets'],  queryFn: () => getAssets() })

  const createMut = useMutation({
    mutationFn: createSchedule,
    onSuccess: () => qc.invalidateQueries(['schedules']),
  })

  const generateMut = useMutation({
    mutationFn: generateWorkOrder,
    onSuccess: (data) => {
      qc.invalidateQueries(['schedules'])
      qc.invalidateQueries(['work-orders'])
      alert(`Work order ${data.order_number} created. Next due: ${data.next_due_date}`)
    },
  })

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))

  return (
    <div className="space-y-6">
      {showForm && (
        <NewScheduleForm
          clients={clients}
          assets={assets}
          onClose={() => setShowForm(false)}
          onSave={d => createMut.mutateAsync(d)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Preventive Maintenance</h1>
          <p className="text-slate-500 text-sm mt-0.5">{schedules.length} active schedules</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <PlusIcon className="h-4 w-4" /> New Schedule
        </Button>
      </div>

      {/* Upcoming alert */}
      {upcoming.length > 0 && (
        <Card className="p-4 border-orange-200 bg-orange-50">
          <div className="flex items-center gap-3">
            <CalendarDaysIcon className="h-5 w-5 text-orange-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-800">{upcoming.length} maintenance{upcoming.length > 1 ? 's' : ''} due in the next 30 days</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {upcoming.slice(0, 5).map(s => (
                  <span key={s.id} className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
                    {s.title} — {s.next_due_date ? format(parseISO(s.next_due_date), 'd MMM') : '—'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Schedules table */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : schedules.length === 0 ? (
          <p className="text-center text-slate-400 py-16 text-sm">No maintenance schedules yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3">Schedule</th>
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Frequency</th>
                <th className="px-5 py-3">Next Due</th>
                <th className="px-5 py-3">Est. Hours</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedules.map(s => {
                const overdue = s.next_due_date && isPast(parseISO(s.next_due_date))
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800">{s.title}</td>
                    <td className="px-5 py-3 text-slate-500">{clientMap[s.client_id]?.name ?? `#${s.client_id}`}</td>
                    <td className="px-5 py-3 text-slate-500">{FREQ_LABEL[s.frequency]}</td>
                    <td className={`px-5 py-3 text-sm font-medium ${overdue ? 'text-red-600' : 'text-slate-700'}`}>
                      {s.next_due_date ? format(parseISO(s.next_due_date), 'd MMM yyyy') : '—'}
                      {overdue && <span className="ml-1 text-xs bg-red-100 text-red-600 px-1 rounded">overdue</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{s.estimated_hours ? `${s.estimated_hours}h` : '—'}</td>
                    <td className="px-5 py-3">
                      <Button
                        variant="secondary"
                        className="py-1 px-3 text-xs flex items-center gap-1"
                        disabled={generateMut.isPending}
                        onClick={() => {
                          if (confirm(`Generate work order for "${s.title}"?`)) generateMut.mutate(s.id)
                        }}
                      >
                        <ArrowPathIcon className="h-3 w-3" /> Generate WO
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
