import { useState, useEffect, useCallback, Fragment } from 'react';

const API = import.meta.env.VITE_API_URL || '';
const REFRESH_INTERVAL_MS = 30_000;

/* ── helpers ───────────────────────────────────────────── */

const fmtTs = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const statusColor = (s) => {
  if (!s) return 'bg-gray-100 text-gray-600';
  const u = s.toUpperCase();
  if (u === 'SUCCESS' || u === 'OK')   return 'bg-emerald-100 text-emerald-700';
  if (u === 'PARTIAL')                 return 'bg-amber-100 text-amber-700';
  if (u === 'FAILED' || u === 'ERROR') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
};

const badge = (s) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(s)}`}>
    {s || 'UNKNOWN'}
  </span>
);

/* ── main component ────────────────────────────────────── */

export default function IntegrationDashboard() {
  const [status, setStatus]           = useState(null);
  const [fileLog, setFileLog]         = useState([]);
  const [auditLog, setAuditLog]       = useState([]);
  const [failedRecs, setFailedRecs]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [auditSource, setAuditSource] = useState('');
  const [triggerMsg, setTriggerMsg]   = useState('');

  /* ── data fetching ──────────────────────────────────── */

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, fRes, aRes, rRes] = await Promise.all([
        fetch(`${API}/api/integration/status`),
        fetch(`${API}/api/integration/file-log?limit=20`),
        fetch(`${API}/api/integration/audit-log?limit=50${auditSource ? `&source=${auditSource}` : ''}`),
        fetch(`${API}/api/integration/failed-records?table=stg_policy_transactions&limit=50`),
      ]);
      setStatus(await sRes.json());
      setFileLog(await fRes.json());
      setAuditLog(await aRes.json());
      setFailedRecs(await rRes.json());
    } catch (e) {
      console.error('Integration fetch error', e);
    }
    setLoading(false);
  }, [auditSource]);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [fetchAll]);

  /* ── triggers ───────────────────────────────────────── */

  const trigger = async (path, label) => {
    try {
      setTriggerMsg(`${label}…`);
      const r = await fetch(`${API}/api/integration/trigger/${path}`, { method: 'POST' });
      const j = await r.json();
      setTriggerMsg(j.message || j.error || 'Done');
      setTimeout(() => { setTriggerMsg(''); fetchAll(); }, 3000);
    } catch {
      setTriggerMsg('Network error');
    }
  };

  const skipRecord = async (id) => {
    try {
      await fetch(`${API}/api/integration/failed-records/${id}/skip?table=stg_policy_transactions`, { method: 'POST' });
      fetchAll();
    } catch (e) {
      console.error('Skip error', e);
    }
  };

  /* ── render ─────────────────────────────────────────── */

  if (loading) return <div className="flex h-64 items-center justify-center text-gray-400">Loading integration data…</div>;

  const s = status || {};

  return (
    <div className="space-y-8 font-[Inter]">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integration Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Real-time integration health &amp; monitoring</p>
        </div>
        <span className="text-xs text-gray-400">Auto-refreshes every 30 s</span>
      </div>

      {/* ── 1. STATUS CARDS ──────────────────────────── */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Life Asia SFTP */}
        <StatusCard
          title="Life Asia SFTP"
          icon="📂"
          status={s.lifeAsia?.status}
          rows={[
            ['Last file', s.lifeAsia?.lastFile || '—'],
            ['Records', s.lifeAsia?.recordsProcessed],
            ['Received', fmtTs(s.lifeAsia?.lastReceived)],
          ]}
        />
        {/* KGILS Penta API */}
        <StatusCard
          title="KGILS Penta API"
          icon="🔗"
          status={s.penta?.status}
          rows={[
            ['Last call', fmtTs(s.penta?.lastCall)],
            ['Duration', s.penta?.durationMs != null ? `${s.penta.durationMs} ms` : '—'],
            ['Status', s.penta?.status || '—'],
          ]}
        />
        {/* Hierarchy API */}
        <StatusCard
          title="Hierarchy API"
          icon="🏢"
          status={s.hierarchy?.status}
          rows={[
            ['Last sync', fmtTs(s.hierarchy?.lastSync || s.hierarchy?.lastCompleted)],
            ['Agents synced', s.hierarchy?.agentsSynced],
            ['Status', s.hierarchy?.status || '—'],
          ]}
        />
        {/* Outbound Files */}
        <StatusCard
          title="Outbound Files"
          icon="📤"
          status={s.outbound?.status}
          rows={[
            ['Last file', s.outbound?.lastFile || '—'],
            ['Target', s.outbound?.targetSystem || '—'],
            ['Records', s.outbound?.recordCount],
            ['Generated', fmtTs(s.outbound?.generatedAt)],
          ]}
        />
      </section>

      {/* ── 5. MANUAL TRIGGERS ───────────────────────── */}
      <section className="flex flex-wrap items-center gap-3">
        <TriggerBtn label="Trigger SFTP Poll" onClick={() => trigger('sftp-poll', 'Triggering SFTP poll')} />
        <TriggerBtn label="Trigger Hierarchy Sync" onClick={() => trigger('hierarchy-sync', 'Triggering hierarchy sync')} />
        <TriggerBtn label="Reprocess Failed Records" onClick={() => trigger('reprocess', 'Reprocessing')} />
        {triggerMsg && <span className="ml-2 text-sm text-teal-700">{triggerMsg}</span>}
      </section>

      {/* ── 2. FILE PROCESSING LOG ───────────────────── */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Recent File Processing</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">File Name</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">OK</th>
                <th className="px-4 py-3 text-right">Failed</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fileLog.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No file processing records</td></tr>
              )}
              {fileLog.map((f) => (
                <Fragment key={f.id}>
                  <tr
                    key={f.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedRow(expandedRow === f.id ? null : f.id)}
                  >
                    <td className="px-4 py-2 font-medium text-gray-900">{f.file_name}</td>
                    <td className="px-4 py-2">{f.source_system}</td>
                    <td className="px-4 py-2">{f.file_type}</td>
                    <td className="px-4 py-2 text-right">{f.total_rows ?? '—'}</td>
                    <td className="px-4 py-2 text-right">{f.valid_rows ?? f.inserted_rows ?? '—'}</td>
                    <td className="px-4 py-2 text-right">{f.error_rows ?? '—'}</td>
                    <td className="px-4 py-2">{badge(f.status)}</td>
                    <td className="px-4 py-2 text-gray-500">{fmtTs(f.completed_at || f.started_at)}</td>
                  </tr>
                  {expandedRow === f.id && f.error_message && (
                    <tr key={`${f.id}-err`}>
                      <td colSpan={8} className="bg-red-50 px-6 py-3 text-xs text-red-700">
                        <strong>Error:</strong> {f.error_message}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 3. API CALL LOG ──────────────────────────── */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">API Call Log</h2>
          <select
            value={auditSource}
            onChange={(e) => setAuditSource(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="">All sources</option>
            <option value="PENTA">Penta</option>
            <option value="LIFEASIA">Life Asia</option>
            <option value="HIERARCHY">Hierarchy</option>
          </select>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3 text-right">Records</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Duration</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditLog.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No audit records</td></tr>
              )}
              {auditLog.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{a.source_system}</td>
                  <td className="px-4 py-2 font-mono text-xs">{a.endpoint}</td>
                  <td className="px-4 py-2 text-right">{a.records_processed ?? a.records_received ?? '—'}</td>
                  <td className="px-4 py-2">{badge(a.status)}</td>
                  <td className="px-4 py-2 text-right">{a.duration_ms != null ? `${a.duration_ms} ms` : '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{fmtTs(a.called_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 4. FAILED RECORDS ────────────────────────── */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Failed Staging Records
          {failedRecs.length > 0 && (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {failedRecs.length}
            </span>
          )}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Policy #</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Row</th>
                <th className="px-4 py-3">Error</th>
                <th className="px-4 py-3">Loaded</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {failedRecs.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No failed records 🎉</td></tr>
              )}
              {failedRecs.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{r.id}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.policy_number || '—'}</td>
                  <td className="px-4 py-2">{r.agent_code || '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.batch_id || '—'}</td>
                  <td className="px-4 py-2">{r.row_number ?? '—'}</td>
                  <td className="px-4 py-2 max-w-xs truncate text-red-600" title={r.stg_error}>{r.stg_error || '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{fmtTs(r.stg_loaded_at)}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => skipRecord(r.id)}
                      className="rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
                    >
                      Skip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ── sub-components ──────────────────────────────────── */

function StatusCard({ title, icon, status, rows }) {
  const ring =
    status === 'SUCCESS' || status === 'OK'
      ? 'border-l-emerald-500'
      : status === 'FAILED' || status === 'ERROR'
        ? 'border-l-red-500'
        : status === 'PARTIAL'
          ? 'border-l-amber-500'
          : 'border-l-gray-300';

  return (
    <div className={`rounded-lg border border-gray-200 border-l-4 ${ring} bg-white p-5 shadow-sm`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <span className="ml-auto">{badge(status)}</span>
      </div>
      <dl className="space-y-1 text-xs text-gray-600">
        {rows.map(([label, value], i) => (
          <div key={i} className="flex justify-between">
            <dt className="text-gray-400">{label}</dt>
            <dd className="font-medium text-gray-700">{value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TriggerBtn({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
    >
      {label}
    </button>
  );
}
