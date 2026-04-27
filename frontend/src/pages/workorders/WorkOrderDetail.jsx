import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWorkOrder, updateWorkOrder } from '../../api/workorders'
import { getTimesheets } from '../../api/timesheets'
import { createInvoiceFromWO } from '../../api/invoices'
import api from '../../api/client'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeftIcon, DocumentTextIcon, BanknotesIcon,
  ClipboardDocumentCheckIcon, WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'

const STATUSES = ['draft','scheduled','dispatched','in_progress','on_hold','completed','cancelled','invoiced']

const SLA_HOURS = { critical: 2, high: 4, medium: 24, low: 48 }

function SLABadge({ wo }) {
  if (!wo.sla_due_at) return null
  const due = parseISO(wo.sla_due_at)
  const now = new Date()
  const breached = wo.sla_breached || (now > due && !['completed','invoiced','cancelled'].includes(wo.status))
  const mins = Math.round((due - now) / 60000)
  if (breached) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">SLA Breached</span>
  if (mins < 60) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-300">SLA due in {mins}m</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">SLA OK — due {format(due, 'h:mm a')}</span>
}

function ServiceReportSection({ workOrderId, status }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ work_performed: '', recommendations: '', client_signed_by: '' })
  const qc = useQueryClient()

  const { data: report } = useQuery({
    queryKey: ['service-report', workOrderId],
    queryFn: () => api.get(`/service-reports/work-order/${workOrderId}`).then(r => r.data).catch(() => null),
    retry: false,
  })

  const createMut = useMutation({
    mutationFn: (data) => api.post('/service-reports/', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries(['service-report', workOrderId])
      qc.invalidateQueries(['work-orders', String(workOrderId)])
      setShowForm(false)
    },
  })

  if (report) {
    return (
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardDocumentCheckIcon className="h-5 w-5 text-green-600" />
          <h2 className="font-semibold text-slate-800">Service Report</h2>
          <span className="ml-auto text-xs text-slate-400">{format(parseISO(report.completed_at), 'd MMM yyyy, h:mm a')}</span>
        </div>
        {report.work_performed && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Work Performed</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{report.work_performed}</p>
          </div>
        )}
        {report.recommendations && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Recommendations</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{report.recommendations}</p>
          </div>
        )}
        {report.parts_used?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Parts Used</p>
            <ul className="space-y-1">
              {report.parts_used.map((p, i) => (
                <li key={i} className="text-sm text-slate-700 flex justify-between">
                  <span>{p.description} × {p.qty}</span>
                  {p.unit_cost > 0 && <span className="text-slate-500">${(p.qty * p.unit_cost).toFixed(2)}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {report.client_signed_by && (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <ClipboardDocumentCheckIcon className="h-4 w-4" />
            Signed off by <strong>{report.client_signed_by}</strong>
            {report.client_signed_at && <span className="text-green-500">· {format(parseISO(report.client_signed_at), 'd MMM, h:mm a')}</span>}
          </div>
        )}
      </Card>
    )
  }

  if (!['in_progress', 'completed'].includes(status)) return null

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <DocumentTextIcon className="h-5 w-5 text-slate-400" />
        <h2 className="font-semibold text-slate-800">Service Report</h2>
      </div>
      {!showForm ? (
        <Button variant="secondary" onClick={() => setShowForm(true)} className="text-sm">
          Complete Service Report
        </Button>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-700">Work Performed *</label>
            <textarea
              required
              rows={4}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="Describe what was done…"
              value={form.work_performed}
              onChange={e => setForm(f => ({ ...f, work_performed: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Recommendations</label>
            <textarea
              rows={2}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="Follow-up recommendations…"
              value={form.recommendations}
              onChange={e => setForm(f => ({ ...f, recommendations: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Client Sign-off Name</label>
            <input
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Name of person who approved the work"
              value={form.client_signed_by}
              onChange={e => setForm(f => ({ ...f, client_signed_by: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={!form.work_performed || createMut.isPending}
              onClick={() => createMut.mutate({ work_order_id: workOrderId, ...form })}
            >
              {createMut.isPending ? 'Saving…' : 'Submit Report'}
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function InvoiceSection({ wo }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [dueDays, setDueDays] = useState(30)

  const { data: existingInvoices = [] } = useQuery({
    queryKey: ['invoices', 'wo', wo.id],
    queryFn: () => api.get('/invoices/', { params: { client_id: wo.client_id } }).then(r =>
      r.data.filter(i => i.work_order_id === wo.id)
    ),
  })

  const createMut = useMutation({
    mutationFn: (data) => createInvoiceFromWO(wo.id, data),
    onSuccess: () => {
      qc.invalidateQueries(['invoices'])
      setShowForm(false)
    },
  })

  if (existingInvoices.length > 0) {
    const inv = existingInvoices[0]
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <BanknotesIcon className="h-5 w-5 text-purple-500" />
          <h2 className="font-semibold text-slate-800">Invoice</h2>
          <Link to="/invoices" className="ml-auto text-xs text-blue-600 hover:underline">View in Invoices</Link>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-mono text-slate-600">{inv.invoice_number}</span>
          <span className="font-semibold text-slate-900">${inv.total.toFixed(2)} inc. GST</span>
          <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${
            inv.status === 'paid' ? 'bg-green-50 text-green-700 border-green-300' :
            inv.status === 'sent' ? 'bg-blue-50 text-blue-700 border-blue-300' :
            'bg-slate-100 text-slate-600 border-slate-300'
          }`}>{inv.status}</span>
        </div>
      </Card>
    )
  }

  if (!['completed', 'invoiced'].includes(wo.status)) return null

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <BanknotesIcon className="h-5 w-5 text-slate-400" />
        <h2 className="font-semibold text-slate-800">Invoice</h2>
      </div>
      {!showForm ? (
        <Button variant="secondary" onClick={() => setShowForm(true)} className="text-sm">
          Generate Invoice
        </Button>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-700">Payment Terms (days)</label>
            <select className="mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" value={dueDays} onChange={e => setDueDays(parseInt(e.target.value))}>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
            </select>
          </div>
          <p className="text-xs text-slate-500">
            Labour: {wo.estimated_hours ?? 0}h × ${wo.hourly_rate ?? 0}/h = ${((wo.estimated_hours ?? 0) * (wo.hourly_rate ?? 0)).toFixed(2)}<br />
            Materials: ${wo.materials_cost ?? 0} · GST (10%): auto-calculated
          </p>
          <div className="flex gap-2">
            <Button
              disabled={createMut.isPending}
              onClick={() => createMut.mutate({ work_order_id: wo.id, materials_cost: wo.materials_cost ?? 0, due_days: dueDays })}
            >
              {createMut.isPending ? 'Creating…' : 'Create Invoice'}
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  )
}

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
            <SLABadge wo={wo} />
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
              ['Client',       `#${wo.client_id}`],
              ['Technician',   wo.technician_id ? `#${wo.technician_id}` : 'Unassigned'],
              ['Asset',        wo.asset_id ? `Asset #${wo.asset_id}` : '—'],
              ['Service type', wo.service_type ?? '—'],
              ['Cost centre',  wo.cost_center ?? '—'],
              ['Site',         [wo.site_address, wo.site_city].filter(Boolean).join(', ') || '—'],
              ['Scheduled',    wo.scheduled_start ? format(parseISO(wo.scheduled_start), 'd MMM yyyy, h:mm a') : '—'],
              ['Est. hours',   wo.estimated_hours ? `${wo.estimated_hours} h` : '—'],
              ['Rate',         wo.hourly_rate ? `$${wo.hourly_rate}/h` : '—'],
              ['Materials',    wo.materials_cost ? `$${wo.materials_cost}` : '—'],
              ['Total cost',   wo.total_cost ? `$${wo.total_cost}` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-28 text-slate-500 flex-shrink-0">{k}</dt>
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

      {/* Service report + Invoice */}
      <ServiceReportSection workOrderId={parseInt(id)} status={wo.status} />
      <InvoiceSection wo={wo} />

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
                  <td className="px-5 py-3 text-slate-500">{format(parseISO(ts.started_at), 'd MMM, h:mm a')}</td>
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
