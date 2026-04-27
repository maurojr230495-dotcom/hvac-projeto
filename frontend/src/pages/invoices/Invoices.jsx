import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvoices, updateInvoice } from '../../api/invoices'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import { format, parseISO, isPast } from 'date-fns'
import { BanknotesIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'

const STATUS_COLOUR = {
  draft:     'bg-slate-100 text-slate-600 border-slate-300',
  sent:      'bg-blue-100 text-blue-700 border-blue-300',
  paid:      'bg-green-100 text-green-700 border-green-300',
  overdue:   'bg-red-100 text-red-700 border-red-300',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
}

export default function Invoices() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: () => getInvoices(statusFilter ? { inv_status: statusFilter } : {}),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => updateInvoice(id, data),
    onSuccess: () => qc.invalidateQueries(['invoices']),
  })

  // KPIs
  const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const totalPending = invoices.filter(i => ['sent', 'draft'].includes(i.status)).reduce((s, i) => s + i.total, 0)
  const overdue      = invoices.filter(i => i.status === 'sent' && i.due_date && isPast(parseISO(i.due_date))).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <p className="text-slate-500 text-sm mt-0.5">{invoices.length} invoices total</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
            <CheckCircleIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">${totalPaid.toLocaleString('en-AU', { maximumFractionDigits: 0 })}</p>
            <p className="text-sm text-slate-500">Collected</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
            <ClockIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">${totalPending.toLocaleString('en-AU', { maximumFractionDigits: 0 })}</p>
            <p className="text-sm text-slate-500">Outstanding</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${overdue > 0 ? 'bg-red-500' : 'bg-slate-400'}`}>
            <BanknotesIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{overdue}</p>
            <p className="text-sm text-slate-500">Overdue</p>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <div className="flex gap-2 flex-wrap">
          {['', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : invoices.length === 0 ? (
          <p className="text-center text-slate-400 py-16 text-sm">No invoices yet — generate one from a completed work order</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3">Invoice #</th>
                <th className="px-5 py-3">Work Order</th>
                <th className="px-5 py-3">Subtotal</th>
                <th className="px-5 py-3">GST</th>
                <th className="px-5 py-3">Total (inc. GST)</th>
                <th className="px-5 py-3">Due</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map(inv => {
                const isOverdue = inv.status === 'sent' && inv.due_date && isPast(parseISO(inv.due_date))
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-slate-600">{inv.invoice_number}</td>
                    <td className="px-5 py-3 text-slate-500">WO #{inv.work_order_id}</td>
                    <td className="px-5 py-3 text-slate-700">${inv.subtotal.toFixed(2)}</td>
                    <td className="px-5 py-3 text-slate-500">${inv.gst_amount.toFixed(2)}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">${inv.total.toFixed(2)}</td>
                    <td className={`px-5 py-3 text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                      {inv.due_date ? format(parseISO(inv.due_date), 'd MMM yyyy') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${STATUS_COLOUR[inv.status] ?? ''}`}>
                        {isOverdue ? 'overdue' : inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 justify-end">
                        {inv.status === 'draft' && (
                          <Button
                            variant="secondary"
                            className="py-1 px-3 text-xs"
                            onClick={() => updateMut.mutate({ id: inv.id, status: 'sent' })}
                          >
                            Mark Sent
                          </Button>
                        )}
                        {(inv.status === 'sent' || isOverdue) && (
                          <Button
                            className="py-1 px-3 text-xs"
                            onClick={() => updateMut.mutate({ id: inv.id, status: 'paid', paid_at: new Date().toISOString() })}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
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
