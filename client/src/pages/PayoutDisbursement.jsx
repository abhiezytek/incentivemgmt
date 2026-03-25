import { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { PageHeader, Button, Badge, LoadingSpinner, EmptyState } from '../components/ui';

const STAGES = [
  { key: 'DRAFT',     label: 'Calculated',       color: 'grey' },
  { key: 'APPROVED',  label: 'Approved',          color: 'blue' },
  { key: 'INITIATED', label: 'Payment Initiated', color: 'yellow' },
  { key: 'PAID',      label: 'Paid',              color: 'green' },
];

const STATUS_BADGE = {
  DRAFT:     'grey',
  APPROVED:  'blue',
  INITIATED: 'yellow',
  PAID:      'green',
};

export default function PayoutDisbursement() {
  const [agents, setAgents]           = useState([]);
  const [selected, setSelected]       = useState([]);
  const [stageCounts, setStageCounts] = useState({});
  const [filters, setFilters]         = useState({ programId: '', periodStart: '', status: '' });
  const [loading, setLoading]         = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [toast, setToast]             = useState(null);

  const API = import.meta.env.VITE_API_URL;

  const fetchAgents = async () => {
    setLoading(true);
    const filterParams = { ...filters };
    if (filterParams.periodStart && !filterParams.periodStart.includes('-', 5)) {
      filterParams.periodStart = `${filterParams.periodStart}-01`;
    }
    const p = new URLSearchParams(
      Object.fromEntries(Object.entries(filterParams).filter(([, v]) => v)),
    );
    try {
      const [agentsRes, summaryRes] = await Promise.all([
        fetch(`${API}/api/incentive-results?${p}`).then((r) => r.json()),
        fetch(`${API}/api/incentive-results/stage-summary?${p}`).then((r) => r.json()),
      ]);
      setAgents(Array.isArray(agentsRes) ? agentsRes : []);
      setStageCounts(summaryRes || {});
    } catch {
      setAgents([]);
      setStageCounts({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const bulkAction = async (endpoint, body, loadingKey, successMsg) => {
    setActionLoading(loadingKey);
    try {
      const res = await fetch(`${API}/api/incentive-results/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      showToast(successMsg(data));
      await fetchAgents();
      setSelected([]);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setActionLoading('');
    }
  };

  const exportToExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Payout');
    ws.columns = [
      { header: 'Rank', key: 'rank', width: 6 },
      { header: 'Agent Code', key: 'agent_code', width: 14 },
      { header: 'Agent Name', key: 'agent_name', width: 22 },
      { header: 'Channel', key: 'channel', width: 14 },
      { header: 'Region', key: 'region', width: 14 },
      { header: 'NB Incentive', key: 'nb_incentive', width: 14 },
      { header: 'Renewal Incentive', key: 'renewal_incentive', width: 16 },
      { header: 'Clawback', key: 'clawback_amount', width: 12 },
      { header: 'Net Self Incentive', key: 'net_self_incentive', width: 16 },
      { header: 'L1 Override', key: 'l1_override', width: 12 },
      { header: 'L2 Override', key: 'l2_override', width: 12 },
      { header: 'Total Incentive', key: 'total_incentive', width: 16 },
      { header: 'Gate Passed', key: 'gate_passed', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
    ];
    agents.forEach((a, i) => {
      ws.addRow({
        rank: i + 1, agent_code: a.agent_code, agent_name: a.agent_name,
        channel: a.channel_name || a.channel || '', region: a.region_name || a.region || '',
        nb_incentive: Number(a.nb_incentive || 0), renewal_incentive: Number(a.renewal_incentive || 0),
        clawback_amount: Number(a.clawback_amount || 0), net_self_incentive: Number(a.net_self_incentive || 0),
        l1_override: Number(a.l1_override || 0), l2_override: Number(a.l2_override || 0),
        total_incentive: Number(a.total_incentive || 0),
        gate_passed: a.persistency_gate_passed ? 'YES' : 'NO', status: a.status,
      });
    });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payout_${filters.periodStart || 'all'}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const toggleSelect = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const selectAll = () => setSelected(selected.length === agents.length ? [] : agents.map((a) => a.id));
  const totalAmount = agents.reduce((s, a) => s + Number(a.total_incentive || 0), 0);

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-5 py-3 text-sm font-medium shadow-lg ${
          toast.type === 'error' ? 'bg-error text-white' : 'bg-primary text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      <PageHeader
        title="Payout & Disbursement"
        subtitle="Review calculated payouts and process disbursements."
        actions={
          <Button variant="secondary" onClick={exportToExcel} disabled={agents.length === 0}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export to Excel
          </Button>
        }
      />

      {/* Pipeline Stage Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STAGES.map((s, idx) => {
          const info = stageCounts[s.key] || { count: 0, total: 0 };
          const isActive = filters.status === s.key;
          const isLast = idx === STAGES.length - 1;
          return (
            <div key={s.key} className={`relative rounded-lg border p-4 bg-surface transition-shadow
              ${isActive ? 'border-primary shadow-md ring-1 ring-primary' : 'border-border'}`}>
              <div className="flex items-center gap-2">
                <Badge variant={s.color}>{s.label}</Badge>
              </div>
              <p className="mt-2 text-2xl font-bold text-text-primary">{info.count}</p>
              <p className="text-xs text-text-muted">{fmt(info.total)}</p>
              {!isLast && (
                <span className="absolute top-1/2 -right-3 hidden -translate-y-1/2 text-text-muted sm:block">→</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-lg border border-border bg-surface p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Program ID</label>
            <input type="text" value={filters.programId}
              onChange={(e) => setFilters((f) => ({ ...f, programId: e.target.value }))}
              placeholder="Program ID"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Period</label>
            <input type="month" value={filters.periodStart}
              onChange={(e) => setFilters((f) => ({ ...f, periodStart: e.target.value }))}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Status</label>
            <select value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
              <option value="">All</option>
              {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <Button variant="primary" className="w-full" onClick={fetchAgents} loading={loading}>Search</Button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-primary p-3 text-white">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <Button size="sm" variant="ghost" className="!text-white hover:!bg-white/20"
            disabled={actionLoading === 'initiate'}
            onClick={() => bulkAction('initiate-payment', { ids: selected }, 'initiate', (d) => `🏦 ${d.count ?? 0} result(s) payment initiated`)}>
            {actionLoading === 'initiate' ? '…' : 'Initiate Payment'}
          </Button>
        </div>
      )}

      {/* Bulk program-wide actions */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Button size="sm" variant="secondary"
          disabled={actionLoading === 'approve' || !filters.programId || !filters.periodStart}
          onClick={() => {
            const ps = filters.periodStart.length === 7 ? `${filters.periodStart}-01` : filters.periodStart;
            bulkAction('bulk-approve', { programId: filters.programId, periodStart: ps }, 'approve', (d) => `✅ ${d.approvedCount ?? 0} result(s) approved`);
          }}>
          {actionLoading === 'approve' ? '…' : 'Bulk Approve'}
        </Button>
        <Button size="sm" variant="secondary"
          disabled={actionLoading === 'paid' || !filters.programId || !filters.periodStart}
          onClick={() => {
            const ps = filters.periodStart.length === 7 ? `${filters.periodStart}-01` : filters.periodStart;
            bulkAction('mark-paid', { programId: filters.programId, periodStart: ps }, 'paid', (d) => `💸 ${d.paid ?? d.paidCount ?? 0} result(s) marked paid`);
          }}>
          {actionLoading === 'paid' ? '…' : 'Mark Paid'}
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : agents.length === 0 ? (
        <EmptyState message="No results found. Adjust filters and search." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-primary text-white">
              <tr>
                <th className="px-3 py-3"><input type="checkbox" checked={agents.length > 0 && selected.length === agents.length} onChange={selectAll} /></th>
                <th className="px-3 py-3 font-semibold">#</th>
                <th className="px-3 py-3 font-semibold">Agent</th>
                <th className="px-3 py-3 font-semibold">Channel</th>
                <th className="px-3 py-3 font-semibold text-right">NB Incentive</th>
                <th className="px-3 py-3 font-semibold text-right">Renewal</th>
                <th className="px-3 py-3 font-semibold text-right">Clawback</th>
                <th className="px-3 py-3 font-semibold text-right">Total</th>
                <th className="px-3 py-3 font-semibold">Gate</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a, idx) => (
                <tr key={a.id ?? idx}
                  className={`border-t border-border transition-colors
                    ${selected.includes(a.id) ? 'bg-primary-50' : idx % 2 === 0 ? 'bg-surface' : 'bg-background'}
                    hover:bg-primary-50`}>
                  <td className="px-3 py-3"><input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggleSelect(a.id)} /></td>
                  <td className="px-3 py-3 text-text-muted">{idx + 1}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-text-primary">{a.agent_name || '—'}</div>
                    <div className="text-xs text-text-muted">{a.agent_code}</div>
                  </td>
                  <td className="px-3 py-3 text-text-secondary">{a.channel_name || a.channel || '—'}</td>
                  <td className="px-3 py-3 text-right text-text-primary">{fmt(a.nb_incentive)}</td>
                  <td className="px-3 py-3 text-right text-text-primary">{fmt(a.renewal_incentive)}</td>
                  <td className="px-3 py-3 text-right text-error">{fmt(a.clawback_amount)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-text-primary">{fmt(a.total_incentive)}</td>
                  <td className="px-3 py-3"><Badge variant={a.persistency_gate_passed ? 'green' : 'red'}>{a.persistency_gate_passed ? 'YES' : 'NO'}</Badge></td>
                  <td className="px-3 py-3"><Badge variant={STATUS_BADGE[a.status] || 'grey'}>{a.status}</Badge></td>
                  <td className="px-3 py-3"><SingleActionButton agent={a} onDone={fetchAgents} API={API} /></td>
                </tr>
              ))}
            </tbody>
            {/* Footer totals */}
            <tfoot>
              <tr className="bg-primary text-white font-semibold">
                <td colSpan={7} className="px-3 py-3 text-right">Total</td>
                <td className="px-3 py-3 text-right">{fmt(totalAmount)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function SingleActionButton({ agent, onDone, API }) {
  const next = {
    DRAFT:     { label: 'Approve',  endpoint: `${agent.id}/approve`, body: {} },
    APPROVED:  { label: 'Initiate', endpoint: 'initiate-payment',    body: { ids: [agent.id] } },
    INITIATED: { label: 'Mark Paid', endpoint: 'mark-paid',          body: { ids: [agent.id] } },
    PAID: null,
  }[agent.status];

  if (!next) return <span className="text-xs text-text-muted">—</span>;

  const handle = async () => {
    await fetch(`${API}/api/incentive-results/${next.endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next.body),
    });
    onDone();
  };

  return <Button size="sm" variant="secondary" onClick={handle}>{next.label}</Button>;
}
