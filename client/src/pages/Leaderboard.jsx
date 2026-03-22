import { useState } from 'react'
import {
  useGetProgramsQuery,
  useGetResultsQuery,
} from '../store/apiSlice'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const BADGE = [
  { label: '🥇', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  { label: '🥈', bg: 'bg-gray-100', text: 'text-gray-700' },
  { label: '🥉', bg: 'bg-orange-100', text: 'text-orange-800' },
]

export default function Leaderboard() {
  const { data: programs = [] } = useGetProgramsQuery()
  const [programId, setProgramId] = useState('')
  const [period, setPeriod] = useState('')

  const canFetch = Boolean(programId && period)
  const {
    data: results = [],
    isLoading,
    isError,
  } = useGetResultsQuery(
    { programId, period },
    { skip: !canFetch },
  )

  const chartData = results.slice(0, 10).map((r, idx) => ({
    name: r.user_name || `User ${r.user_id}`,
    total: Number(r.total_incentive) || 0,
    rank: idx + 1,
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

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Program
          </label>
          <select
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          >
            <option value="">Select a program…</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Period (YYYY-MM)
          </label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ── States ─────────────────────────────────────────────────────── */}
      {!canFetch && (
        <p className="py-8 text-center text-sm text-gray-400">
          Select a program and period to view the leaderboard.
        </p>
      )}
      {canFetch && isLoading && (
        <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
      )}
      {canFetch && isError && (
        <p className="py-8 text-center text-sm text-red-500">
          Failed to load results.
        </p>
      )}

      {/* ── Ranked Table ───────────────────────────────────────────────── */}
      {canFetch && !isLoading && !isError && (
        <>
          <div className="mb-8 overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-teal-600 text-white">
                  <th className="px-4 py-3 font-medium">Rank</th>
                  <th className="px-4 py-3 font-medium">User Name</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Self Incentive</th>
                  <th className="px-4 py-3 font-medium">Team Incentive</th>
                  <th className="px-4 py-3 font-medium">Total Incentive</th>
                  <th className="px-4 py-3 font-medium">Achievement %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No results found for the selected program and period.
                    </td>
                  </tr>
                ) : (
                  results.map((r, idx) => {
                    const rank = idx + 1
                    const badge = BADGE[idx]
                    const breakdown = r.calc_breakdown ?? {}
                    const achievementPct =
                      breakdown.achievement_pct != null
                        ? `${Number(breakdown.achievement_pct).toFixed(1)}%`
                        : '—'

                    return (
                      <tr
                        key={r.id ?? idx}
                        className={
                          badge
                            ? `${badge.bg}`
                            : idx % 2 === 0
                              ? 'bg-white'
                              : 'bg-slate-50'
                        }
                      >
                        <td className="px-4 py-3 font-medium text-gray-800">
                          <span className="inline-flex items-center gap-1.5">
                            {badge && (
                              <span className="text-base">{badge.label}</span>
                            )}
                            {rank}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {r.user_name || `User ${r.user_id}`}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {r.channel_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {r.self_incentive ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {r.team_incentive ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {r.total_incentive ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {achievementPct}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Bar Chart (Top 10) ──────────────────────────────────────── */}
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
                  <Tooltip />
                  <Bar
                    dataKey="total"
                    name="Total Incentive"
                    fill="#0d9488"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
