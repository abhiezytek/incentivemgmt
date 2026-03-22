import { useState, useEffect } from 'react';

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

  const STATUS_COLORS = {
    DRAFT: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-blue-100 text-blue-700',
    PAID: 'bg-green-100 text-green-700',
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="font-[Inter]">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Incentive Breakdown
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Per-agent incentive breakdown with filters and detail view.
        </p>
      </div>

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
            placeholder="Channel ID"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          >
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={fetchResults}
            disabled={loading}
            className="w-full rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Search'}
          </button>
        </div>
      </div>

      {/* ── Results Table ──────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-teal-600 text-white">
              <th className="px-3 py-3 font-medium">Agent Code</th>
              <th className="px-3 py-3 font-medium">Agent Name</th>
              <th className="px-3 py-3 font-medium">Channel</th>
              <th className="px-3 py-3 font-medium text-right">NB Incentive</th>
              <th className="px-3 py-3 font-medium text-right">Renewal</th>
              <th className="px-3 py-3 font-medium text-right">Persistency</th>
              <th className="px-3 py-3 font-medium text-right">Clawback</th>
              <th className="px-3 py-3 font-medium text-right">Net Self</th>
              <th className="px-3 py-3 font-medium text-right">L1 Override</th>
              <th className="px-3 py-3 font-medium text-right">L2 Override</th>
              <th className="px-3 py-3 font-medium text-right">Total</th>
              <th className="px-3 py-3 font-medium text-center">Gate</th>
              <th className="px-3 py-3 font-medium text-center">Status</th>
              <th className="px-3 py-3 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {results.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-center text-gray-400">
                  {loading ? 'Loading…' : 'No results found. Adjust filters and search.'}
                </td>
              </tr>
            ) : (
              results.map((r, idx) => (
                <tr
                  key={r.id ?? idx}
                  className={`cursor-pointer transition hover:bg-teal-50 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                  }`}
                  onClick={() => setSelected(r)}
                >
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {r.agent_code}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {r.agent_name ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {r.channel_name ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {fmt(r.nb_incentive)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {fmt(r.renewal_incentive)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {fmt(r.persistency_bonus)}
                  </td>
                  <td className="px-3 py-2 text-right text-red-600">
                    {r.clawback_amount ? fmt(-Math.abs(r.clawback_amount)) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">
                    {fmt(r.net_self_incentive)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {fmt(r.l1_override)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {fmt(r.l2_override)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">
                    {fmt(r.total_incentive)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.persistency_gate_passed ? (
                      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        ✓ Pass
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        ✗ Fail
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(r);
                      }}
                      className="mr-1 rounded bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100"
                    >
                      View
                    </button>
                    {r.status === 'DRAFT' && (
                      <ApproveButton id={r.id} onDone={fetchResults} />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Detail Modal ───────────────────────────────────────────────── */}
      {selected && (
        <BreakdownModal
          data={selected}
          onClose={() => setSelected(null)}
          fmt={fmt}
        />
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

  return (
    <button
      type="button"
      onClick={approve}
      className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
    >
      Approve
    </button>
  );
}

function BreakdownModal({ data, onClose, fmt }) {
  const breakdown = data.calc_breakdown || {};
  const products = breakdown.products || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <h2 className="mb-1 text-lg font-semibold text-gray-800">
          Breakdown — {data.agent_code}
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          {data.agent_name ?? ''} · {data.program_name ?? `Program ${data.program_id}`} ·{' '}
          {data.period_start?.slice(0, 7)}
        </p>

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'NB Incentive', value: data.nb_incentive },
            { label: 'Renewal', value: data.renewal_incentive },
            { label: 'Persistency Bonus', value: data.persistency_bonus },
            { label: 'Clawback', value: data.clawback_amount, negative: true },
            { label: 'Net Self', value: data.net_self_incentive },
            { label: 'L1 Override', value: data.l1_override },
            { label: 'L2 Override', value: data.l2_override },
            { label: 'Total Incentive', value: data.total_incentive, highlight: true },
          ].map(({ label, value, negative, highlight }) => (
            <div
              key={label}
              className={`rounded-lg border p-3 ${
                highlight ? 'border-teal-200 bg-teal-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <p className="text-xs text-gray-500">{label}</p>
              <p
                className={`mt-1 text-base font-semibold ${
                  negative
                    ? 'text-red-600'
                    : highlight
                      ? 'text-teal-700'
                      : 'text-gray-800'
                }`}
              >
                {negative && value ? fmt(-Math.abs(value)) : fmt(value)}
              </p>
            </div>
          ))}
        </div>

        {/* Product-wise detail table */}
        {products.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-teal-600 text-white">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium text-right">Premium</th>
                  <th className="px-3 py-2 font-medium text-right">Rate</th>
                  <th className="px-3 py-2 font-medium text-right">Incentive</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Policy Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    <td className="px-3 py-1.5 font-medium text-gray-800">
                      {p.product_code || '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right text-gray-700">
                      {fmt(p.premium)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-gray-700">
                      {p.rate != null ? `${Number(p.rate).toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium text-gray-800">
                      {fmt(p.incentive)}
                    </td>
                    <td className="px-3 py-1.5 text-gray-600">
                      {p.transaction_type || '—'}
                    </td>
                    <td className="px-3 py-1.5 text-gray-600">
                      {p.policy_year || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              No product-wise breakdown available.
            </p>
            {Object.keys(breakdown).length > 0 && (
              <pre className="mt-3 max-h-60 overflow-auto rounded bg-white p-3 text-xs text-gray-600">
                {JSON.stringify(breakdown, null, 2)}
              </pre>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
