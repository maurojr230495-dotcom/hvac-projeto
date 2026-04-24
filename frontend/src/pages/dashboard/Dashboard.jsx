import { useQuery } from '@tanstack/react-query'
import { getWorkOrders } from '../../api/workorders'
import { getTimesheets } from '../../api/timesheets'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  ClipboardDocumentListIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

function KpiCard({ label, value, icon: Icon, colour }) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colour}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const { data: allOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['work-orders'],
    queryFn: () => getWorkOrders({ is_active: true }),
  })

  const { data: timesheets = [], isLoading: loadingTS } = useQuery({
    queryKey: ['timesheets', 'active'],
    queryFn: () => getTimesheets({ ts_status: 'active' }),
  })

  const inProgress = allOrders.filter(o => o.status === 'in_progress').length
  const scheduled  = allOrders.filter(o => o.status === 'scheduled').length
  const completed  = allOrders.filter(o => o.status === 'completed').length
  const critical   = allOrders.filter(o => o.priority === 'critical').length

  // Mock weekly chart data — replace with real API when analytics endpoint exists
  const weeklyData = [
    { day: 'Mon', completed: 4, created: 6 },
    { day: 'Tue', completed: 7, created: 5 },
    { day: 'Wed', completed: 3, created: 8 },
    { day: 'Thu', completed: 9, created: 7 },
    { day: 'Fri', completed: 6, created: 4 },
    { day: 'Sat', completed: 2, created: 2 },
    { day: 'Sun', completed: 1, created: 0 },
  ]

  if (loadingOrders || loadingTS) {
    return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="In Progress"    value={inProgress} icon={ClipboardDocumentListIcon} colour="bg-yellow-500" />
        <KpiCard label="Scheduled"      value={scheduled}  icon={ClockIcon}                 colour="bg-blue-500" />
        <KpiCard label="Completed Today" value={completed}  icon={CheckCircleIcon}           colour="bg-green-500" />
        <KpiCard label="Critical Priority" value={critical} icon={ExclamationTriangleIcon}   colour="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly chart */}
        <Card className="col-span-2 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Work Orders — This Week</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="created"   name="Created"   fill="#93c5fd" radius={[4,4,0,0]} />
              <Bar dataKey="completed" name="Completed" fill="#2563eb" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Active technicians */}
        <Card className="p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Technicians On-site</h2>
          {timesheets.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No active check-ins right now</p>
          ) : (
            <ul className="space-y-3">
              {timesheets.slice(0, 6).map(ts => (
                <li key={ts.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {String(ts.technician_id).slice(-2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">Tech #{ts.technician_id}</p>
                    <p className="text-xs text-slate-400 truncate">{ts.activity_type?.replace('_', ' ')}</p>
                  </div>
                  <Badge value="active" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent work orders */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Recent Work Orders</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {allOrders.slice(0, 8).map(wo => (
            <div key={wo.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
              <span className="text-xs font-mono text-slate-400 w-24 flex-shrink-0">{wo.order_number ?? `#${wo.id}`}</span>
              <span className="flex-1 text-sm text-slate-800 truncate">{wo.title}</span>
              <Badge value={wo.priority} />
              <Badge value={wo.status} />
            </div>
          ))}
          {allOrders.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No work orders yet</p>
          )}
        </div>
      </Card>
    </div>
  )
}
