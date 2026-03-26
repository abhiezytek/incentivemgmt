import { PageShell, PageTitle, SectionCard, StatCard, EnterpriseTable, StatusPill, Button, MetricStrip } from '../../components/ui'

const MOCK_SCHEMES = [
  { id: 1, name: 'FY 2025-26 Agency Channel', channel: 'AGENCY', status: 'active', agents: 245, start: '2025-04-01', end: '2026-03-31' },
  { id: 2, name: 'Bancassurance Q1 Sprint', channel: 'BANCA', status: 'active', agents: 89, start: '2025-04-01', end: '2025-06-30' },
  { id: 3, name: 'Direct Channel FY26', channel: 'DIRECT', status: 'draft', agents: 0, start: '2025-04-01', end: '2026-03-31' },
  { id: 4, name: 'FY 2024-25 Agency (Closed)', channel: 'AGENCY', status: 'closed', agents: 210, start: '2024-04-01', end: '2025-03-31' },
]

const columns = [
  { key: 'name', label: 'Scheme Name' },
  { key: 'channel', label: 'Channel' },
  { key: 'agents', label: 'Agents' },
  { key: 'start', label: 'Start Date' },
  { key: 'end', label: 'End Date' },
  {
    key: 'status',
    label: 'Status',
    render: (val) => {
      const map = { active: 'processed', draft: 'pending', closed: 'hold' }
      return <StatusPill status={map[val] || 'pending'}>{val}</StatusPill>
    },
  },
]

export default function SchemeManagement() {
  return (
    <PageShell>
      <PageTitle
        title="Scheme Management"
        subtitle="Create and manage incentive programs, rates, and payout rules"
        actions={<Button>+ New Scheme</Button>}
      />

      <MetricStrip
        metrics={[
          { label: 'Active Schemes', value: '2' },
          { label: 'Total Agents Enrolled', value: '334' },
          { label: 'Draft Schemes', value: '1' },
          { label: 'Closed', value: '1' },
        ]}
        className="mb-6"
      />

      <SectionCard sectionLabel="INCENTIVE PROGRAMS" title="All Schemes">
        <EnterpriseTable columns={columns} data={MOCK_SCHEMES} />
      </SectionCard>
    </PageShell>
  )
}
