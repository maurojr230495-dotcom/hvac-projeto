import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  HomeIcon, ClipboardDocumentListIcon, CalendarDaysIcon,
  ClockIcon, UsersIcon, Cog6ToothIcon, WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'

const nav = [
  { to: '/',           label: 'Dashboard',     icon: HomeIcon },
  { to: '/work-orders', label: 'Work Orders',  icon: ClipboardDocumentListIcon },
  { to: '/dispatch',   label: 'Dispatch Board', icon: CalendarDaysIcon },
  { to: '/timesheets', label: 'Timesheets',    icon: ClockIcon },
  { to: '/clients',    label: 'Clients',       icon: UsersIcon },
  { to: '/settings',   label: 'Settings',      icon: Cog6ToothIcon, adminOnly: true },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-slate-900 flex flex-col z-20">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-800">
        <WrenchScrewdriverIcon className="h-7 w-7 text-blue-400" />
        <span className="text-white font-semibold text-lg leading-tight">FieldOps<br/>
          <span className="text-xs font-normal text-slate-400">HVAC Management</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, label, icon: Icon, adminOnly }) => {
          if (adminOnly && !['admin', 'manager'].includes(user?.role)) return null
          return (
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
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-slate-800">
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
          className="w-full mt-2 px-3 py-2 text-left text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
