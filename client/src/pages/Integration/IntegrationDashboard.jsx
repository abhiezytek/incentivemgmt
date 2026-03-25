import { useState, useEffect, useCallback, Fragment } from 'react';
import { PageHeader, Button, Badge, Card, LoadingSpinner, EmptyState } from '../../components/ui';

const API = import.meta.env.VITE_API_URL || '';
const REFRESH_INTERVAL_MS = 30_000;

/* ── helpers ───────────────────────────────────────────── */

const fmtTs = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const statusBadge = (s) => {
  if (!s) return 'grey';
  const u = s.toUpperCase();
  if (u === 'SUCCESS' || u === 'OK') return 'green';
  if (u === 'PARTIAL') return 'yellow';
  if (u === 'FAILED' || u === 'ERROR') return 'red';
  return 'grey';
};

const healthDot = (s) => {
  if (!s) return 'bg-gray-400';
  const u = s.toUpperCase();
  if (u === 'SUCCESS' || u === 'OK') return 'bg-success';
  if (u === 'FAILED' || u === 'ERROR') return 'bg-error';
  return 'bg-gray-400';
};

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

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );

  const s = status || {};

  return (
    <div className="space-y-8">
      <PageHeader
        title="Integration Dashboard"
        subtitle="Real-time integration health & monitoring"
        actions={<span className="text-xs text-text-muted">Auto-refreshes every 30s</span>}
      />

      {/* ── 1. SYSTEM HEALTH CARDS ── */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <HealthCard title="Life Asia SFTP" status={s.lifeAsia?.status} rows={[
          ['Last file', s.lifeAsia?.lastFile || '—'],
          ['Records', s.lifeAsia?.recordsProcessed],
          ['Received', fmtTs(s.lifeAsia?.lastReceived)],
        ]} />
        <HealthCard title="KGILS Penta API" status={s.penta?.status} rows={[
          ['Last call', fmtTs(s.penta?.lastCall)],
          ['Duration', s.penta?.durationMs != null ? `${s.penta.durationMs} ms` : '—'],
          ['Status', s.penta?.status || '—'],
        ]} />
        <HealthCard title="Hierarchy API" status={s.hierarchy?.status} rows={[
          ['Last sync', fmtTs(s.hierarchy?.lastSync || s.hierarchy?.lastCompleted)],
          ['Agents synced', s.hierarchy?.agentsSynced],
          ['Status', s.hierarchy?.status || '—'],
        ]} />
        <HealthCard title="Outbound Files" status={s.outbound?.status} rows={[
          ['Last file', s.outbound?.lastFile || '—'],
          ['Target', s.outbound?.targetSystem || '—'],
          ['Records', s.outbound?.recordCount],
          ['Generated', fmtTs(s.outbound?.generatedAt)],
        ]} />
      </section>

      {/* ── MANUAL TRIGGERS ── */}
      <section className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => trigger('sftp-poll', 'Triggering SFTP poll')}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
          Trigger SFTP Poll
        </Button>
        <Button variant="secondary" onClick={() => trigger('hierarchy-sync', 'Triggering hierarchy sync')}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
          Trigger Hierarchy Sync
        </Button>
        <Button variant="secondary" onClick={() => trigger('reprocess', 'Reprocessing')}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" /></svg>
          Reprocess Failed
        </Button>
        {triggerMsg && <span className="ml-2 text-sm text-primary font-medium">{triggerMsg}</span>}
      </section>

      {/* ── 2. FILE PROCESSING LOG ── */}
      <Card title="Recent File Processing">
        {fileLog.length === 0 ? (
          <EmptyState message="No file processing records" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-primary text-white text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-semibold">File Name</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  <th className="px-4 py-3 font-semibold text-right">OK</th>
                  <th className="px-4 py-3 font-semibold text-right">Failed</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {fileLog.map((f, idx) => (
                  <Fragment key={f.id}>
                    <tr
                      className={`cursor-pointer border-t border-border transition-colors
                        ${idx % 2 === 0 ? 'bg-surface' : 'bg-background'} hover:bg-primary-50`}
                      onClick={() => setExpandedRow(expandedRow === f.id ? null : f.id)}
                    >
                      <td className="px-4 py-2 font-medium text-text-primary">{f.file_name}</td>
                      <td className="px-4 py-2 text-text-secondary">{f.source_system}</td>
                      <td className="px-4 py-2 text-text-secondary">{f.file_type}</td>
                      <td className="px-4 py-2 text-right text-text-primary">{f.total_rows ?? '—'}</td>
                      <td className="px-4 py-2 text-right text-text-primary">{f.valid_rows ?? f.inserted_rows ?? '—'}</td>
                      <td className="px-4 py-2 text-right text-text-primary">{f.error_rows ?? '—'}</td>
                      <td className="px-4 py-2"><Badge variant={statusBadge(f.status)}>{f.status || 'UNKNOWN'}</Badge></td>
                      <td className="px-4 py-2 text-text-muted">{fmtTs(f.completed_at || f.started_at)}</td>
                    </tr>
                    {expandedRow === f.id && f.error_message && (
                      <tr key={`${f.id}-err`}>
                        <td colSpan={8} className="bg-red-50 px-6 py-3 text-xs text-error">
                          <strong>Error:</strong> {f.error_message}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── 3. API CALL LOG ── */}
      <Card title="API Call Log" action={
        <select value={auditSource} onChange={(e) => setAuditSource(e.target.value)}
          className="rounded-lg border border-border px-2 py-1 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none">
          <option value="">All sources</option>
          <option value="PENTA">Penta</option>
          <option value="LIFEASIA">Life Asia</option>
          <option value="HIERARCHY">Hierarchy</option>
        </select>
      }>
        {auditLog.length === 0 ? (
          <EmptyState message="No audit records" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-primary text-white text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Endpoint</th>
                  <th className="px-4 py-3 font-semibold text-right">Records</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Duration</th>
                  <th className="px-4 py-3 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((a, idx) => (
                  <tr key={a.id} className={`border-t border-border transition-colors
                    ${idx % 2 === 0 ? 'bg-surface' : 'bg-background'} hover:bg-primary-50`}>
                    <td className="px-4 py-2 text-text-secondary">{a.source_system}</td>
                    <td className="px-4 py-2 font-mono text-xs text-text-primary">{a.endpoint}</td>
                    <td className="px-4 py-2 text-right text-text-primary">{a.records_processed ?? a.records_received ?? '—'}</td>
                    <td className="px-4 py-2"><Badge variant={statusBadge(a.status)}>{a.status || 'UNKNOWN'}</Badge></td>
                    <td className="px-4 py-2 text-right text-text-secondary">{a.duration_ms != null ? `${a.duration_ms} ms` : '—'}</td>
                    <td className="px-4 py-2 text-text-muted">{fmtTs(a.called_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── 4. FAILED RECORDS ── */}
      <div className="rounded-lg border-l-4 border-l-error border border-border bg-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-bold text-text-primary">Failed Staging Records</h2>
          {failedRecs.length > 0 && <Badge variant="red">{failedRecs.length}</Badge>}
        </div>
        {failedRecs.length === 0 ? (
          <EmptyState message="No failed records 🎉" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-primary text-white text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Policy #</th>
                  <th className="px-4 py-3 font-semibold">Agent</th>
                  <th className="px-4 py-3 font-semibold">Batch</th>
                  <th className="px-4 py-3 font-semibold">Row</th>
                  <th className="px-4 py-3 font-semibold">Error</th>
                  <th className="px-4 py-3 font-semibold">Loaded</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {failedRecs.map((r, idx) => (
                  <tr key={r.id} className={`border-t border-border transition-colors
                    ${idx % 2 === 0 ? 'bg-surface' : 'bg-background'} hover:bg-primary-50`}>
                    <td className="px-4 py-2 text-text-primary">{r.id}</td>
                    <td className="px-4 py-2 font-mono text-xs text-text-primary">{r.policy_number || '—'}</td>
                    <td className="px-4 py-2 text-text-secondary">{r.agent_code || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs text-text-secondary">{r.batch_id || '—'}</td>
                    <td className="px-4 py-2 text-text-secondary">{r.row_number ?? '—'}</td>
                    <td className="px-4 py-2 max-w-xs truncate text-error" title={r.stg_error}>{r.stg_error || '—'}</td>
                    <td className="px-4 py-2 text-text-muted">{fmtTs(r.stg_loaded_at)}</td>
                    <td className="px-4 py-2">
                      <Button size="sm" variant="ghost" onClick={() => skipRecord(r.id)}>Skip</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Health Card ──────────────────────────────────────── */

function HealthCard({ title, status, rows }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${healthDot(status)}`} />
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <span className="ml-auto"><Badge variant={statusBadge(status)}>{status || 'UNKNOWN'}</Badge></span>
      </div>
      <dl className="space-y-1 text-xs text-text-secondary">
        {rows.map(([label, value], i) => (
          <div key={i} className="flex justify-between">
            <dt className="text-text-muted">{label}</dt>
            <dd className="font-medium text-text-primary">{value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
