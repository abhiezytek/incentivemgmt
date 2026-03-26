import { PageShell, PageTitle, SectionCard, StatCard, EnterpriseTable, StatusPill, Button, FilterChipBar } from '../components/ui'

const MOCK_AGENTS = [
  { id: 1, code: 'AGT-001', name: 'Rajesh Kumar', channel: 'AGENCY', region: 'North', branch: 'Delhi-01', level: 'L1', status: 'active' },
  { id: 2, code: 'AGT-002', name: 'Priya Sharma', channel: 'AGENCY', region: 'West', branch: 'Mumbai-03', level: 'L2', status: 'active' },
  { id: 3, code: 'AGT-003', name: 'Amit Patel', channel: 'BANCA', region: 'West', branch: 'Mumbai-01', level: 'L1', status: 'active' },
  { id: 4, code: 'AGT-004', name: 'Sunita Reddy', channel: 'AGENCY', region: 'South', branch: 'Hyderabad-02', level: 'L1', status: 'inactive' },
]

const columns = [
  { key: 'code', label: 'Agent Code' },
  { key: 'name', label: 'Name' },
  { key: 'channel', label: 'Channel' },
  { key: 'region', label: 'Region' },
  { key: 'branch', label: 'Branch' },
  { key: 'level', label: 'Hierarchy Level' },
  {
    key: 'status',
    label: 'Status',
    render: (val) => <StatusPill status={val === 'active' ? 'processed' : 'hold'}>{val}</StatusPill>,
  },
]

export default function OrgDomainMapping() {
  return (
    <PageShell>
      <PageTitle
        title="Org & Domain Mapping"
        subtitle="Agent hierarchy, region and branch assignments, channel configuration"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary">Import Agents</Button>
            <Button>+ Add Agent</Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Agents" value="342" color="blue" />
        <StatCard label="Active" value="298" color="green" />
        <StatCard label="Regions" value="4" color="grey" />
        <StatCard label="Channels" value="3" color="grey" />
      </div>

      <SectionCard sectionLabel="AGENT DIRECTORY" title="All Agents">
        <FilterChipBar
          filters={[
            { key: 'all', label: 'All', active: true },
            { key: 'agency', label: 'Agency', active: false },
            { key: 'banca', label: 'Banca', active: false },
            { key: 'direct', label: 'Direct', active: false },
          ]}
          onToggle={() => {}}
          className="mb-4"
        />
        <EnterpriseTable columns={columns} data={MOCK_AGENTS} />
      </SectionCard>
    </PageShell>
  )
}
