import { PageShell, PageTitle, SectionCard, StatCard, EnterpriseTable, StatusPill, Button } from '../../components/ui'

const MOCK_KPIS = [
  { id: 1, name: 'New Business Premium', type: 'NUMERIC', frequency: 'MONTHLY', status: 'active', programs: 4 },
  { id: 2, name: 'Persistency 13M', type: 'PERCENTAGE', frequency: 'MONTHLY', status: 'active', programs: 3 },
  { id: 3, name: 'Policy Count', type: 'NUMERIC', frequency: 'MONTHLY', status: 'active', programs: 5 },
  { id: 4, name: 'APE Target', type: 'CURRENCY', frequency: 'QUARTERLY', status: 'draft', programs: 1 },
  { id: 5, name: 'Renewal Collection Rate', type: 'PERCENTAGE', frequency: 'MONTHLY', status: 'active', programs: 2 },
]

const columns = [
  { key: 'name', label: 'KPI Name' },
  { key: 'type', label: 'Type' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'programs', label: 'Programs' },
  {
    key: 'status',
    label: 'Status',
    render: (val) => <StatusPill status={val === 'active' ? 'processed' : 'pending'}>{val}</StatusPill>,
  },
]

export default function KPIConfig() {
  return (
    <PageShell>
      <PageTitle
        title="KPI Configuration"
        subtitle="Define and manage key performance indicators across incentive programs"
        actions={<Button>+ New KPI</Button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total KPIs" value="12" color="blue" />
        <StatCard label="Active" value="9" color="green" />
        <StatCard label="Draft" value="3" color="yellow" />
        <StatCard label="Derived Variables" value="5" color="grey" />
      </div>

      <SectionCard sectionLabel="KPI DEFINITIONS" title="All KPIs">
        <EnterpriseTable columns={columns} data={MOCK_KPIS} />
      </SectionCard>
    </PageShell>
  )
}
