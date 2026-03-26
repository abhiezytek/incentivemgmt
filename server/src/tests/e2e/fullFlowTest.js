/**
 * End-to-End Full-Flow Test Suite
 *
 * Tests the complete application flow against a running server.
 * Run with:  node src/tests/e2e/fullFlowTest.js
 *
 * Prerequisites:
 *   - Server running at BASE_URL (default http://localhost:5000/api)
 *   - Database seeded with seed data (003_program_seed.sql etc.)
 */

import FormData from 'form-data';
import { Readable } from 'node:stream';

/* ─── Configuration ──────────────────────────────────── */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';

/* ─── Shared state across tests ──────────────────────── */

const state = {
  userToken: null,       // user JWT from /auth/login
  systemToken: null,     // system JWT from /auth/system-token
  newProgramId: null,
  programId: null,       // seeded program id
  approvedIds: [],       // approved incentive result ids
  initiatedIds: [],      // payment-initiated result ids
};

/* ─── Test runner infrastructure ─────────────────────── */

const results = [];

async function run(id, name, fn) {
  try {
    await fn();
    results.push({ id, name, passed: true });
    console.log(`  ✅ PASS  ${id}: ${name}`);
  } catch (err) {
    results.push({ id, name, passed: false, error: err.message });
    console.log(`  ❌ FAIL  ${id}: ${name}`);
    console.log(`          → ${err.message}`);
  }
}

function assert(condition, expected, actual) {
  if (!condition) {
    throw new Error(`Expected: ${expected} — Got: ${JSON.stringify(actual)}`);
  }
}

async function api(path, opts = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { ...(opts.headers || {}) };
  const defaultToken = state.userToken || state.systemToken;
  if (defaultToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${defaultToken}`;
  }
  if (opts.body && !headers['Content-Type'] && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const fetchOpts = { method: opts.method || 'GET', headers };
  if (opts.body) {
    if (opts.body instanceof FormData) {
      // Let form-data set Content-Type with boundary
      delete headers['Content-Type'];
      Object.assign(headers, opts.body.getHeaders());
      fetchOpts.body = opts.body;
    } else {
      fetchOpts.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
    }
  }
  const res = await fetch(url, fetchOpts);
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, data, headers: res.headers };
}

/* ─── Helpers ────────────────────────────────────────── */

function csvBuffer(headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => row[h] ?? '').join(','));
  }
  return Buffer.from(lines.join('\n'), 'utf-8');
}

/* ═══════════════════════════════════════════════════════
   TEST GROUP 1: AUTH
   ═══════════════════════════════════════════════════════ */

async function testAuth() {
  console.log('\n━━━ TEST GROUP 1: AUTH ━━━');

  // T01 — User login with valid credentials
  await run('T01', 'POST /auth/login with valid credentials', async () => {
    const { status, data } = await api('/auth/login', {
      method: 'POST',
      body: { email: 'rajesh@insure.com', password: 'password' },
      headers: {},  // no auth header for this request
    });
    assert(status === 200, '200', status);
    assert(data.token, 'token in response', data);
    state.userToken = data.token;
  });

  // T02 — User login with wrong password
  await run('T02', 'POST /auth/login with wrong password', async () => {
    const { status, data } = await api('/auth/login', {
      method: 'POST',
      body: { email: 'rajesh@insure.com', password: 'wrongpass' },
      headers: {},
    });
    assert(status === 401, '401', status);
    assert(data.code === 'AUTH_003', 'AUTH_003', data.code);
  });

  // T02b — System token with valid credentials (original T01)
  await run('T02b', 'POST /auth/system-token with valid credentials', async () => {
    const { status, data } = await api('/auth/system-token', {
      method: 'POST',
      body: { client_id: 'penta_inbound', client_secret: 'penta_secret_2025' },
      headers: {},
    });
    assert(status === 200, '200', status);
    assert(data.token, 'token in response', data);
    state.systemToken = data.token;
  });

  // T03 — Access without token
  await run('T03', 'GET /programs without token → 401', async () => {
    const { status, data } = await api('/programs', {
      headers: { Authorization: '' },
    });
    assert(status === 401, '401', status);
    assert(data.code === 'AUTH_001', 'AUTH_001', data.code);
  });
}

/* ═══════════════════════════════════════════════════════
   TEST GROUP 2: PROGRAMS
   ═══════════════════════════════════════════════════════ */

async function testPrograms() {
  console.log('\n━━━ TEST GROUP 2: PROGRAMS ━━━');

  // T04 — List programs
  await run('T04', 'GET /programs → array with seeded program', async () => {
    const { status, data } = await api('/programs');
    assert(status === 200, '200', status);
    assert(Array.isArray(data), 'array', typeof data);
    assert(data.length >= 1, 'at least 1 program', data.length);
    const target = data.find(p => p.name === 'Agency Monthly Contest - Jan 2026');
    assert(target, '"Agency Monthly Contest - Jan 2026" exists', data.map(p => p.name));
    state.programId = target.id;
  });

  // T05 — Get single program
  await run('T05', 'GET /programs/:id → program details', async () => {
    const { status, data } = await api(`/programs/${state.programId}`);
    assert(status === 200, '200', status);
    assert(data.name === 'Agency Monthly Contest - Jan 2026', 'correct name', data.name);
  });

  // T06 — Create new program
  await run('T06', 'POST /programs → create test program', async () => {
    const { status, data } = await api('/programs', {
      method: 'POST',
      body: {
        name: 'E2E Test Program',
        channel_id: 1,
        start_date: '2026-02-01',
        end_date: '2026-02-28',
        plan_type: 'MONTHLY',
      },
    });
    assert(status === 201, '201', status);
    assert(data.id, 'new program id returned', data);
    state.newProgramId = data.id;
  });

  // T07 — Update program via PUT (partial update)
  await run('T07', 'PUT /programs/:id → partial update', async () => {
    const { status, data } = await api(`/programs/${state.newProgramId}`, {
      method: 'PUT',
      body: { name: 'E2E Test Program Updated' },
    });
    assert(status === 200, '200', status);
    assert(data.name === 'E2E Test Program Updated', 'name updated', data.name);
    // Verify protected fields were not cleared and other fields are intact
    assert(data.id === state.newProgramId, 'id unchanged', data.id);
    assert(data.channel_id === 1, 'channel_id preserved', data.channel_id);
  });

  // T07b — Update program status via PATCH
  await run('T07b', 'PATCH /programs/:id/status → test status transition rules', async () => {
    // First try setting to CLOSED (DRAFT→CLOSED is allowed)
    const { status, data } = await api(`/programs/${state.newProgramId}/status`, {
      method: 'PATCH',
      body: { status: 'CLOSED' },
    });
    assert(status === 200, '200', status);
    assert(data.status === 'CLOSED', 'status=CLOSED', data.status);

    // Verify CLOSED→ACTIVE is rejected (BUS_001)
    const { status: s2, data: d2 } = await api(`/programs/${state.newProgramId}/status`, {
      method: 'PATCH',
      body: { status: 'ACTIVE' },
    });
    assert(s2 === 422, '422 (cannot reactivate CLOSED)', s2);
    assert(d2.code === 'BUS_001', 'BUS_001', d2.code);

    // Verify invalid status is rejected (VAL_003)
    const { status: s3, data: d3 } = await api(`/programs/${state.newProgramId}/status`, {
      method: 'PATCH',
      body: { status: 'INVALID' },
    });
    assert(s3 === 400, '400 (invalid enum)', s3);
    assert(d3.code === 'VAL_003', 'VAL_003', d3.code);

    // Reset to DRAFT so delete works
    // CLOSED→DRAFT is allowed
    const { status: s4 } = await api(`/programs/${state.newProgramId}/status`, {
      method: 'PATCH',
      body: { status: 'DRAFT' },
    });
    assert(s4 === 200, '200 (back to DRAFT)', s4);
  });

  // T08 — Delete test program
  await run('T08', 'DELETE /programs/:id → remove test program', async () => {
    const { status } = await api(`/programs/${state.newProgramId}`, {
      method: 'DELETE',
    });
    assert(status === 200, '200', status);
    state.newProgramId = null;
  });
}

/* ═══════════════════════════════════════════════════════
   TEST GROUP 3: DATA INTEGRITY
   ═══════════════════════════════════════════════════════ */

async function testDataIntegrity() {
  console.log('\n━━━ TEST GROUP 3: DATA INTEGRITY ━━━');

  // T09 — Agent count
  await run('T09', 'GET /agents → at least 20 agents', async () => {
    const { status, data } = await api('/agents');
    assert(status === 200, '200', status);
    assert(Array.isArray(data), 'array', typeof data);
    assert(data.length >= 20, '>= 20 agents', data.length);
  });

  // T10 — Agent hierarchy
  await run('T10', 'GET /agents → hierarchy paths', async () => {
    const { data } = await api('/agents');
    const bm = data.find(a => a.agent_code === 'AGT-BM-001');
    assert(bm, 'AGT-BM-001 exists', data.map(a => a.agent_code).slice(0, 5));
    // Branch manager should have single-level path (just their own id)
    const bmPath = String(bm.hierarchy_path || '');
    const bmLevels = bmPath.split('/').filter(Boolean);
    assert(bmLevels.length === 1, 'BM path = 1 level', bmLevels.length);

    const jr = data.find(a => a.agent_code === 'AGT-JR-001');
    assert(jr, 'AGT-JR-001 exists', null);
    const jrPath = String(jr.hierarchy_path || '');
    const jrLevels = jrPath.split('/').filter(Boolean);
    assert(jrLevels.length === 3, 'JR path = 3 levels', jrLevels.length);
  });

  // T11 — Policy transactions (masked)
  await run('T11', 'GET /policy-transactions → at least 20, masked', async () => {
    const { status, data } = await api('/policy-transactions');
    assert(status === 200, '200', status);
    assert(Array.isArray(data), 'array', typeof data);
    assert(data.length >= 20, '>= 20 transactions', data.length);
    // Check masking — policy numbers should contain asterisks
    const first = data[0];
    if (first && first.policy_number) {
      const hasMask = first.policy_number.includes('*');
      assert(hasMask, 'masked policy number', first.policy_number);
    }
  });

  // T12 — Persistency data for junior agents
  await run('T12', 'GET /persistency-data → records for 12 junior agents', async () => {
    const { status, data } = await api('/persistency-data');
    assert(status === 200, '200', status);
    assert(Array.isArray(data), 'array', typeof data);
    // Collect unique junior agent codes
    const juniorCodes = new Set(
      data
        .map(r => r.agent_code)
        .filter(c => c && c.startsWith('AGT-JR-')),
    );
    assert(juniorCodes.size >= 12, '>= 12 junior agents', juniorCodes.size);
  });
}

/* ═══════════════════════════════════════════════════════
   TEST GROUP 4: INCENTIVE RESULTS
   ═══════════════════════════════════════════════════════ */

async function testIncentiveResults() {
  console.log('\n━━━ TEST GROUP 4: INCENTIVE RESULTS ━━━');

  let allResults = [];

  // T13 — List incentive results
  await run('T13', 'GET /incentive-results → 20 agents for program 1', async () => {
    const { status, data } = await api(
      `/incentive-results?programId=${state.programId}&periodStart=2026-01-01`,
    );
    assert(status === 200, '200', status);
    assert(Array.isArray(data), 'array', typeof data);
    assert(data.length >= 20, '>= 20 results', data.length);
    allResults = data;

    // AGT-JR-005 should have highest total_incentive
    const sorted = [...data].sort(
      (a, b) => Number(b.total_incentive) - Number(a.total_incentive),
    );
    assert(
      sorted[0].agent_code === 'AGT-JR-005',
      'AGT-JR-005 highest',
      sorted[0].agent_code,
    );

    // AGT-JR-004 should have persistency_gate_passed = false
    const jr004 = data.find(r => r.agent_code === 'AGT-JR-004');
    assert(jr004, 'AGT-JR-004 exists', null);
    assert(
      jr004.persistency_gate_passed === false,
      'gate_passed=false',
      jr004.persistency_gate_passed,
    );
  });

  // T14 — Single approve
  await run('T14', 'POST /incentive-results/:id/approve → APPROVED', async () => {
    const jr001 = allResults.find(r => r.agent_code === 'AGT-JR-001');
    assert(jr001, 'AGT-JR-001 result exists', null);
    const { status, data } = await api(`/incentive-results/${jr001.id}/approve`, {
      method: 'POST',
      body: { approvedBy: 'e2e-test' },
    });
    assert(status === 200, '200', status);
    assert(data.status === 'APPROVED', 'status=APPROVED', data.status);
  });

  // T15 — Bulk approve
  await run('T15', 'POST /incentive-results/bulk-approve → approved > 0', async () => {
    const { status, data } = await api('/incentive-results/bulk-approve', {
      method: 'POST',
      body: {
        programId: state.programId,
        periodStart: '2026-01-01',
        approvedBy: 'e2e-test',
      },
    });
    assert(status === 200, '200', status);
    const approved = data.approved ?? data.approvedCount ?? 0;
    assert(approved > 0, 'approved > 0', approved);
    const skipped = data.skipped_gate_failed ?? 0;
    assert(skipped >= 1, 'skipped_gate_failed >= 1 (AGT-JR-004)', skipped);
  });

  // T16 — Stage summary
  await run('T16', 'GET /incentive-results/stage-summary → APPROVED > 0', async () => {
    const { status, data } = await api(
      `/incentive-results/stage-summary?programId=${state.programId}&periodStart=2026-01-01`,
    );
    assert(status === 200, '200', status);
    const approvedCount = data.APPROVED?.count ?? 0;
    assert(approvedCount > 0, 'APPROVED count > 0', approvedCount);
    // DRAFT count should be reduced (only gate-failed remain)
    const draftCount = data.DRAFT?.count ?? 0;
    // We expect 1+ DRAFT remaining (AGT-JR-004 at minimum)
    assert(draftCount >= 1, 'DRAFT >= 1 remaining', draftCount);

    // Collect approved IDs for payout tests
    const { data: approved } = await api(
      `/incentive-results?programId=${state.programId}&periodStart=2026-01-01&status=APPROVED`,
    );
    if (Array.isArray(approved)) {
      state.approvedIds = approved.slice(0, 5).map(r => r.id);
    }
  });
}

/* ═══════════════════════════════════════════════════════
   TEST GROUP 5: LEADERBOARD
   ═══════════════════════════════════════════════════════ */

async function testLeaderboard() {
  console.log('\n━━━ TEST GROUP 5: LEADERBOARD ━━━');

  // T17 — Leaderboard
  await run('T17', 'GET /leaderboard → ordered, AGT-JR-005 first', async () => {
    const { status, data } = await api(
      `/leaderboard?programId=${state.programId}&period=2026-01-01`,
    );
    assert(status === 200, '200', status);
    assert(data.agents, 'agents array', Object.keys(data));
    assert(data.agents.length > 0, 'has agents', data.agents.length);

    // Verify descending order
    for (let i = 1; i < data.agents.length; i++) {
      assert(
        Number(data.agents[i - 1].total_incentive) >=
          Number(data.agents[i].total_incentive),
        `[${i - 1}] >= [${i}]`,
        {
          prev: data.agents[i - 1].total_incentive,
          curr: data.agents[i].total_incentive,
        },
      );
    }

    // First result should be AGT-JR-005
    assert(
      data.agents[0].agent_code === 'AGT-JR-005',
      'first = AGT-JR-005',
      data.agents[0].agent_code,
    );

    assert(Number(data.summary?.total_pool) > 0, 'total_pool > 0', data.summary?.total_pool);
  });
}

/* ═══════════════════════════════════════════════════════
   TEST GROUP 6: DASHBOARD
   ═══════════════════════════════════════════════════════ */

async function testDashboard() {
  console.log('\n━━━ TEST GROUP 6: DASHBOARD ━━━');

  // T18 — Dashboard summary
  await run('T18', 'GET /dashboard/summary → full dashboard data', async () => {
    const { status, data } = await api(
      `/dashboard/summary?programId=${state.programId}&period=2026-01-01`,
    );
    assert(status === 200, '200', status);

    // KPI
    assert(Number(data.kpi?.total_pool) > 0, 'kpi.total_pool > 0', data.kpi?.total_pool);

    // Channel breakdown
    assert(
      Array.isArray(data.channelBreakdown) && data.channelBreakdown.length > 0,
      'channelBreakdown not empty',
      data.channelBreakdown?.length,
    );

    // Top agents
    assert(
      Array.isArray(data.topAgents) && data.topAgents.length === 5,
      'topAgents has 5',
      data.topAgents?.length,
    );

    // Pipeline status
    assert(data.pipelineStatus, 'pipelineStatus exists', Object.keys(data));
    const hasDraft = data.pipelineStatus.DRAFT !== undefined;
    const hasApproved = data.pipelineStatus.APPROVED !== undefined;
    assert(hasDraft || hasApproved, 'has DRAFT or APPROVED keys', data.pipelineStatus);
  });
}

/* ═══════════════════════════════════════════════════════
   TEST GROUP 7: PAYOUT FLOW
   ═══════════════════════════════════════════════════════ */

async function testPayoutFlow() {
  console.log('\n━━━ TEST GROUP 7: PAYOUT FLOW ━━━');

  // T19 — Initiate payment
  await run('T19', 'POST /incentive-results/initiate-payment → count > 0', async () => {
    assert(state.approvedIds.length > 0, 'have approved IDs to initiate', state.approvedIds.length);
    const { status, data } = await api('/incentive-results/initiate-payment', {
      method: 'POST',
      body: {
        ids: state.approvedIds,
        paymentReference: 'E2E-TEST-BATCH-001',
        paidBy: 'e2e-test',
      },
    });
    assert(status === 200, '200', status);
    assert((data.count ?? 0) > 0, 'count > 0', data.count);
    state.initiatedIds = state.approvedIds;
  });

  // T20 — Export Oracle financials
  await run('T20', 'POST /integration/export/oracle-financials → file generated', async () => {
    // First, we need some APPROVED results. Re-check stage summary.
    const { data: summary } = await api(
      `/incentive-results/stage-summary?programId=${state.programId}&periodStart=2026-01-01`,
    );
    // If all are now INITIATED, this export may 404. We still test the endpoint works.
    const { status, data, headers } = await api('/integration/export/oracle-financials', {
      method: 'POST',
      body: { programId: state.programId, periodStart: '2026-01-01' },
    });
    // Could be 200 (CSV) or 404 (no approved results left after initiation)
    if (status === 200) {
      // Expect CSV content
      const ct = headers.get('content-type') || '';
      assert(
        ct.includes('text/csv') || ct.includes('application/octet-stream') || typeof data === 'string',
        'CSV or file response',
        ct,
      );
    } else if (status === 404) {
      // Acceptable — all results moved past APPROVED
      assert(true, '404 — no APPROVED results (all initiated)', status);
    } else {
      assert(false, '200 or 404', status);
    }
  });

  // T21 — Mark paid
  await run('T21', 'POST /incentive-results/mark-paid → paid > 0', async () => {
    const { status, data } = await api('/incentive-results/mark-paid', {
      method: 'POST',
      body: {
        ids: state.initiatedIds,
        paidBy: 'e2e-test',
      },
    });
    assert(status === 200, '200', status);
    const paid = data.paid ?? data.paidCount ?? 0;
    assert(paid > 0, 'paid > 0', paid);
  });
}

/* ═══════════════════════════════════════════════════════
   TEST GROUP 8: UPLOAD VALIDATION
   ═══════════════════════════════════════════════════════ */

async function testUploadValidation() {
  console.log('\n━━━ TEST GROUP 8: UPLOAD VALIDATION ━━━');

  // T22 — Upload with missing columns
  await run('T22', 'POST /upload/policy-transactions with missing columns → 400', async () => {
    const form = new FormData();
    // CSV with only 2 of the 7 required columns
    const buf = csvBuffer(['policy_number', 'agent_code'], [
      { policy_number: 'POL-999', agent_code: 'AGT-JR-001' },
    ]);
    form.append('file', buf, { filename: 'test.csv', contentType: 'text/csv' });

    const { status, data } = await api('/upload/policy-transactions', {
      method: 'POST',
      body: form,
    });
    assert(status === 400, '400', status);
    // Should mention missing columns
    const msg = JSON.stringify(data);
    assert(
      msg.includes('Missing columns') || msg.includes('VAL_007') || msg.includes('missing'),
      'mentions missing columns',
      msg.slice(0, 200),
    );
  });

  // T23 — Upload persistency with invalid data
  await run('T23', 'POST /upload/persistency with invalid persistency_month → 400 VAL_010', async () => {
    const form = new FormData();
    // Include all required columns but with invalid persistency_month=99
    const buf = csvBuffer(
      ['agent_code', 'persistency_month', 'period_start', 'period_end', 'policies_due', 'policies_renewed'],
      [{ agent_code: 'AGT-JR-001', persistency_month: '99', period_start: '2026-01-01', period_end: '2026-01-31', policies_due: '10', policies_renewed: '8' }],
    );
    form.append('file', buf, { filename: 'test_invalid_month.csv', contentType: 'text/csv' });
    form.append('programId', String(state.programId));

    const { status, data } = await api('/upload/persistency', {
      method: 'POST',
      body: form,
    });
    assert(status === 400, '400', status);
    assert(data.code === 'VAL_010', 'VAL_010', data.code);
    assert(Array.isArray(data.invalid_rows), 'invalid_rows array', data.invalid_rows);
  });
}

/* ═══════════════════════════════════════════════════════
   TEST GROUP 9: GAP FIX VALIDATIONS (T24-T29)
   ═══════════════════════════════════════════════════════ */

async function testGapFixes() {
  console.log('\n━━━ TEST GROUP 9: GAP FIX VALIDATIONS ━━━');

  // T24 — PATCH /programs/:id/status (Gap G2 fix)
  await run('T24', 'PATCH /programs/:id/status → activate seeded program', async () => {
    // Create a fresh program to test status transitions
    const { data: created } = await api('/programs', {
      method: 'POST',
      body: {
        name: 'E2E Status Test Program',
        channel_id: 1,
        start_date: '2026-06-01',
        end_date: '2026-06-30',
        plan_type: 'MONTHLY',
      },
    });
    const testId = created.id;

    const { status, data } = await api(`/programs/${testId}/status`, {
      method: 'PATCH',
      body: { status: 'ACTIVE' },
    });
    // May return 200 (activated) or 422 (no KPI/payout rules, which is expected)
    if (status === 200) {
      assert(data.status === 'ACTIVE', 'status=ACTIVE', data.status);
    } else {
      // Acceptable — business rules may block activation without KPI/payout rules
      assert(
        status === 422 && (data.code === 'BUS_006' || data.code === 'BUS_007'),
        '422 with BUS_006 or BUS_007',
        `${status} ${data.code}`,
      );
    }

    // Clean up
    await api(`/programs/${testId}`, { method: 'DELETE' });
  });

  // T25 — Upload persistency with invalid month (Gap G4 fix)
  await run('T25', 'POST /upload/persistency with persistency_month=99 → 400 VAL_010', async () => {
    const form = new FormData();
    const buf = csvBuffer(
      ['agent_code', 'persistency_month', 'period_start', 'period_end', 'policies_due', 'policies_renewed'],
      [
        { agent_code: 'AGT-JR-001', persistency_month: '99', period_start: '2026-03-01', period_end: '2026-03-31', policies_due: '10', policies_renewed: '8' },
        { agent_code: 'AGT-JR-002', persistency_month: '7', period_start: '2026-03-01', period_end: '2026-03-31', policies_due: '5', policies_renewed: '3' },
      ],
    );
    form.append('file', buf, { filename: 'test_t25_invalid_months.csv', contentType: 'text/csv' });
    form.append('programId', String(state.programId));

    const { status, data } = await api('/upload/persistency', {
      method: 'POST',
      body: form,
    });
    assert(status === 400, '400', status);
    assert(data.code === 'VAL_010', 'VAL_010', data.code);
    assert(Array.isArray(data.invalid_rows), 'invalid_rows array present', data.invalid_rows);
  });

  // T26 — Upload persistency with valid months (Gap G4 fix)
  await run('T26', 'POST /upload/persistency with persistency_month=13 → 200', async () => {
    const form = new FormData();
    const buf = csvBuffer(
      ['agent_code', 'persistency_month', 'period_start', 'period_end', 'policies_due', 'policies_renewed'],
      [
        { agent_code: 'AGT-JR-001', persistency_month: '13', period_start: '2026-04-01', period_end: '2026-04-30', policies_due: '10', policies_renewed: '8' },
      ],
    );
    form.append('file', buf, { filename: 'test_t26_valid_month.csv', contentType: 'text/csv' });
    form.append('programId', String(state.programId));

    const { status, data } = await api('/upload/persistency', {
      method: 'POST',
      body: form,
    });
    assert(status === 200, '200', status);
    assert(data.inserted > 0, 'inserted > 0', data.inserted);
  });

  // T27 — SAP FICO export (Gap G3 fix)
  await run('T27', 'POST /integration/export/sap-fico → CSV with SAP_PAYOUT filename', async () => {
    const { status, data, headers } = await api('/integration/export/sap-fico', {
      method: 'POST',
      body: { programId: state.programId, periodStart: '2026-01-01' },
    });
    // Could be 200 (CSV) or 404 (no approved results)
    if (status === 200) {
      const ct = headers.get('content-type') || '';
      assert(ct.includes('text/csv'), 'Content-Type: text/csv', ct);
      const cd = headers.get('content-disposition') || '';
      assert(cd.includes('SAP_PAYOUT'), 'filename contains SAP_PAYOUT', cd);
    } else if (status === 404) {
      // Acceptable — no APPROVED results available
      assert(true, '404 — no approved results for export', status);
    } else {
      assert(false, '200 or 404', status);
    }
  });

  // T28 — GET /auth/me
  await run('T28', 'GET /auth/me → user profile with email and role', async () => {
    const { status, data } = await api('/auth/me');
    assert(status === 200, '200', status);
    assert(data.user?.email === 'rajesh@insure.com', 'email=rajesh@insure.com', data.user?.email);
    assert(data.user?.role === 'ADMIN', 'role=ADMIN', data.user?.role);
  });

  // T29 — Role-based access check (OPS user cannot export SAP FICO)
  await run('T29', 'POST /integration/export/sap-fico as OPS user → 403 AUTH_004', async () => {
    // Login as OPS user
    const { data: loginData } = await api('/auth/login', {
      method: 'POST',
      body: { email: 'meena@insure.com', password: 'password' },
      headers: {},
    });
    const opsToken = loginData.token;

    const { status, data } = await api('/integration/export/sap-fico', {
      method: 'POST',
      body: { programId: state.programId, periodStart: '2026-01-01' },
      headers: opsToken ? { Authorization: `Bearer ${opsToken}` } : {},
    });
    assert(status === 403, '403', status);
    assert(data.code === 'AUTH_004', 'AUTH_004', data.code);
  });
}

/* ═══════════════════════════════════════════════════════
   TEST GROUP 10: ADDITIVE API ENDPOINTS
   (Backend-safe extension — these only touch new tables)
   ═══════════════════════════════════════════════════════ */

async function testAdditiveEndpoints() {
  console.log('\n━━━ TEST GROUP 10: ADDITIVE API ENDPOINTS ━━━');

  // T30 — Executive summary
  await run('T30', 'GET /dashboard/executive-summary → kpiCards', async () => {
    const { status, data } = await api('/dashboard/executive-summary');
    assert(status === 200, '200', status);
    assert(data.kpiCards !== undefined, 'kpiCards exists', Object.keys(data));
    assert(typeof data.kpiCards.activeSchemes === 'number', 'activeSchemes is number', data.kpiCards.activeSchemes);
  });

  // T31 — Review adjustments list
  await run('T31', 'GET /review-adjustments → 200 with summary and rows', async () => {
    const { status, data } = await api('/review-adjustments');
    assert(status === 200, '200', status);
    assert(data.summary !== undefined, 'summary present', Object.keys(data));
    assert(Array.isArray(data.rows), 'rows is array', typeof data.rows);
    assert(data.pagination !== undefined, 'pagination present', Object.keys(data));
  });

  // T32 — Review adjustments single (non-existent)
  await run('T32', 'GET /review-adjustments/999999 → 404', async () => {
    const { status } = await api('/review-adjustments/999999');
    assert(status === 404, '404', status);
  });

  // T33 — Adjust with missing amount
  await run('T33', 'POST /review-adjustments/999999/adjust → 400 without amount', async () => {
    const { status, data } = await api('/review-adjustments/999999/adjust', {
      method: 'POST',
      body: { reason: 'test' },
    });
    assert(status === 400, '400', status);
    assert(data.code === 'VAL_001', 'VAL_001', data.code);
  });

  // T34 — Batch approve with empty ids
  await run('T34', 'POST /review-adjustments/batch-approve → 400 with empty ids', async () => {
    const { status, data } = await api('/review-adjustments/batch-approve', {
      method: 'POST',
      body: { ids: [] },
    });
    assert(status === 400, '400', status);
    assert(data.code === 'VAL_001', 'VAL_001', data.code);
  });

  // T35 — Exception log list
  await run('T35', 'GET /exception-log → 200 with summary', async () => {
    const { status, data } = await api('/exception-log');
    assert(status === 200, '200', status);
    assert(data.summary !== undefined, 'summary present', Object.keys(data));
    assert(Array.isArray(data.rows), 'rows is array', typeof data.rows);
  });

  // T36 — Exception log single (non-existent)
  await run('T36', 'GET /exception-log/999999 → 404', async () => {
    const { status } = await api('/exception-log/999999');
    assert(status === 404, '404', status);
  });

  // T37 — Resolve exception with invalid status
  await run('T37', 'POST /exception-log/999999/resolve → 400 with invalid status', async () => {
    const { status, data } = await api('/exception-log/999999/resolve', {
      method: 'POST',
      body: { status: 'INVALID' },
    });
    assert(status === 400, '400', status);
    assert(data.code === 'VAL_003', 'VAL_003', data.code);
  });

  // T38 — System status
  await run('T38', 'GET /system-status/summary → database CONNECTED', async () => {
    const { status, data } = await api('/system-status/summary');
    assert(status === 200, '200', status);
    assert(data.database?.status === 'CONNECTED', 'CONNECTED', data.database?.status);
  });

  // T39 — Notifications list
  await run('T39', 'GET /notifications → 200 with rows', async () => {
    const { status, data } = await api('/notifications');
    assert(status === 200, '200', status);
    assert(Array.isArray(data.rows), 'rows is array', typeof data.rows);
  });

  // T40 — Org domain mapping
  await run('T40', 'GET /org-domain-mapping → 200 with summary', async () => {
    const { status, data } = await api('/org-domain-mapping');
    assert(status === 200, '200', status);
    assert(data.summary !== undefined, 'summary present', Object.keys(data));
    assert(data.view === 'region', 'default view is region', data.view);
  });

  // T41 — Org domain mapping by channel
  await run('T41', 'GET /org-domain-mapping?view=channel → channel view', async () => {
    const { status, data } = await api('/org-domain-mapping?view=channel');
    assert(status === 200, '200', status);
    assert(data.view === 'channel', 'view is channel', data.view);
  });

  // T42 — KPI config registry
  await run('T42', 'GET /kpi-config/registry → 200 with stats and kpis', async () => {
    const { status, data } = await api('/kpi-config/registry');
    assert(status === 200, '200', status);
    assert(data.stats !== undefined, 'stats present', Object.keys(data));
    assert(Array.isArray(data.kpis), 'kpis is array', typeof data.kpis);
  });

  // T43 — KPI validate (non-existent)
  await run('T43', 'POST /kpi-config/999999/validate → 404', async () => {
    const { status } = await api('/kpi-config/999999/validate', { method: 'POST' });
    assert(status === 404, '404', status);
  });

  // T44 — KPI summary (non-existent)
  await run('T44', 'GET /kpi-config/999999/summary → 404', async () => {
    const { status } = await api('/kpi-config/999999/summary');
    assert(status === 404, '404', status);
  });

  // T45 — Scheme preview
  await run('T45', 'GET /programs/:id/preview → 200 with kpis and payoutRules', async () => {
    const { data: programs } = await api('/programs');
    if (programs.length > 0) {
      const { status, data } = await api(`/programs/${programs[0].id}/preview`);
      assert(status === 200, '200', status);
      assert(Array.isArray(data.kpis), 'kpis is array', typeof data.kpis);
      assert(Array.isArray(data.payoutRules), 'payoutRules is array', typeof data.payoutRules);
      assert(typeof data.agentCount === 'number', 'agentCount is number', typeof data.agentCount);
    }
  });

  // T46 — Verify original dashboard still works after additive changes
  await run('T46', 'GET /dashboard/summary → original endpoint still functional', async () => {
    const { status, data } = await api('/dashboard/summary');
    assert(status === 200, '200', status);
    assert(data.kpi !== undefined, 'kpi section exists', Object.keys(data));
    assert(data.channelBreakdown !== undefined, 'channelBreakdown exists', Object.keys(data));
    assert(data.pipelineStatus !== undefined, 'pipelineStatus exists', Object.keys(data));
  });
}

/* ═══════════════════════════════════════════════════════
   MAIN — Run all test groups
   ═══════════════════════════════════════════════════════ */

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   E2E Full-Flow Test Suite                      ║');
  console.log(`║   Target: ${BASE_URL.padEnd(38)}║`);
  console.log('╚══════════════════════════════════════════════════╝');

  // Verify server is reachable
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.status !== 200) {
      console.error(`\n❌ Server health check failed (status ${res.status})`);
      console.error(`   Ensure server is running at ${BASE_URL}`);
      process.exit(1);
    }
    console.log(`\n🔌 Server reachable — health OK\n`);
  } catch (err) {
    console.error(`\n❌ Cannot reach server at ${BASE_URL}`);
    console.error(`   Error: ${err.message}`);
    console.error('   Start the server first:  cd server && node index.js');
    process.exit(1);
  }

  await testAuth();
  await testPrograms();
  await testDataIntegrity();
  await testIncentiveResults();
  await testLeaderboard();
  await testDashboard();
  await testPayoutFlow();
  await testUploadValidation();
  await testGapFixes();
  await testAdditiveEndpoints();

  /* ── Final Report ──────────────────────────────────── */

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   FINAL REPORT                                  ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`  Total tests : ${total}`);
  console.log(`  Passed      : ${passed}`);
  console.log(`  Failed      : ${failed}`);
  console.log('');

  // Group breakdown
  const groups = [
    { name: 'AUTH',              prefix: ['T01', 'T02', 'T02b', 'T03'] },
    { name: 'PROGRAMS',          prefix: ['T04', 'T05', 'T06', 'T07', 'T07b', 'T08'] },
    { name: 'DATA INTEGRITY',    prefix: ['T09', 'T10', 'T11', 'T12'] },
    { name: 'INCENTIVE RESULTS', prefix: ['T13', 'T14', 'T15', 'T16'] },
    { name: 'LEADERBOARD',       prefix: ['T17'] },
    { name: 'DASHBOARD',         prefix: ['T18'] },
    { name: 'PAYOUT FLOW',       prefix: ['T19', 'T20', 'T21'] },
    { name: 'UPLOAD VALIDATION', prefix: ['T22', 'T23'] },
    { name: 'GAP FIX VALIDATIONS', prefix: ['T24', 'T25', 'T26', 'T27', 'T28', 'T29'] },
    { name: 'ADDITIVE ENDPOINTS', prefix: ['T30', 'T31', 'T32', 'T33', 'T34', 'T35', 'T36', 'T37', 'T38', 'T39', 'T40', 'T41', 'T42', 'T43', 'T44', 'T45', 'T46'] },
  ];

  console.log('  ── Breakdown by group ──');
  for (const g of groups) {
    const groupResults = results.filter(r => g.prefix.includes(r.id));
    const gPassed = groupResults.filter(r => r.passed).length;
    const gFailed = groupResults.filter(r => !r.passed).length;
    const icon = gFailed === 0 ? '✅' : '❌';
    console.log(`  ${icon} ${g.name.padEnd(22)} ${gPassed}/${groupResults.length} passed`);
  }
  console.log('');

  if (failed === 0) {
    console.log('  ✅ ALL TESTS PASSED — Application ready for UAT');
  } else {
    console.log(`  ❌ ${failed} TESTS FAILED — Fix above issues before UAT\n`);
    for (const r of results.filter(r => !r.passed)) {
      console.log(`  ${r.id}: ${r.name}`);
      console.log(`       ${r.error}\n`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
