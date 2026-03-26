import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  PageShell,
  PageTitle,
  StatCard,
  SectionCard,
  EnterpriseTable,
  StatusPill,
  Button,
  FilterChipBar,
  RightPreviewPanel,
  ActionToolbar,
  MetricStrip,
  SearchInput,
  AlertPanel,
  TimelineList,
} from '../components/ui'
import { useGetProgramsQuery, useGetAgentsQuery } from '../store/apiSlice'

// ─── Currency helpers (Indian ₹ formatting) ──────────────────────────────────

function formatINR(num) {
  if (num == null || isNaN(num)) return '₹0'
  const abs = Math.abs(Number(num))
  if (abs >= 1e7) return `${num < 0 ? '-' : ''}₹${(abs / 1e7).toFixed(2)}Cr`
  if (abs >= 1e5) return `${num < 0 ? '-' : ''}₹${(abs / 1e5).toFixed(2)}L`
  return `${num < 0 ? '-' : ''}₹${abs.toLocaleString('en-IN')}`
}

function formatINRFull(num) {
  if (num == null || isNaN(num)) return '₹0'
  return `${num < 0 ? '-' : ''}₹${Math.abs(Number(num)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

// ─── Status mapping ──────────────────────────────────────────────────────────

const STATUS_PILL_MAP = {
  DRAFT: 'pending',
  APPROVED: 'processed',
  HOLD: 'hold',
  MANUAL: 'manual',
  PAID: 'success',
}

const STATUS_LABELS = {
  DRAFT: 'Draft',
  APPROVED: 'Approved',
  HOLD: 'On Hold',
  MANUAL: 'Manual Override',
  PAID: 'Paid',
}

// ─── Filter definitions ──────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'DRAFT', label: 'Pending Review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'HOLD', label: 'On Hold' },
  { key: 'MANUAL', label: 'Manual Override' },
  { key: 'PAID', label: 'Paid' },
]

// ─── Adjustment reason options ───────────────────────────────────────────────

const ADJUSTMENT_REASONS = [
  'Calculation Error Correction',
  'Policy Lapse Adjustment',
  'Manager Override',
  'Performance Bonus',
  'Clawback – Persistency',
  'Pro-rata Adjustment',
  'Compliance Deduction',
  'Other',
]

// ─── Mock data adapter (for when the real API doesn't return expected fields) ─

// TODO: Replace with real API hookup
const MOCK_RESULTS = [
  {
    id: 1, agentCode: 'AGT-001', agentName: 'Rajesh Kumar',
    channel: 'Agency', designation: 'Senior Agent',
    program: 'FY 2025-26 Agency', programId: 1, period: 'Jan 2026',
    calculatedAmount: 45200, adjustment: 0, totalPayout: 45200, status: 'DRAFT',
    kpis: [
      { name: 'New Business Premium', target: 500000, achieved: 620000, pct: 124 },
      { name: 'Persistency 13M', target: 85, achieved: 91, pct: 107 },
      { name: 'Policy Count', target: 30, achieved: 28, pct: 93 },
    ],
    audit: [
      { timestamp: '2026-01-15 09:30', title: 'Calculation Run', description: 'Auto-calculated by engine v2.1', status: 'active' },
      { timestamp: '2026-01-15 09:30', title: 'Draft Created', description: 'Pending manager review', status: 'pending' },
    ],
  },
  {
    id: 2, agentCode: 'AGT-002', agentName: 'Priya Sharma',
    channel: 'Agency', designation: 'Agent',
    program: 'FY 2025-26 Agency', programId: 1, period: 'Jan 2026',
    calculatedAmount: 38750, adjustment: 0, totalPayout: 38750, status: 'APPROVED',
    kpis: [
      { name: 'New Business Premium', target: 400000, achieved: 455000, pct: 114 },
      { name: 'Persistency 13M', target: 85, achieved: 88, pct: 104 },
    ],
    audit: [
      { timestamp: '2026-01-15 09:30', title: 'Calculation Run', description: 'Auto-calculated', status: 'active' },
      { timestamp: '2026-01-16 14:20', title: 'Approved', description: 'Approved by Manager – Deepak M.', status: 'success' },
    ],
  },
  {
    id: 3, agentCode: 'AGT-003', agentName: 'Amit Patel',
    channel: 'Bancassurance', designation: 'Team Lead',
    program: 'Bancassurance Q1', programId: 2, period: 'Jan 2026',
    calculatedAmount: 62100, adjustment: -5000, totalPayout: 57100, status: 'MANUAL',
    kpis: [
      { name: 'New Business Premium', target: 800000, achieved: 910000, pct: 114 },
      { name: 'Cross-sell Ratio', target: 20, achieved: 24, pct: 120 },
    ],
    audit: [
      { timestamp: '2026-01-15 09:30', title: 'Calculation Run', description: 'Auto-calculated', status: 'active' },
      { timestamp: '2026-01-16 10:00', title: 'Manual Adjustment', description: '₹-5,000 – Clawback for policy lapse', status: 'warning' },
    ],
  },
  {
    id: 4, agentCode: 'AGT-004', agentName: 'Sunita Reddy',
    channel: 'Agency', designation: 'Agent',
    program: 'FY 2025-26 Agency', programId: 1, period: 'Jan 2026',
    calculatedAmount: 29400, adjustment: 0, totalPayout: 29400, status: 'PAID',
    kpis: [
      { name: 'New Business Premium', target: 300000, achieved: 345000, pct: 115 },
    ],
    audit: [
      { timestamp: '2026-01-15 09:30', title: 'Calculation Run', description: 'Auto-calculated', status: 'active' },
      { timestamp: '2026-01-16 14:20', title: 'Approved', description: 'Approved by Manager', status: 'success' },
      { timestamp: '2026-01-20 11:00', title: 'Paid', description: 'Payout processed – Ref #PAY-20260120-004', status: 'success' },
    ],
  },
  {
    id: 5, agentCode: 'AGT-005', agentName: 'Vikram Singh',
    channel: 'Agency', designation: 'Senior Agent',
    program: 'FY 2025-26 Agency', programId: 1, period: 'Jan 2026',
    calculatedAmount: 51800, adjustment: 0, totalPayout: 51800, status: 'HOLD',
    kpis: [
      { name: 'New Business Premium', target: 600000, achieved: 680000, pct: 113 },
      { name: 'Persistency 13M', target: 85, achieved: 72, pct: 85 },
    ],
    audit: [
      { timestamp: '2026-01-15 09:30', title: 'Calculation Run', description: 'Auto-calculated', status: 'active' },
      { timestamp: '2026-01-16 14:20', title: 'Placed on Hold', description: 'Persistency below threshold – pending review', status: 'hold' },
    ],
  },
  {
    id: 6, agentCode: 'AGT-006', agentName: 'Meena Iyer',
    channel: 'Direct', designation: 'Agent',
    program: 'FY 2025-26 Agency', programId: 1, period: 'Jan 2026',
    calculatedAmount: 33500, adjustment: 5000, totalPayout: 38500, status: 'MANUAL',
    kpis: [
      { name: 'New Business Premium', target: 350000, achieved: 380000, pct: 109 },
    ],
    audit: [
      { timestamp: '2026-01-15 09:30', title: 'Calculation Run', description: 'Auto-calculated', status: 'active' },
      { timestamp: '2026-01-17 11:10', title: 'Manual Adjustment', description: '₹+5,000 – Performance bonus approved', status: 'warning' },
    ],
  },
  {
    id: 7, agentCode: 'AGT-007', agentName: 'Karan Mehta',
    channel: 'Agency', designation: 'Agent',
    program: 'Bancassurance Q1', programId: 2, period: 'Jan 2026',
    calculatedAmount: 41200, adjustment: 0, totalPayout: 41200, status: 'DRAFT',
    kpis: [
      { name: 'New Business Premium', target: 450000, achieved: 510000, pct: 113 },
    ],
    audit: [
      { timestamp: '2026-01-15 09:30', title: 'Calculation Run', description: 'Auto-calculated', status: 'active' },
      { timestamp: '2026-01-15 09:30', title: 'Draft Created', description: 'Pending review', status: 'pending' },
    ],
  },
  {
    id: 8, agentCode: 'AGT-008', agentName: 'Lakshmi Nair',
    channel: 'Bancassurance', designation: 'Senior Agent',
    program: 'Bancassurance Q1', programId: 2, period: 'Jan 2026',
    calculatedAmount: 72000, adjustment: -8000, totalPayout: 64000, status: 'APPROVED',
    kpis: [
      { name: 'New Business Premium', target: 900000, achieved: 1050000, pct: 117 },
      { name: 'Cross-sell Ratio', target: 20, achieved: 26, pct: 130 },
    ],
    audit: [
      { timestamp: '2026-01-15 09:30', title: 'Calculation Run', description: 'Auto-calculated', status: 'active' },
      { timestamp: '2026-01-16 09:00', title: 'Manual Adjustment', description: '₹-8,000 – Compliance deduction', status: 'warning' },
      { timestamp: '2026-01-17 15:00', title: 'Approved', description: 'Approved with adjustment', status: 'success' },
    ],
  },
]

/**
 * Normalise raw API data into the shape our UI expects.
 * Falls back to mock data if the API result is empty or malformed.
 */
function normaliseResults(apiData) {
  if (!Array.isArray(apiData) || apiData.length === 0) return null

  return apiData.map((r, idx) => ({
    id: r.id ?? idx + 1,
    agentCode: r.agent_code ?? r.agentCode ?? `AGT-${String(idx + 1).padStart(3, '0')}`,
    agentName: r.agent_name ?? r.agentName ?? r.name ?? 'Unknown',
    channel: r.channel ?? 'Agency',
    designation: r.designation ?? 'Agent',
    program: r.program_name ?? r.program ?? 'Unknown',
    programId: r.program_id ?? r.programId ?? null,
    period: r.period ?? 'N/A',
    calculatedAmount: Number(r.calculated_amount ?? r.calculatedAmount ?? r.total ?? 0),
    adjustment: Number(r.adjustment ?? 0),
    totalPayout: Number(r.total_payout ?? r.totalPayout ?? r.calculated_amount ?? r.total ?? 0),
    status: (r.status ?? 'DRAFT').toUpperCase(),
    kpis: r.kpis ?? [],
    audit: r.audit ?? [
      { timestamp: new Date().toISOString(), title: 'Record Created', description: 'Imported from calculation engine', status: 'active' },
    ],
  }))
}

// ─── Summary computation ─────────────────────────────────────────────────────

function computeSummary(rows) {
  const totalCalculated = rows.reduce((s, r) => s + r.calculatedAmount, 0)
  const totalHeld = rows.filter((r) => r.status === 'HOLD').reduce((s, r) => s + r.totalPayout, 0)
  const totalAdjustments = rows.reduce((s, r) => s + r.adjustment, 0)
  const netPayout = rows.reduce((s, r) => s + r.totalPayout, 0)
  return { totalCalculated, totalHeld, totalAdjustments, netPayout }
}

// ─── SVG icons (inline, no external dependency) ──────────────────────────────

function CalcIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm2.25 0h.008v.008H15.5V13.5zm0 2.25h.008v.008H15.5v-.008zM8.25 6h7.5v2.25h-7.5V6zM6 3.75A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6z" />
    </svg>
  )
}

function HoldIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  )
}

function AdjustIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  )
}

function PayoutIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  )
}

// ─── Detail drawer content ───────────────────────────────────────────────────

function DetailDrawerContent({ row }) {
  if (!row) return null

  return (
    <div className="space-y-6">
      {/* Agent info */}
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ent-muted">Agent Information</h4>
        <div className="grid grid-cols-2 gap-3">
          <InfoField label="Agent Code" value={row.agentCode} />
          <InfoField label="Name" value={row.agentName} />
          <InfoField label="Channel" value={row.channel} />
          <InfoField label="Designation" value={row.designation} />
        </div>
      </div>

      {/* KPI Achievement */}
      {row.kpis?.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ent-muted">KPI Achievement</h4>
          <div className="space-y-2">
            {row.kpis.map((kpi, i) => (
              <div key={i} className="rounded-lg border border-ent-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ent-text">{kpi.name}</span>
                  <span className={`text-sm font-bold ${kpi.pct >= 100 ? 'text-[#16A34A]' : 'text-ent-error'}`}>
                    {kpi.pct}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ent-bg">
                  <div
                    className={`h-full rounded-full transition-all ${kpi.pct >= 100 ? 'bg-[#16A34A]' : kpi.pct >= 80 ? 'bg-[#D6A15C]' : 'bg-ent-error'}`}
                    style={{ width: `${Math.min(kpi.pct, 100)}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-ent-muted">
                  <span>Target: {typeof kpi.target === 'number' && kpi.target > 1000 ? formatINR(kpi.target) : kpi.target}</span>
                  <span>Achieved: {typeof kpi.achieved === 'number' && kpi.achieved > 1000 ? formatINR(kpi.achieved) : kpi.achieved}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amounts */}
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ent-muted">Payout Breakdown</h4>
        <div className="rounded-lg border border-ent-border divide-y divide-ent-border">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-ent-muted">Calculated Amount</span>
            <span className="text-sm font-semibold text-ent-text">{formatINRFull(row.calculatedAmount)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-ent-muted">Adjustment</span>
            <span className={`text-sm font-semibold ${row.adjustment > 0 ? 'text-[#16A34A]' : row.adjustment < 0 ? 'text-ent-error' : 'text-ent-muted'}`}>
              {row.adjustment > 0 ? '+' : ''}{formatINRFull(row.adjustment)}
            </span>
          </div>
          <div className="flex items-center justify-between bg-ent-bg px-4 py-2.5">
            <span className="text-sm font-semibold text-ent-text">Total Payout</span>
            <span className="text-base font-bold text-ent-text">{formatINRFull(row.totalPayout)}</span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ent-muted">Current Status</h4>
        <StatusPill status={STATUS_PILL_MAP[row.status] || 'pending'}>
          {STATUS_LABELS[row.status] || row.status}
        </StatusPill>
      </div>

      {/* Audit timeline */}
      {row.audit?.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ent-muted">Audit Trail</h4>
          <TimelineList items={row.audit} />
        </div>
      )}
    </div>
  )
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-ent-muted">{label}</p>
      <p className="text-sm font-medium text-ent-text">{value}</p>
    </div>
  )
}

// ─── Adjustment drawer content ───────────────────────────────────────────────

function AdjustmentDrawerContent({ row, onApply, onCancel }) {
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  if (!row) return null

  const handleApply = () => {
    onApply({
      rowId: row.id,
      adjustmentAmount: Number(adjustmentAmount) || 0,
      reason,
      notes,
    })
  }

  const isValid = adjustmentAmount !== '' && !isNaN(Number(adjustmentAmount)) && reason !== ''

  return (
    <div className="space-y-6">
      {/* Agent context */}
      <div className="rounded-lg border border-ent-border bg-ent-bg p-4">
        <p className="text-xs text-ent-muted">Adjusting payout for</p>
        <p className="mt-0.5 text-sm font-semibold text-ent-text">{row.agentCode} — {row.agentName}</p>
        <p className="text-xs text-ent-muted">{row.program} · {row.period}</p>
      </div>

      {/* Current calculated */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ent-muted">
          Calculated Amount (readonly)
        </label>
        <div className="flex h-10 items-center rounded-lg border border-ent-border bg-ent-bg px-3 text-sm font-medium text-ent-text">
          {formatINRFull(row.calculatedAmount)}
        </div>
      </div>

      {/* Current adjustment display */}
      {row.adjustment !== 0 && (
        <AlertPanel
          variant="warning"
          title="Existing Adjustment"
          message={`This record already has an adjustment of ${row.adjustment > 0 ? '+' : ''}${formatINRFull(row.adjustment)}. A new adjustment will replace it.`}
        />
      )}

      {/* Adjustment amount */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ent-muted">
          Adjustment Amount (₹)
        </label>
        <input
          type="number"
          value={adjustmentAmount}
          onChange={(e) => setAdjustmentAmount(e.target.value)}
          placeholder="e.g. -5000 or 3000"
          className="h-10 w-full rounded-lg border border-ent-border bg-ent-surface px-3 text-sm text-ent-text placeholder:text-ent-muted focus:border-action-blue focus:outline-none focus:ring-1 focus:ring-action-blue"
        />
        <p className="mt-1 text-xs text-ent-muted">Use negative values for deductions, positive for additions</p>
      </div>

      {/* Reason dropdown */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ent-muted">
          Reason
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-10 w-full rounded-lg border border-ent-border bg-ent-surface px-3 text-sm text-ent-text focus:border-action-blue focus:outline-none focus:ring-1 focus:ring-action-blue"
        >
          <option value="">Select a reason…</option>
          {ADJUSTMENT_REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ent-muted">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Additional context for this adjustment…"
          className="w-full rounded-lg border border-ent-border bg-ent-surface px-3 py-2 text-sm text-ent-text placeholder:text-ent-muted focus:border-action-blue focus:outline-none focus:ring-1 focus:ring-action-blue"
        />
      </div>

      {/* Preview */}
      {adjustmentAmount !== '' && !isNaN(Number(adjustmentAmount)) && (
        <div className="rounded-lg border border-ent-border bg-ent-bg p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ent-muted">New Total Preview</p>
          <p className="mt-1 text-xl font-bold text-ent-text">
            {formatINRFull(row.calculatedAmount + Number(adjustmentAmount))}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button disabled={!isValid} onClick={handleApply} className="flex-1">
          Apply Adjustment
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function ReviewAdjustments() {
  // Data state
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  // UI state
  const [selectedRows, setSelectedRows] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [detailRow, setDetailRow] = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [approveLoading, setApproveLoading] = useState(false)

  // Fetch real programs/agents for enrichment (available for future normalisation)
  const { data: _programs } = useGetProgramsQuery()
  const { data: _agents } = useGetAgentsQuery()

  // ── Fetch results from /api/incentive-results ────────────────────────────

  useEffect(() => {
    let cancelled = false
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

    async function fetchResults() {
      setLoading(true)
      setFetchError(null)
      try {
        const res = await fetch(`${baseUrl}/incentive-results`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) {
          const normalised = normaliseResults(Array.isArray(data) ? data : data?.results)
          // TODO: Replace with real API hookup
          setResults(normalised || MOCK_RESULTS)
        }
      } catch {
        if (!cancelled) {
          // TODO: Replace with real API hookup
          setResults(MOCK_RESULTS)
          setFetchError('Using demonstration data — connect to API for live results')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchResults()
    return () => { cancelled = true }
  }, [])

  // ── Derived data ─────────────────────────────────────────────────────────

  const filteredResults = useMemo(() => {
    let rows = results

    // Status filter
    if (activeFilter !== 'all') {
      rows = rows.filter((r) => r.status === activeFilter)
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.agentCode.toLowerCase().includes(q) ||
          r.agentName.toLowerCase().includes(q) ||
          r.program.toLowerCase().includes(q) ||
          r.channel.toLowerCase().includes(q)
      )
    }

    return rows
  }, [results, activeFilter, searchQuery])

  const summary = useMemo(() => computeSummary(results), [results])

  const filterCounts = useMemo(() => {
    const counts = { all: results.length }
    for (const r of results) {
      counts[r.status] = (counts[r.status] || 0) + 1
    }
    return counts
  }, [results])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleFilterToggle = useCallback((key) => {
    setActiveFilter(key)
    setSelectedRows([])
  }, [])

  const handleSelectionChange = useCallback((indices) => {
    setSelectedRows(indices)
  }, [])

  const handleApproveSelected = useCallback(() => {
    if (selectedRows.length === 0) return
    setApproveLoading(true)

    // TODO: Replace with real API hookup — POST /api/incentive-results/approve
    setTimeout(() => {
      setResults((prev) =>
        prev.map((r) => {
          const filteredIndex = filteredResults.indexOf(r)
          if (selectedRows.includes(filteredIndex)) {
            return { ...r, status: 'APPROVED', audit: [...(r.audit || []), { timestamp: new Date().toLocaleString(), title: 'Approved', description: 'Batch approved by current user', status: 'success' }] }
          }
          return r
        })
      )
      setSelectedRows([])
      setApproveLoading(false)
    }, 600)
  }, [selectedRows, filteredResults])

  const handleApplyAdjustment = useCallback(({ rowId, adjustmentAmount, reason, notes }) => {
    // TODO: Replace with real API hookup — PUT /api/incentive-results/:id/adjust
    setResults((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          const newTotal = r.calculatedAmount + adjustmentAmount
          return {
            ...r,
            adjustment: adjustmentAmount,
            totalPayout: newTotal,
            status: 'MANUAL',
            audit: [
              ...(r.audit || []),
              {
                timestamp: new Date().toLocaleString(),
                title: 'Manual Adjustment',
                description: `${adjustmentAmount >= 0 ? '+' : ''}${formatINRFull(adjustmentAmount)} — ${reason}${notes ? `. ${notes}` : ''}`,
                status: 'warning',
              },
            ],
          }
        }
        return r
      })
    )
    setEditRow(null)
  }, [])

  // ── Table columns ────────────────────────────────────────────────────────

  const columns = useMemo(
    () => [
      {
        key: 'agent',
        label: 'Person / Agent',
        render: (_val, row) => (
          <div>
            <p className="text-sm font-medium text-ent-text">{row.agentName}</p>
            <p className="text-xs text-ent-muted">{row.agentCode}</p>
          </div>
        ),
      },
      { key: 'channel', label: 'Channel' },
      { key: 'program', label: 'Program' },
      { key: 'period', label: 'Period' },
      {
        key: 'calculatedAmount',
        label: 'Calculated Amt',
        render: (val) => <span className="font-medium">{formatINRFull(val)}</span>,
      },
      {
        key: 'adjustment',
        label: 'Adjustment',
        render: (val) => {
          if (!val || val === 0) return <span className="text-ent-muted">—</span>
          return (
            <span className={`font-medium ${val > 0 ? 'text-[#16A34A]' : 'text-ent-error'}`}>
              {val > 0 ? '+' : ''}{formatINRFull(val)}
            </span>
          )
        },
      },
      {
        key: 'totalPayout',
        label: 'Total Payout',
        render: (val) => <span className="text-sm font-bold text-ent-text">{formatINRFull(val)}</span>,
      },
      {
        key: 'status',
        label: 'Status',
        render: (val) => (
          <StatusPill status={STATUS_PILL_MAP[val] || 'pending'}>
            {STATUS_LABELS[val] || val}
          </StatusPill>
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (_val, row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setDetailRow(row) }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-action-blue hover:bg-[#1D4ED8]/10"
              title="View details"
            >
              <EyeIcon /> View
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setEditRow(row) }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-ent-muted hover:bg-ent-bg hover:text-ent-text"
              title="Edit / Adjust"
            >
              <PencilIcon /> Edit
            </button>
          </div>
        ),
      },
    ],
    []
  )

  // ── Filter chips with counts ─────────────────────────────────────────────

  const filterChips = useMemo(
    () =>
      FILTER_OPTIONS.map((f) => ({
        key: f.key,
        label: `${f.label}${filterCounts[f.key] != null ? ` (${filterCounts[f.key]})` : ''}`,
        active: activeFilter === f.key,
      })),
    [activeFilter, filterCounts]
  )

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <PageShell>
      <PageTitle
        title="Review & Adjustments"
        subtitle="Review calculated incentives, approve, adjust, or hold payouts"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">Export</Button>
          </div>
        }
      />

      {/* ── Alert for mock data ──────────────────────────────────────────── */}
      {fetchError && (
        <AlertPanel
          variant="warning"
          title="Demo Mode"
          message={fetchError}
          onDismiss={() => setFetchError(null)}
          className="mb-6"
        />
      )}

      {/* ── Summary cards ────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Calculated"
          value={formatINR(summary.totalCalculated)}
          icon={<CalcIcon />}
          color="blue"
          accentColor="blue"
        />
        <StatCard
          label="Total Held"
          value={formatINR(summary.totalHeld)}
          icon={<HoldIcon />}
          color="yellow"
          accentColor="yellow"
        />
        <StatCard
          label="Total Adjustments"
          value={formatINR(summary.totalAdjustments)}
          icon={<AdjustIcon />}
          color="red"
          accentColor="red"
        />
        <StatCard
          label="Net Payout"
          value={formatINR(summary.netPayout)}
          icon={<PayoutIcon />}
          color="green"
          accentColor="green"
          trend={4.2}
        />
      </div>

      {/* ── Metric strip ─────────────────────────────────────────────────── */}
      <MetricStrip
        metrics={[
          { label: 'Total Records', value: String(results.length) },
          { label: 'Pending Review', value: String(filterCounts.DRAFT || 0), color: '#6B7280' },
          { label: 'Approved', value: String(filterCounts.APPROVED || 0), color: '#16A34A' },
          { label: 'On Hold', value: String(filterCounts.HOLD || 0), color: '#D6A15C' },
          { label: 'Manual Override', value: String(filterCounts.MANUAL || 0), color: '#7A3E00' },
          { label: 'Paid', value: String(filterCounts.PAID || 0), color: '#16A34A' },
        ]}
        className="mb-6"
      />

      {/* ── Main table section ───────────────────────────────────────────── */}
      <SectionCard sectionLabel="INCENTIVE RESULTS" title="Review Queue" noPadding>
        <div className="px-5 pt-4 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FilterChipBar
              filters={filterChips}
              onToggle={handleFilterToggle}
            />
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agent, code, program…"
              className="w-full sm:w-64"
            />
          </div>
        </div>

        <EnterpriseTable
          columns={columns}
          data={filteredResults}
          loading={loading}
          selectable
          selectedRows={selectedRows}
          onSelectionChange={handleSelectionChange}
          emptyMessage={activeFilter !== 'all' || searchQuery ? 'No results match your filters' : 'No incentive results found'}
        />
      </SectionCard>

      {/* ── Sticky batch approve toolbar ─────────────────────────────────── */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-ent-border bg-ent-surface/95 px-4 py-3 shadow-lg backdrop-blur-sm">
          <div className="mx-auto max-w-7xl">
            <ActionToolbar
              leftContent={
                <span>
                  <strong className="text-ent-text">{selectedRows.length}</strong>{' '}
                  {selectedRows.length === 1 ? 'record' : 'records'} selected
                </span>
              }
            >
              <Button variant="ghost" size="sm" onClick={() => setSelectedRows([])}>
                Clear Selection
              </Button>
              <Button size="sm" loading={approveLoading} onClick={handleApproveSelected}>
                Approve Selected
              </Button>
            </ActionToolbar>
          </div>
        </div>
      )}

      {/* ── Detail drawer ────────────────────────────────────────────────── */}
      <RightPreviewPanel
        open={detailRow != null}
        onClose={() => setDetailRow(null)}
        title="Incentive Details"
        width={480}
      >
        <DetailDrawerContent row={detailRow} />
      </RightPreviewPanel>

      {/* ── Adjustment drawer ────────────────────────────────────────────── */}
      <RightPreviewPanel
        open={editRow != null}
        onClose={() => setEditRow(null)}
        title="Manual Adjustment"
        width={440}
      >
        <AdjustmentDrawerContent
          row={editRow}
          onApply={handleApplyAdjustment}
          onCancel={() => setEditRow(null)}
        />
      </RightPreviewPanel>
    </PageShell>
  )
}
