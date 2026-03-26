import SearchInput from './SearchInput'

export default function AppHeader({ onMenuClick, notificationCount = 0 }) {
  return (
    <header className="flex h-16 items-center gap-4 border-b border-ent-border bg-ent-surface px-4 lg:px-6">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-ent-muted hover:bg-ent-bg hover:text-ent-text lg:hidden"
        aria-label="Open menu"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Title (visible on mobile only since sidebar has it on desktop) */}
      <span className="text-base font-bold text-ent-text lg:hidden">
        Incentive Engine
      </span>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* System Status */}
        <a
          href="/integration/dashboard"
          className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-ent-muted hover:bg-ent-bg hover:text-ent-text md:flex"
        >
          <span className="h-2 w-2 rounded-full bg-ent-success" />
          System Status
        </a>

        {/* Notifications */}
        <button
          className="relative rounded-lg p-2 text-ent-muted hover:bg-ent-bg hover:text-ent-text"
          aria-label="Notifications"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ent-error px-1 text-[10px] font-bold text-white">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </button>

        {/* Search */}
        <div className="hidden md:block">
          <SearchInput placeholder="Search…" className="w-48 lg:w-56" />
        </div>

        {/* Help */}
        <button
          className="rounded-lg p-2 text-ent-muted hover:bg-ent-bg hover:text-ent-text"
          aria-label="Help"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </button>

        {/* User avatar */}
        <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-ent-bg">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-action-blue text-xs font-bold text-white">
            AK
          </div>
          <svg className="hidden h-4 w-4 text-ent-muted sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>
    </header>
  )
}
