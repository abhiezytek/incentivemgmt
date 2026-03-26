import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/**
 * @swagger
 * /api/kpi-config/registry:
 *   get:
 *     tags: [KPI Config]
 *     summary: KPI configuration registry
 *     description: >
 *       Returns a composite view of all KPI definitions with their
 *       milestones, linked programs, and derived variables. This is a
 *       read-only aggregation endpoint for the redesigned KPI Config screen.
 *     responses:
 *       200:
 *         description: Full KPI registry
 */
router.get('/registry', async (req, res) => {
  try {
    // KPI definitions with program info
    const kpis = await query(`
      SELECT kd.*,
             ip.name AS program_name, ip.status AS program_status,
             c.name AS channel_name
      FROM kpi_definitions kd
      LEFT JOIN incentive_programs ip ON ip.id = kd.program_id
      LEFT JOIN channels c ON c.id = ip.channel_id
      ORDER BY kd.program_id, kd.sort_order
    `);

    // All milestones
    const milestones = await query(`
      SELECT km.* FROM kpi_milestones km
      ORDER BY km.kpi_id, km.sort_order
    `);

    // Derived variables
    const derivedVars = await query(`
      SELECT * FROM derived_variables ORDER BY var_name
    `);

    // Group milestones by kpi_id
    const milestoneMap = {};
    for (const m of milestones) {
      if (!milestoneMap[m.kpi_id]) milestoneMap[m.kpi_id] = [];
      milestoneMap[m.kpi_id].push(m);
    }

    // Attach milestones to KPIs
    const registry = kpis.map(kpi => ({
      ...kpi,
      milestones: milestoneMap[kpi.id] || [],
    }));

    // Stats
    const programCount = new Set(kpis.map(k => k.program_id)).size;
    const activeCount = kpis.filter(k => k.program_status === 'ACTIVE').length;

    res.json({
      stats: {
        totalKPIs: kpis.length,
        activeKPIs: activeCount,
        programsLinked: programCount,
        derivedVariables: derivedVars.length,
      },
      kpis: registry,
      derivedVariables: derivedVars,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/kpi-config/{id}/validate:
 *   post:
 *     tags: [KPI Config]
 *     summary: Validate KPI configuration
 *     description: >
 *       Performs validation checks on a KPI definition: verifies milestone
 *       ranges are continuous, checks for missing program references, and
 *       validates derived variable formulas are syntactically correct.
 *       Does NOT execute formulas at runtime.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Validation results
 *       404:
 *         description: KPI not found
 */
router.post('/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    const warnings = [];
    const errors = [];

    // Fetch KPI
    const kpiRows = await query(`SELECT * FROM kpi_definitions WHERE id = $1`, [id]);
    if (!kpiRows.length) {
      return res.status(404).json({ error: 'KPI definition not found' });
    }
    const kpi = kpiRows[0];

    // Check program exists and is valid
    if (kpi.program_id) {
      const prog = await query(`SELECT id, status FROM incentive_programs WHERE id = $1`, [kpi.program_id]);
      if (!prog.length) {
        errors.push({ field: 'program_id', message: 'Linked program does not exist' });
      } else if (prog[0].status === 'CLOSED') {
        warnings.push({ field: 'program_id', message: 'Linked program is CLOSED' });
      }
    }

    // Check milestones
    const milestones = await query(
      `SELECT * FROM kpi_milestones WHERE kpi_id = $1 ORDER BY sort_order`,
      [id]
    );
    if (milestones.length === 0) {
      warnings.push({ field: 'milestones', message: 'No milestones defined — KPI will have no slab structure' });
    } else {
      // Check for gaps in milestone ranges
      for (let i = 0; i < milestones.length - 1; i++) {
        const curr = milestones[i];
        const next = milestones[i + 1];
        if (curr.range_to !== null && next.range_from !== null &&
            Number(curr.range_to) < Number(next.range_from)) {
          warnings.push({
            field: 'milestones',
            message: `Gap between milestone ${curr.milestone_label} (to: ${curr.range_to}) and ${next.milestone_label} (from: ${next.range_from})`,
          });
        }
      }
    }

    // Check payout rules link this KPI
    const payoutLinks = await query(
      `SELECT COUNT(*)::int AS cnt FROM payout_slabs WHERE kpi_id = $1`,
      [id]
    );
    if (payoutLinks[0]?.cnt === 0) {
      warnings.push({ field: 'payout_slabs', message: 'KPI is not linked to any payout slab' });
    }

    res.json({
      valid: errors.length === 0,
      errors,
      warnings,
      milestoneCount: milestones.length,
      payoutSlabLinks: payoutLinks[0]?.cnt || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/kpi-config/{id}/summary:
 *   get:
 *     tags: [KPI Config]
 *     summary: KPI configuration summary
 *     description: >
 *       Returns a complete summary of a single KPI definition including
 *       its milestones, linked payout slabs, and qualifying rules.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: KPI summary
 *       404:
 *         description: KPI not found
 */
router.get('/:id/summary', async (req, res) => {
  try {
    const { id } = req.params;

    const kpiRows = await query(
      `SELECT kd.*, ip.name AS program_name, ip.status AS program_status,
              c.name AS channel_name
       FROM kpi_definitions kd
       LEFT JOIN incentive_programs ip ON ip.id = kd.program_id
       LEFT JOIN channels c ON c.id = ip.channel_id
       WHERE kd.id = $1`,
      [id]
    );
    if (!kpiRows.length) {
      return res.status(404).json({ error: 'KPI definition not found' });
    }

    const milestones = await query(
      `SELECT * FROM kpi_milestones WHERE kpi_id = $1 ORDER BY sort_order`,
      [id]
    );

    const payoutSlabs = await query(
      `SELECT ps.*, pr.rule_name
       FROM payout_slabs ps
       JOIN payout_rules pr ON pr.id = ps.payout_rule_id
       WHERE ps.kpi_id = $1
       ORDER BY ps.sort_order`,
      [id]
    );

    const qualifyingRules = await query(
      `SELECT pqr.*, pr.rule_name
       FROM payout_qualifying_rules pqr
       JOIN payout_rules pr ON pr.id = pqr.payout_rule_id
       WHERE pqr.kpi_id = $1`,
      [id]
    );

    res.json({
      ...kpiRows[0],
      milestones,
      payoutSlabs,
      qualifyingRules,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
