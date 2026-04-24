import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWorkOrder, updateWorkOrder } from '../../api/workorders'
import { getTimesheets } from '../../api/timesheets'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { format } from 'date-fns'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

const STATUSES = ['draft','scheduled','dispatched','in_progress','on_hold','completed','cancelled','invoiced']

export default function WorkOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: wo, isLoading } = useQuery({
    queryKey: ['work-orders', id],
    queryFn: () => getWorkOrder(id),
  })

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets', { work_order_id: id }],
    queryFn: () => getTimesheets({ work_order_id: id }),
    enabled: !!id,
  })

  const updateMut = useMutation({
    mutationFn: ({ status }) => updateWorkOrder(id, { status }),
    onSuccess: () => qc.invalidateQueries(['work-orders']),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!wo) return <p className="text-slate-400 text-center py-20">Work order not found.</p>

  const totalHours = timesheets.reduce((s, ts) => s + (ts.total_hours ?? 0), 0)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate(-1)} className="mt-1 text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{wo.title}</h1>
            <Badge value={wo.priority} />
            <Badge value={wo.status} />
          </div>
          <p className="text-slate-500 text-sm mt-0.5 font-mono">{wo.order_number ?? `#${wo.id}`}</p>
        </div>
      </div>

      {/* Status change */}
      <Card className="p-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-slate-700">Update status:</span>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => updateMut.mutate({ status: s })}
            disabled={wo.status === s || updateMut.isPending}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-40 ${
              wo.status === s ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Details */}
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold text-slate-800">Details</h2>
          <dl className="space-y-2 text-sm">
            {[
              ['Client',        `#${wo.client_id}`],
              ['Technician',    wo.technician_id ? `#${wo.technician_id}` : 'Unassigned'],
              ['Service type',  wo.service_type ?? '—'],
              ['Cost centre',   wo.cost_center ?? '—'],
              ['Site address',  [wo.site_address, wo.site_city].filter(Boolean).join(', ') || '—'],
              ['Scheduled',     wo.scheduled_start ? format(new Date(wo.scheduled_start), 'd MMM yyyy, h:mm a') : '—'],
              ['Est. hours',    wo.estimated_hours ? `${wo.estimated_hours} h` : '—'],
              ['Hourly rate',   wo.hourly_rate ? `$${wo.hourly_rate}/h` : '—'],
              ['Materials',     wo.materials_cost ? `$${wo.materials_cost}` : '—'],
              ['Total cost',    wo.total_cost ? `$${wo.total_cost}` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-32 text-slate-500 flex-shrink-0">{k}</dt>
                <dd className="text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* Description + checklist */}
        <div className="space-y-4">
          {wo.description && (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-800 mb-2">Description</h2>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{wo.description}</p>
            </Card>
          )}
          {wo.checklist?.length > 0 && (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-800 mb-2">Checklist</h2>
              <ul className="space-y-1">
                {wo.checklist.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" readOnly checked={item.done ?? false} className="rounded" />
                    {item.label ?? item}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* Timesheets */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Timesheets</h2>
          <span className="text-sm text-slate-500">Total: <strong>{totalHours.toFixed(2)} h</strong></span>
        </div>
        {timesheets.length === 0 ? (
          <p className="text-center text-slate-400 py-10 text-sm">No time logged yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3">Tech</th>
                <th className="px-5 py-3">Activity</th>
                <th className="px-5 py-3">Started</th>
                <th className="px-5 py-3">Hours</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timesheets.map(ts => (
                <tr key={ts.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-600">#{ts.technician_id}</td>
                  <td className="px-5 py-3 text-slate-800">{ts.activity_type?.replace('_', ' ')}</td>
                  <td className="px-5 py-3 text-slate-500">{format(new Date(ts.started_at), 'd MMM, h:mm a')}</td>
                  <td className="px-5 py-3 text-slate-800 font-medium">{ts.total_hours?.toFixed(2) ?? '—'}</td>
                  <td className="px-5 py-3"><Badge value={ts.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
