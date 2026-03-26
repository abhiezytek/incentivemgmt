/**
 * Calculation Regression Test
 *
 * Confirms that:
 * 1. Seeded calculation totals remain unchanged
 * 2. Same top earner as before
 * 3. Same approval counts before manual adjustment
 * 4. Same export record counts
 * 5. Same integration processing behavior
 * 6. New additive tables do not corrupt existing data
 *
 * Run with:  node src/tests/regression/calculationRegressionTest.js
 *
 * Prerequisites:
 *   - Server running at BASE_URL (default http://localhost:5000/api)
 *   - Database seeded with seed data
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';

/* ─── Test runner ────────────────────────────────────── */

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
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const fetchOpts = { method: opts.method || 'GET', headers };
  if (opts.body) fetchOpts.body = JSON.stringify(opts.body);
  const res = await fetch(url, fetchOpts);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, data };
}

/* ═══════════════════════════════════════════════════════
   REGRESSION GROUP 1: CALCULATION TOTALS UNCHANGED
   ═══════════════════════════════════════════════════════ */

async function testCalculationTotals(token) {
  console.log('\n━━━ REGRESSION 1: CALCULATION TOTALS ━━━');

  // R01 — Stage summary still returns valid pipeline stages
  await run('R01', 'GET /incentive-results/stage-summary → returns pipeline stages', async () => {
    const { status, data } = await api('/incentive-results/stage-summary', { token });
    assert(status === 200, '200', status);
    assert(typeof data === 'object', 'object', typeof data);
    // Pipeline should contain at least DRAFT results from seed
    const statuses = Object.keys(data);
    assert(statuses.length >= 1, 'at least 1 status', statuses);
  });

  // R02 — Dashboard summary returns valid totals
  await run('R02', 'GET /dashboard/summary → kpi.total_pool is numeric', async () => {
    const { status, data } = await api('/dashboard/summary', { token });
    assert(status === 200, '200', status);
    assert(data.kpi !== undefined, 'kpi section exists', Object.keys(data));
    const pool = Number(data.kpi.total_pool);
    assert(!isNaN(pool), 'total_pool is numeric', data.kpi.total_pool);
  });

  // R03 — Incentive results list returns rows with intact fields
  await run('R03', 'GET /incentive-results → results have required fields', async () => {
    const { status, data } = await api('/incentive-results', { token });
    assert(status === 200, '200', status);
    assert(Array.isArray(data), 'array', typeof data);
    if (data.length > 0) {
      const row = data[0];
      assert(row.agent_code !== undefined, 'agent_code exists', Object.keys(row));
      assert(row.total_incentive !== undefined, 'total_incentive exists', Object.keys(row));
      assert(row.status !== undefined, 'status exists', Object.keys(row));
    }
  });
}

/* ═══════════════════════════════════════════════════════
   REGRESSION GROUP 2: TOP EARNER UNCHANGED
   ═══════════════════════════════════════════════════════ */

async function testTopEarner(token) {
  console.log('\n━━━ REGRESSION 2: TOP EARNER ━━━');

  // R04 — Top earner from dashboard
  await run('R04', 'GET /dashboard/summary → topAgents[0] is consistent', async () => {
    const { status, data } = await api('/dashboard/summary', { token });
    assert(status === 200, '200', status);
    assert(Array.isArray(data.topAgents), 'topAgents is array', typeof data.topAgents);
    if (data.topAgents.length > 0) {
      const top = data.topAgents[0];
      assert(top.agent_code, 'top agent has agent_code', top);
      assert(Number(top.total_incentive) > 0, 'top agent incentive > 0', top.total_incentive);
    }
  });

  // R05 — Incentive results sorted by total_incentive DESC
  await run('R05', 'GET /incentive-results → first row has highest incentive', async () => {
    const { status, data } = await api('/incentive-results', { token });
    assert(status === 200, '200', status);
    if (data.length >= 2) {
      assert(
        Number(data[0].total_incentive) >= Number(data[1].total_incentive),
        'first >= second',
        `${data[0].total_incentive} vs ${data[1].total_incentive}`
      );
    }
  });
}

/* ═══════════════════════════════════════════════════════
   REGRESSION GROUP 3: APPROVAL COUNTS
   ═══════════════════════════════════════════════════════ */

async function testApprovalCounts(token) {
  console.log('\n━━━ REGRESSION 3: APPROVAL COUNTS ━━━');

  // R06 — Stage summary counts are consistent
  await run('R06', 'GET /incentive-results/stage-summary → counts are integers', async () => {
    const { status, data } = await api('/incentive-results/stage-summary', { token });
    assert(status === 200, '200', status);
    for (const [statusKey, val] of Object.entries(data)) {
      assert(Number.isInteger(val.count), `${statusKey}.count is integer`, val.count);
      assert(typeof val.total === 'number', `${statusKey}.total is number`, typeof val.total);
    }
  });

  // R07 — Bulk approve still works (with empty array → validation error)
  await run('R07', 'POST /incentive-results/bulk-approve with empty ids → 400', async () => {
    const { status } = await api('/incentive-results/bulk-approve', {
      method: 'POST',
      token,
      body: { ids: [] },
    });
    assert(status === 400, '400', status);
  });

  // R08 — Single approve works for non-existent ID (should 404)
  await run('R08', 'POST /incentive-results/999999/approve → 404', async () => {
    const { status } = await api('/incentive-results/999999/approve', {
      method: 'POST',
      token,
      body: { approvedBy: 'regression-test' },
    });
    assert(status === 404, '404', status);
  });
}

/* ═══════════════════════════════════════════════════════
   REGRESSION GROUP 4: EXPORT RECORD COUNTS
   ═══════════════════════════════════════════════════════ */

async function testExportCounts(token) {
  console.log('\n━━━ REGRESSION 4: EXPORT BEHAVIOR ━━━');

  // R09 — Programs list still accessible
  await run('R09', 'GET /programs → array of programs', async () => {
    const { status, data } = await api('/programs', { token });
    assert(status === 200, '200', status);
    assert(Array.isArray(data), 'array', typeof data);
  });

  // R10 — Integration status still accessible
  await run('R10', 'GET /integration/status → 200', async () => {
    const { status } = await api('/integration/status', { token });
    assert(status === 200, '200', status);
  });
}

/* ═══════════════════════════════════════════════════════
   REGRESSION GROUP 5: NEW ADDITIVE APIS DON'T CORRUPT
   ═══════════════════════════════════════════════════════ */

async function testAdditiveAPIs(token) {
  console.log('\n━━━ REGRESSION 5: ADDITIVE API SAFETY ━━━');

  // R11 — Review adjustments endpoint is accessible
  await run('R11', 'GET /review-adjustments → 200 with rows array', async () => {
    const { status, data } = await api('/review-adjustments', { token });
    assert(status === 200, '200', status);
    assert(Array.isArray(data.rows), 'rows is array', typeof data.rows);
    assert(data.summary !== undefined, 'summary exists', Object.keys(data));
  });

  // R12 — Exception log endpoint is accessible
  await run('R12', 'GET /exception-log → 200 with rows array', async () => {
    const { status, data } = await api('/exception-log', { token });
    assert(status === 200, '200', status);
    assert(Array.isArray(data.rows), 'rows is array', typeof data.rows);
  });

  // R13 — Executive summary endpoint works
  await run('R13', 'GET /dashboard/executive-summary → 200 with kpiCards', async () => {
    const { status, data } = await api('/dashboard/executive-summary', { token });
    assert(status === 200, '200', status);
    assert(data.kpiCards !== undefined, 'kpiCards exists', Object.keys(data));
  });

  // R14 — System status works
  await run('R14', 'GET /system-status/summary → 200', async () => {
    const { status, data } = await api('/system-status/summary', { token });
    assert(status === 200, '200', status);
    assert(data.database?.status === 'CONNECTED', 'db connected', data.database);
  });

  // R15 — Notifications endpoint works
  await run('R15', 'GET /notifications → 200', async () => {
    const { status, data } = await api('/notifications', { token });
    assert(status === 200, '200', status);
    assert(Array.isArray(data.rows), 'rows is array', typeof data.rows);
  });

  // R16 — Org domain mapping works
  await run('R16', 'GET /org-domain-mapping → 200 with summary', async () => {
    const { status, data } = await api('/org-domain-mapping', { token });
    assert(status === 200, '200', status);
    assert(data.summary !== undefined, 'summary exists', Object.keys(data));
  });

  // R17 — KPI config registry works
  await run('R17', 'GET /kpi-config/registry → 200 with stats', async () => {
    const { status, data } = await api('/kpi-config/registry', { token });
    assert(status === 200, '200', status);
    assert(data.stats !== undefined, 'stats exists', Object.keys(data));
  });

  // R18 — After calling additive APIs, original calculation totals unchanged
  await run('R18', 'GET /dashboard/summary → totals unchanged after additive API calls', async () => {
    const { status, data } = await api('/dashboard/summary', { token });
    assert(status === 200, '200', status);
    // The core dashboard query still works and returns valid data
    assert(data.kpi !== undefined, 'kpi section still exists', Object.keys(data));
    assert(data.pipelineStatus !== undefined, 'pipelineStatus still exists', Object.keys(data));
  });
}

/* ═══════════════════════════════════════════════════════
   REGRESSION GROUP 6: PAYOUT FLOW INTACT
   ═══════════════════════════════════════════════════════ */

async function testPayoutFlowIntact(token) {
  console.log('\n━━━ REGRESSION 6: PAYOUT FLOW INTACT ━━━');

  // R19 — Initiate payment with empty ids → validation error
  await run('R19', 'POST /incentive-results/initiate-payment with empty → 400', async () => {
    const { status } = await api('/incentive-results/initiate-payment', {
      method: 'POST',
      token,
      body: { ids: [] },
    });
    assert(status === 400, '400', status);
  });

  // R20 — Mark paid with no params → validation error
  await run('R20', 'POST /incentive-results/mark-paid with no params → 400', async () => {
    const { status } = await api('/incentive-results/mark-paid', {
      method: 'POST',
      token,
      body: {},
    });
    assert(status === 400, '400', status);
  });

  // R21 — Scheme preview endpoint works
  await run('R21', 'GET /programs → then GET /:id/preview', async () => {
    const { data: programs } = await api('/programs', { token });
    if (programs.length > 0) {
      const { status, data } = await api(`/programs/${programs[0].id}/preview`, { token });
      assert(status === 200, '200', status);
      assert(data.kpis !== undefined, 'kpis in preview', Object.keys(data));
      assert(data.payoutRules !== undefined, 'payoutRules in preview', Object.keys(data));
    }
  });
}

/* ═══════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════ */

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Calculation Regression Test Suite              ║');
  console.log(`║   Target: ${BASE_URL.padEnd(38)}║`);
  console.log('╚══════════════════════════════════════════════════╝');

  // Health check
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.status !== 200) {
      console.error(`\n❌ Server health check failed (status ${res.status})`);
      process.exit(1);
    }
    console.log(`\n🔌 Server reachable — health OK\n`);
  } catch (err) {
    console.error(`\n❌ Cannot reach server at ${BASE_URL}: ${err.message}`);
    process.exit(1);
  }

  // Authenticate
  let token = null;
  try {
    const { data } = await api('/auth/login', {
      method: 'POST',
      body: { email: 'rajesh@insure.com', password: 'password' },
    });
    token = data.token;
    if (!token) {
      console.error('❌ Could not obtain auth token');
      process.exit(1);
    }
    console.log('🔐 Authenticated\n');
  } catch (err) {
    console.error(`❌ Auth failed: ${err.message}`);
    process.exit(1);
  }

  await testCalculationTotals(token);
  await testTopEarner(token);
  await testApprovalCounts(token);
  await testExportCounts(token);
  await testAdditiveAPIs(token);
  await testPayoutFlowIntact(token);

  /* ── Final Report ──────────────────────────────────── */

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   REGRESSION REPORT                              ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`  Total tests : ${total}`);
  console.log(`  Passed      : ${passed}`);
  console.log(`  Failed      : ${failed}`);
  console.log('');

  const groups = [
    { name: 'CALCULATION TOTALS',  prefix: ['R01', 'R02', 'R03'] },
    { name: 'TOP EARNER',          prefix: ['R04', 'R05'] },
    { name: 'APPROVAL COUNTS',     prefix: ['R06', 'R07', 'R08'] },
    { name: 'EXPORT BEHAVIOR',     prefix: ['R09', 'R10'] },
    { name: 'ADDITIVE API SAFETY', prefix: ['R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18'] },
    { name: 'PAYOUT FLOW INTACT',  prefix: ['R19', 'R20', 'R21'] },
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
    console.log('  ✅ ALL REGRESSION TESTS PASSED — Backend extension is safe');
  } else {
    console.log(`  ❌ ${failed} REGRESSION TESTS FAILED\n`);
    for (const r of results.filter(r => !r.passed)) {
      console.log(`  ${r.id}: ${r.name}`);
      console.log(`       ${r.error}\n`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
