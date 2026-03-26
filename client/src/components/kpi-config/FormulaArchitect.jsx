import { useGetMilestonesQuery } from '../../store/apiSlice'
import { SectionCard, EnterpriseTable, AlertPanel } from '../ui'

const milestoneColumns = [
  { key: 'label', label: 'Milestone / Slab', render: (v, row) => v || row.name || `Slab ${row.id}` },
  {
    key: 'min_value',
    label: 'Min Value',
    render: (v) => (v != null ? Number(v).toLocaleString() : '—'),
  },
  {
    key: 'max_value',
    label: 'Max Value',
    render: (v) => (v != null ? Number(v).toLocaleString() : '—'),
  },
  {
    key: 'payout_rate',
    label: 'Payout Rate',
    render: (v) => (v != null ? `${v}%` : '—'),
  },
  {
    key: 'payout_amount',
    label: 'Payout Amount',
    render: (v) => (v != null ? `₹${Number(v).toLocaleString()}` : '—'),
  },
]

// Available parameter tokens used in KPI formulas
const PARAMETER_TOKENS = [
  'NB_PREMIUM',
  'POLICY_COUNT',
  'PERSISTENCY_13M',
  'PERSISTENCY_25M',
  'RENEWAL_PREMIUM',
  'APE_TARGET',
  'CASE_COUNT',
  'TICKET_SIZE',
  'LOSS_RATIO',
  'CHANNEL_MIX',
]

function ParameterTokens() {
  return (
    <div className="flex flex-wrap gap-2">
      {PARAMETER_TOKENS.map((token) => (
        <span
          key={token}
          className="inline-flex items-center rounded-md border border-ent-border bg-ent-bg px-2.5 py-1 text-xs font-mono font-medium text-action-blue"
        >
          {token}
        </span>
      ))}
    </div>
  )
}

export default function FormulaArchitect({ selectedKPI }) {
  const {
    data: milestones = [],
    isLoading,
    error,
  } = useGetMilestonesQuery(selectedKPI?.id, {
    skip: !selectedKPI?.id,
  })

  return (
    <div className="space-y-6">
      {/* Parameter tokens section */}
      <SectionCard
        sectionLabel="FORMULA PARAMETERS"
        title="Available Parameter Tokens"
        subtitle="Tokens available for use in KPI formula definitions"
      >
        <ParameterTokens />
      </SectionCard>

      {/* Formula architect — milestone/slab table */}
      <SectionCard
        sectionLabel="FORMULA ARCHITECT"
        title={
          selectedKPI
            ? `Milestones — ${selectedKPI.name}`
            : 'Milestone / Slab Structure'
        }
        subtitle="Formulas are table-driven using milestone slabs. Select a KPI to view its slab structure."
      >
        {!selectedKPI ? (
          <div className="py-8 text-center text-sm text-ent-muted">
            Select a KPI from the registry above to view its milestone structure.
          </div>
        ) : error ? (
          <AlertPanel
            variant="error"
            title="Failed to load milestones"
            message="There was an error fetching milestone data for this KPI."
          />
        ) : (
          <>
            <AlertPanel
              variant="info"
              title="Table-Driven Formulas"
              message={`This KPI uses ${milestones.length} milestone slab${milestones.length !== 1 ? 's' : ''} to determine payouts. Each slab defines a value range and its associated payout rate or amount.`}
              className="mb-4"
            />
            <EnterpriseTable
              columns={milestoneColumns}
              data={milestones}
              loading={isLoading}
              emptyMessage="No milestones configured for this KPI yet."
            />
          </>
        )}
      </SectionCard>
    </div>
  )
}
