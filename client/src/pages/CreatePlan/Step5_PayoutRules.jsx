import { useState } from 'react'
import {
  useGetPayoutRulesQuery,
  useCreatePayoutRuleMutation,
  useGetSlabsQuery,
  useCreateSlabMutation,
} from '../../store/apiSlice'

const EMPTY_RULE = {
  rule_name: '',
  calc_type: 'VARIABLE',
  variable_name: '',
  has_qualifying_rules: false,
  has_incentive_table: false,
}

const EMPTY_SLAB = {
  slab_label: '',
  milestone_label: '',
  operator: 'GTE',
  value1: '',
  value2: '',
  incentive_operator: 'MULTIPLY',
  tag_type: '',
  parameter_name: '',
  weight_pct: 100,
  payout_calc_type: 'HIGHEST_AMOUNT',
  max_cap: '',
}

export default function Step5_PayoutRules({ programId }) {
  const { data: rules = [], isLoading } = useGetPayoutRulesQuery(programId, { skip: !programId })
  const [createPayoutRule] = useCreatePayoutRuleMutation()

  const [draft, setDraft] = useState(EMPTY_RULE)
  const [expandedRule, setExpandedRule] = useState(null)

  const handleAddRule = async () => {
    if (!draft.rule_name) return
    await createPayoutRule({ ...draft, program_id: programId })
    setDraft(EMPTY_RULE)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 font-[Inter]">
      <h2 className="mb-6 text-lg font-semibold text-teal-700">Payout Rules &amp; Slabs</h2>

      {/* Add Rule Form */}
      <div className="mb-6 rounded-md border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-700">Add Payout Rule</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Rule Name</label>
            <input
              type="text"
              value={draft.rule_name}
              onChange={(e) => setDraft({ ...draft, rule_name: e.target.value })}
              placeholder="e.g. Collection Payout"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Calc Type</label>
            <select
              value={draft.calc_type}
              onChange={(e) => setDraft({ ...draft, calc_type: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              <option value="VARIABLE">Variable</option>
              <option value="FIXED">Fixed</option>
              <option value="PERCENTAGE">Percentage</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Variable Name</label>
            <input
              type="text"
              value={draft.variable_name}
              onChange={(e) => setDraft({ ...draft, variable_name: e.target.value })}
              placeholder="e.g. collection_rate"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            />
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={draft.has_qualifying_rules}
                onChange={(e) => setDraft({ ...draft, has_qualifying_rules: e.target.checked })}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              Qualifying Rules
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={draft.has_incentive_table}
                onChange={(e) => setDraft({ ...draft, has_incentive_table: e.target.checked })}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              Incentive Table
            </label>
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={handleAddRule}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Add Rule
          </button>
        </div>
      </div>

      {/* Rules List */}
      {isLoading ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading rules…</p>
      ) : rules.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">No payout rules defined yet.</p>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-md border border-gray-200">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-800">{rule.rule_name}</span>
                  <span className="ml-3 text-xs text-gray-500">{rule.calc_type}</span>
                  {rule.variable_name && (
                    <span className="ml-2 text-xs text-gray-400">({rule.variable_name})</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                  className="rounded border border-teal-500 px-3 py-1 text-xs text-teal-600 hover:bg-teal-50"
                >
                  {expandedRule === rule.id ? 'Hide Slabs' : 'Slabs'}
                </button>
              </div>
              {expandedRule === rule.id && <SlabPanel ruleId={rule.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Inline Slab Panel ─────────────────────────────────────────────── */

function SlabPanel({ ruleId }) {
  const { data: slabs = [], isLoading } = useGetSlabsQuery(ruleId)
  const [createSlab] = useCreateSlabMutation()
  const [draft, setDraft] = useState(EMPTY_SLAB)

  const handleAdd = async () => {
    if (!draft.slab_label) return
    await createSlab({ ruleId, ...draft })
    setDraft(EMPTY_SLAB)
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
      <h4 className="mb-2 text-xs font-semibold text-gray-600 uppercase">Payout Slabs</h4>

      {isLoading ? (
        <p className="text-xs text-gray-400">Loading…</p>
      ) : (
        <div className="mb-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-1 pr-2">Label</th>
                <th className="pb-1 pr-2">Operator</th>
                <th className="pb-1 pr-2">Value1</th>
                <th className="pb-1 pr-2">Value2</th>
                <th className="pb-1 pr-2">Incentive Op</th>
                <th className="pb-1 pr-2">Weight %</th>
                <th className="pb-1">Max Cap</th>
              </tr>
            </thead>
            <tbody>
              {slabs.map((s) => (
                <tr key={s.id}>
                  <td className="py-1 pr-2 text-gray-700">{s.slab_label}</td>
                  <td className="py-1 pr-2 text-gray-500">{s.operator}</td>
                  <td className="py-1 pr-2 text-gray-500">{s.value1}</td>
                  <td className="py-1 pr-2 text-gray-500">{s.value2}</td>
                  <td className="py-1 pr-2 text-gray-500">{s.incentive_operator}</td>
                  <td className="py-1 pr-2 text-gray-500">{s.weight_pct}</td>
                  <td className="py-1 text-gray-500">{s.max_cap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Label"
          value={draft.slab_label}
          onChange={(e) => setDraft({ ...draft, slab_label: e.target.value })}
          className="w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none"
        />
        <select
          value={draft.operator}
          onChange={(e) => setDraft({ ...draft, operator: e.target.value })}
          className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none"
        >
          <option value="GTE">≥</option>
          <option value="LTE">≤</option>
          <option value="BETWEEN">Between</option>
          <option value="EQ">=</option>
        </select>
        <input
          type="number"
          placeholder="Val 1"
          value={draft.value1}
          onChange={(e) => setDraft({ ...draft, value1: e.target.value })}
          className="w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none"
        />
        <input
          type="number"
          placeholder="Val 2"
          value={draft.value2}
          onChange={(e) => setDraft({ ...draft, value2: e.target.value })}
          className="w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none"
        />
        <select
          value={draft.incentive_operator}
          onChange={(e) => setDraft({ ...draft, incentive_operator: e.target.value })}
          className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none"
        >
          <option value="MULTIPLY">Multiply</option>
          <option value="FLAT">Flat</option>
          <option value="PERCENTAGE_OF">% Of</option>
        </select>
        <input
          type="number"
          placeholder="Weight %"
          value={draft.weight_pct}
          onChange={(e) => setDraft({ ...draft, weight_pct: e.target.value })}
          className="w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none"
        />
        <input
          type="number"
          placeholder="Max Cap"
          value={draft.max_cap}
          onChange={(e) => setDraft({ ...draft, max_cap: e.target.value })}
          className="w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded bg-teal-600 px-3 py-1 text-xs text-white hover:bg-teal-700"
        >
          Add Slab
        </button>
      </div>
    </div>
  )
}
