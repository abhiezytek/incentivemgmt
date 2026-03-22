import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

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
 * POST /calculate/:programId/:userId/:period
 *
 * period format: YYYY-MM  (uses first and last day of the month)
 *
 * Steps:
 *  1. Derive period_start / period_end from :period
 *  2. Load KPI definitions + milestones for the program
 *  3. Load performance data for the user / program / period
 *  4. Determine milestone hit per KPI
 *  5. Load payout rules + qualifying rules + slabs
 *  6. For each rule, check qualifying gates then compute payout
 *  7. Persist result into incentive_results and return it
 */
router.post('/:programId/:userId/:period', async (req, res) => {
  try {
    const { programId, userId, period } = req.params;

    // 1 — Derive period window
    const [year, month] = period.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'period must be YYYY-MM' });
    }
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const periodEnd = new Date(year, month, 0).toISOString().slice(0, 10); // last day

    // 2 — KPI definitions + milestones
    const kpis = await query(
      `SELECT * FROM kpi_definitions WHERE program_id = $1 ORDER BY sort_order`,
      [programId],
    );

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

    // 3 — Performance data
    const perfRows = await query(
      `SELECT * FROM performance_data
       WHERE user_id = $1 AND program_id = $2
         AND period_start >= $3 AND period_end <= $4`,
      [userId, programId, periodStart, periodEnd],
    );

    // Build achievement map: kpi_id → { target, achieved, pct }
    const achievements = {};
    for (const p of perfRows) {
      const target = Number(p.target_value) || 0;
      const achieved = Number(p.achieved_value) || 0;
      const pct = target > 0 ? (achieved / target) * 100 : 0;
      achievements[p.kpi_id] = { target, achieved, pct };
    }

    // 4 — Determine milestone hit per KPI
    const milestoneHits = {}; // kpi_id → milestone_label | null
    for (const kpi of kpis) {
      const ach = achievements[kpi.id];
      if (!ach) { milestoneHits[kpi.id] = null; continue; }
      const ms = milestonesByKpi[kpi.id] || [];
      const hit = ms.find((m) => matchesMilestone(ach.pct, m));
      milestoneHits[kpi.id] = hit ? hit.milestone_label : null;
    }

    // 5 — Payout rules + qualifying rules + slabs
    const rules = await query(
      `SELECT * FROM payout_rules WHERE program_id = $1 AND is_active = true`,
      [programId],
    );

    let totalIncentive = 0;
    const breakdown = [];

    for (const rule of rules) {
      // 5a — Qualifying gates
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

        // Determine join mode from the first rule (all rules share the same join)
        const isOr = qRules.some((qr) => qr.condition_join === 'OR');
        const qualified = isOr
          ? results.some(Boolean)   // OR: at least one must pass
          : results.every(Boolean); // AND: all must pass

        if (!qualified) {
          breakdown.push({ rule_id: rule.id, rule_name: rule.rule_name, qualified: false, amount: 0 });
          continue;
        }
      }

      // 5b — Evaluate slabs
      const slabs = await query(
        `SELECT * FROM payout_slabs WHERE payout_rule_id = $1 ORDER BY sort_order`,
        [rule.id],
      );

      let ruleAmount = 0;
      const slabDetails = [];

      for (const slab of slabs) {
        const ach = achievements[slab.kpi_id];
        const val = ach ? ach.pct : 0;

        // Check milestone label match (if specified on slab)
        if (slab.milestone_label && milestoneHits[slab.kpi_id] !== slab.milestone_label) continue;

        if (!matchesSlab(val, slab)) continue;

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

        if (slab.max_cap != null && amount > Number(slab.max_cap)) {
          amount = Number(slab.max_cap);
        }

        slabDetails.push({ slab_id: slab.id, label: slab.slab_label, amount });

        if (rule.calc_type === 'VARIABLE' || slab.payout_calc_type === 'HIGHEST_AMOUNT') {
          ruleAmount = Math.max(ruleAmount, amount);
        } else {
          ruleAmount += amount;
        }
      }

      totalIncentive += ruleAmount;
      breakdown.push({
        rule_id: rule.id,
        rule_name: rule.rule_name,
        qualified: true,
        amount: ruleAmount,
        slabs: slabDetails,
      });
    }

    // 6 — Persist result
    const resultRows = await query(
      `INSERT INTO incentive_results
         (user_id, program_id, period_start, period_end,
          self_incentive, total_incentive, calc_breakdown, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'CALCULATED')
       RETURNING *`,
      [userId, programId, periodStart, periodEnd, totalIncentive, totalIncentive, JSON.stringify(breakdown)],
    );

    res.status(201).json(resultRows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
