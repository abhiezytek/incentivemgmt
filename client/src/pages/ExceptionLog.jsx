import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  PageShell, PageTitle, StatCard, SectionCard, EnterpriseTable,
  StatusPill, Button, FilterChipBar, RightPreviewPanel,
  ActionToolbar, AlertPanel, TimelineList, SearchInput, MetricStrip,
} from '../components/ui'

const API = import.meta.env.VITE_API_URL || ''
const PAGE_SIZE = 10

/* ── helpers ─────────────────────────────────────────────── */

const fmtTs = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

/* ── mock fallback data ──────────────────────────────────── */
// TODO: Replace with real API hookup — remove mock data once /api/integration/failed-records is live
const MOCK_EXCEPTIONS = [
  { id: 1, source: 'Life Asia SFTP', type: 'INVALID_AGENT_CODE', entity: 'AGT-999', severity: 'critical', message: 'Agent code AGT-999 not found in master', beforeValue: 'Agent Code: AGT-999', afterValue: 'not found', reasonCode: 'AGENT_NOT_IN_MASTER', timestamp: '2026-03-15T02:30:00Z', status: 'open' },
  { id: 2, source: 'Penta API', type: 'DUPLICATE_POLICY', entity: 'POL-2026-4421', severity: 'critical', message: 'Policy POL-2026-4421 already exists in staging', beforeValue: 'Policy: POL-2026-4421', afterValue: 'duplicate in stg_policy_transactions', reasonCode: 'DUPLICATE_RECORD', timestamp: '2026-03-14T18:45:00Z', status: 'open' },
  { id: 3, source: 'Calculation Engine', type: 'MISSING_RATE', entity: 'PROG-002 / HEALTH', severity: 'warning', message: 'No incentive rate for product HEALTH in program 2', beforeValue: 'Rate lookup: HEALTH', afterValue: 'no matching rate row', reasonCode: 'RATE_NOT_CONFIGURED', timestamp: '2026-03-14T10:00:00Z', status: 'resolved' },
  { id: 4, source: 'Life Asia SFTP', type: 'INVALID_DATE', entity: 'policy_txn_20260314.csv:87', severity: 'info', message: 'Invalid date format in paid_date column', beforeValue: 'paid_date: 14-03-2026', afterValue: 'expected YYYY-MM-DD', reasonCode: 'DATE_FORMAT_MISMATCH', timestamp: '2026-03-14T02:30:00Z', status: 'skipped' },
  { id: 5, source: 'Manual Entry', type: 'DATA_MISMATCH', entity: 'AGT-045', severity: 'warning', message: 'Commission override amount exceeds slab maximum', beforeValue: '₹45,000', afterValue: 'Max slab: ₹30,000', reasonCode: 'AMOUNT_EXCEEDS_LIMIT', timestamp: '2026-03-13T16:20:00Z', status: 'open' },
  { id: 6, source: 'Life Asia SFTP', type: 'INVALID_AGENT_CODE', entity: 'AGT-777', severity: 'critical', message: 'Agent code AGT-777 terminated but received new policy', beforeValue: 'Agent Status: Terminated', afterValue: 'New policy POL-2026-5501', reasonCode: 'AGENT_INACTIVE', timestamp: '2026-03-13T02:30:00Z', status: 'open' },
  { id: 7, source: 'Penta API', type: 'DATA_MISMATCH', entity: 'POL-2026-3310', severity: 'info', message: 'Premium amount differs between source systems', beforeValue: '₹12,500 (Life Asia)', afterValue: '₹12,750 (Penta)', reasonCode: 'PREMIUM_MISMATCH', timestamp: '2026-03-12T14:10:00Z', status: 'resolved' },
  { id: 8, source: 'Calculation Engine', type: 'MISSING_RATE', entity: 'PROG-005 / ULIP', severity: 'warning', message: 'Rate table expired for ULIP product effective 2026-03-01', beforeValue: 'Rate valid until: 2026-02-28', afterValue: 'No successor rate row', reasonCode: 'RATE_EXPIRED', timestamp: '2026-03-12T09:00:00Z', status: 'investigating' },
  { id: 9, source: 'Life Asia SFTP', type: 'DUPLICATE_POLICY', entity: 'POL-2026-2289', severity: 'info', message: 'Re-transmitted record already processed', beforeValue: 'POL-2026-2289 row 1', afterValue: 'already in policy_transactions', reasonCode: 'DUPLICATE_RECORD', timestamp: '2026-03-11T02:30:00Z', status: 'skipped' },
  { id: 10, source: 'Manual Entry', type: 'INVALID_AGENT_CODE', entity: 'AGT-000', severity: 'critical', message: 'Agent code AGT-000 is a placeholder code', beforeValue: 'Agent Code: AGT-000', afterValue: 'placeholder / test code', reasonCode: 'INVALID_CODE', timestamp: '2026-03-11T11:45:00Z', status: 'open' },
  { id: 11, source: 'Penta API', type: 'INVALID_DATE', entity: 'POL-2026-6601', severity: 'info', message: 'Policy start date is in the future', beforeValue: 'start_date: 2026-04-01', afterValue: 'current date: 2026-03-15', reasonCode: 'FUTURE_DATE', timestamp: '2026-03-10T17:30:00Z', status: 'resolved' },
  { id: 12, source: 'Calculation Engine', type: 'DATA_MISMATCH', entity: 'AGT-112', severity: 'warning', message: 'Persistency ratio calculation produced negative value', beforeValue: 'Renewals: 3', afterValue: 'Ratio: -0.12', reasonCode: 'NEGATIVE_RATIO', timestamp: '2026-03-10T09:15:00Z', status: 'open' },
]

// TODO: Replace with real API hookup — remove mock audit trail
const MOCK_AUDIT_TRAIL = [
  { timestamp: '2026-03-15 03:00:00', title: 'Exception logged', description: 'System detected issue during nightly batch import', status: 'error' },
  { timestamp: '2026-03-15 09:15:00', title: 'Assigned to Ops team', description: 'Auto-escalated due to critical severity', status: 'warning' },
  { timestamp: '2026-03-15 10:30:00', title: 'Investigation started', description: 'Agent confirmed by ops: Rajesh K.', status: 'pending' },
]

/* ── table columns ───────────────────────────────────────── */

const SEVERITY_MAP = { critical: 'exception', warning: 'hold', info: 'active' }
const STATUS_MAP = { open: 'exception', resolved: 'processed', skipped: 'hold', investigating: 'pending' }

/* ── component ───────────────────────────────────────────── */

export default function ExceptionLog() {
  const [exceptions, setExceptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  /* ── fetch data ──────────────────────────────────────── */

  const fetchExceptions = useCallback(async () => {
    setLoading(true)
    try {
      // TODO: Replace with real API hookup
      const res = await fetch(`${API}/api/integration/failed-records`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setExceptions(Array.isArray(data) ? data : [])
    } catch {
      // Fallback to mock data when API unavailable
      // TODO: Replace with real API hookup — remove fallback
      setExceptions(MOCK_EXCEPTIONS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchExceptions() }, [fetchExceptions])

  /* ── derived data ────────────────────────────────────── */

  const filtered = useMemo(() => {
    let data = exceptions
    if (activeFilter !== 'all') {
      data = data.filter((e) =>
        activeFilter === 'critical' ? e.severity === 'critical' : e.status === activeFilter
      )
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(
        (e) =>
          (e.entity || '').toLowerCase().includes(q) ||
          (e.type || '').toLowerCase().includes(q) ||
          (e.message || '').toLowerCase().includes(q)
      )
    }
    return data
  }, [exceptions, activeFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /* ── stats ───────────────────────────────────────────── */

  const openCount = exceptions.filter((e) => e.status === 'open').length
  const resolvedToday = exceptions.filter((e) => {
    if (e.status !== 'resolved') return false
    const today = new Date().toISOString().slice(0, 10)
    return (e.timestamp || '').slice(0, 10) === today
  }).length
  const criticalCount = exceptions.filter((e) => e.severity === 'critical').length
  const sourcesAffected = new Set(exceptions.map((e) => e.source)).size

  /* ── actions ─────────────────────────────────────────── */

  const handleView = (row) => {
    setSelected(row)
    setDrawerOpen(true)
  }

  const handleResolve = () => {
    if (!selected) return
    // TODO: Replace with real API hookup — POST /api/integration/failed-records/:id/resolve
    setExceptions((prev) =>
      prev.map((e) => (e.id === selected.id ? { ...e, status: 'resolved' } : e))
    )
    setSelected((s) => ({ ...s, status: 'resolved' }))
  }

  const handleSkip = () => {
    if (!selected) return
    // TODO: Replace with real API hookup — POST /api/integration/failed-records/:id/skip
    setExceptions((prev) =>
      prev.map((e) => (e.id === selected.id ? { ...e, status: 'skipped' } : e))
    )
    setSelected((s) => ({ ...s, status: 'skipped' }))
  }

  const handleEscalate = () => {
    if (!selected) return
    // TODO: Replace with real API hookup — POST /api/integration/failed-records/:id/escalate
    setExceptions((prev) =>
      prev.map((e) => (e.id === selected.id ? { ...e, status: 'investigating' } : e))
    )
    setSelected((s) => ({ ...s, status: 'investigating' }))
  }

  /* ── filter chip toggle ──────────────────────────────── */

  const handleFilterToggle = (key) => {
    setActiveFilter(key)
    setPage(1)
  }

  const filters = [
    { key: 'all', label: 'All', active: activeFilter === 'all' },
    { key: 'open', label: 'Open', active: activeFilter === 'open' },
    { key: 'resolved', label: 'Resolved', active: activeFilter === 'resolved' },
    { key: 'skipped', label: 'Skipped', active: activeFilter === 'skipped' },
    { key: 'critical', label: 'Critical', active: activeFilter === 'critical' },
  ]

  /* ── table columns ─────────────────────────────────── */

  const columns = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      width: '160px',
      render: (val) => <span className="whitespace-nowrap text-xs text-ent-muted">{fmtTs(val)}</span>,
    },
    { key: 'type', label: 'Exception Type', render: (val) => <code className="rounded bg-ent-bg px-1.5 py-0.5 text-xs font-medium text-ent-text">{val}</code> },
    { key: 'source', label: 'Source / Actor' },
    { key: 'entity', label: 'Impacted Entity', render: (val) => <span className="font-medium">{val}</span> },
    {
      key: 'severity',
      label: 'Severity',
      width: '100px',
      render: (val) => <StatusPill status={SEVERITY_MAP[val] || 'pending'}>{val}</StatusPill>,
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (val) => <StatusPill status={STATUS_MAP[val] || 'pending'}>{val}</StatusPill>,
    },
    {
      key: 'actions',
      label: '',
      width: '80px',
      render: (_val, row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); handleView(row) }}
        >
          View
        </Button>
      ),
    },
  ]

  /* ── render ────────────────────────────────────────── */

  return (
    <PageShell>
      <PageTitle
        title="Exception Log"
        subtitle="Data quality issues, failed records, and calculation anomalies"
        breadcrumb={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Exception Log', active: true },
        ]}
        actions={
          <Button variant="secondary" onClick={fetchExceptions}>
            Refresh
          </Button>
        }
      />

      {/* Alert for unresolved critical exceptions */}
      {criticalCount > 0 && (
        <AlertPanel
          variant="warning"
          title={`${criticalCount} unresolved critical exception${criticalCount !== 1 ? 's' : ''}`}
          message="There are critical data quality issues that may affect upcoming calculation runs. Review and resolve them before the next batch."
          className="mb-6"
        />
      )}

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open Exceptions" value={String(openCount)} color="red" accentColor="red" />
        <StatCard label="Resolved Today" value={String(resolvedToday)} color="green" accentColor="green" />
        <StatCard label="Critical Severity" value={String(criticalCount)} color="red" accentColor="red" />
        <StatCard label="Sources Affected" value={String(sourcesAffected)} color="blue" accentColor="blue" />
      </div>

      {/* Exception table */}
      <SectionCard sectionLabel="EXCEPTIONS" title="All Exceptions">
        {/* Toolbar: filters + search */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <FilterChipBar filters={filters} onToggle={handleFilterToggle} />
          <SearchInput
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search entity, type, or message…"
            className="w-full sm:w-64"
          />
        </div>

        <EnterpriseTable
          columns={columns}
          data={paginated}
          loading={loading}
          onRowClick={handleView}
          emptyMessage="No exceptions match your filters"
        />

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between border-t border-ent-border pt-4">
            <span className="text-xs text-ent-muted">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ← Prev
              </Button>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next →
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Detail drawer */}
      <RightPreviewPanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Exception Detail"
        width={480}
      >
        {selected && (
          <div className="flex flex-col gap-5">
            {/* Header info */}
            <div className="flex items-start justify-between">
              <div>
                <code className="rounded bg-ent-bg px-2 py-1 text-sm font-semibold text-ent-text">{selected.type}</code>
                <p className="mt-2 text-sm text-ent-muted">{selected.message}</p>
              </div>
              <StatusPill status={STATUS_MAP[selected.status] || 'pending'}>{selected.status}</StatusPill>
            </div>

            {/* Key/value details */}
            <div className="rounded-lg border border-ent-border">
              {[
                ['Source / Actor', selected.source],
                ['Impacted Entity', selected.entity],
                ['Severity', selected.severity],
                ['Timestamp', fmtTs(selected.timestamp)],
                ['Record ID', `#${selected.id}`],
              ].map(([label, value], i) => (
                <div
                  key={label}
                  className={`flex justify-between px-4 py-2.5 text-sm ${i % 2 === 0 ? 'bg-ent-bg' : 'bg-ent-surface'}`}
                >
                  <span className="text-ent-muted">{label}</span>
                  <span className="font-medium text-ent-text">{value}</span>
                </div>
              ))}
            </div>

            {/* Before/After values */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ent-muted">Before / After</h4>
              <div className="rounded-lg border border-ent-border bg-ent-bg p-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-ent-error">{selected.beforeValue || '—'}</span>
                  <span className="text-ent-muted">→</span>
                  <span className="rounded bg-[#7AD67A]/20 px-2 py-0.5 text-xs text-[#16A34A]">{selected.afterValue || '—'}</span>
                </div>
              </div>
            </div>

            {/* Reason code */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ent-muted">Reason Code</h4>
              <code className="rounded border border-ent-border bg-ent-surface px-3 py-1.5 text-xs font-medium text-ent-text">
                {selected.reasonCode || '—'}
              </code>
            </div>

            {/* Resolution actions */}
            {selected.status === 'open' || selected.status === 'investigating' ? (
              <ActionToolbar leftContent="Resolution Actions">
                <Button size="sm" onClick={handleResolve}>Resolve</Button>
                <Button size="sm" variant="secondary" onClick={handleSkip}>Skip</Button>
                <Button size="sm" variant="danger" onClick={handleEscalate}>Escalate</Button>
              </ActionToolbar>
            ) : (
              <div className="rounded-lg border border-ent-border bg-ent-bg px-4 py-3 text-center text-sm text-ent-muted">
                This exception has been <strong>{selected.status}</strong>.
              </div>
            )}

            {/* Audit trail */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ent-muted">Audit Trail</h4>
              {/* TODO: Replace with real API hookup — GET /api/integration/audit-log?entityId=:id */}
              <TimelineList items={MOCK_AUDIT_TRAIL} />
            </div>
          </div>
        )}
      </RightPreviewPanel>
    </PageShell>
  )
}
