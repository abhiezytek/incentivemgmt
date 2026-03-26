import { PageShell, PageTitle, SectionCard, StatCard, EnterpriseTable, StatusPill, Button, FilterChipBar, MetricStrip } from '../components/ui'

const MOCK_RESULTS = [
  { id: 1, agent: 'AGT-001', name: 'Rajesh Kumar', program: 'FY 2025-26 Agency', period: 'Jan 2026', total: '₹45,200', status: 'DRAFT' },
  { id: 2, agent: 'AGT-002', name: 'Priya Sharma', program: 'FY 2025-26 Agency', period: 'Jan 2026', total: '₹38,750', status: 'APPROVED' },
  { id: 3, agent: 'AGT-003', name: 'Amit Patel', program: 'Bancassurance Q1', period: 'Jan 2026', total: '₹62,100', status: 'DRAFT' },
  { id: 4, agent: 'AGT-004', name: 'Sunita Reddy', program: 'FY 2025-26 Agency', period: 'Jan 2026', total: '₹29,400', status: 'PAID' },
  { id: 5, agent: 'AGT-005', name: 'Vikram Singh', program: 'FY 2025-26 Agency', period: 'Jan 2026', total: '₹51,800', status: 'HOLD' },
]

const columns = [
  { key: 'agent', label: 'Agent Code' },
  { key: 'name', label: 'Agent Name' },
  { key: 'program', label: 'Program' },
  { key: 'period', label: 'Period' },
  { key: 'total', label: 'Total Incentive' },
  {
    key: 'status',
    label: 'Status',
    render: (val) => {
      const map = { DRAFT: 'pending', APPROVED: 'processed', PAID: 'success', HOLD: 'hold' }
      return <StatusPill status={map[val] || 'pending'}>{val}</StatusPill>
    },
  },
]

export default function ReviewAdjustments() {
  return (
    <PageShell>
      <PageTitle
        title="Review & Adjustments"
        subtitle="Review calculated incentives, approve, adjust, or hold payouts"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary">Export</Button>
            <Button>Approve Selected</Button>
          </div>
        }
      />

      <MetricStrip
        metrics={[
          { label: 'Total Records', value: '156' },
          { label: 'Pending Review', value: '45', color: '#D6A15C' },
          { label: 'Approved', value: '89', color: '#16A34A' },
          { label: 'On Hold', value: '12', color: '#DC2626' },
          { label: 'Total Payout', value: '₹18.4L' },
        ]}
        className="mb-6"
      />

      <SectionCard sectionLabel="INCENTIVE RESULTS" title="Review Queue">
        <FilterChipBar
          filters={[
            { key: 'all', label: 'All', active: true },
            { key: 'draft', label: 'Draft', active: false },
            { key: 'approved', label: 'Approved', active: false },
            { key: 'hold', label: 'On Hold', active: false },
            { key: 'paid', label: 'Paid', active: false },
          ]}
          onToggle={() => {}}
          className="mb-4"
        />
        <EnterpriseTable columns={columns} data={MOCK_RESULTS} />
      </SectionCard>
    </PageShell>
  )
}
