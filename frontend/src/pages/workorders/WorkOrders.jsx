import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getWorkOrders, cancelWorkOrder } from '../../api/workorders'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { format } from 'date-fns'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

const STATUS_OPTIONS = ['', 'draft', 'scheduled', 'dispatched', 'in_progress', 'on_hold', 'completed', 'cancelled']
const PRIORITY_OPTIONS = ['', 'low', 'medium', 'high', 'critical']

export default function WorkOrders() {
  const qc = useQueryClient()
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')
  const [priority, setPriority] = useState('')

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['work-orders', status],
    queryFn: () => getWorkOrders({ status: status || undefined }),
  })

  const cancelMut = useMutation({
    mutationFn: cancelWorkOrder,
    onSuccess: () => qc.invalidateQueries(['work-orders']),
  })

  const filtered = orders.filter(wo => {
    const q = search.toLowerCase()
    const matchText = !q || wo.title.toLowerCase().includes(q) || wo.order_number?.toLowerCase().includes(q) || wo.site_city?.toLowerCase().includes(q)
    const matchPriority = !priority || wo.priority === priority
    return matchText && matchPriority
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Work Orders</h1>
          <p className="text-slate-500 text-sm mt-0.5">{orders.length} total orders</p>
        </div>
        <Link to="/work-orders/new">
          <Button><PlusIcon className="h-4 w-4" /> New Work Order</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by title, order no., city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          value={priority}
          onChange={e => setPriority(e.target.value)}
        >
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.filter(Boolean).map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-16 text-sm">No work orders found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Order #</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Site</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Scheduled</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(wo => (
                <tr key={wo.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-slate-500">{wo.order_number ?? `#${wo.id}`}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{wo.title}</td>
                  <td className="px-5 py-3 text-slate-500">{[wo.site_city, wo.site_address].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {wo.scheduled_start ? format(new Date(wo.scheduled_start), 'd MMM, h:mm a') : '—'}
                  </td>
                  <td className="px-5 py-3"><Badge value={wo.priority} /></td>
                  <td className="px-5 py-3"><Badge value={wo.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link to={`/work-orders/${wo.id}`}>
                        <Button variant="secondary" className="py-1 px-3 text-xs">View</Button>
                      </Link>
                      {wo.status !== 'cancelled' && wo.status !== 'completed' && (
                        <Button
                          variant="ghost"
                          className="py-1 px-3 text-xs text-red-500 hover:text-red-700"
                          onClick={() => { if (confirm('Cancel this work order?')) cancelMut.mutate(wo.id) }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
