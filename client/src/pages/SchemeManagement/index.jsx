import { useState, useMemo, useCallback } from 'react'
import {
  PageShell,
  PageTitle,
  SectionCard,
  EnterpriseTable,
  StatusPill,
  Button,
  MetricStrip,
  FilterChipBar,
  RightPreviewPanel,
  SearchInput,
  AlertPanel,
} from '../../components/ui'
import {
  useGetProgramsQuery,
  useCreateProgramMutation,
  useDeleteProgramMutation,
  useGetChannelsQuery,
  useGetKPIsQuery,
  useGetPayoutRulesQuery,
} from '../../store/apiSlice'

/* ─── Helpers ───────────────────────────────────────────────────────── */

const STATUS_MAP = { ACTIVE: 'processed', DRAFT: 'pending', CLOSED: 'hold' }
const STATUS_LABEL = { ACTIVE: 'Active', DRAFT: 'Draft', CLOSED: 'Closed' }

function normalizeStatus(s) {
  return (s || '').toUpperCase()
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// TODO: Wire to backend — version data should come from program record
function mockVersion() {
  return 'v1.0'
}

/* ─── Version Chip ──────────────────────────────────────────────────── */

function VersionChip({ version }) {
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
      {version}
    </span>
  )
}

/* ─── Step Indicator ────────────────────────────────────────────────── */

const WIZARD_STEPS = [
  { key: 'identity', label: 'Identity' },
  { key: 'scope', label: 'Scope & KPI' },
  { key: 'deployment', label: 'Deployment' },
  { key: 'preview', label: 'Live Preview' },
]

function StepIndicator({ current }) {
  return (
    <nav className="mb-6 flex items-center gap-2">
      {WIZARD_STEPS.map((step, i) => {
        const isActive = i === current
        const isDone = i < current
        return (
          <div key={step.key} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-8 ${isDone ? 'bg-action-blue' : 'bg-ent-border'}`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isActive
                    ? 'bg-action-blue text-white'
                    : isDone
                      ? 'bg-action-blue/20 text-action-blue'
                      : 'bg-ent-bg text-ent-muted'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </span>
              <span
                className={`hidden text-xs font-medium sm:inline ${
                  isActive ? 'text-action-blue' : 'text-ent-muted'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </nav>
  )
}

/* ─── Wizard: Step 1 — Identity ─────────────────────────────────────── */

function StepIdentity({ form, setField, channels, channelsLoading }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-ent-muted">
          Scheme Name *
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder="e.g. FY 2025-26 Agency Channel"
          className="w-full rounded-lg border border-ent-border bg-ent-surface px-3 py-2 text-sm text-ent-text placeholder:text-ent-muted focus:border-action-blue focus:outline-none focus:ring-1 focus:ring-action-blue"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ent-muted">
          Description
        </label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Describe the incentive scheme objectives…"
          className="w-full rounded-lg border border-ent-border bg-ent-surface px-3 py-2 text-sm text-ent-text placeholder:text-ent-muted focus:border-action-blue focus:outline-none focus:ring-1 focus:ring-action-blue"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ent-muted">
          Channel *
        </label>
        <select
          value={form.channel}
          onChange={(e) => setField('channel', e.target.value)}
          className="w-full rounded-lg border border-ent-border bg-ent-surface px-3 py-2 text-sm text-ent-text focus:border-action-blue focus:outline-none focus:ring-1 focus:ring-action-blue"
        >
          <option value="">Select channel…</option>
          {channelsLoading && <option disabled>Loading…</option>}
          {(channels || []).map((ch) => (
            <option key={ch.id ?? ch} value={ch.name ?? ch}>
              {ch.name ?? ch}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ent-muted">
          Version Tag
        </label>
        {/* TODO: Wire to backend — version should auto-increment */}
        <input
          type="text"
          value={form.versionTag}
          onChange={(e) => setField('versionTag', e.target.value)}
          placeholder="v1.0"
          className="w-48 rounded-lg border border-ent-border bg-ent-surface px-3 py-2 text-sm text-ent-text placeholder:text-ent-muted focus:border-action-blue focus:outline-none focus:ring-1 focus:ring-action-blue"
        />
      </div>
    </div>
  )
}

/* ─── Wizard: Step 2 — Scope & KPI ──────────────────────────────────── */

function StepScopeKPI({ form, setField, kpis, kpisLoading }) {
  const toggleKpi = (kpiId) => {
    const next = form.selectedKpis.includes(kpiId)
      ? form.selectedKpis.filter((k) => k !== kpiId)
      : [...form.selectedKpis, kpiId]
    setField('selectedKpis', next)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-xs font-semibold text-ent-muted">
          Link KPIs to this Scheme
        </label>
        {kpisLoading ? (
          <p className="text-sm text-ent-muted">Loading KPIs…</p>
        ) : (kpis || []).length === 0 ? (
          <p className="text-sm text-ent-muted">
            No KPIs available. Create KPIs first.
          </p>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-ent-border p-3">
            {(kpis || []).map((kpi) => (
              <label
                key={kpi.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-ent-bg"
              >
                <input
                  type="checkbox"
                  checked={form.selectedKpis.includes(kpi.id)}
                  onChange={() => toggleKpi(kpi.id)}
                  className="h-4 w-4 rounded border-ent-border text-action-blue focus:ring-action-blue"
                />
                <span className="text-sm text-ent-text">
                  {kpi.name || kpi.metric_name || `KPI #${kpi.id}`}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ent-muted">
          Target Notes
        </label>
        <textarea
          rows={2}
          value={form.targetNotes}
          onChange={(e) => setField('targetNotes', e.target.value)}
          placeholder="Describe targets and thresholds for linked KPIs…"
          className="w-full rounded-lg border border-ent-border bg-ent-surface px-3 py-2 text-sm text-ent-text placeholder:text-ent-muted focus:border-action-blue focus:outline-none focus:ring-1 focus:ring-action-blue"
        />
      </div>
    </div>
  )
}

/* ─── Wizard: Step 3 — Deployment ───────────────────────────────────── */

function StepDeployment({ form, setField }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ent-muted">
            Start Date *
          </label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setField('start_date', e.target.value)}
            className="w-full rounded-lg border border-ent-border bg-ent-surface px-3 py-2 text-sm text-ent-text focus:border-action-blue focus:outline-none focus:ring-1 focus:ring-action-blue"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ent-muted">
            End Date *
          </label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setField('end_date', e.target.value)}
            className="w-full rounded-lg border border-ent-border bg-ent-surface px-3 py-2 text-sm text-ent-text focus:border-action-blue focus:outline-none focus:ring-1 focus:ring-action-blue"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ent-muted">
          Initial Status
        </label>
        <select
          value={form.status}
          onChange={(e) => setField('status', e.target.value)}
          className="w-full rounded-lg border border-ent-border bg-ent-surface px-3 py-2 text-sm text-ent-text focus:border-action-blue focus:outline-none focus:ring-1 focus:ring-action-blue"
        >
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ent-muted">
          Rollout Notes
        </label>
        <textarea
          rows={3}
          value={form.rolloutNotes}
          onChange={(e) => setField('rolloutNotes', e.target.value)}
          placeholder="Internal notes on deployment plan, regions, phasing…"
          className="w-full rounded-lg border border-ent-border bg-ent-surface px-3 py-2 text-sm text-ent-text placeholder:text-ent-muted focus:border-action-blue focus:outline-none focus:ring-1 focus:ring-action-blue"
        />
      </div>
    </div>
  )
}

/* ─── Wizard: Step 4 — Live Preview ─────────────────────────────────── */

function StepLivePreview({ form, channels }) {
  const channelLabel =
    (channels || []).find(
      (ch) => (ch.name ?? ch) === form.channel
    )?.name ?? form.channel

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ent-border bg-ent-bg p-5">
        <h4 className="mb-3 text-sm font-bold text-ent-text">
          Scheme Summary
        </h4>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-ent-muted">Name</dt>
            <dd className="text-ent-text">{form.name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ent-muted">Channel</dt>
            <dd className="text-ent-text">{channelLabel || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ent-muted">
              Start Date
            </dt>
            <dd className="text-ent-text">
              {form.start_date ? formatDate(form.start_date) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ent-muted">End Date</dt>
            <dd className="text-ent-text">
              {form.end_date ? formatDate(form.end_date) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ent-muted">Status</dt>
            <dd>
              <StatusPill status={STATUS_MAP[form.status] || 'pending'}>
                {STATUS_LABEL[form.status] || form.status}
              </StatusPill>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ent-muted">Version</dt>
            <dd>
              <VersionChip version={form.versionTag || 'v1.0'} />
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-ent-muted">
              Description
            </dt>
            <dd className="text-ent-text">{form.description || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ent-muted">
              Linked KPIs
            </dt>
            <dd className="text-ent-text">
              {form.selectedKpis.length} KPI(s) selected
            </dd>
          </div>
          {form.rolloutNotes && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-ent-muted">
                Rollout Notes
              </dt>
              <dd className="text-ent-text">{form.rolloutNotes}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}

/* ─── Create Scheme Wizard ──────────────────────────────────────────── */

const EMPTY_FORM = {
  name: '',
  description: '',
  channel: '',
  versionTag: 'v1.0',
  selectedKpis: [],
  targetNotes: '',
  start_date: '',
  end_date: '',
  status: 'DRAFT',
  rolloutNotes: '',
}

function CreateSchemeWizard({ open, onClose }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saveError, setSaveError] = useState(null)

  const { data: channels, isLoading: channelsLoading } = useGetChannelsQuery(
    undefined,
    { skip: !open }
  )
  const { data: kpis, isLoading: kpisLoading } = useGetKPIsQuery(undefined, {
    skip: !open,
  })
  const [createProgram, { isLoading: creating }] = useCreateProgramMutation()

  const setField = useCallback(
    (key, value) => setForm((prev) => ({ ...prev, [key]: value })),
    []
  )

  const resetAndClose = useCallback(() => {
    setStep(0)
    setForm(EMPTY_FORM)
    setSaveError(null)
    onClose()
  }, [onClose])

  const canNext =
    step === 0
      ? form.name.trim() && form.channel
      : step === 2
        ? form.start_date && form.end_date
        : true

  const handleSave = async (publishStatus) => {
    setSaveError(null)
    try {
      await createProgram({
        name: form.name,
        description: form.description,
        channel: form.channel,
        start_date: form.start_date,
        end_date: form.end_date,
        status: publishStatus,
      }).unwrap()
      resetAndClose()
    } catch (err) {
      setSaveError(err?.data?.message || err?.message || 'Failed to save scheme.')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-12 pb-12">
      <div className="relative w-full max-w-2xl rounded-2xl border border-ent-border bg-ent-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ent-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-ent-text">
              Create New Scheme
            </h2>
            <p className="text-xs text-ent-muted">
              Step {step + 1} of {WIZARD_STEPS.length} — {WIZARD_STEPS[step].label}
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className="rounded-lg p-1.5 text-ent-muted hover:bg-ent-bg hover:text-ent-text"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <StepIndicator current={step} />

          {saveError && (
            <AlertPanel
              variant="error"
              title="Save Failed"
              message={saveError}
              onDismiss={() => setSaveError(null)}
              className="mb-4"
            />
          )}

          {step === 0 && (
            <StepIdentity
              form={form}
              setField={setField}
              channels={channels}
              channelsLoading={channelsLoading}
            />
          )}
          {step === 1 && (
            <StepScopeKPI
              form={form}
              setField={setField}
              kpis={kpis}
              kpisLoading={kpisLoading}
            />
          )}
          {step === 2 && <StepDeployment form={form} setField={setField} />}
          {step === 3 && (
            <StepLivePreview form={form} channels={channels} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-ent-border px-6 py-4">
          <Button variant="ghost" onClick={resetAndClose} disabled={creating}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                variant="secondary"
                onClick={() => setStep((s) => s - 1)}
                disabled={creating}
              >
                Back
              </Button>
            )}
            {step < WIZARD_STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
              >
                Next
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  loading={creating}
                  onClick={() => handleSave('DRAFT')}
                >
                  Save as Draft
                </Button>
                <Button
                  loading={creating}
                  onClick={() => handleSave('ACTIVE')}
                >
                  Publish
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Preview Panel Content ─────────────────────────────────────────── */

function PreviewContent({ program, onEdit, onDelete, deleting }) {
  const { data: kpis } = useGetKPIsQuery(program?.id, {
    skip: !program?.id,
  })
  const { data: payoutRules } = useGetPayoutRulesQuery(program?.id, {
    skip: !program?.id,
  })

  if (!program) return null

  const status = normalizeStatus(program.status)

  return (
    <div className="space-y-5">
      {/* Status & Version */}
      <div className="flex items-center gap-2">
        <StatusPill status={STATUS_MAP[status] || 'pending'}>
          {STATUS_LABEL[status] || program.status}
        </StatusPill>
        {/* TODO: Wire to backend */}
        <VersionChip version={mockVersion()} />
      </div>

      {/* Details */}
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs font-semibold text-ent-muted">Channel</dt>
          <dd className="text-ent-text">{program.channel || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-ent-muted">Start Date</dt>
          <dd className="text-ent-text">{formatDate(program.start_date)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-ent-muted">End Date</dt>
          <dd className="text-ent-text">{formatDate(program.end_date)}</dd>
        </div>
        {program.description && (
          <div>
            <dt className="text-xs font-semibold text-ent-muted">
              Description
            </dt>
            <dd className="text-ent-text">{program.description}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-semibold text-ent-muted">Created</dt>
          <dd className="text-ent-text">{formatDate(program.created_at)}</dd>
        </div>
      </dl>

      {/* Linked KPIs */}
      <div className="rounded-lg border border-ent-border bg-ent-bg p-3">
        <h4 className="mb-1 text-xs font-bold text-ent-muted">Linked KPIs</h4>
        <p className="text-lg font-semibold text-ent-text">
          {(kpis || []).length}
        </p>
      </div>

      {/* Payout Rules Summary */}
      <div className="rounded-lg border border-ent-border bg-ent-bg p-3">
        <h4 className="mb-1 text-xs font-bold text-ent-muted">Payout Rules</h4>
        <p className="text-lg font-semibold text-ent-text">
          {(payoutRules || []).length}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-ent-border pt-4">
        <Button variant="secondary" size="sm" onClick={onEdit} className="flex-1">
          Edit
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onDelete}
          loading={deleting}
          className="flex-1"
        >
          Delete
        </Button>
      </div>
    </div>
  )
}

/* ─── Table Columns ─────────────────────────────────────────────────── */

const TABLE_COLUMNS = [
  { key: 'name', label: 'Scheme Name' },
  { key: 'channel', label: 'Channel' },
  { key: 'start_date', label: 'Start Date', render: (val) => formatDate(val) },
  { key: 'end_date', label: 'End Date', render: (val) => formatDate(val) },
  {
    key: 'status',
    label: 'Status',
    render: (val) => {
      const s = normalizeStatus(val)
      return (
        <StatusPill status={STATUS_MAP[s] || 'pending'}>
          {STATUS_LABEL[s] || val}
        </StatusPill>
      )
    },
  },
  {
    key: '_version',
    label: 'Version',
    // TODO: Wire to backend — version should come from program record
    render: () => <VersionChip version={mockVersion()} />,
  },
]

/* ─── Main Page ─────────────────────────────────────────────────────── */

export default function SchemeManagement() {
  const { data: programs = [], isLoading, error } = useGetProgramsQuery()
  const [deleteProgram, { isLoading: deleting }] = useDeleteProgramMutation()

  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  /* ── Computed metrics ───────────────────────────────────────────── */
  const metrics = useMemo(() => {
    const active = programs.filter(
      (p) => normalizeStatus(p.status) === 'ACTIVE'
    ).length
    const draft = programs.filter(
      (p) => normalizeStatus(p.status) === 'DRAFT'
    ).length
    const closed = programs.filter(
      (p) => normalizeStatus(p.status) === 'CLOSED'
    ).length
    return [
      { label: 'Active Schemes', value: String(active) },
      // TODO: Wire to backend — total agents should aggregate from enrollments
      { label: 'Total Agents', value: '—' },
      { label: 'Draft Schemes', value: String(draft) },
      { label: 'Closed', value: String(closed) },
    ]
  }, [programs])

  /* ── Filtered & searched data ──────────────────────────────────── */
  const filteredPrograms = useMemo(() => {
    let list = programs
    if (activeFilter !== 'ALL') {
      list = list.filter(
        (p) => normalizeStatus(p.status) === activeFilter
      )
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      list = list.filter((p) => (p.name || '').toLowerCase().includes(q))
    }
    return list
  }, [programs, activeFilter, searchTerm])

  /* ── Filters ────────────────────────────────────────────────────── */
  const filters = useMemo(
    () =>
      ['ALL', 'ACTIVE', 'DRAFT', 'CLOSED'].map((key) => ({
        key,
        label: key === 'ALL' ? 'All' : STATUS_LABEL[key],
        active: activeFilter === key,
      })),
    [activeFilter]
  )

  /* ── Handlers ───────────────────────────────────────────────────── */
  const handleRowClick = useCallback((row) => setSelectedProgram(row), [])

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm('Delete this scheme? This action cannot be undone.'))
        return
      try {
        await deleteProgram(id).unwrap()
        setSelectedProgram(null)
      } catch {
        /* error handled by RTK Query */
      }
    },
    [deleteProgram]
  )

  const handleEdit = useCallback(() => {
    // TODO: Wire to edit flow — open wizard in edit mode
    alert('Edit flow coming soon')
  }, [])

  return (
    <PageShell>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <PageTitle
        title="Scheme Management"
        subtitle="Create and manage incentive programs, rates, and payout rules"
        actions={
          <Button onClick={() => setWizardOpen(true)}>
            + Create New Scheme
          </Button>
        }
      />

      {/* ── Metric Strip ────────────────────────────────────────────── */}
      <MetricStrip metrics={metrics} className="mb-6" />

      {/* ── Error Alert ─────────────────────────────────────────────── */}
      {error && (
        <AlertPanel
          variant="error"
          title="Failed to load schemes"
          message={error?.data?.message || error?.error || 'Unknown error'}
          className="mb-4"
        />
      )}

      {/* ── Filter Bar + Search ─────────────────────────────────────── */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChipBar
          filters={filters}
          onToggle={(key) => setActiveFilter(key)}
        />
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search schemes…"
          className="w-full sm:w-72"
        />
      </div>

      {/* ── Scheme Table ────────────────────────────────────────────── */}
      <SectionCard sectionLabel="ACTIVE STRATEGY MATRIX" title="All Schemes">
        <EnterpriseTable
          columns={TABLE_COLUMNS}
          data={filteredPrograms}
          loading={isLoading}
          onRowClick={handleRowClick}
          emptyMessage="No schemes found. Create one to get started."
        />
      </SectionCard>

      {/* ── Create Wizard ───────────────────────────────────────────── */}
      <CreateSchemeWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />

      {/* ── Right Preview Panel ─────────────────────────────────────── */}
      <RightPreviewPanel
        open={selectedProgram !== null}
        onClose={() => setSelectedProgram(null)}
        title={selectedProgram?.name || 'Scheme Details'}
      >
        <PreviewContent
          program={selectedProgram}
          onEdit={handleEdit}
          onDelete={() => handleDelete(selectedProgram?.id)}
          deleting={deleting}
        />
      </RightPreviewPanel>
    </PageShell>
  )
}
