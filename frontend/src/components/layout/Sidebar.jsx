import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  HomeIcon, ClipboardDocumentListIcon, CalendarDaysIcon,
  ClockIcon, UsersIcon, Cog6ToothIcon, WrenchScrewdriverIcon,
  CpuChipIcon, BanknotesIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline'

const nav = [
  {
    group: 'Main',
    items: [
      { to: '/',           label: 'Dashboard',      icon: HomeIcon },
    ],
  },
  {
    group: 'Operations',
    items: [
      { to: '/work-orders', label: 'Work Orders',   icon: ClipboardDocumentListIcon },
      { to: '/dispatch',    label: 'Dispatch',       icon: CalendarDaysIcon },
      { to: '/timesheets',  label: 'Timesheets',     icon: ClockIcon },
    ],
  },
  {
    group: 'Assets & Billing',
    items: [
      { to: '/assets',      label: 'Assets',         icon: CpuChipIcon },
      { to: '/maintenance', label: 'Maintenance',    icon: ArrowPathIcon },
      { to: '/invoices',    label: 'Invoices',        icon: BanknotesIcon },
    ],
  },
  {
    group: 'Admin',
    adminOnly: true,
    items: [
      { to: '/clients',   label: 'Clients',          icon: UsersIcon },
      { to: '/settings',  label: 'Settings',          icon: Cog6ToothIcon },
    ],
  },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const isAdmin = ['admin', 'manager'].includes(user?.role)

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-slate-900 flex flex-col z-20">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-800 flex-shrink-0">
        <WrenchScrewdriverIcon className="h-7 w-7 text-blue-400" />
        <div>
          <p className="text-white font-semibold text-base leading-tight">FieldOps</p>
          <p className="text-slate-400 text-xs">HVAC Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {nav.map(({ group, adminOnly, items }) => {
          if (adminOnly && !isAdmin) return null
          return (
            <div key={group}>
              <p className="px-3 mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{group}</p>
              <div className="space-y-0.5">
                {items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full mt-1 px-3 py-2 text-left text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
