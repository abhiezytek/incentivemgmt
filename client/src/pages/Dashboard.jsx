// client/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Legend, Cell
} from 'recharts';
import { StatCard, Badge, LoadingSpinner, Card } from '../components/ui';

const BLUE_SHADES = ['#1E40AF', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'];
const PROGRAM_STATUS = {
  ACTIVE: 'green',
  DRAFT: 'yellow',
  CLOSED: 'grey',
};

const fmt  = (n) => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmtK = (n) => n >= 10000000
  ? `₹${(n/10000000).toFixed(1)}Cr`
  : n >= 100000
  ? `₹${(n/100000).toFixed(1)}L`
  : fmt(n);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

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
    <div className="flex items-center justify-center py-32">
      <LoadingSpinner size="lg" />
    </div>
  );

  const maxIncentive = Math.max(
    ...((data.topAgents || []).map(a => Number(a.total_incentive || 0))),
    1,
  );

  return (
    <div className="space-y-6">

      {/* ── Blue gradient banner ── */}
      <div className="rounded-xl bg-gradient-to-r from-primary to-primary-light p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{getGreeting()}, Admin 👋</h1>
            <p className="mt-1 text-sm text-blue-100">
              {data.programs?.[0]?.name || 'Incentive Management'} · {period || 'Current Period'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={program}
              onChange={e => setProgram(e.target.value)}
              placeholder="Program ID"
              className="rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm text-white
                         placeholder:text-blue-200 focus:ring-2 focus:ring-white/50 outline-none w-28"
            />
            <input
              type="date"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm text-white
                         focus:ring-2 focus:ring-white/50 outline-none"
            />
            <button
              onClick={fetchDashboard}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-blue-50"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI StatCards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Incentive Pool"
          value={fmtK(data.kpi.total_pool)}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          trend={data.kpi.pool_growth}
          color="blue"
        />
        <StatCard
          label="Total NB Premium"
          value={fmtK(data.kpi.total_nb_premium)}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
          trend={data.kpi.nb_growth}
          color="grey"
        />
        <StatCard
          label="Avg Achievement %"
          value={`${Number(data.kpi.avg_achievement||0).toFixed(1)}%`}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z M9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z M16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>}
          trend={data.kpi.achievement_trend}
          color="blue"
        />
        <StatCard
          label="Active Agents"
          value={data.kpi.paid_count || '—'}
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
          trend={data.kpi.persistency_trend}
          color="grey"
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Bar Chart — Channel Incentive */}
        <Card title="Channel Incentive Breakdown" subtitle="Self vs MLM Override" className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.channelBreakdown} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
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
                formatter={(v) => <span className="text-xs text-text-secondary">{v}</span>}
              />
              <Bar dataKey="self_incentive" name="Self" stackId="a" fill="#1E40AF" radius={[0,0,0,0]} />
              <Bar dataKey="override_incentive" name="MLM Override" stackId="a" fill="#64748B" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Donut — Product Mix */}
        <Card title="NB Premium Mix" subtitle="By Product" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
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
                  <Cell key={i} fill={BLUE_SHADES[i % BLUE_SHADES.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => [fmtK(v), 'Premium']}
                contentStyle={{ borderRadius:'8px', border:'1px solid #E2E8F0', fontSize:'12px' }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span className="text-xs text-text-secondary">{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Top 5 Agents */}
        <Card
          title="Top Performers"
          action={<a href="/incentive/leaderboard" className="text-xs font-medium text-primary hover:underline">View all →</a>}
        >
          <div className="space-y-3">
            {(data.topAgents || []).map((a, i) => (
              <div key={a.agent_code} className="flex items-center gap-3">
                <Badge variant={i === 0 ? 'yellow' : i === 1 ? 'grey' : i === 2 ? 'red' : 'blue'}>
                  #{i + 1}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text-primary truncate">
                    {a.agent_name}
                  </p>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-primary h-1.5 rounded-full"
                      style={{ width: `${(Number(a.total_incentive) / maxIncentive * 100).toFixed(0)}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-primary shrink-0">
                  {fmtK(Number(a.total_incentive))}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Active Programs */}
        <Card
          title="Active Programs"
          action={<a href="/admin/plans" className="text-xs font-medium text-primary hover:underline">Manage →</a>}
        >
          <div className="space-y-3">
            {(data.programs || []).map((p) => (
              <div
                key={p.id}
                className="flex items-start justify-between rounded-lg border border-border p-2.5 hover:bg-background transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-text-primary truncate">{p.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {p.start_date} → {p.end_date}
                  </p>
                  <p className="text-xs text-text-muted">{p.channel}</p>
                </div>
                <Badge variant={PROGRAM_STATUS[p.status] || 'grey'}>
                  {p.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Activity Feed */}
        <Card title="Recent Activity">
          <div className="space-y-3">
            {(data.recentActivity || []).map((act, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-primary font-medium">{act.message}</p>
                  <p className="text-xs text-text-muted mt-0.5">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Payout Pipeline ── */}
      <Card title="Payout Pipeline Status" action={
        <a href="/payout/disbursement" className="text-xs font-medium text-primary hover:underline">
          Go to Disbursement →
        </a>
      }>
        <div className="flex gap-0 rounded-lg overflow-hidden h-8 border border-border">
          {[
            { label:'Calculated', key:'DRAFT',     color:'bg-accent' },
            { label:'Approved',   key:'APPROVED',  color:'bg-primary'  },
            { label:'Initiated',  key:'INITIATED', color:'bg-warning'},
            { label:'Paid',       key:'PAID',      color:'bg-success' },
          ].map((s) => {
            const count = data.pipelineStatus?.[s.key]?.count || 0;
            const total = Object.values(data.pipelineStatus || {})
              .reduce((sum, v) => sum + (v.count || 0), 0);
            const width = total > 0 ? (count / total) * 100 : 0;
            return (
              <div
                key={s.key}
                className={`${s.color} flex items-center justify-center text-white text-xs font-medium transition-all ${width < 5 ? 'hidden' : ''}`}
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
            { label:'Calculated', color:'bg-accent' },
            { label:'Approved',   color:'bg-primary'  },
            { label:'Initiated',  color:'bg-warning'},
            { label:'Paid',       color:'bg-success' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${s.color}`} />
              <span className="text-xs text-text-secondary">{s.label}</span>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}
