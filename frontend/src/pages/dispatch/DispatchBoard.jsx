import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWorkOrders, updateWorkOrder } from '../../api/workorders'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

const COLUMNS = [
  { key: 'scheduled',   label: 'Scheduled',    colour: 'bg-blue-50 border-blue-200' },
  { key: 'dispatched',  label: 'Dispatched',   colour: 'bg-indigo-50 border-indigo-200' },
  { key: 'in_progress', label: 'In Progress',  colour: 'bg-yellow-50 border-yellow-200' },
  { key: 'on_hold',     label: 'On Hold',      colour: 'bg-orange-50 border-orange-200' },
  { key: 'completed',   label: 'Completed',    colour: 'bg-green-50 border-green-200' },
]

const NEXT_STATUS = {
  scheduled: 'dispatched',
  dispatched: 'in_progress',
  in_progress: 'on_hold',
  on_hold: 'in_progress',
}

export default function DispatchBoard() {
  const qc = useQueryClient()

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['work-orders', 'dispatch'],
    queryFn: () => getWorkOrders({}),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, status }) => updateWorkOrder(id, { status }),
    onSuccess: () => qc.invalidateQueries(['work-orders']),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dispatch Board</h1>
        <p className="text-slate-500 text-sm mt-0.5">Drag-free kanban — click to advance status</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 items-start">
        {COLUMNS.map(col => {
          const cards = orders.filter(o => o.status === col.key)
          return (
            <div key={col.key} className={`rounded-xl border ${col.colour} p-3 space-y-3`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{col.label}</h3>
                <span className="text-xs font-bold text-slate-500">{cards.length}</span>
              </div>

              {cards.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Empty</p>
              )}

              {cards.map(wo => (
                <div key={wo.id} className="bg-white rounded-lg border border-slate-200 shadow-sm p-3 space-y-2">
                  <div className="flex items-start justify-between gap-1">
                    <Link to={`/work-orders/${wo.id}`} className="text-sm font-medium text-slate-800 hover:text-blue-600 leading-tight">
                      {wo.title}
                    </Link>
                    <Badge value={wo.priority} />
                  </div>
                  <p className="text-xs text-slate-400 font-mono">{wo.order_number ?? `#${wo.id}`}</p>
                  {wo.site_city && <p className="text-xs text-slate-500">{wo.site_city}</p>}
                  {wo.scheduled_start && (
                    <p className="text-xs text-slate-400">
                      {format(new Date(wo.scheduled_start), 'd MMM, h:mm a')}
                    </p>
                  )}
                  {wo.technician_id ? (
                    <p className="text-xs text-slate-500">Tech #{wo.technician_id}</p>
                  ) : (
                    <p className="text-xs text-orange-500 font-medium">Unassigned</p>
                  )}
                  {NEXT_STATUS[col.key] && (
                    <button
                      onClick={() => updateMut.mutate({ id: wo.id, status: NEXT_STATUS[col.key] })}
                      disabled={updateMut.isPending}
                      className="w-full mt-1 text-xs py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors disabled:opacity-50"
                    >
                      → {NEXT_STATUS[col.key].replace('_', ' ')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
