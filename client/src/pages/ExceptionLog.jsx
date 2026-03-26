import { PageShell, PageTitle, SectionCard, StatCard, EnterpriseTable, StatusPill, FilterChipBar, AlertPanel } from '../components/ui'

const MOCK_EXCEPTIONS = [
  { id: 1, source: 'Life Asia SFTP', type: 'INVALID_AGENT_CODE', file: 'policy_txn_20260315.csv', row: 142, message: 'Agent code AGT-999 not found in master', timestamp: '2026-03-15 02:30:00', status: 'open' },
  { id: 2, source: 'Penta API', type: 'DUPLICATE_POLICY', file: '—', row: null, message: 'Policy POL-2026-4421 already exists', timestamp: '2026-03-14 18:45:00', status: 'open' },
  { id: 3, source: 'Calculation', type: 'MISSING_RATE', file: '—', row: null, message: 'No incentive rate for product HEALTH in program 2', timestamp: '2026-03-14 10:00:00', status: 'resolved' },
  { id: 4, source: 'Life Asia SFTP', type: 'INVALID_DATE', file: 'persistency_20260314.csv', row: 87, message: 'Invalid date format in paid_date column', timestamp: '2026-03-14 02:30:00', status: 'skipped' },
]

const columns = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'source', label: 'Source' },
  { key: 'type', label: 'Exception Type' },
  { key: 'message', label: 'Message' },
  {
    key: 'status',
    label: 'Status',
    render: (val) => {
      const map = { open: 'exception', resolved: 'processed', skipped: 'hold' }
      return <StatusPill status={map[val] || 'pending'}>{val}</StatusPill>
    },
  },
]

export default function ExceptionLog() {
  return (
    <PageShell>
      <PageTitle
        title="Exception Log"
        subtitle="Data quality issues, failed records, and calculation anomalies"
      />

      <AlertPanel
        variant="warning"
        title="3 unresolved exceptions"
        message="There are data quality issues that may affect upcoming calculation runs. Review and resolve them before the next batch."
        className="mb-6"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open Exceptions" value="8" color="red" />
        <StatCard label="Resolved Today" value="3" color="green" />
        <StatCard label="Skipped" value="2" color="yellow" />
        <StatCard label="Sources Affected" value="3" color="blue" />
      </div>

      <SectionCard sectionLabel="EXCEPTIONS" title="All Exceptions">
        <FilterChipBar
          filters={[
            { key: 'all', label: 'All', active: true },
            { key: 'open', label: 'Open', active: false },
            { key: 'resolved', label: 'Resolved', active: false },
            { key: 'skipped', label: 'Skipped', active: false },
          ]}
          onToggle={() => {}}
          className="mb-4"
        />
        <EnterpriseTable columns={columns} data={MOCK_EXCEPTIONS} />
      </SectionCard>
    </PageShell>
  )
}
