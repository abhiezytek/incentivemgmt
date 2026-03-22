import { Router } from 'express';
import { calculateIncentive } from '../engine/calculateIncentive.js';

const router = Router();

/**
 * POST /calculate/:programId/:userId/:period
 *
 * period format: YYYY-MM  (uses first and last day of the month)
 *
 * Delegates to the calculateIncentive engine which:
 *  1. Loads KPI definitions + milestones for the program
 *  2. Loads performance data and computes achievement percentages
 *  3. Determines milestone hits, evaluates qualifying gates
 *  4. Computes payout slabs (MULTIPLY / FLAT / PERCENTAGE_OF) with weight_pct & max_cap
 *  5. Computes team rollup from direct reportees' incentive_results
 *  6. Persists into incentive_results and returns full breakdown
 */
router.post('/:programId/:userId/:period', async (req, res) => {
  try {
    const { programId, userId, period } = req.params;

    // Derive period window from YYYY-MM
    const [year, month] = period.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'period must be YYYY-MM' });
    }
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const periodEnd = new Date(year, month, 0).toISOString().slice(0, 10); // last day

    const result = await calculateIncentive(userId, programId, periodStart, periodEnd);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
