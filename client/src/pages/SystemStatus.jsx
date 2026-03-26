import { PageShell, PageTitle, SectionCard, StatCard, StatusPill, TimelineList, MetricStrip } from '../components/ui'

const MOCK_TIMELINE = [
  { timestamp: '2026-03-26 05:00', title: 'Hierarchy Sync Complete', description: '342 agents synchronized from internal API', status: 'success' },
  { timestamp: '2026-03-26 02:30', title: 'SFTP Poll: Life Asia', description: '3 files downloaded, 2,847 records processed', status: 'success' },
  { timestamp: '2026-03-25 18:45', title: 'Penta API: Policy Push', description: '145 policy transactions received', status: 'success' },
  { timestamp: '2026-03-25 14:00', title: 'Calculation Run: FY26 Agency', description: '245 agent results computed in 12.3s', status: 'success' },
  { timestamp: '2026-03-25 02:30', title: 'SFTP Poll: Life Asia', description: '1 file failed validation - 23 invalid rows', status: 'warning' },
]

export default function SystemStatus() {
  return (
    <PageShell>
      <PageTitle
        title="System Status"
        subtitle="Real-time health monitoring and integration status"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="System Health" value="Operational" color="green" />
        <StatCard label="Last SFTP Sync" value="5h ago" color="blue" />
        <StatCard label="Penta API" value="Connected" color="green" />
        <StatCard label="Failed Jobs (24h)" value="1" color="yellow" />
      </div>

      <MetricStrip
        metrics={[
          { label: 'Uptime', value: '99.7%' },
          { label: 'Files Today', value: '6' },
          { label: 'API Calls (24h)', value: '1,247' },
          { label: 'Avg Latency', value: '145ms' },
        ]}
        className="mb-6"
      />

      <SectionCard sectionLabel="ACTIVITY LOG" title="Recent Activity">
        <TimelineList items={MOCK_TIMELINE} />
      </SectionCard>
    </PageShell>
  )
}
