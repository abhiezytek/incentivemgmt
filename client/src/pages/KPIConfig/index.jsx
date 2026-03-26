import { useState, useCallback } from 'react'
import { useGetDerivedVariablesQuery } from '../../store/apiSlice'
import { PageShell, PageTitle, StatCard, Button, MetricStrip } from '../../components/ui'
import KPIRegistryTable from '../../components/kpi-config/KPIRegistryTable'
import FormulaArchitect from '../../components/kpi-config/FormulaArchitect'
import KPIDetailPanel from '../../components/kpi-config/KPIDetailPanel'

export default function KPIConfig() {
  const [selectedKPI, setSelectedKPI] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelKPI, setPanelKPI] = useState(null)

  const { data: derivedVars = [] } = useGetDerivedVariablesQuery()

  // KPIRegistryTable returns { stats, table } so we can use stats in the page header
  const { stats, table: registryTable } = KPIRegistryTable({
    onSelectKPI: handleSelectKPI,
  })

  function handleSelectKPI(kpi) {
    setSelectedKPI(kpi)
    setPanelKPI(kpi)
    setPanelOpen(true)
  }

  const handleNewKPI = useCallback(() => {
    setSelectedKPI(null)
    setPanelKPI(null)
    setPanelOpen(true)
  }, [])

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false)
  }, [])

  return (
    <PageShell>
      <PageTitle
        title="KPI Configuration"
        subtitle="Define and manage key performance indicators across incentive programs"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Configuration' },
          { label: 'KPIs' },
        ]}
        actions={<Button onClick={handleNewKPI}>+ New KPI</Button>}
      />

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total KPIs" value={String(stats.total)} color="blue" />
        <StatCard label="Active" value={String(stats.active)} color="green" />
        <StatCard label="Draft" value={String(stats.draft)} color="yellow" />
        <StatCard
          label="Derived Variables"
          value={String(derivedVars.length)}
          color="grey"
        />
      </div>

      {/* ── Quick metrics strip ──────────────────────────────── */}
      <MetricStrip
        className="mb-6"
        metrics={[
          { label: 'Numeric KPIs', value: stats.total - stats.draft },
          { label: 'Draft Pending', value: stats.draft, color: '#D6A15C' },
          { label: 'Active Rate', value: stats.total ? `${Math.round((stats.active / stats.total) * 100)}%` : '—' },
        ]}
      />

      {/* ── KPI Registry table ────────────────────────────────── */}
      <div className="mb-6">{registryTable}</div>

      {/* ── Formula Architect (tokens + milestones) ───────────── */}
      <FormulaArchitect selectedKPI={selectedKPI} />

      {/* ── Right detail / edit panel ─────────────────────────── */}
      <KPIDetailPanel
        key={panelKPI?.id ?? 'new'}
        open={panelOpen}
        onClose={handleClosePanel}
        kpi={panelKPI}
        onSaved={handleClosePanel}
      />
    </PageShell>
  )
}
