import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const MEDAL = { 0: '🥇', 1: '🥈', 2: '🥉' }
const MEDAL_BG = {
  0: 'bg-yellow-50 border-l-4 border-yellow-400',
  1: 'bg-slate-50 border-l-4 border-slate-400',
  2: 'bg-orange-50 border-l-4 border-orange-400',
}
const BAR_COLORS = [
  '#0D9488', '#0D9488', '#0D9488',
  '#5EEAD4', '#5EEAD4', '#5EEAD4', '#5EEAD4', '#5EEAD4', '#5EEAD4', '#5EEAD4',
]

export default function Leaderboard() {
  const [data, setData] = useState([])
  const [filters, setFilters] = useState({
    programId: '', period: '', channel: '', region: '',
  })
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    )
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/leaderboard?${params}`,
      )
      const json = await res.json()
      setData(json.agents || [])
      setSummary(json.summary || null)
    } catch {
      setData([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const fmt = (n) =>
    n != null
      ? `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
      : '—'

  const pct = (n) => `${Number(n || 0).toFixed(1)}%`

  const chartData = data.slice(0, 10).map((r) => ({
    name: r.agent_name || r.agent_code || '—',
    total: Number(r.total_incentive) || 0,
  }))

  return (
    <div className="font-[Inter]">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Leaderboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Top performers ranked by incentive earnings.
        </p>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Pool', value: fmt(summary.total_pool) },
            { label: 'Agent Count', value: summary.agent_count ?? '—' },
            { label: 'Avg Incentive', value: fmt(summary.avg_incentive) },
            { label: 'Top Performer', value: summary.top_earner ?? '—' },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-lg font-semibold text-gray-800">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Program ID
          </label>
          <input
            type="text"
            value={filters.programId}
            onChange={(e) => handleFilterChange('programId', e.target.value)}
            placeholder="Program ID"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Period (YYYY-MM)
          </label>
          <input
            type="month"
            value={filters.period}
            onChange={(e) => handleFilterChange('period', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Channel
          </label>
          <input
            type="text"
            value={filters.channel}
            onChange={(e) => handleFilterChange('channel', e.target.value)}
            placeholder="Channel"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Region
          </label>
          <input
            type="text"
            value={filters.region}
            onChange={(e) => handleFilterChange('region', e.target.value)}
            placeholder="Region"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="w-full rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Search'}
          </button>
        </div>
      </div>

      {/* ── Ranked Table ───────────────────────────────────────────────── */}
      <div className="mb-8 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-teal-600 text-white">
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium text-right">Self Incentive</th>
              <th className="px-4 py-3 font-medium text-right">Team Override</th>
              <th className="px-4 py-3 font-medium text-right">Total Incentive</th>
              <th className="px-4 py-3 font-medium" style={{ minWidth: 180 }}>
                Achievement %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  {loading
                    ? 'Loading…'
                    : 'No results found. Adjust filters and search.'}
                </td>
              </tr>
            ) : (
              data.map((r, idx) => {
                const rank = idx + 1
                const medal = MEDAL[idx]
                const medalBg = MEDAL_BG[idx]
                const achievementPct = Number(r.achievement_pct || r.nb_achievement_pct || 0)

                return (
                  <tr
                    key={r.id ?? idx}
                    className={
                      medalBg ??
                      (idx % 2 === 0 ? 'bg-white' : 'bg-slate-50')
                    }
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      <span className="inline-flex items-center gap-1.5">
                        {medal && (
                          <span className="text-base">{medal}</span>
                        )}
                        {rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {r.agent_name || r.agent_code || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.channel ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {fmt(r.net_self_incentive)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {fmt(r.team_override)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {fmt(r.total_incentive)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-teal-500"
                            style={{ width: `${Math.min(achievementPct, 100)}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs text-gray-600">
                          {pct(achievementPct)}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Bar Chart (Top 10) ─────────────────────────────────────────── */}
      {chartData.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Top {chartData.length} Performers
          </h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-35}
                textAnchor="end"
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => fmt(value)}
              />
              <Bar
                dataKey="total"
                name="Total Incentive"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={BAR_COLORS[idx] || '#5EEAD4'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
