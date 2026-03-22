import { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';

const STAGES = [
  { key: 'DRAFT',     label: 'Calculated',       icon: '🧮', color: 'slate' },
  { key: 'APPROVED',  label: 'Approved',          icon: '✅', color: 'blue' },
  { key: 'INITIATED', label: 'Payment Initiated', icon: '🏦', color: 'yellow' },
  { key: 'PAID',      label: 'Paid',              icon: '💸', color: 'green' },
];

const STATUS_STYLE = {
  DRAFT:     'bg-slate-100 text-slate-600',
  APPROVED:  'bg-blue-100 text-blue-700',
  INITIATED: 'bg-yellow-100 text-yellow-700',
  PAID:      'bg-green-100 text-green-700',
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
    const p = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
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
        rank: i + 1,
        agent_code: a.agent_code,
        agent_name: a.agent_name,
        channel: a.channel_name || a.channel || '',
        region: a.region_name || a.region || '',
        nb_incentive: Number(a.nb_incentive || 0),
        renewal_incentive: Number(a.renewal_incentive || 0),
        clawback_amount: Number(a.clawback_amount || 0),
        net_self_incentive: Number(a.net_self_incentive || 0),
        l1_override: Number(a.l1_override || 0),
        l2_override: Number(a.l2_override || 0),
        total_incentive: Number(a.total_incentive || 0),
        gate_passed: a.persistency_gate_passed ? 'YES' : 'NO',
        status: a.status,
      });
    });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payout_${filters.periodStart || 'all'}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n) =>
    `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const toggleSelect = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const selectAll = () =>
    setSelected(selected.length === agents.length ? [] : agents.map((a) => a.id));

  return (
    <div className="font-[Inter]">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-5 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-teal-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Payout &amp; Disbursement
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review calculated payouts and process disbursements.
          </p>
        </div>
        <button
          type="button"
          onClick={exportToExcel}
          disabled={agents.length === 0}
          className="rounded-md border border-teal-600 px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 disabled:opacity-40"
        >
          📥 Export to Excel
        </button>
      </div>

      {/* Pipeline Stage Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STAGES.map((s, idx) => {
          const info = stageCounts[s.key] || { count: 0, total: 0 };
          const isLast = idx === STAGES.length - 1;
          return (
            <div
              key={s.key}
              className="relative rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{s.icon}</span>
                <span className="text-sm font-medium text-gray-600">
                  {s.label}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-800">
                {info.count}
              </p>
              <p className="text-xs text-gray-500">{fmt(info.total)}</p>
              {!isLast && (
                <span className="absolute top-1/2 -right-3 hidden -translate-y-1/2 text-gray-300 sm:block">
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Program ID
          </label>
          <input
            type="text"
            value={filters.programId}
            onChange={(e) =>
              setFilters((f) => ({ ...f, programId: e.target.value }))
            }
            placeholder="Program ID"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Period
          </label>
          <input
            type="month"
            value={filters.periodStart}
            onChange={(e) =>
              setFilters((f) => ({ ...f, periodStart: e.target.value }))
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value }))
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          >
            <option value="">All</option>
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={fetchAgents}
            disabled={loading}
            className="w-full rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Search'}
          </button>
        </div>
      </div>

      {/* Bulk Action Buttons */}
      <div className="mb-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={actionLoading === 'approve' || !filters.programId || !filters.periodStart}
          onClick={() =>
            bulkAction(
              'bulk-approve',
              { programId: filters.programId, periodStart: filters.periodStart },
              'approve',
              (d) => `✅ ${d.approvedCount ?? 0} result(s) approved`,
            )
          }
          className="rounded-md border border-blue-400 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40"
        >
          {actionLoading === 'approve' ? '…' : '✅ Bulk Approve'}
        </button>
        <button
          type="button"
          disabled={actionLoading === 'paid' || !filters.programId || !filters.periodStart}
          onClick={() =>
            bulkAction(
              'mark-paid',
              { programId: filters.programId, periodStart: filters.periodStart },
              'paid',
              (d) => `💸 ${d.paidCount ?? 0} result(s) marked paid`,
            )
          }
          className="rounded-md border border-green-400 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-40"
        >
          {actionLoading === 'paid' ? '…' : '💸 Mark Paid'}
        </button>
        {selected.length > 0 && (
          <span className="self-center text-xs text-gray-500">
            {selected.length} selected
          </span>
        )}
      </div>

      {/* Agent Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-teal-600 text-white">
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={agents.length > 0 && selected.length === agents.length}
                  onChange={selectAll}
                />
              </th>
              <th className="px-3 py-3 font-medium">#</th>
              <th className="px-3 py-3 font-medium">Agent</th>
              <th className="px-3 py-3 font-medium">Channel</th>
              <th className="px-3 py-3 font-medium text-right">NB Incentive</th>
              <th className="px-3 py-3 font-medium text-right">Renewal</th>
              <th className="px-3 py-3 font-medium text-right">Clawback</th>
              <th className="px-3 py-3 font-medium text-right">Total</th>
              <th className="px-3 py-3 font-medium">Gate</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {agents.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-gray-400">
                  {loading ? 'Loading…' : 'No results found. Adjust filters and search.'}
                </td>
              </tr>
            ) : (
              agents.map((a, idx) => (
                <tr
                  key={a.id ?? idx}
                  className={selected.includes(a.id) ? 'bg-teal-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(a.id)}
                      onChange={() => toggleSelect(a.id)}
                    />
                  </td>
                  <td className="px-3 py-3 text-gray-500">{idx + 1}</td>
                  <td className="px-3 py-3 font-medium text-gray-800">
                    <div>{a.agent_name || '—'}</div>
                    <div className="text-xs text-gray-400">{a.agent_code}</div>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{a.channel_name || a.channel || '—'}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{fmt(a.nb_incentive)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{fmt(a.renewal_incentive)}</td>
                  <td className="px-3 py-3 text-right text-red-600">{fmt(a.clawback_amount)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-900">{fmt(a.total_incentive)}</td>
                  <td className="px-3 py-3">
                    {a.persistency_gate_passed ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">YES</span>
                    ) : (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">NO</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[a.status] || 'bg-gray-100 text-gray-600'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <SingleActionButton agent={a} onDone={fetchAgents} API={API} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SingleActionButton({ agent, onDone, API }) {
  const next = {
    DRAFT: {
      label: 'Approve',
      endpoint: `${agent.id}/approve`,
      style: 'text-blue-600 border-blue-300 hover:bg-blue-50',
    },
    APPROVED: {
      label: 'Mark Paid',
      endpoint: 'mark-paid',
      style: 'text-green-700 border-green-300 hover:bg-green-50',
    },
    PAID: null,
  }[agent.status];

  if (!next) return <span className="text-xs text-gray-400">—</span>;

  const handle = async () => {
    await fetch(`${API}/api/incentive-results/${next.endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        next.endpoint.includes('/approve')
          ? {}
          : { programId: agent.program_id, periodStart: agent.period_start },
      ),
    });
    onDone();
  };

  return (
    <button
      type="button"
      onClick={handle}
      className={`rounded border px-2 py-1 text-xs font-medium ${next.style}`}
    >
      {next.label}
    </button>
  );
}
