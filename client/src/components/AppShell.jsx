import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/admin/plans', label: 'Plans' },
  { to: '/plans/create', label: 'Create Plan' },
  { to: '/data/variables', label: 'Derived Variables' },
  { to: '/data/upload-transactions', label: 'Upload Transactions' },
  { to: '/data/upload-agents', label: 'Upload Agents' },
  { to: '/data/upload-persistency', label: 'Upload Persistency' },
  { to: '/data/upload-products', label: 'Upload Products' },
  { to: '/data/upload-rates', label: 'Upload Rates' },
  { to: '/team/performance', label: 'Team Performance' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/payout/disbursement', label: 'Payout' },
  { to: '/incentive/breakdown', label: 'Incentive Breakdown' },
]

export default function AppShell() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center border-b border-gray-200 px-4">
          <span className="text-lg font-bold text-indigo-600">IncentiveMgmt</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-indigo-50 font-medium text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
          <span className="text-sm text-gray-500">Incentive Management System</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
