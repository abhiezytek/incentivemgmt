import { query } from '../db/pool.js';

/**
 * Evaluate whether a value falls within a milestone range.
 * function_type values: LEFT_INCLUSIVE_BETWEEN, GTE, LTE, BETWEEN
 */
const matchesMilestone = (value, milestone) => {
  const v = Number(value);
  const from = Number(milestone.range_from);
  const to = Number(milestone.range_to);

  switch (milestone.function_type) {
    case 'LEFT_INCLUSIVE_BETWEEN':
      return v >= from && v < to;
    case 'BETWEEN':
      return v >= from && v <= to;
    case 'GTE':
      return v >= from;
    case 'LTE':
      return v <= from;
    default:
      return false;
  }
};

/**
 * Evaluate whether a slab's operator condition is satisfied.
 */
const matchesSlab = (value, slab) => {
  const v = Number(value);
  const v1 = Number(slab.value1);
  const v2 = slab.value2 != null ? Number(slab.value2) : null;

  switch (slab.operator) {
    case 'GTE':
      return v >= v1;
    case 'LTE':
      return v <= v1;
    case 'BETWEEN':
      return v2 != null && v >= v1 && v <= v2;
    case 'EQ':
      return v === v1;
    default:
      return false;
  }
};

/**
 * Full incentive calculation engine.
 * All rules are fetched from DB — nothing is hardcoded.
 *
 * @param {number|string} userId       - Target user
 * @param {number|string} programId    - Incentive program
 * @param {string}        periodStart  - ISO date (YYYY-MM-DD)
 * @param {string}        periodEnd    - ISO date (YYYY-MM-DD)
 * @returns {Promise<object>} The persisted incentive_results row (includes calc_breakdown JSONB)
 */
export const calculateIncentive = async (userId, programId, periodStart, periodEnd) => {
  // ── Step 1: Fetch KPI definitions for this program ────────────────
  const kpis = await query(
    `SELECT * FROM kpi_definitions WHERE program_id = $1 ORDER BY sort_order`,
    [programId],
  );

  // ── Step 2 & 3: Get performance data and compute achievement_pct ──
  const perfRows = await query(
    `SELECT * FROM performance_data
     WHERE user_id = $1 AND program_id = $2
       AND period_start >= $3 AND period_end <= $4`,
    [userId, programId, periodStart, periodEnd],
  );

  const achievements = {}; // kpi_id → { target, achieved, pct }
  for (const p of perfRows) {
    const target = Number(p.target_value) || 0;
    const achieved = Number(p.achieved_value) || 0;
    const pct = target > 0 ? (achieved / target) * 100 : 0;
    achievements[p.kpi_id] = { target, achieved, pct };
  }

  // ── Step 4 & 5: Match milestones per KPI ──────────────────────────
  const milestoneRows = await query(
    `SELECT m.* FROM kpi_milestones m
     JOIN kpi_definitions k ON k.id = m.kpi_id
     WHERE k.program_id = $1 ORDER BY m.sort_order`,
    [programId],
  );

  const milestonesByKpi = {};
  for (const m of milestoneRows) {
    (milestonesByKpi[m.kpi_id] ??= []).push(m);
  }

  const milestoneHits = {}; // kpi_id → milestone_label | null
  for (const kpi of kpis) {
    const ach = achievements[kpi.id];
    if (!ach) { milestoneHits[kpi.id] = null; continue; }
    const ms = milestonesByKpi[kpi.id] || [];
    const hit = ms.find((m) => matchesMilestone(ach.pct, m));
    milestoneHits[kpi.id] = hit ? hit.milestone_label : null;
  }

  // ── Step 5–9: Payout rules, qualifying gates, slabs ───────────────
  const rules = await query(
    `SELECT * FROM payout_rules WHERE program_id = $1 AND is_active = true`,
    [programId],
  );

  let selfIncentive = 0;
  const breakdown = [];

  for (const rule of rules) {
    // Step 8 — Qualifying gates: if any gate fails → incentive = 0 for this rule
    if (rule.has_qualifying_rules) {
      const qRules = await query(
        `SELECT * FROM payout_qualifying_rules WHERE payout_rule_id = $1`,
        [rule.id],
      );

      const results = qRules.map((qr) => {
        const ach = achievements[qr.kpi_id];
        const val = ach ? ach.pct : 0;
        const threshold = Number(qr.threshold_value);

        switch (qr.operator) {
          case 'GTE': return val >= threshold;
          case 'LTE': return val <= threshold;
          case 'EQ':  return val === threshold;
          default:    return false;
        }
      });

      const isOr = qRules.some((qr) => qr.condition_join === 'OR');
      const qualified = isOr
        ? results.some(Boolean)
        : results.every(Boolean);

      if (!qualified) {
        breakdown.push({ rule_id: rule.id, rule_name: rule.rule_name, qualified: false, amount: 0 });
        continue;
      }
    }

    // Steps 6–7 — Evaluate slabs
    const slabs = await query(
      `SELECT * FROM payout_slabs WHERE payout_rule_id = $1 ORDER BY sort_order`,
      [rule.id],
    );

    let ruleAmount = 0;
    const slabDetails = [];

    for (const slab of slabs) {
      const ach = achievements[slab.kpi_id];
      const val = ach ? ach.pct : 0;

      // Step 6 — milestone_label match
      if (slab.milestone_label && milestoneHits[slab.kpi_id] !== slab.milestone_label) continue;

      // Step 6 — operator condition
      if (!matchesSlab(val, slab)) continue;

      // Step 7 — Apply incentive_operator with weight_pct
      let amount = 0;
      const weight = Number(slab.weight_pct ?? 100) / 100;

      switch (slab.incentive_operator) {
        case 'MULTIPLY':
          amount = (ach ? ach.achieved : 0) * Number(slab.value1 ?? 0) * weight;
          break;
        case 'FLAT':
          amount = Number(slab.value1 ?? 0) * weight;
          break;
        case 'PERCENTAGE_OF':
          amount = ((ach ? ach.achieved : 0) * Number(slab.value1 ?? 0) / 100) * weight;
          break;
        default:
          amount = 0;
      }

      // Step 9 — Apply max_cap
      if (slab.max_cap != null && amount > Number(slab.max_cap)) {
        amount = Number(slab.max_cap);
      }

      slabDetails.push({ slab_id: slab.id, label: slab.slab_label, amount });

      // VARIABLE rules or HIGHEST_AMOUNT slabs: pick the single best slab.
      // All other combinations (FIXED, PERCENTAGE, PROPORTIONAL): sum all matching slabs.
      if (rule.calc_type === 'VARIABLE' || slab.payout_calc_type === 'HIGHEST_AMOUNT') {
        ruleAmount = Math.max(ruleAmount, amount);
      } else {
        ruleAmount += amount;
      }
    }

    // Step 10 — Sum slab payouts into self_incentive
    selfIncentive += ruleAmount;
    breakdown.push({
      rule_id: rule.id,
      rule_name: rule.rule_name,
      qualified: true,
      amount: ruleAmount,
      slabs: slabDetails,
    });
  }

  // ── Steps 11–13: Team rollup ──────────────────────────────────────

  // Step 11 — Fetch direct reportees
  const reportees = await query(
    `SELECT user_id FROM group_members WHERE reports_to_user_id = $1`,
    [userId],
  );

  let teamIncentive = 0;
  const teamDetails = [];

  if (reportees.length > 0) {
    // Step 12 — For each reportee, get their self_incentive from incentive_results
    for (const rep of reportees) {
      const resultRows = await query(
        `SELECT self_incentive FROM incentive_results
         WHERE user_id = $1 AND program_id = $2
           AND period_start = $3 AND period_end = $4
         ORDER BY calculated_at DESC LIMIT 1`,
        [rep.user_id, programId, periodStart, periodEnd],
      );

      const repSelf = resultRows.length > 0 ? Number(resultRows[0].self_incentive) : 0;
      teamDetails.push({ user_id: rep.user_id, self_incentive: repSelf });
    }

    // Step 13 — Apply team_override_pct from each active payout rule
    const totalReporteeSelf = teamDetails.reduce((sum, r) => sum + r.self_incentive, 0);

    for (const rule of rules) {
      const overridePct = Number(rule.team_override_pct ?? 0);
      if (overridePct > 0) {
        teamIncentive += (totalReporteeSelf * overridePct) / 100;
      }
    }
  }

  const totalIncentive = selfIncentive + teamIncentive;

  // ── Step 14: Persist to incentive_results ─────────────────────────
  const calcBreakdown = {
    rules: breakdown,
    achievements,
    milestone_hits: milestoneHits,
    team: { reportees: teamDetails, team_incentive: teamIncentive },
  };

  const resultRows = await query(
    `INSERT INTO incentive_results
       (user_id, program_id, period_start, period_end,
        self_incentive, team_incentive, total_incentive,
        calc_breakdown, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'CALCULATED')
     RETURNING *`,
    [
      userId, programId, periodStart, periodEnd,
      selfIncentive, teamIncentive, totalIncentive,
      JSON.stringify(calcBreakdown),
    ],
  );

  return resultRows[0];
};
