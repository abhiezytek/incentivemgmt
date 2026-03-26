import { PageShell, PageTitle, SectionCard, EnterpriseTable, StatusPill, FilterChipBar, Button } from '../components/ui'

const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'Batch Approval Required', message: '45 incentive results pending your approval for Jan 2026', type: 'APPROVAL', time: '2 hours ago', read: false },
  { id: 2, title: 'Export Ready: SAP FICO', message: 'January 2026 payout file generated successfully - 89 records', type: 'EXPORT', time: '4 hours ago', read: false },
  { id: 3, title: 'SFTP Poll Failed', message: 'Life Asia file validation failed: 23 invalid rows in persistency_20260325.csv', type: 'INTEGRATION', time: '1 day ago', read: true },
  { id: 4, title: 'New Scheme Published', message: 'Direct Channel FY26 scheme has been activated by Admin', type: 'SYSTEM', time: '2 days ago', read: true },
  { id: 5, title: 'Calculation Complete', message: 'FY 2025-26 Agency Channel: 245 agent results calculated', type: 'CALCULATION', time: '3 days ago', read: true },
]

const columns = [
  {
    key: 'title',
    label: 'Notification',
    render: (val, row) => (
      <div>
        <div className={`text-sm ${row.read ? 'text-ent-muted' : 'font-semibold text-ent-text'}`}>{val}</div>
        <div className="mt-0.5 text-xs text-ent-muted">{row.message}</div>
      </div>
    ),
  },
  {
    key: 'type',
    label: 'Type',
    render: (val) => {
      const map = { APPROVAL: 'hold', EXPORT: 'processed', INTEGRATION: 'exception', SYSTEM: 'active', CALCULATION: 'processed' }
      return <StatusPill status={map[val] || 'pending'}>{val}</StatusPill>
    },
  },
  { key: 'time', label: 'Time' },
  {
    key: 'read',
    label: 'Status',
    render: (val) => <StatusPill status={val ? 'processed' : 'pending'}>{val ? 'Read' : 'Unread'}</StatusPill>,
  },
]

export default function Notifications() {
  return (
    <PageShell>
      <PageTitle
        title="Notifications"
        subtitle="Alerts, reminders, and workflow notifications"
        actions={<Button variant="secondary">Mark All Read</Button>}
      />

      <SectionCard sectionLabel="ALL NOTIFICATIONS">
        <FilterChipBar
          filters={[
            { key: 'all', label: 'All', active: true },
            { key: 'unread', label: 'Unread', active: false },
            { key: 'approval', label: 'Approval', active: false },
            { key: 'integration', label: 'Integration', active: false },
          ]}
          onToggle={() => {}}
          className="mb-4"
        />
        <EnterpriseTable columns={columns} data={MOCK_NOTIFICATIONS} />
      </SectionCard>
    </PageShell>
  )
}
