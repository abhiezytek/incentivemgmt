import { useState, useEffect } from 'react';
import { PageHeader, Button, Badge, StatCard, LoadingSpinner, EmptyState } from '../components/ui';

export default function IncentiveBreakdown() {
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({ programId: '', period: '', channel: '', status: '' });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchResults = async () => {
    setLoading(true);
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    );
    if (filters.period) {
      const [year, month] = filters.period.split('-');
      params.set('periodStart', `${year}-${month}-01`);
      params.delete('period');
    }
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/incentive-results?${params}`
      );
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (n) =>
    n != null
      ? `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
      : '—';

  const STATUS_BADGE = { DRAFT: 'yellow', APPROVED: 'blue', PAID: 'green' };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const totalPool = results.reduce((s, r) => s + Number(r.total_incentive || 0), 0);
  const gatePassed = results.filter(r => r.persistency_gate_passed).length;
  const gateFailed = results.filter(r => !r.persistency_gate_passed).length;

  return (
    <div>
      <PageHeader
        title="Incentive Breakdown"
        subtitle="Per-agent incentive breakdown with filters and detail view."
      />

      {/* ── Filters ── */}
      <div className="mb-6 rounded-lg border border-border bg-surface p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Program ID</label>
            <input
              type="text"
              value={filters.programId}
              onChange={(e) => handleFilterChange('programId', e.target.value)}
              placeholder="Program ID"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Period</label>
            <input
              type="month"
              value={filters.period}
              onChange={(e) => handleFilterChange('period', e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Channel</label>
            <input
              type="text"
              value={filters.channel}
              onChange={(e) => handleFilterChange('channel', e.target.value)}
              placeholder="Channel ID"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button variant="primary" className="w-full" onClick={fetchResults} loading={loading}>
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* ── Summary Strip ── */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Pool" value={fmt(totalPool)} color="blue" />
        <StatCard label="Agents" value={results.length} color="grey" />
        <StatCard label="Gate Passed" value={gatePassed} color="green" />
        <StatCard label="Gate Failed" value={gateFailed} color="red" />
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : results.length === 0 ? (
        <EmptyState message="No results found. Adjust filters and search." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-primary text-white">
              <tr>
                <th className="px-3 py-3 font-semibold">Agent</th>
                <th className="px-3 py-3 font-semibold">Channel</th>
                <th className="px-3 py-3 font-semibold text-right">NB Incentive</th>
                <th className="px-3 py-3 font-semibold text-right">Renewal</th>
                <th className="px-3 py-3 font-semibold text-right">Clawback</th>
                <th className="px-3 py-3 font-semibold text-right">Net Self</th>
                <th className="px-3 py-3 font-semibold text-right">Override</th>
                <th className="px-3 py-3 font-semibold text-right">Total</th>
                <th className="px-3 py-3 font-semibold text-center">Gate</th>
                <th className="px-3 py-3 font-semibold text-center">Status</th>
                <th className="px-3 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr
                  key={r.id ?? idx}
                  className={`border-t border-border cursor-pointer transition-colors
                    ${idx % 2 === 0 ? 'bg-surface' : 'bg-background'}
                    hover:bg-primary-50`}
                  onClick={() => setSelected(r)}
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-text-primary">{r.agent_name ?? '—'}</div>
                    <div className="text-xs text-text-muted">{r.agent_code}</div>
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{r.channel_name ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-text-primary">{fmt(r.nb_incentive)}</td>
                  <td className="px-3 py-2 text-right text-text-primary">{fmt(r.renewal_incentive)}</td>
                  <td className="px-3 py-2 text-right text-error">
                    {r.clawback_amount ? fmt(-Math.abs(r.clawback_amount)) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-text-primary">{fmt(r.net_self_incentive)}</td>
                  <td className="px-3 py-2 text-right text-text-primary">
                    {fmt(Number(r.l1_override || 0) + Number(r.l2_override || 0))}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-text-primary">{fmt(r.total_incentive)}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant={r.persistency_gate_passed ? 'green' : 'red'}>
                      {r.persistency_gate_passed ? '✓ Pass' : '✗ Fail'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant={STATUS_BADGE[r.status] || 'grey'}>{r.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {r.status === 'DRAFT' && <ApproveButton id={r.id} onDone={fetchResults} />}
                      <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>Detail</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selected && (
        <BreakdownModal data={selected} onClose={() => setSelected(null)} fmt={fmt} />
      )}
    </div>
  );
}

function ApproveButton({ id, onDone }) {
  const approve = async (e) => {
    e.stopPropagation();
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL}/api/incentive-results/${id}/approve`,
        { method: 'POST' }
      );
      onDone();
    } catch {
      // silently fail — user can retry
    }
  };

  return <Button size="sm" variant="primary" onClick={approve}>Approve</Button>;
}

function BreakdownModal({ data, onClose, fmt }) {
  const breakdown = data.calc_breakdown || {};
  const products = breakdown.products || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="absolute right-4 top-4 text-text-muted hover:text-text-primary">✕</button>

        <h2 className="mb-1 text-lg font-bold text-text-primary">
          {data.agent_name ?? data.agent_code}
        </h2>
        <p className="mb-4 text-sm text-text-secondary">
          {data.agent_code} · {data.program_name ?? `Program ${data.program_id}`} · {data.period_start?.slice(0, 7)}
        </p>

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-primary-50 p-3">
            <p className="text-xs text-text-muted">Net Self</p>
            <p className="mt-1 text-lg font-bold text-primary">{fmt(data.net_self_incentive)}</p>
          </div>
          <div className="rounded-lg border border-border bg-primary-50 p-3">
            <p className="text-xs text-text-muted">Override</p>
            <p className="mt-1 text-lg font-bold text-primary">{fmt(Number(data.l1_override || 0) + Number(data.l2_override || 0))}</p>
          </div>
          <div className="rounded-lg border border-primary bg-primary-50 p-3">
            <p className="text-xs text-text-muted">Total</p>
            <p className="mt-1 text-lg font-bold text-primary">{fmt(data.total_incentive)}</p>
          </div>
        </div>

        {/* Product breakdown table */}
        {products.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-primary text-white">
                <tr>
                  <th className="px-3 py-2 font-semibold">Product</th>
                  <th className="px-3 py-2 font-semibold text-right">Premium</th>
                  <th className="px-3 py-2 font-semibold text-right">Rate</th>
                  <th className="px-3 py-2 font-semibold text-right">Incentive</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, idx) => (
                  <tr key={idx} className={`border-t border-border ${idx % 2 === 0 ? 'bg-surface' : 'bg-background'}`}>
                    <td className="px-3 py-1.5 font-medium text-text-primary">{p.product_code || '—'}</td>
                    <td className="px-3 py-1.5 text-right text-text-secondary">{fmt(p.premium)}</td>
                    <td className="px-3 py-1.5 text-right text-text-secondary">{p.rate != null ? `${Number(p.rate).toFixed(2)}%` : '—'}</td>
                    <td className="px-3 py-1.5 text-right font-medium text-text-primary">{fmt(p.incentive)}</td>
                    <td className="px-3 py-1.5 text-text-secondary">{p.transaction_type || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No product-wise breakdown available." />
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
