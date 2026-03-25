import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { PageHeader, Button, Badge, StatCard, Card, LoadingSpinner, EmptyState } from '../components/ui'

const PODIUM_STYLES = {
  0: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', label: '🥇 Gold' },
  1: { bg: 'bg-gray-50', border: 'border-gray-400', text: 'text-gray-600', label: '🥈 Silver' },
  2: { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-700', label: '🥉 Bronze' },
}

const BAR_COLORS = [
  '#1E40AF', '#1E40AF', '#1E40AF',
  '#3B82F6', '#3B82F6', '#3B82F6', '#3B82F6', '#64748B', '#64748B', '#64748B',
]

export default function Leaderboard() {
  const [data, setData] = useState([])
  const [filters, setFilters] = useState({ programId: '', period: '', channel: '', region: '' })
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    )
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/leaderboard?${params}`)
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
    n != null ? `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'
  const pct = (n) => `${Number(n || 0).toFixed(1)}%`

  const chartData = data.slice(0, 10).map((r) => ({
    name: r.agent_name || r.agent_code || '—',
    total: Number(r.total_incentive) || 0,
  }))

  return (
    <div>
      {/* Blue gradient header */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-primary to-primary-light p-6 text-white">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="mt-1 text-sm text-blue-100">Top performers ranked by incentive earnings.</p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Pool" value={fmt(summary.total_pool)} color="blue" />
          <StatCard label="Agent Count" value={summary.agent_count ?? '—'} color="grey" />
          <StatCard label="Avg Incentive" value={fmt(summary.avg_incentive)} color="blue" />
          <StatCard label="Top Performer" value={summary.top_earner ?? '—'} color="grey" />
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-border bg-surface p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Program ID</label>
            <input type="text" value={filters.programId} onChange={(e) => handleFilterChange('programId', e.target.value)}
              placeholder="Program ID" className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Period</label>
            <input type="month" value={filters.period} onChange={(e) => handleFilterChange('period', e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Channel</label>
            <input type="text" value={filters.channel} onChange={(e) => handleFilterChange('channel', e.target.value)}
              placeholder="Channel" className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Region</label>
            <input type="text" value={filters.region} onChange={(e) => handleFilterChange('region', e.target.value)}
              placeholder="Region" className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div className="flex items-end">
            <Button variant="primary" className="w-full" onClick={fetchData} loading={loading}>Search</Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : data.length === 0 ? (
        <EmptyState message="No results found. Adjust filters and search." />
      ) : (
        <>
          {/* Top 3 Podium */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {data.slice(0, 3).map((r, idx) => {
              const style = PODIUM_STYLES[idx]
              return (
                <div key={r.id ?? idx} className={`rounded-lg border-l-4 ${style.border} ${style.bg} p-5`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-black text-text-muted">#{idx + 1}</span>
                    <span className="text-xs font-medium">{style.label}</span>
                  </div>
                  <p className="text-sm font-bold text-text-primary">{r.agent_name || r.agent_code}</p>
                  <p className="text-xl font-bold text-primary mt-1">{fmt(r.total_incentive)}</p>
                  {r.channel && <Badge variant="grey" className="mt-2">{r.channel}</Badge>}
                </div>
              )
            })}
          </div>

          {/* Rank Table */}
          <div className="mb-8 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-primary text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Rank</th>
                  <th className="px-4 py-3 font-semibold">Agent</th>
                  <th className="px-4 py-3 font-semibold">Channel</th>
                  <th className="px-4 py-3 font-semibold text-right">Self Incentive</th>
                  <th className="px-4 py-3 font-semibold text-right">Team Override</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Incentive</th>
                  <th className="px-4 py-3 font-semibold" style={{ minWidth: 180 }}>Achievement %</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, idx) => {
                  const achievementPct = Number(r.achievement_pct || r.nb_achievement_pct || 0)
                  return (
                    <tr key={r.id ?? idx}
                      className={`border-t border-border transition-colors
                        ${idx % 2 === 0 ? 'bg-surface' : 'bg-background'}
                        hover:bg-primary-50`}
                    >
                      <td className="px-4 py-3 font-medium text-text-primary">
                        <span className="inline-flex items-center gap-1.5">
                          {idx < 3 && <span className="text-base">{['🥇','🥈','🥉'][idx]}</span>}
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-text-primary">{r.agent_name || r.agent_code || '—'}</td>
                      <td className="px-4 py-3 text-text-secondary">{r.channel ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-text-primary">{fmt(r.net_self_incentive)}</td>
                      <td className="px-4 py-3 text-right text-text-primary">{fmt(r.team_override)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-text-primary">{fmt(r.total_incentive)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-gray-100">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(achievementPct, 100)}%` }} />
                          </div>
                          <span className="w-12 text-right text-xs text-text-secondary">{pct(achievementPct)}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Bar Chart */}
          {chartData.length > 0 && (
            <Card title={`Top ${chartData.length} Performers`}>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 12, fill: '#64748B' }} interval={0} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip formatter={(value) => fmt(value)} contentStyle={{ borderRadius:'8px', border:'1px solid #E2E8F0', fontSize:'12px' }} />
                  <Bar dataKey="total" name="Total Incentive" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, idx) => (
                      <Cell key={idx} fill={BAR_COLORS[idx] || '#64748B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
