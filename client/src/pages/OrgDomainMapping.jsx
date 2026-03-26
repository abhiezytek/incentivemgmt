import { useState, useMemo, useCallback } from 'react'
import {
  PageShell, PageTitle, StatCard, SectionCard, EnterpriseTable,
  StatusPill, Button, FilterChipBar, RightPreviewPanel,
  SearchInput, MetricStrip,
} from '../components/ui'
import { useGetAgentsQuery } from '../store/apiSlice'

/* ── mock hierarchy enrichment ───────────────────────────── */
// TODO: Wire hierarchy to backend — replace static maps with API data

const REGION_META = {
  North: { color: '#1D4ED8', branches: ['Delhi-01', 'Delhi-02', 'Noida-01', 'Jaipur-01'] },
  South: { color: '#16A34A', branches: ['Hyderabad-01', 'Hyderabad-02', 'Chennai-01', 'Bangalore-01'] },
  West: { color: '#D6A15C', branches: ['Mumbai-01', 'Mumbai-03', 'Pune-01', 'Ahmedabad-01'] },
  East: { color: '#DC2626', branches: ['Kolkata-01', 'Kolkata-02', 'Bhubaneswar-01'] },
}

const CHANNEL_META = {
  AGENCY: { color: '#1D4ED8', label: 'Agency Channel' },
  BANCA: { color: '#16A34A', label: 'Bancassurance' },
  DIRECT: { color: '#D6A15C', label: 'Direct Sales' },
}

const DESIGNATION_META = {
  'Development Officer': { color: '#1D4ED8' },
  'Senior Agent': { color: '#16A34A' },
  'Agent': { color: '#D6A15C' },
  'Trainee': { color: '#667085' },
}

// TODO: Wire hierarchy to backend — remove fallback agent data
const MOCK_AGENTS = [
  { id: 1, agent_code: 'AGT-001', name: 'Rajesh Kumar', channel: 'AGENCY', region: 'North', branch: 'Delhi-01', designation: 'Development Officer', level: 'L3', status: 'active' },
  { id: 2, agent_code: 'AGT-002', name: 'Priya Sharma', channel: 'AGENCY', region: 'West', branch: 'Mumbai-03', designation: 'Senior Agent', level: 'L2', status: 'active' },
  { id: 3, agent_code: 'AGT-003', name: 'Amit Patel', channel: 'BANCA', region: 'West', branch: 'Mumbai-01', designation: 'Agent', level: 'L1', status: 'active' },
  { id: 4, agent_code: 'AGT-004', name: 'Sunita Reddy', channel: 'AGENCY', region: 'South', branch: 'Hyderabad-02', designation: 'Senior Agent', level: 'L2', status: 'inactive' },
  { id: 5, agent_code: 'AGT-005', name: 'Vikram Singh', channel: 'DIRECT', region: 'North', branch: 'Noida-01', designation: 'Agent', level: 'L1', status: 'active' },
  { id: 6, agent_code: 'AGT-006', name: 'Ananya Das', channel: 'BANCA', region: 'East', branch: 'Kolkata-01', designation: 'Development Officer', level: 'L3', status: 'active' },
  { id: 7, agent_code: 'AGT-007', name: 'Mohammed Irfan', channel: 'AGENCY', region: 'South', branch: 'Chennai-01', designation: 'Trainee', level: 'L0', status: 'active' },
  { id: 8, agent_code: 'AGT-008', name: 'Kavita Nair', channel: 'AGENCY', region: 'South', branch: 'Bangalore-01', designation: 'Agent', level: 'L1', status: 'active' },
  { id: 9, agent_code: 'AGT-009', name: 'Ravi Iyer', channel: 'DIRECT', region: 'West', branch: 'Pune-01', designation: 'Senior Agent', level: 'L2', status: 'inactive' },
  { id: 10, agent_code: 'AGT-010', name: 'Deepa Joshi', channel: 'BANCA', region: 'North', branch: 'Jaipur-01', designation: 'Agent', level: 'L1', status: 'active' },
  { id: 11, agent_code: 'AGT-011', name: 'Suresh Babu', channel: 'AGENCY', region: 'East', branch: 'Bhubaneswar-01', designation: 'Development Officer', level: 'L3', status: 'active' },
  { id: 12, agent_code: 'AGT-012', name: 'Meena Kumari', channel: 'AGENCY', region: 'North', branch: 'Delhi-02', designation: 'Trainee', level: 'L0', status: 'active' },
]

// TODO: Wire hierarchy to backend — linked programs should come from API
const MOCK_LINKED_PROGRAMS = ['Agency Q1 Incentive 2026', 'Star Performer Bonus']

// TODO: Wire hierarchy to backend — status history should come from API
const MOCK_STATUS_HISTORY = [
  { date: '2026-01-15', status: 'active', note: 'Onboarded' },
  { date: '2025-06-01', status: 'active', note: 'Promoted to L2' },
  { date: '2025-01-10', status: 'active', note: 'Joined as L1 trainee' },
]

const VIEW_TABS = [
  { key: 'region', label: 'By Region' },
  { key: 'channel', label: 'By Channel' },
  { key: 'branch', label: 'By Branch' },
  { key: 'designation', label: 'By Designation' },
]

/* ── component ───────────────────────────────────────────── */

export default function OrgDomainMapping() {
  const { data: apiAgents } = useGetAgentsQuery()

  const agents = useMemo(() => {
    if (Array.isArray(apiAgents) && apiAgents.length > 0) return apiAgents
    // TODO: Wire hierarchy to backend — remove fallback
    return MOCK_AGENTS
  }, [apiAgents])

  const [activeView, setActiveView] = useState('region')
  const [search, setSearch] = useState('')
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [selectedScope, setSelectedScope] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expandedCards, setExpandedCards] = useState({})

  /* ── derived stats ─────────────────────────────────────── */

  const stats = useMemo(() => {
    const active = agents.filter((a) => a.status === 'active').length
    const regions = new Set(agents.map((a) => a.region)).size
    const channels = new Set(agents.map((a) => a.channel)).size
    const branches = new Set(agents.map((a) => a.branch)).size
    return { total: agents.length, active, regions, channels, branches }
  }, [agents])

  /* ── search filter ─────────────────────────────────────── */

  const filteredAgents = useMemo(() => {
    if (!search.trim()) return agents
    const q = search.toLowerCase()
    return agents.filter(
      (a) =>
        (a.agent_code || a.code || '').toLowerCase().includes(q) ||
        (a.name || '').toLowerCase().includes(q) ||
        (a.channel || '').toLowerCase().includes(q) ||
        (a.region || '').toLowerCase().includes(q) ||
        (a.branch || '').toLowerCase().includes(q) ||
        (a.designation || '').toLowerCase().includes(q)
    )
  }, [agents, search])

  /* ── grouping for card views ───────────────────────────── */

  const grouped = useMemo(() => {
    const keyFn = {
      region: (a) => a.region,
      channel: (a) => a.channel,
      branch: (a) => a.branch,
      designation: (a) => a.designation,
    }[activeView]

    const map = {}
    filteredAgents.forEach((a) => {
      const key = keyFn(a) || 'Unknown'
      if (!map[key]) map[key] = []
      map[key].push(a)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredAgents, activeView])

  /* ── card color lookup ─────────────────────────────────── */

  const getCardColor = useCallback(
    (key) => {
      if (activeView === 'region') return REGION_META[key]?.color || '#667085'
      if (activeView === 'channel') return CHANNEL_META[key]?.color || '#667085'
      if (activeView === 'designation') return DESIGNATION_META[key]?.color || '#667085'
      return '#1D4ED8'
    },
    [activeView]
  )

  /* ── card expand/collapse ──────────────────────────────── */

  const toggleCard = (key) => {
    setExpandedCards((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  /* ── open agent detail ─────────────────────────────────── */

  const openAgent = (agent) => {
    setSelectedAgent(agent)
    setSelectedScope(null)
    setDrawerOpen(true)
  }

  const openScope = (key, agentsList) => {
    setSelectedScope({ key, agents: agentsList })
    setSelectedAgent(null)
    setDrawerOpen(true)
  }

  /* ── table columns (flat list) ─────────────────────────── */

  const agentColumns = [
    { key: 'agent_code', label: 'Agent Code', width: '110px', render: (val) => <span className="font-medium text-action-blue">{val}</span> },
    { key: 'name', label: 'Name' },
    { key: 'channel', label: 'Channel', width: '100px' },
    { key: 'region', label: 'Region', width: '90px' },
    { key: 'branch', label: 'Branch', width: '120px' },
    { key: 'designation', label: 'Designation', width: '140px' },
    { key: 'level', label: 'Level', width: '60px' },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (val) => <StatusPill status={val === 'active' ? 'processed' : 'hold'}>{val}</StatusPill>,
    },
  ]

  /* ── inner table for expanded cards ────────────────────── */

  const innerColumns = [
    { key: 'agent_code', label: 'Code', width: '100px', render: (val) => <span className="font-medium">{val}</span> },
    { key: 'name', label: 'Name' },
    { key: 'level', label: 'Level', width: '60px' },
    {
      key: 'status',
      label: 'Status',
      width: '90px',
      render: (val) => <StatusPill status={val === 'active' ? 'processed' : 'hold'}>{val}</StatusPill>,
    },
  ]

  /* ── view tabs ─────────────────────────────────────────── */

  const viewFilters = VIEW_TABS.map((t) => ({
    key: t.key,
    label: t.label,
    active: activeView === t.key,
  }))

  /* ── render ────────────────────────────────────────────── */

  return (
    <PageShell>
      <PageTitle
        title="Org & Domain Mapping"
        subtitle="Agent hierarchy, region and branch assignments, channel configuration"
        breadcrumb={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Org & Domain Mapping', active: true },
        ]}
        actions={
          <div className="flex gap-2">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents…"
              className="w-48 lg:w-64"
            />
            <Button variant="secondary">Import Agents</Button>
            <Button>+ Add Agent</Button>
          </div>
        }
      />

      {/* Metric strip */}
      <MetricStrip
        metrics={[
          { label: 'Total Agents', value: String(stats.total), color: '#1D4ED8' },
          { label: 'Active', value: String(stats.active), color: '#16A34A' },
          { label: 'Regions', value: String(stats.regions) },
          { label: 'Channels', value: String(stats.channels) },
          { label: 'Branches', value: String(stats.branches) },
        ]}
        className="mb-6"
      />

      {/* View toggle */}
      <FilterChipBar
        filters={viewFilters}
        onToggle={(key) => { setActiveView(key); setExpandedCards({}) }}
        className="mb-6"
      />

      {/* Cards grid view */}
      {(activeView === 'region' || activeView === 'channel' || activeView === 'designation') && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {grouped.map(([key, groupAgents]) => {
            const activeCount = groupAgents.filter((a) => a.status === 'active').length
            const pct = groupAgents.length ? Math.round((activeCount / groupAgents.length) * 100) : 0
            const cardColor = getCardColor(key)
            const isExpanded = expandedCards[key]

            return (
              <div
                key={key}
                className="overflow-hidden rounded-xl border border-ent-border bg-ent-surface shadow-sm"
                style={{ borderLeftWidth: '4px', borderLeftColor: cardColor }}
              >
                {/* Card header */}
                <div
                  className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-ent-bg"
                  onClick={() => toggleCard(key)}
                >
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-ent-text">{key}</h3>
                    <p className="mt-0.5 text-xs text-ent-muted">
                      {groupAgents.length} agent{groupAgents.length !== 1 ? 's' : ''} · {pct}% active
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-lg p-1 text-ent-muted hover:bg-ent-bg hover:text-ent-text"
                      onClick={(e) => { e.stopPropagation(); openScope(key, groupAgents) }}
                      title="View details"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <svg
                      className={`h-4 w-4 text-ent-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Active bar */}
                <div className="mx-4 mb-3 h-1.5 overflow-hidden rounded-full bg-ent-bg">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: cardColor }}
                  />
                </div>

                {/* Expanded agent list */}
                {isExpanded && (
                  <div className="border-t border-ent-border">
                    <EnterpriseTable
                      columns={innerColumns}
                      data={groupAgents}
                      onRowClick={openAgent}
                    />
                  </div>
                )}
              </div>
            )
          })}
          {grouped.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-ent-muted">
              No results match your search.
            </div>
          )}
        </div>
      )}

      {/* Branch flat view — show as table with hierarchy parent */}
      {activeView === 'branch' && (
        <SectionCard sectionLabel="BRANCH VIEW" title="All Agents by Branch">
          {grouped.map(([branch, groupAgents]) => {
            // TODO: Wire hierarchy to backend — derive region from branch lookup
            const parentRegion = Object.entries(REGION_META).find(([, meta]) =>
              meta.branches.includes(branch)
            )?.[0] || '—'

            return (
              <div key={branch} className="mb-4 last:mb-0">
                <div className="mb-1 flex items-center gap-2 text-xs text-ent-muted">
                  <span>{parentRegion}</span>
                  <span>→</span>
                  <span className="font-semibold text-ent-text">{branch}</span>
                  <span className="ml-auto">{groupAgents.length} agent{groupAgents.length !== 1 ? 's' : ''}</span>
                </div>
                <EnterpriseTable
                  columns={agentColumns}
                  data={groupAgents}
                  onRowClick={openAgent}
                />
              </div>
            )
          })}
          {grouped.length === 0 && (
            <div className="py-12 text-center text-sm text-ent-muted">
              No results match your search.
            </div>
          )}
        </SectionCard>
      )}

      {/* Right preview panel */}
      <RightPreviewPanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedAgent ? 'Agent Details' : selectedScope ? `${selectedScope.key} Details` : 'Details'}
        width={460}
      >
        {/* Agent detail */}
        {selectedAgent && (
          <div className="flex flex-col gap-5">
            {/* Agent header */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-action-blue/10 text-sm font-bold text-action-blue">
                {(selectedAgent.name || '').split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h3 className="text-base font-semibold text-ent-text">{selectedAgent.name}</h3>
                <p className="text-sm text-ent-muted">{selectedAgent.agent_code || selectedAgent.code}</p>
              </div>
              <div className="ml-auto">
                <StatusPill status={selectedAgent.status === 'active' ? 'processed' : 'hold'}>
                  {selectedAgent.status}
                </StatusPill>
              </div>
            </div>

            {/* Key details */}
            <div className="rounded-lg border border-ent-border">
              {[
                ['Agent Code', selectedAgent.agent_code || selectedAgent.code],
                ['Name', selectedAgent.name],
                ['Channel', selectedAgent.channel],
                ['Region', selectedAgent.region],
                ['Branch', selectedAgent.branch],
                ['Designation', selectedAgent.designation || '—'],
                ['Level', selectedAgent.level],
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

            {/* Hierarchy path */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ent-muted">Hierarchy Path</h4>
              <div className="flex items-center gap-1.5 rounded-lg border border-ent-border bg-ent-bg px-3 py-2 text-sm text-ent-text">
                <span>{selectedAgent.channel}</span>
                <span className="text-ent-muted">→</span>
                <span>{selectedAgent.region}</span>
                <span className="text-ent-muted">→</span>
                <span>{selectedAgent.branch}</span>
                <span className="text-ent-muted">→</span>
                <span className="font-medium">{selectedAgent.agent_code || selectedAgent.code}</span>
              </div>
            </div>

            {/* Linked programs */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ent-muted">Linked Programs</h4>
              {/* TODO: Wire hierarchy to backend — fetch linked programs per agent */}
              <div className="flex flex-col gap-1.5">
                {MOCK_LINKED_PROGRAMS.map((p) => (
                  <div key={p} className="rounded-lg border border-ent-border bg-ent-surface px-3 py-2 text-sm text-ent-text">
                    {p}
                  </div>
                ))}
              </div>
            </div>

            {/* Status history */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ent-muted">Status History</h4>
              {/* TODO: Wire hierarchy to backend — fetch status history per agent */}
              <div className="flex flex-col gap-1.5">
                {MOCK_STATUS_HISTORY.map((h, i) => (
                  <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${i % 2 === 0 ? 'bg-ent-bg' : 'bg-ent-surface'}`}>
                    <div>
                      <span className="text-ent-muted">{h.date}</span>
                      <span className="ml-2 text-ent-text">{h.note}</span>
                    </div>
                    <StatusPill status={h.status === 'active' ? 'processed' : 'hold'}>{h.status}</StatusPill>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Scope detail (region/channel/designation) */}
        {selectedScope && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: getCardColor(selectedScope.key) }}
              >
                {selectedScope.key.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-semibold text-ent-text">{selectedScope.key}</h3>
                <p className="text-sm text-ent-muted">{selectedScope.agents.length} agents</p>
              </div>
            </div>

            {/* Stats for scope */}
            {(() => {
              const activeCount = selectedScope.agents.filter((a) => a.status === 'active').length
              const pct = selectedScope.agents.length
                ? Math.round((activeCount / selectedScope.agents.length) * 100)
                : 0
              const scopeBranches = new Set(selectedScope.agents.map((a) => a.branch)).size

              return (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-ent-border bg-ent-bg px-3 py-2 text-center">
                    <p className="text-lg font-bold text-ent-text">{selectedScope.agents.length}</p>
                    <p className="text-xs text-ent-muted">Total</p>
                  </div>
                  <div className="rounded-lg border border-ent-border bg-ent-bg px-3 py-2 text-center">
                    <p className="text-lg font-bold text-[#16A34A]">{pct}%</p>
                    <p className="text-xs text-ent-muted">Active</p>
                  </div>
                  <div className="rounded-lg border border-ent-border bg-ent-bg px-3 py-2 text-center">
                    <p className="text-lg font-bold text-ent-text">{scopeBranches}</p>
                    <p className="text-xs text-ent-muted">Branches</p>
                  </div>
                </div>
              )
            })()}

            {/* Hierarchy children */}
            {activeView === 'region' && REGION_META[selectedScope.key] && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ent-muted">Branches in {selectedScope.key}</h4>
                {/* TODO: Wire hierarchy to backend — use real branch list */}
                <div className="flex flex-wrap gap-1.5">
                  {REGION_META[selectedScope.key].branches.map((b) => (
                    <span key={b} className="rounded-full border border-ent-border bg-ent-surface px-2.5 py-1 text-xs text-ent-text">{b}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Agents in scope */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ent-muted">Agents</h4>
              <EnterpriseTable
                columns={innerColumns}
                data={selectedScope.agents}
                onRowClick={openAgent}
              />
            </div>
          </div>
        )}
      </RightPreviewPanel>
    </PageShell>
  )
}
