// client/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

const CHANNEL_COLORS  = ['#0D9488','#0EA5E9','#8B5CF6','#F59E0B','#EF4444'];
const PRODUCT_COLORS  = ['#0D9488','#14B8A6','#5EEAD4','#0EA5E9','#8B5CF6'];
const PROGRAM_STATUS  = {
  ACTIVE: 'bg-green-100 text-green-700',
  DRAFT:  'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-slate-100 text-slate-500',
};

const fmt  = (n) => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmtK = (n) => n >= 10000000
  ? `₹${(n/10000000).toFixed(1)}Cr`
  : n >= 100000
  ? `₹${(n/100000).toFixed(1)}L`
  : fmt(n);

export default function Dashboard() {
  const [data,    setData]    = useState(null);
  const [period,  setPeriod]  = useState('');
  const [program, setProgram] = useState('');
  const [loading, setLoading] = useState(false);

  const API = import.meta.env.VITE_API_URL;

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (program) p.append('programId', program);
      if (period)  p.append('period', period);
      const res  = await fetch(`${API}/api/dashboard/summary?${p}`);
      const json = await res.json();
      setData(json);
    } catch {
      /* ignore – data stays null */
    }
    setLoading(false);
  };

  useEffect(() => { fetchDashboard(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !data) return (
    <div className="p-6 text-slate-400 animate-pulse">Loading dashboard…</div>
  );

  const maxIncentive = Math.max(
    ...((data.topAgents || []).map(a => Number(a.total_incentive || 0))),
    1,
  );

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome back 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Incentive performance overview · {period || 'Current Period'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={program}
            onChange={e => setProgram(e.target.value)}
            placeholder="Program ID"
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-28
                       focus:ring-2 focus:ring-teal-500 outline-none"
          />
          <input
            type="date"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm
                       focus:ring-2 focus:ring-teal-500 outline-none"
          />
          <button
            onClick={fetchDashboard}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg
                       text-sm font-medium hover:bg-teal-700"
          >
            Apply
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Incentive Pool',
            value: fmtK(data.kpi.total_pool),
            sub:   `${data.kpi.paid_count} agents paid`,
            icon:  '💰',
            trend: data.kpi.pool_growth,
            color: 'teal',
          },
          {
            label: 'Total NB Premium',
            value: fmtK(data.kpi.total_nb_premium),
            sub:   `${data.kpi.nb_policy_count} policies`,
            icon:  '📋',
            trend: data.kpi.nb_growth,
            color: 'blue',
          },
          {
            label: 'Avg Achievement %',
            value: `${Number(data.kpi.avg_achievement||0).toFixed(1)}%`,
            sub:   `Target: ${fmtK(data.kpi.total_target)}`,
            icon:  '🎯',
            trend: data.kpi.achievement_trend,
            color: 'purple',
          },
          {
            label: 'Avg 13M Persistency',
            value: `${Number(data.kpi.avg_persistency_13m||0).toFixed(1)}%`,
            sub:   `${data.kpi.agents_below_gate} below gate`,
            icon:  '🔄',
            trend: data.kpi.persistency_trend,
            color: 'orange',
          },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-xl border border-slate-200 p-5
                       hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{c.icon}</span>
              {c.trend != null && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full
                    ${c.trend >= 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'}`}
                >
                  {c.trend >= 0 ? '▲' : '▼'} {Math.abs(c.trend).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">{c.label}</p>
            <p className={`text-2xl font-bold mt-0.5 text-${c.color}-600`}>
              {c.value}
            </p>
            <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Bar Chart — Incentive Pool by Channel */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">
              Incentive Pool by Channel
            </h2>
            <span className="text-xs text-slate-400">This Period</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.channelBreakdown} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="channel" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis
                tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`}
                tick={{ fontSize: 11, fill: '#64748B' }}
              />
              <Tooltip
                formatter={(v, n) => [fmtK(v), n === 'self_incentive' ? 'Self' : 'MLM Override']}
                contentStyle={{ borderRadius:'8px', border:'1px solid #E2E8F0', fontSize:'12px' }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span className="text-xs text-slate-500">{v}</span>}
              />
              <Bar dataKey="self_incentive" name="Self" stackId="a" radius={[0,0,0,0]}>
                {(data.channelBreakdown || []).map((_, i) => (
                  <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                ))}
              </Bar>
              <Bar dataKey="override_incentive" name="MLM Override" stackId="a" radius={[6,6,0,0]} fill="#5EEAD4" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Chart — Product-wise NB Premium */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">
              NB Premium Mix
            </h2>
            <span className="text-xs text-slate-400">By Product</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data.productMix}
                dataKey="premium"
                nameKey="product"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {(data.productMix || []).map((_, i) => (
                  <Cell key={i} fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => [fmtK(v), 'Premium']}
                contentStyle={{ borderRadius:'8px', border:'1px solid #E2E8F0', fontSize:'12px' }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span className="text-xs text-slate-500">{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Top 5 Agents */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">🏆 Top Performers</h2>
            <a href="/leaderboard" className="text-xs text-teal-600 hover:underline">View all →</a>
          </div>
          <div className="space-y-3">
            {(data.topAgents || []).map((a, i) => (
              <div key={a.agent_code} className="flex items-center gap-3">
                <span className="text-lg w-6 text-center shrink-0">
                  {['🥇','🥈','🥉','4️⃣','5️⃣'][i]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {a.agent_name}
                  </p>
                  <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
                    <div
                      className="bg-teal-500 h-1 rounded-full"
                      style={{ width: `${(Number(a.total_incentive) / maxIncentive * 100).toFixed(0)}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-teal-700 shrink-0">
                  {fmtK(Number(a.total_incentive))}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Programs */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">📌 Active Programs</h2>
            <a href="/admin/plans" className="text-xs text-teal-600 hover:underline">Manage →</a>
          </div>
          <div className="space-y-3">
            {(data.programs || []).map((p) => (
              <div
                key={p.id}
                className="flex items-start justify-between border border-slate-100
                           rounded-lg p-2.5 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {p.start_date} → {p.end_date}
                  </p>
                  <p className="text-xs text-slate-400">{p.channel}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2
                    ${PROGRAM_STATUS[p.status] || 'bg-slate-100 text-slate-500'}`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">🕐 Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {(data.recentActivity || []).map((act, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center
                                justify-center text-sm shrink-0">
                  {act.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-700 font-medium">{act.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Payout Status Bar ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Payout Pipeline Status
          </h2>
          <a href="/payout/disbursement" className="text-xs text-teal-600 hover:underline">
            Go to Disbursement →
          </a>
        </div>
        <div className="flex gap-0 rounded-lg overflow-hidden h-8 border border-slate-200">
          {[
            { label:'Calculated', key:'DRAFT',     color:'bg-slate-400' },
            { label:'Approved',   key:'APPROVED',  color:'bg-blue-500'  },
            { label:'Initiated',  key:'INITIATED', color:'bg-yellow-400'},
            { label:'Paid',       key:'PAID',      color:'bg-green-500' },
          ].map((s) => {
            const count = data.pipelineStatus?.[s.key]?.count || 0;
            const total = Object.values(data.pipelineStatus || {})
              .reduce((sum, v) => sum + (v.count || 0), 0);
            const width = total > 0 ? (count / total) * 100 : 0;
            return (
              <div
                key={s.key}
                className={`${s.color} flex items-center justify-center
                             text-white text-xs font-medium transition-all
                             ${width < 5 ? 'hidden' : ''}`}
                style={{ width: `${width}%` }}
                title={`${s.label}: ${count} agents`}
              >
                {width > 8 ? `${s.label} (${count})` : count}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2">
          {[
            { label:'Calculated', color:'bg-slate-400' },
            { label:'Approved',   color:'bg-blue-500'  },
            { label:'Initiated',  color:'bg-yellow-400'},
            { label:'Paid',       color:'bg-green-500' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${s.color}`} />
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
