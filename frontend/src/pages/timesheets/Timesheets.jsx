import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTimesheets, checkin, checkout, reviewTimesheet } from '../../api/timesheets'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { format } from 'date-fns'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

const ACTIVITY_TYPES = ['travel','installation','repair','maintenance','inspection','commissioning','training','admin','other']

export default function Timesheets() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const isTech = user?.role === 'technician'
  const canReview = ['admin','manager'].includes(user?.role)

  const [checkinForm, setCheckinForm] = useState({ work_order_id: '', cost_center: '', activity_type: 'installation' })
  const [showCheckin, setShowCheckin] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectTarget, setRejectTarget] = useState(null)

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ['timesheets'],
    queryFn: () => getTimesheets({}),
  })

  const checkinMut = useMutation({
    mutationFn: checkin,
    onSuccess: () => { qc.invalidateQueries(['timesheets']); setShowCheckin(false) },
  })

  const checkoutMut = useMutation({
    mutationFn: (id) => checkout(id, {}),
    onSuccess: () => qc.invalidateQueries(['timesheets']),
  })

  const reviewMut = useMutation({
    mutationFn: ({ id, approve, note }) => reviewTimesheet(id, { approve, rejection_note: note }),
    onSuccess: () => { qc.invalidateQueries(['timesheets']); setRejectTarget(null) },
  })

  const activeSheet = timesheets.find(ts => ts.status === 'active' && ts.technician_id === user?.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Timesheets</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track time on site</p>
        </div>
        {isTech && !activeSheet && (
          <Button onClick={() => setShowCheckin(true)}>Check In</Button>
        )}
        {isTech && activeSheet && (
          <Button variant="danger" onClick={() => checkoutMut.mutate(activeSheet.id)}>
            Check Out
          </Button>
        )}
      </div>

      {/* Active sheet banner */}
      {activeSheet && (
        <Card className="p-4 bg-yellow-50 border-yellow-200 flex items-center gap-4">
          <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">You are currently checked in</p>
            <p className="text-xs text-yellow-600">
              {activeSheet.activity_type?.replace('_', ' ')} · Started {format(new Date(activeSheet.started_at), 'h:mm a')}
            </p>
          </div>
        </Card>
      )}

      {/* Check-in modal */}
      {showCheckin && (
        <Card className="p-5 space-y-4 border-blue-200 bg-blue-50">
          <h2 className="font-semibold text-slate-800">New Check-in</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Work Order ID *</label>
              <input type="number" className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={checkinForm.work_order_id}
                onChange={e => setCheckinForm(p => ({ ...p, work_order_id: e.target.value }))}
                placeholder="e.g. 42" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Cost Centre *</label>
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={checkinForm.cost_center}
                onChange={e => setCheckinForm(p => ({ ...p, cost_center: e.target.value }))}
                placeholder="e.g. CC-001" />
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-sm font-medium text-slate-700">Activity Type *</label>
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={checkinForm.activity_type}
                onChange={e => setCheckinForm(p => ({ ...p, activity_type: e.target.value }))}>
                {ACTIVITY_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => checkinMut.mutate({ ...checkinForm, work_order_id: Number(checkinForm.work_order_id) })}
              disabled={checkinMut.isPending || !checkinForm.work_order_id || !checkinForm.cost_center}
            >
              {checkinMut.isPending ? 'Checking in…' : 'Confirm Check-in'}
            </Button>
            <Button variant="secondary" onClick={() => setShowCheckin(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <Card className="p-5 space-y-3 border-red-200 bg-red-50">
          <h2 className="font-semibold text-slate-800">Reject Timesheet #{rejectTarget}</h2>
          <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            rows={3} placeholder="Reason for rejection…" value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="danger" onClick={() => reviewMut.mutate({ id: rejectTarget, approve: false, note: rejectNote })}
              disabled={!rejectNote || reviewMut.isPending}>
              Reject
            </Button>
            <Button variant="secondary" onClick={() => { setRejectTarget(null); setRejectNote('') }}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : timesheets.length === 0 ? (
          <p className="text-center text-slate-400 py-16 text-sm">No timesheets yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3">Tech</th>
                <th className="px-5 py-3">Work Order</th>
                <th className="px-5 py-3">Activity</th>
                <th className="px-5 py-3">Started</th>
                <th className="px-5 py-3">Hours</th>
                <th className="px-5 py-3">Status</th>
                {canReview && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timesheets.map(ts => (
                <tr key={ts.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-600">#{ts.technician_id}</td>
                  <td className="px-5 py-3 text-slate-600">#{ts.work_order_id}</td>
                  <td className="px-5 py-3 text-slate-800">{ts.activity_type?.replace('_', ' ')}</td>
                  <td className="px-5 py-3 text-slate-500">{format(new Date(ts.started_at), 'd MMM, h:mm a')}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{ts.total_hours?.toFixed(2) ?? '—'}</td>
                  <td className="px-5 py-3"><Badge value={ts.status} /></td>
                  {canReview && (
                    <td className="px-5 py-3">
                      {ts.status === 'completed' && (
                        <div className="flex gap-2">
                          <button onClick={() => reviewMut.mutate({ id: ts.id, approve: true })}
                            className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors" title="Approve">
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button onClick={() => setRejectTarget(ts.id)}
                            className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors" title="Reject">
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
