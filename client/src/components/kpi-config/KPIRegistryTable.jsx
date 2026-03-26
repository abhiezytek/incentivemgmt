import { useMemo, useState } from 'react'
import { useGetKPIsQuery, useGetProgramsQuery } from '../../store/apiSlice'
import {
  SectionCard,
  EnterpriseTable,
  StatusPill,
  SearchInput,
  FilterChipBar,
} from '../ui'

const TYPE_LABELS = { NUMERIC: 'Numeric', PERCENTAGE: 'Percentage', CURRENCY: 'Currency' }
const FREQ_LABELS = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ANNUAL: 'Annual' }

const STATUS_VARIANT = {
  active: 'processed',
  draft: 'pending',
  archived: 'hold',
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Draft' },
  { key: 'NUMERIC', label: 'Numeric' },
  { key: 'PERCENTAGE', label: 'Percentage' },
  { key: 'CURRENCY', label: 'Currency' },
]

export default function KPIRegistryTable({ onSelectKPI }) {
  const { data: kpis = [], isLoading, error } = useGetKPIsQuery()
  const { data: programs = [] } = useGetProgramsQuery()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  // Build a map of program counts per KPI
  const programCountMap = useMemo(() => {
    const map = {}
    programs.forEach((p) => {
      ;(p.kpi_ids || []).forEach((kpiId) => {
        map[kpiId] = (map[kpiId] || 0) + 1
      })
    })
    return map
  }, [programs])

  // Compute stats from real data
  const stats = useMemo(() => {
    const total = kpis.length
    const active = kpis.filter((k) => k.status === 'active').length
    const draft = kpis.filter((k) => k.status === 'draft').length
    // TODO: Add derived variables count via GET /api/derived-variables when that
    // endpoint returns a count or filterable results linked to specific KPIs
    return { total, active, draft, derived: 0 }
  }, [kpis])

  const filters = FILTER_OPTIONS.map((f) => ({
    ...f,
    active: f.key === activeFilter,
  }))

  const filteredData = useMemo(() => {
    let result = kpis
    if (activeFilter === 'active' || activeFilter === 'draft') {
      result = result.filter((k) => k.status === activeFilter)
    } else if (['NUMERIC', 'PERCENTAGE', 'CURRENCY'].includes(activeFilter)) {
      result = result.filter((k) => k.type === activeFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (k) =>
          (k.name || '').toLowerCase().includes(q) ||
          (k.type || '').toLowerCase().includes(q),
      )
    }
    return result
  }, [kpis, activeFilter, search])

  const columns = [
    { key: 'name', label: 'KPI Name' },
    {
      key: 'type',
      label: 'Type',
      render: (val) => (
        <span className="rounded bg-ent-bg px-2 py-0.5 text-xs font-medium text-ent-text">
          {TYPE_LABELS[val] || val}
        </span>
      ),
    },
    {
      key: 'frequency',
      label: 'Frequency',
      render: (val) => FREQ_LABELS[val] || val || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <StatusPill status={STATUS_VARIANT[val] || 'pending'}>
          {val ? val.charAt(0).toUpperCase() + val.slice(1) : 'Unknown'}
        </StatusPill>
      ),
    },
    {
      key: 'programs_linked',
      label: 'Programs Linked',
      render: (_val, row) => programCountMap[row.id] ?? 0,
    },
  ]

  const handleToggle = (key) => setActiveFilter(key)

  return {
    stats,
    table: (
      <SectionCard
        sectionLabel="KPI REGISTRY"
        title="All KPIs"
        subtitle={error ? 'Failed to load KPIs' : undefined}
        action={
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search KPIs…"
            className="w-56"
          />
        }
      >
        <div className="mb-4">
          <FilterChipBar filters={filters} onToggle={handleToggle} />
        </div>
        <EnterpriseTable
          columns={columns}
          data={filteredData}
          loading={isLoading}
          onRowClick={(row) => onSelectKPI && onSelectKPI(row)}
          emptyMessage="No KPIs found. Create your first KPI to get started."
        />
      </SectionCard>
    ),
  }
}
