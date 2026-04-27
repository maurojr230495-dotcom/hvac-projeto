import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getWorkOrders, updateWorkOrder } from '../../api/workorders'
import api from '../../api/client'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import { format, parseISO, startOfDay, addDays, isSameDay } from 'date-fns'
import {
  CalendarDaysIcon, ListBulletIcon, ChevronLeftIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline'

// ── constants ────────────────────────────────────────────────────────────────
const HOUR_START  = 7    // 07:00
const HOUR_END    = 19   // 19:00
const SLOT_HEIGHT = 60   // px per hour

const STATUS_COLOUR = {
  draft:       'bg-slate-200 border-slate-400 text-slate-700',
  scheduled:   'bg-blue-100 border-blue-400 text-blue-800',
  dispatched:  'bg-indigo-100 border-indigo-400 text-indigo-800',
  in_progress: 'bg-yellow-100 border-yellow-400 text-yellow-800',
  on_hold:     'bg-orange-100 border-orange-400 text-orange-800',
  completed:   'bg-green-100 border-green-500 text-green-800',
  cancelled:   'bg-red-100 border-red-400 text-red-700',
  invoiced:    'bg-purple-100 border-purple-400 text-purple-800',
}

const PRIORITY_DOT = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-blue-500',
  low:      'bg-slate-400',
}

// ── helpers ──────────────────────────────────────────────────────────────────
function toMinutes(date) {
  return date.getHours() * 60 + date.getMinutes()
}

function calcBlock(start, end) {
  const dayStart = HOUR_START * 60
  const dayEnd   = HOUR_END   * 60
  const s = Math.max(toMinutes(start), dayStart)
  const e = end ? Math.min(toMinutes(end), dayEnd) : s + 60
  const top    = ((s - dayStart) / 60) * SLOT_HEIGHT
  const height = Math.max(((e - s) / 60) * SLOT_HEIGHT, 28)
  return { top, height }
}

// ── timeline view ────────────────────────────────────────────────────────────
function TimelineView({ orders, techs, selectedDate }) {
  const qc = useQueryClient()
  const updateMut = useMutation({
    mutationFn: ({ id, status }) => updateWorkOrder(id, { status }),
    onSuccess: () => qc.invalidateQueries(['work-orders']),
  })

  // Filter orders for this day that have a scheduled_start
  const dayOrders = orders.filter(wo => {
    if (!wo.scheduled_start) return false
    return isSameDay(parseISO(wo.scheduled_start), selectedDate)
  })

  // Group by technician
  const unassigned = dayOrders.filter(wo => !wo.technician_id)
  const byTech = {}
  techs.forEach(t => { byTech[t.id] = [] })
  dayOrders.filter(wo => wo.technician_id).forEach(wo => {
    if (!byTech[wo.technician_id]) byTech[wo.technician_id] = []
    byTech[wo.technician_id].push(wo)
  })

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: Math.max(700, techs.length * 200 + 60) }}>
        {/* Header row — technician names */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <div className="w-14 flex-shrink-0" />
          {techs.map(t => (
            <div key={t.id} className="flex-1 min-w-40 px-3 py-2 border-l border-slate-200 text-center">
              <div className="h-8 w-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mx-auto mb-1">
                {t.name[0]}
              </div>
              <p className="text-xs font-semibold text-slate-700 truncate">{t.name}</p>
              <p className="text-xs text-slate-400">{t.territory || 'All zones'}</p>
            </div>
          ))}
          {unassigned.length > 0 && (
            <div className="flex-1 min-w-40 px-3 py-2 border-l border-orange-200 bg-orange-50 text-center">
              <p className="text-xs font-semibold text-orange-700">Unassigned</p>
              <p className="text-xs text-orange-400">{unassigned.length} job{unassigned.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>

        {/* Timeline grid */}
        <div className="flex">
          {/* Hour labels */}
          <div className="w-14 flex-shrink-0 border-r border-slate-200">
            {hours.map(h => (
              <div key={h} style={{ height: SLOT_HEIGHT }} className="flex items-start pt-1 pr-2 justify-end">
                <span className="text-xs text-slate-400">{h}:00</span>
              </div>
            ))}
          </div>

          {/* Technician columns */}
          {techs.map(tech => (
            <div key={tech.id} className="flex-1 min-w-40 border-l border-slate-200 relative">
              {hours.map(h => (
                <div
                  key={h}
                  style={{ height: SLOT_HEIGHT }}
                  className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors cursor-pointer"
                  title={`Schedule at ${h}:00 — ${tech.name}`}
                />
              ))}
              {/* Work order blocks */}
              {byTech[tech.id]?.map(wo => {
                const start = parseISO(wo.scheduled_start)
                const end   = wo.scheduled_end ? parseISO(wo.scheduled_end) : null
                const { top, height } = calcBlock(start, end)
                return (
                  <Link
                    key={wo.id}
                    to={`/work-orders/${wo.id}`}
                    style={{ top, height, left: 4, right: 4 }}
                    className={`absolute rounded border-l-4 px-2 py-1 text-xs overflow-hidden shadow-sm hover:shadow-md transition-shadow z-10 ${STATUS_COLOUR[wo.status] ?? 'bg-slate-100 border-slate-400'}`}
                    title={wo.title}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[wo.priority]}`} />
                      <span className="font-semibold truncate">{wo.order_number ?? `#${wo.id}`}</span>
                    </div>
                    <p className="truncate leading-tight">{wo.title}</p>
                    {height > 44 && wo.site_city && (
                      <p className="truncate text-current/70">{wo.site_city}</p>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}

          {/* Unassigned column */}
          {unassigned.length > 0 && (
            <div className="flex-1 min-w-40 border-l border-orange-200 bg-orange-50/30 relative">
              {hours.map(h => (
                <div key={h} style={{ height: SLOT_HEIGHT }} className="border-b border-orange-100" />
              ))}
              {unassigned.map(wo => {
                const start = parseISO(wo.scheduled_start)
                const end   = wo.scheduled_end ? parseISO(wo.scheduled_end) : null
                const { top, height } = calcBlock(start, end)
                return (
                  <Link
                    key={wo.id}
                    to={`/work-orders/${wo.id}`}
                    style={{ top, height, left: 4, right: 4 }}
                    className="absolute rounded border-l-4 border-orange-400 bg-orange-100 text-orange-800 px-2 py-1 text-xs overflow-hidden shadow-sm hover:shadow-md transition-shadow z-10"
                  >
                    <p className="font-semibold truncate">{wo.order_number ?? `#${wo.id}`}</p>
                    <p className="truncate">{wo.title}</p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs">
        {Object.entries(STATUS_COLOUR).map(([s, cls]) => (
          <span key={s} className={`px-2 py-0.5 rounded border ${cls}`}>{s.replace('_', ' ')}</span>
        ))}
      </div>
    </div>
  )
}

// ── kanban view (secondary) ──────────────────────────────────────────────────
const COLUMNS = [
  { key: 'scheduled',   label: 'Scheduled',    colour: 'bg-blue-50 border-blue-200' },
  { key: 'dispatched',  label: 'Dispatched',   colour: 'bg-indigo-50 border-indigo-200' },
  { key: 'in_progress', label: 'In Progress',  colour: 'bg-yellow-50 border-yellow-200' },
  { key: 'on_hold',     label: 'On Hold',      colour: 'bg-orange-50 border-orange-200' },
  { key: 'completed',   label: 'Completed',    colour: 'bg-green-50 border-green-200' },
]
const NEXT_STATUS = { scheduled: 'dispatched', dispatched: 'in_progress', in_progress: 'on_hold', on_hold: 'in_progress' }

function KanbanView({ orders }) {
  const qc = useQueryClient()
  const updateMut = useMutation({
    mutationFn: ({ id, status }) => updateWorkOrder(id, { status }),
    onSuccess: () => qc.invalidateQueries(['work-orders']),
  })
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 items-start p-4">
      {COLUMNS.map(col => {
        const cards = orders.filter(o => o.status === col.key)
        return (
          <div key={col.key} className={`rounded-xl border ${col.colour} p-3 space-y-3`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{col.label}</h3>
              <span className="text-xs font-bold text-slate-500">{cards.length}</span>
            </div>
            {cards.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Empty</p>}
            {cards.map(wo => (
              <div key={wo.id} className="bg-white rounded-lg border border-slate-200 shadow-sm p-3 space-y-2">
                <div className="flex items-start gap-1">
                  <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[wo.priority]}`} />
                  <Link to={`/work-orders/${wo.id}`} className="text-sm font-medium text-slate-800 hover:text-blue-600 leading-tight flex-1">
                    {wo.title}
                  </Link>
                </div>
                <p className="text-xs text-slate-400 font-mono pl-3">{wo.order_number ?? `#${wo.id}`}</p>
                {wo.scheduled_start && (
                  <p className="text-xs text-slate-400 pl-3">
                    {format(parseISO(wo.scheduled_start), 'd MMM, h:mm a')}
                  </p>
                )}
                {!wo.technician_id && <p className="text-xs text-orange-500 font-medium pl-3">Unassigned</p>}
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
  )
}

// ── main ─────────────────────────────────────────────────────────────────────
export default function DispatchBoard() {
  const [view, setView]               = useState('timeline')  // 'timeline' | 'kanban'
  const [selectedDate, setSelectedDate] = useState(new Date())

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['work-orders', 'dispatch'],
    queryFn: () => getWorkOrders({}),
  })

  const { data: techs = [] } = useQuery({
    queryKey: ['users', 'technicians'],
    queryFn: () => api.get('/users/', { params: { role: 'technician' } }).then(r => r.data),
  })

  const dateLabel = format(selectedDate, 'EEEE, d MMMM yyyy')
  const isToday   = isSameDay(selectedDate, new Date())

  if (loadingOrders) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dispatch Board</h1>
          <p className="text-slate-500 text-sm mt-0.5">{orders.length} active jobs</p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
            <button
              onClick={() => setView('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${view === 'timeline' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <CalendarDaysIcon className="h-4 w-4" /> Timeline
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${view === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <ListBulletIcon className="h-4 w-4" /> Kanban
            </button>
          </div>

          {/* Date navigation (timeline only) */}
          {view === 'timeline' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedDate(d => addDays(d, -1))}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4 text-slate-600" />
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${isToday ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
              >
                Today
              </button>
              <button
                onClick={() => setSelectedDate(d => addDays(d, 1))}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4 text-slate-600" />
              </button>
              <span className="text-sm text-slate-600 ml-2 hidden sm:block">{dateLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {view === 'timeline' ? (
          <TimelineView orders={orders} techs={techs} selectedDate={selectedDate} />
        ) : (
          <KanbanView orders={orders} />
        )}
      </div>
    </div>
  )
}
