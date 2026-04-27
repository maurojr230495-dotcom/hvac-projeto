import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getDashboardStats, getTechnicianUtilisation } from '../../api/analytics'
import { getWorkOrders } from '../../api/workorders'
import { getUpcomingSchedules } from '../../api/maintenance'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import {
  ClipboardDocumentListIcon, CheckCircleIcon, ExclamationTriangleIcon,
  WrenchScrewdriverIcon, ShieldCheckIcon, BanknotesIcon, CalendarDaysIcon,
} from '@heroicons/react/24/outline'

function KpiCard({ label, value, sub, icon: Icon, colour, to }) {
  const inner = (
    <Card className="p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colour}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </Card>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

export default function Dashboard() {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: getDashboardStats,
    retry: 1,
  })

  const { data: utilisation = [] } = useQuery({
    queryKey: ['analytics', 'utilisation'],
    queryFn: () => getTechnicianUtilisation(7),
    retry: 1,
  })

  const { data: recentOrders = [] } = useQuery({
    queryKey: ['work-orders', 'recent'],
    queryFn: () => getWorkOrders({}),
  })

  const { data: upcomingPM = [] } = useQuery({
    queryKey: ['schedules', 'upcoming'],
    queryFn: () => getUpcomingSchedules(14),
  })

  if (loadingStats) {
    return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
  }

  const s = stats ?? {}
  const revenueChange = s.revenue_last_month > 0
    ? Math.round(((s.revenue_month - s.revenue_last_month) / s.revenue_last_month) * 100)
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Open Jobs"
          value={s.total_open ?? 0}
          icon={ClipboardDocumentListIcon}
          colour="bg-blue-500"
          to="/work-orders"
        />
        <KpiCard
          label="Active Techs On-site"
          value={s.active_technicians ?? 0}
          icon={WrenchScrewdriverIcon}
          colour="bg-yellow-500"
        />
        <KpiCard
          label="SLA Compliance"
          value={`${s.sla_compliance_pct ?? 100}%`}
          icon={ShieldCheckIcon}
          colour={s.sla_compliance_pct >= 90 ? 'bg-green-500' : 'bg-orange-500'}
        />
        <KpiCard
          label="Revenue This Month"
          value={`$${(s.revenue_month ?? 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`}
          sub={revenueChange !== null ? `${revenueChange >= 0 ? '+' : ''}${revenueChange}% vs last month` : undefined}
          icon={BanknotesIcon}
          colour="bg-purple-500"
          to="/invoices"
        />
      </div>

      {/* Alerts row */}
      {(s.urgent_unassigned > 0 || s.upcoming_pm_30d > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {s.urgent_unassigned > 0 && (
            <Link to="/dispatch">
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 hover:bg-red-100 transition-colors">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">
                  <strong>{s.urgent_unassigned}</strong> critical/high job{s.urgent_unassigned > 1 ? 's' : ''} unassigned
                </p>
              </div>
            </Link>
          )}
          {s.upcoming_pm_30d > 0 && (
            <Link to="/maintenance">
              <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 hover:bg-orange-100 transition-colors">
                <CalendarDaysIcon className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <p className="text-sm text-orange-700">
                  <strong>{s.upcoming_pm_30d}</strong> preventive maintenance{s.upcoming_pm_30d > 1 ? 's' : ''} due in 30 days
                </p>
              </div>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly chart */}
        <Card className="col-span-2 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Work Orders — Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={s.weekly ?? []} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                formatter={(value, name) => [value, name === 'created' ? 'Created' : 'Completed']}
                labelFormatter={(l, p) => p[0]?.payload?.date ?? l}
              />
              <Legend formatter={v => v === 'created' ? 'Created' : 'Completed'} />
              <Bar dataKey="created"   name="created"   fill="#93c5fd" radius={[4,4,0,0]} />
              <Bar dataKey="completed" name="completed" fill="#2563eb" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Technician utilisation */}
        <Card className="p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Technician Utilisation (7d)</h2>
          {utilisation.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
          ) : (
            <ul className="space-y-3">
              {utilisation.map(t => (
                <li key={t.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 truncate">{t.name}</span>
                    <span className="text-slate-500 text-xs ml-2 flex-shrink-0">{t.hours_logged}h · {t.jobs_completed} jobs</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min((t.hours_logged / 40) * 100, 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent work orders */}
        <Card>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Recent Work Orders</h2>
            <Link to="/work-orders" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentOrders.slice(0, 6).map(wo => (
              <Link
                key={wo.id}
                to={`/work-orders/${wo.id}`}
                className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs font-mono text-slate-400 w-20 flex-shrink-0">{wo.order_number ?? `#${wo.id}`}</span>
                <span className="flex-1 text-sm text-slate-800 truncate">{wo.title}</span>
                <Badge value={wo.priority} />
                <Badge value={wo.status} />
              </Link>
            ))}
            {recentOrders.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No work orders yet</p>
            )}
          </div>
        </Card>

        {/* Upcoming PM */}
        <Card>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Upcoming Maintenance (14 days)</h2>
            <Link to="/maintenance" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingPM.slice(0, 6).map(pm => {
              const overdue = pm.next_due_date && new Date(pm.next_due_date) < new Date()
              return (
                <div key={pm.id} className="px-5 py-3 flex items-center gap-3">
                  <CalendarDaysIcon className={`h-4 w-4 flex-shrink-0 ${overdue ? 'text-red-400' : 'text-orange-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{pm.title}</p>
                    <p className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                      {pm.next_due_date ? format(new Date(pm.next_due_date), 'd MMM yyyy') : '—'}
                      {overdue && ' — overdue'}
                    </p>
                  </div>
                </div>
              )
            })}
            {upcomingPM.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No maintenance due in 14 days</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
