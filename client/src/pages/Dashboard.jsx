// client/src/pages/Dashboard.jsx
import { useState, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Legend, Cell,
} from 'recharts';
import {
  PageShell,
  PageTitle,
  StatCard,
  SectionCard,
  AlertPanel,
  TimelineList,
  Button,
  MetricStrip,
  EnterpriseTable,
  StatusPill,
  LoadingSpinner,
} from '../components/ui';

/* ── Colour constants ── */
const BLUE_SHADES = ['#1E40AF', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'];

/* ── Number formatters (Indian locale) ── */
const fmt  = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtK = (n) => {
  const v = Number(n || 0);
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`;
  return fmt(v);
};

/* ── Fallback data used when /api/dashboard/summary fails or returns null ── */
// TODO: replace zeroed fallback once the API guarantees non-null responses (see GET /api/dashboard/summary)
const FALLBACK = {
  kpi: {
    total_pool: 0, total_nb_premium: 0, avg_achievement: 0,
    paid_count: 0, pool_growth: 0, nb_growth: 0,
    achievement_trend: 0, persistency_trend: 0,
  },
  channelBreakdown: [],
  productMix: [],
  topAgents: [],
  programs: [],
  recentActivity: [],
  pipelineStatus: { DRAFT: { count: 0 }, APPROVED: { count: 0 }, INITIATED: { count: 0 }, PAID: { count: 0 } },
};

/* ── Inline SVG icons ── */
const icons = {
  schemes: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.251 2.251 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  ),
  payout: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  ),
  pending: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  pool: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  refresh: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
    </svg>
  ),
};

/* ════════════════════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const [data,        setData]        = useState(null);
  const [period,      setPeriod]      = useState('');
  const [program,     setProgram]     = useState('');
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const API = import.meta.env.VITE_API_URL;

  /* ── Fetch dashboard summary ── */
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (program) p.append('programId', program);
      if (period)  p.append('period', period);
      const res  = await fetch(`${API}/api/dashboard/summary?${p}`);
      const json = await res.json();
      setData(json);
    } catch {
      /* graceful fallback — FALLBACK data will be used via `d` below */
      setData(null);
    }
    setLastRefresh(new Date());
    setLoading(false);
  }, [API, program, period]);

  /* Initial data load on mount */
  const mountRef = useRef(null);
  if (mountRef.current == null) {
    mountRef.current = true;
    fetchDashboard();
  }

  /* ── Loading state ── */
  if (loading && !data) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-32">
          <LoadingSpinner size="lg" />
        </div>
      </PageShell>
    );
  }

  /* ── Merge API data with fallback ── */
  const d = { ...FALLBACK, ...data };
  const kpi = { ...FALLBACK.kpi, ...d.kpi };
  const pipeline = { ...FALLBACK.pipelineStatus, ...d.pipelineStatus };

  /* ── Derived KPIs ── */
  const activeSchemes    = (d.programs || []).filter((p) => p.status === 'ACTIVE').length;
  const processingCount  = pipeline.INITIATED?.count || 0;
  const pendingApprovals = pipeline.DRAFT?.count || 0;

  /* ── Top agents table columns ── */
  const agentColumns = [
    { key: 'rank',            label: '#',       width: '48px', render: (_, __, i) => <span className="font-semibold text-ent-muted">{i + 1}</span> },
    { key: 'agent_name',      label: 'Agent',   render: (v) => <span className="font-medium">{v}</span> },
    { key: 'agent_code',      label: 'Code' },
    { key: 'total_incentive', label: 'Incentive', render: (v) => <span className="font-semibold text-action-blue">{fmtK(Number(v || 0))}</span> },
  ];

  /* ── Programs table columns ── */
  const programColumns = [
    { key: 'name',       label: 'Scheme Name', render: (v) => <span className="font-medium">{v}</span> },
    { key: 'channel',    label: 'Channel' },
    { key: 'start_date', label: 'Start' },
    { key: 'end_date',   label: 'End' },
    { key: 'status',     label: 'Status', render: (v) => <StatusPill status={v === 'ACTIVE' ? 'active' : v === 'DRAFT' ? 'pending' : v === 'CLOSED' ? 'processed' : 'pending'}>{v}</StatusPill> },
  ];

  /* ── Timeline items from recentActivity ── */
  const timelineItems = (d.recentActivity || []).map((act) => ({
    timestamp: act.time,
    title: act.message,
    status: 'active',
  }));

  /* ── Pipeline metric strip ── */
  const pipelineMetrics = [
    { label: 'Calculated', value: String(pipeline.DRAFT?.count || 0),     color: '#1D4ED8' },
    { label: 'Approved',   value: String(pipeline.APPROVED?.count || 0),  color: '#1E2A78' },
    { label: 'Initiated',  value: String(pipeline.INITIATED?.count || 0), color: '#D6A15C' },
    { label: 'Paid',       value: String(pipeline.PAID?.count || 0),      color: '#16A34A' },
  ];

  /* ── Formatted refresh timestamp ── */
  const refreshLabel = lastRefresh
    ? lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  /* ══════════════════════ Render ══════════════════════ */
  return (
    <PageShell>

      {/* ── Page title + quick actions ── */}
      <PageTitle
        title="Dashboard"
        subtitle={`${d.programs?.[0]?.name || 'Incentive Management'} · ${period || 'Current Period'}`}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard' },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm">Export Ledger</Button>
            <Button variant="secondary" size="sm">Initiate Payout</Button>
            <Button variant="primary"   size="sm">Review Exception Log</Button>
          </>
        }
      />

      {/* ── Live sync / freshness indicator + filters ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-ent-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-ent-success animate-pulse" />
          <span>Last refreshed: {refreshLabel}</span>
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-md border border-ent-border px-2 py-1 text-xs font-medium text-ent-muted hover:text-action-blue hover:border-action-blue transition-colors disabled:opacity-50"
            aria-label="Refresh dashboard"
          >
            {icons.refresh}
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            placeholder="Program ID"
            className="rounded-lg border border-ent-border bg-ent-surface px-3 py-1.5 text-sm text-ent-text
                       placeholder:text-ent-muted focus:ring-2 focus:ring-action-blue/30 focus:border-action-blue outline-none w-32"
          />
          <input
            type="date"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-ent-border bg-ent-surface px-3 py-1.5 text-sm text-ent-text
                       focus:ring-2 focus:ring-action-blue/30 focus:border-action-blue outline-none"
          />
          <Button variant="primary" size="sm" onClick={fetchDashboard} loading={loading}>
            Apply
          </Button>
        </div>
      </div>

      {/* ── Top KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Active Schemes"
          value={activeSchemes}
          icon={icons.schemes}
          color="blue"
          accentColor="blue"
        />
        <StatCard
          label="Processing Payouts"
          value={processingCount}
          icon={icons.payout}
          color="yellow"
          accentColor="yellow"
        />
        <StatCard
          label="Pending Approvals"
          value={pendingApprovals}
          icon={icons.pending}
          color="red"
          accentColor="red"
        />
        <StatCard
          label="Net Payout / Total Calculated"
          value={fmtK(kpi.total_pool)}
          icon={icons.pool}
          trend={kpi.pool_growth}
          color="green"
          accentColor="green"
        />
      </div>

      {/* ── Alerts & Exceptions panel ── */}
      {!alertDismissed && (
        <div className="mb-6">
          {pendingApprovals > 0 ? (
            <AlertPanel
              variant="warning"
              title={`${pendingApprovals} payout batch(es) awaiting approval`}
              message="Review and approve pending batches to proceed with disbursement."
              onDismiss={() => setAlertDismissed(true)}
              action={
                <a href="/payout/disbursement" className="text-sm font-medium underline">
                  Go to Approvals →
                </a>
              }
            />
          ) : (
            // TODO: replace with real exception data from GET /api/dashboard/exceptions when available
            <AlertPanel
              variant="info"
              title="All systems operational"
              message="No pending exceptions or approval bottlenecks at this time."
              onDismiss={() => setAlertDismissed(true)}
            />
          )}
        </div>
      )}

      {/* ── Payout Pipeline Status ── */}
      <div className="mb-6">
        <MetricStrip metrics={pipelineMetrics} />
      </div>

      {/* ── Channel Performance Analysis ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <SectionCard
          sectionLabel="Performance"
          title="Channel Incentive Breakdown"
          subtitle="Self vs Override incentive by channel"
          className="lg:col-span-3"
        >
          {(d.channelBreakdown || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d.channelBreakdown} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6EAF2" vertical={false} />
                <XAxis dataKey="channel" tick={{ fontSize: 11, fill: '#667085' }} />
                <YAxis
                  tickFormatter={(v) => `₹${(v / 100_000).toFixed(0)}L`}
                  tick={{ fontSize: 11, fill: '#667085' }}
                />
                <Tooltip
                  formatter={(v, n) => [fmtK(v), n === 'self_incentive' ? 'Self Incentive' : 'Override Incentive']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E6EAF2', fontSize: '12px' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span className="text-xs text-ent-muted">{v}</span>}
                />
                <Bar dataKey="self_incentive"     name="Self"         stackId="a" fill="#1E40AF" radius={[0, 0, 0, 0]} />
                <Bar dataKey="override_incentive"  name="Override"     stackId="a" fill="#60A5FA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-ent-muted">No channel data available.</p>
          )}
        </SectionCard>

        <SectionCard
          sectionLabel="Product Mix"
          title="NB Premium Distribution"
          subtitle="By product"
          className="lg:col-span-2"
        >
          {(d.productMix || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={d.productMix}
                  dataKey="premium"
                  nameKey="product"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {(d.productMix || []).map((_, i) => (
                    <Cell key={i} fill={BLUE_SHADES[i % BLUE_SHADES.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [fmtK(v), 'Premium']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E6EAF2', fontSize: '12px' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span className="text-xs text-ent-muted">{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-ent-muted">No product data available.</p>
          )}
        </SectionCard>
      </div>

      {/* ── Bottom row: Top Agents · Active Programs · Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top Performers */}
        <SectionCard
          sectionLabel="Leaderboard"
          title="Top Performers"
          action={
            <a href="/incentive/leaderboard" className="text-xs font-medium text-action-blue hover:underline">
              View all →
            </a>
          }
          noPadding
        >
          <EnterpriseTable
            columns={agentColumns}
            data={d.topAgents || []}
            emptyMessage="No agent data available"
          />
        </SectionCard>

        {/* Active Programs */}
        <SectionCard
          sectionLabel="Schemes"
          title="Active Programs"
          action={
            <a href="/admin/plans" className="text-xs font-medium text-action-blue hover:underline">
              Manage →
            </a>
          }
          noPadding
        >
          <EnterpriseTable
            columns={programColumns}
            data={d.programs || []}
            emptyMessage="No active programs"
          />
        </SectionCard>

        {/* Recent Activity / Dispositions */}
        <SectionCard
          sectionLabel="Activity"
          title="Recent Dispositions"
          action={
            <a href="/payout/disbursement" className="text-xs font-medium text-action-blue hover:underline">
              View all →
            </a>
          }
        >
          {timelineItems.length > 0 ? (
            <TimelineList items={timelineItems} />
          ) : (
            <p className="py-8 text-center text-sm text-ent-muted">No recent activity.</p>
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}
