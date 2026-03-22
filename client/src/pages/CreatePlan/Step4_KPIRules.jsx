import { useState } from 'react'
import {
  useGetKPIsQuery,
  useCreateKPIMutation,
  useUpdateKPIMutation,
  useDeleteKPIMutation,
  useGetMilestonesQuery,
  useCreateMilestoneMutation,
} from '../../store/apiSlice'

const EMPTY_KPI = {
  kpi_name: '',
  frequency: 'MONTHLY',
  is_positive: true,
  breakdown_rule: 'FULL_MONTH',
  target_structure: 'MONTHLY_TARGET',
  measurement_type: 'PERCENTAGE',
  tracking_method: 'TARGET_BASED',
  output_display: 'NUMBER',
}

const EMPTY_MILESTONE = {
  milestone_label: '',
  performance_driver: '',
  function_type: 'LEFT_INCLUSIVE_BETWEEN',
  range_from: '',
  range_to: '',
}

export default function Step4_KPIRules({ programId, onNext }) {
  const { data: kpis = [], isLoading } = useGetKPIsQuery(programId, { skip: !programId })
  const [createKPI] = useCreateKPIMutation()
  const [updateKPI] = useUpdateKPIMutation()
  const [deleteKPI] = useDeleteKPIMutation()

  const [draft, setDraft] = useState(EMPTY_KPI)
  const [editingId, setEditingId] = useState(null)
  const [expandedKpi, setExpandedKpi] = useState(null)

  const handleSaveKPI = async () => {
    if (!draft.kpi_name) return
    const body = { ...draft, program_id: programId }
    if (editingId) {
      await updateKPI({ id: editingId, ...body })
      setEditingId(null)
    } else {
      await createKPI(body)
    }
    setDraft(EMPTY_KPI)
  }

  const handleEdit = (kpi) => {
    setEditingId(kpi.id)
    setDraft({
      kpi_name: kpi.kpi_name,
      frequency: kpi.frequency,
      is_positive: kpi.is_positive,
      breakdown_rule: kpi.breakdown_rule,
      target_structure: kpi.target_structure,
      measurement_type: kpi.measurement_type,
      tracking_method: kpi.tracking_method,
      output_display: kpi.output_display,
    })
  }

  const handleDelete = async (id) => {
    await deleteKPI(id)
    if (editingId === id) {
      setEditingId(null)
      setDraft(EMPTY_KPI)
    }
  }

  const handleNext = () => {
    if (onNext) onNext()
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 font-[Inter]">
      <h2 className="mb-6 text-lg font-semibold text-teal-700">KPI Definitions</h2>

      {/* KPI Form */}
      <div className="mb-6 rounded-md border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-700">
          {editingId ? 'Edit KPI' : 'Add New KPI'}
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">KPI Name</label>
            <input
              type="text"
              value={draft.kpi_name}
              onChange={(e) => setDraft({ ...draft, kpi_name: e.target.value })}
              placeholder="e.g. Collection Rate"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Frequency</label>
            <select
              value={draft.frequency}
              onChange={(e) => setDraft({ ...draft, frequency: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="ANNUAL">Annual</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Measurement</label>
            <select
              value={draft.measurement_type}
              onChange={(e) => setDraft({ ...draft, measurement_type: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="ABSOLUTE">Absolute</option>
              <option value="RATIO">Ratio</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Tracking Method</label>
            <select
              value={draft.tracking_method}
              onChange={(e) => setDraft({ ...draft, tracking_method: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              <option value="TARGET_BASED">Target Based</option>
              <option value="FORMULA">Formula</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Target Structure</label>
            <select
              value={draft.target_structure}
              onChange={(e) => setDraft({ ...draft, target_structure: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              <option value="MONTHLY_TARGET">Monthly Target</option>
              <option value="QUARTERLY_TARGET">Quarterly Target</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={draft.is_positive}
                onChange={(e) => setDraft({ ...draft, is_positive: e.target.checked })}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              Positive KPI
            </label>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleSaveKPI}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            {editingId ? 'Update KPI' : 'Add KPI'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => { setEditingId(null); setDraft(EMPTY_KPI) }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* KPI List */}
      {isLoading ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading KPIs…</p>
      ) : kpis.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">No KPIs defined yet.</p>
      ) : (
        <div className="space-y-3">
          {kpis.map((kpi) => (
            <div key={kpi.id} className="rounded-md border border-gray-200">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-800">{kpi.kpi_name}</span>
                  <span className="ml-3 text-xs text-gray-500">{kpi.frequency} · {kpi.measurement_type}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedKpi(expandedKpi === kpi.id ? null : kpi.id)}
                    className="rounded border border-teal-500 px-3 py-1 text-xs text-teal-600 hover:bg-teal-50"
                  >
                    Milestones
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(kpi)}
                    className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(kpi.id)}
                    className="rounded border border-red-300 px-3 py-1 text-xs text-red-500 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {expandedKpi === kpi.id && <MilestonePanel kpiId={kpi.id} />}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleNext}
          className="rounded-md bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Save &amp; Next
        </button>
      </div>
    </div>
  )
}

/* ── Inline Milestone Panel ────────────────────────────────────────── */

function MilestonePanel({ kpiId }) {
  const { data: milestones = [], isLoading } = useGetMilestonesQuery(kpiId)
  const [createMilestone] = useCreateMilestoneMutation()
  const [draft, setDraft] = useState(EMPTY_MILESTONE)

  const handleAdd = async () => {
    if (!draft.milestone_label) return
    await createMilestone({ kpiId, ...draft })
    setDraft(EMPTY_MILESTONE)
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
      <h4 className="mb-2 text-xs font-semibold text-gray-600 uppercase">Milestones</h4>

      {isLoading ? (
        <p className="text-xs text-gray-400">Loading…</p>
      ) : (
        <table className="mb-3 w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-1 pr-3">Label</th>
              <th className="pb-1 pr-3">Driver</th>
              <th className="pb-1 pr-3">Function</th>
              <th className="pb-1 pr-3">From</th>
              <th className="pb-1">To</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m) => (
              <tr key={m.id}>
                <td className="py-1 pr-3 text-gray-700">{m.milestone_label}</td>
                <td className="py-1 pr-3 text-gray-500">{m.performance_driver}</td>
                <td className="py-1 pr-3 text-gray-500">{m.function_type}</td>
                <td className="py-1 pr-3 text-gray-500">{m.range_from}</td>
                <td className="py-1 text-gray-500">{m.range_to}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Label (M-1)"
          value={draft.milestone_label}
          onChange={(e) => setDraft({ ...draft, milestone_label: e.target.value })}
          className="w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Driver"
          value={draft.performance_driver}
          onChange={(e) => setDraft({ ...draft, performance_driver: e.target.value })}
          className="w-28 rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none"
        />
        <select
          value={draft.function_type}
          onChange={(e) => setDraft({ ...draft, function_type: e.target.value })}
          className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none"
        >
          <option value="LEFT_INCLUSIVE_BETWEEN">Left Inclusive Between</option>
          <option value="GTE">≥</option>
          <option value="LTE">≤</option>
        </select>
        <input
          type="number"
          placeholder="From"
          value={draft.range_from}
          onChange={(e) => setDraft({ ...draft, range_from: e.target.value })}
          className="w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none"
        />
        <input
          type="number"
          placeholder="To"
          value={draft.range_to}
          onChange={(e) => setDraft({ ...draft, range_to: e.target.value })}
          className="w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded bg-teal-600 px-3 py-1 text-xs text-white hover:bg-teal-700"
        >
          Add
        </button>
      </div>
    </div>
  )
}
