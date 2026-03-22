import { query } from '../db/pool.js';

export async function calculateAgentIncentive(agentCode, programId, periodStart, periodEnd) {

  const breakdown = {};

  // ── STEP 1: Compute KPI summary from transactions ──
  await query(`SELECT compute_agent_kpi($1,$2,$3,$4)`,
    [agentCode, programId, periodStart, periodEnd]);

  const [kpi] = await query(
    `SELECT * FROM ins_agent_kpi_summary
     WHERE agent_code=$1 AND program_id=$2 AND period_start=$3`,
    [agentCode, programId, periodStart]);

  // ── STEP 2: Product-wise NB Incentive from ins_incentive_rates ──
  const rates = await query(`
    SELECT r.*, p.product_category
    FROM ins_incentive_rates r
    JOIN ins_products p ON p.product_code = r.product_code
    WHERE r.program_id = $1
      AND r.transaction_type = 'NEW_BUSINESS'
      AND r.policy_year = 1
      AND r.effective_from <= $2
      AND (r.effective_to IS NULL OR r.effective_to >= $2)
      AND r.is_active = TRUE
    ORDER BY r.product_code`, [programId, periodStart]);

  let nbIncentive = 0;
  const productBreakdown = kpi.nb_by_product || {};

  for (const rate of rates) {
    const prod = productBreakdown[rate.product_code];
    if (!prod) continue;
    const premium = prod.premium || 0;
    if (premium < rate.min_premium_slab || premium > rate.max_premium_slab) continue;

    let amount = 0;
    if (rate.rate_type === 'PERCENTAGE_OF_PREMIUM')
      amount = (premium * rate.incentive_rate) / 100;
    else if (rate.rate_type === 'FLAT_PER_POLICY')
      amount = (prod.count || 0) * rate.incentive_rate;
    else if (rate.rate_type === 'PERCENTAGE_OF_APE')
      amount = ((prod.ape || 0) * rate.incentive_rate) / 100;

    breakdown[`NB_${rate.product_code}`] = { premium, rate: rate.incentive_rate, amount };
    nbIncentive += amount;
  }

  // ── STEP 3: Renewal Incentive ──
  const renewalRates = await query(`
    SELECT * FROM ins_incentive_rates
    WHERE program_id=$1 AND transaction_type='RENEWAL'
      AND effective_from <= $2 AND is_active=TRUE`,
    [programId, periodStart]);

  let renewalIncentive = 0;
  for (const r of renewalRates) {
    const amount = (kpi.renewal_premium_collected * r.incentive_rate) / 100;
    breakdown[`RENEWAL_${r.product_code || 'ALL'}`] = { amount };
    renewalIncentive += amount;
  }

  // ── STEP 4: Persistency Gate Check ──
  const gates = await query(`
    SELECT * FROM ins_persistency_gates
    WHERE program_id=$1 AND gate_type='QUALIFYING_MINIMUM'
    ORDER BY persistency_month`, [programId]);

  let persistencyGatePassed = true;
  let clawback = 0;
  let disqualificationReason = null;

  for (const gate of gates) {
    const persField = `persistency_${gate.persistency_month}m`;
    const agentPers = kpi[persField] || 0;
    if (agentPers < gate.threshold_pct) {
      if (gate.consequence === 'BLOCK_INCENTIVE') {
        persistencyGatePassed = false;
        disqualificationReason = `${gate.persistency_month}M persistency ${agentPers.toFixed(1)}% below ${gate.threshold_pct}%`;
        nbIncentive = 0; renewalIncentive = 0;
        break;
      } else if (gate.consequence === 'REDUCE_BY_PCT') {
        const reduction = (nbIncentive * gate.consequence_value) / 100;
        clawback += reduction;
        breakdown[`PERSISTENCY_REDUCTION_${gate.persistency_month}M`] = { reduction };
      } else if (gate.consequence === 'CLAWBACK_PCT') {
        clawback += (nbIncentive * gate.consequence_value) / 100;
      }
    }
  }

  const netSelfIncentive = nbIncentive + renewalIncentive - clawback;

  // ── STEP 5: MLM Override Calculation (recursive CTE via hierarchy_path) ──
  const [agentRow] = await query(
    `SELECT hierarchy_path, hierarchy_level FROM ins_agents WHERE agent_code=$1`,
    [agentCode]);
  const myPath = agentRow?.hierarchy_path;

  const downlines = await query(`
    SELECT a.agent_code, a.hierarchy_level,
           (a.hierarchy_level - $2) AS relative_level,
           r.incentive_results
    FROM ins_agents a
    LEFT JOIN ins_incentive_results r ON r.agent_code = a.agent_code
      AND r.program_id = $1 AND r.period_start = $3
    WHERE a.hierarchy_path LIKE $4
      AND a.agent_code != $5
      AND a.status = 'ACTIVE'`,
    [programId, agentRow?.hierarchy_level, periodStart,
     myPath + '.%', agentCode]);

  const overrideRates = await query(`
    SELECT * FROM ins_mlm_override_rates
    WHERE program_id=$1 AND is_active=TRUE
    ORDER BY hierarchy_level`, [programId]);

  let l1Override = 0, l2Override = 0, l3Override = 0;

  for (const dl of downlines) {
    const relLevel = dl.relative_level;
    const dlIncentive = dl.incentive_results?.net_self_incentive || 0;
    const rateRow = overrideRates.find(r =>
      r.hierarchy_level === relLevel &&
      (!r.product_code));  // NULL product_code = applies to all

    if (!rateRow) continue;
    let overrideAmt = 0;
    if (rateRow.override_type === 'PERCENTAGE_OF_DOWNLINE_INCENTIVE')
      overrideAmt = (dlIncentive * rateRow.override_rate) / 100;
    else if (rateRow.override_type === 'FLAT_PER_POLICY')
      overrideAmt = rateRow.override_rate;

    if (rateRow.max_cap_amount) overrideAmt = Math.min(overrideAmt, rateRow.max_cap_amount);

    if (relLevel === 1) l1Override += overrideAmt;
    else if (relLevel === 2) l2Override += overrideAmt;
    else if (relLevel === 3) l3Override += overrideAmt;

    breakdown[`MLM_L${relLevel}_${dl.agent_code}`] = { dlIncentive, rate: rateRow.override_rate, overrideAmt };
  }

  const totalOverride = l1Override + l2Override + l3Override;
  const totalIncentive = netSelfIncentive + totalOverride;

  // ── STEP 6: Save to ins_incentive_results ──
  await query(`
    INSERT INTO ins_incentive_results (
      agent_code, program_id, period_start, period_end,
      nb_incentive, renewal_incentive, clawback_amount, net_self_incentive,
      l1_override, l2_override, l3_override, total_override, total_incentive,
      persistency_gate_passed, disqualification_reason, calc_breakdown, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'DRAFT')
    ON CONFLICT (agent_code, program_id, period_start)
    DO UPDATE SET
      nb_incentive=EXCLUDED.nb_incentive,
      renewal_incentive=EXCLUDED.renewal_incentive,
      clawback_amount=EXCLUDED.clawback_amount,
      net_self_incentive=EXCLUDED.net_self_incentive,
      l1_override=EXCLUDED.l1_override,
      l2_override=EXCLUDED.l2_override,
      l3_override=EXCLUDED.l3_override,
      total_override=EXCLUDED.total_override,
      total_incentive=EXCLUDED.total_incentive,
      persistency_gate_passed=EXCLUDED.persistency_gate_passed,
      disqualification_reason=EXCLUDED.disqualification_reason,
      calc_breakdown=EXCLUDED.calc_breakdown,
      calculated_at=NOW()`,
    [agentCode, programId, periodStart, periodEnd,
     nbIncentive, renewalIncentive, clawback, netSelfIncentive,
     l1Override, l2Override, l3Override, totalOverride, totalIncentive,
     persistencyGatePassed, disqualificationReason, JSON.stringify(breakdown)]);

  return { agentCode, netSelfIncentive, totalOverride, totalIncentive, breakdown };
}
