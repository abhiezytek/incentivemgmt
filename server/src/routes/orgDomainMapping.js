import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/**
 * @swagger
 * /api/org-domain-mapping:
 *   get:
 *     tags: [Organization]
 *     summary: Organizational mapping overview
 *     description: >
 *       Returns a hierarchical organizational mapping including regions,
 *       channels, branches, products, and designations. Reads from existing
 *       master tables only (ins_agents, ins_regions, channels, ins_products).
 *     parameters:
 *       - in: query
 *         name: view
 *         schema: { type: string, enum: [region, channel, branch, designation], default: region }
 *         description: Group-by dimension
 *     responses:
 *       200:
 *         description: Organizational mapping data
 */
router.get('/', async (req, res) => {
  try {
    const { view = 'region' } = req.query;

    // Summary metrics
    const summaryRes = await query(`
      SELECT
        COUNT(*)::int AS total_agents,
        COUNT(*) FILTER(WHERE status = 'ACTIVE')::int AS active_agents,
        COUNT(DISTINCT region_id)::int AS regions,
        COUNT(DISTINCT channel_id)::int AS channels,
        COUNT(DISTINCT branch_code)::int AS branches
      FROM ins_agents
    `);

    let groupedData = [];

    switch (view) {
      case 'region': {
        groupedData = await query(`
          SELECT rg.id, rg.region_name, rg.region_code, rg.zone,
                 COUNT(a.id)::int AS agent_count,
                 COUNT(a.id) FILTER(WHERE a.status = 'ACTIVE')::int AS active_count,
                 COUNT(DISTINCT a.branch_code)::int AS branch_count
          FROM ins_regions rg
          LEFT JOIN ins_agents a ON a.region_id = rg.id
          GROUP BY rg.id, rg.region_name, rg.region_code, rg.zone
          ORDER BY agent_count DESC
        `);
        break;
      }
      case 'channel': {
        groupedData = await query(`
          SELECT c.id, c.name, c.code,
                 COUNT(a.id)::int AS agent_count,
                 COUNT(a.id) FILTER(WHERE a.status = 'ACTIVE')::int AS active_count,
                 COUNT(DISTINCT a.region_id)::int AS region_count,
                 COUNT(DISTINCT a.branch_code)::int AS branch_count
          FROM channels c
          LEFT JOIN ins_agents a ON a.channel_id = c.id
          GROUP BY c.id, c.name, c.code
          ORDER BY agent_count DESC
        `);
        break;
      }
      case 'branch': {
        groupedData = await query(`
          SELECT a.branch_code,
                 rg.region_name, c.name AS channel_name,
                 COUNT(a.id)::int AS agent_count,
                 COUNT(a.id) FILTER(WHERE a.status = 'ACTIVE')::int AS active_count
          FROM ins_agents a
          LEFT JOIN ins_regions rg ON rg.id = a.region_id
          LEFT JOIN channels c ON c.id = a.channel_id
          WHERE a.branch_code IS NOT NULL
          GROUP BY a.branch_code, rg.region_name, c.name
          ORDER BY agent_count DESC
        `);
        break;
      }
      case 'designation': {
        groupedData = await query(`
          SELECT a.hierarchy_level,
                 COUNT(a.id)::int AS agent_count,
                 COUNT(a.id) FILTER(WHERE a.status = 'ACTIVE')::int AS active_count,
                 COUNT(DISTINCT a.channel_id)::int AS channel_count
          FROM ins_agents a
          GROUP BY a.hierarchy_level
          ORDER BY a.hierarchy_level
        `);
        break;
      }
      default:
        break;
    }

    // Products summary
    const productsRes = await query(`
      SELECT product_category, COUNT(*)::int AS count,
             COUNT(*) FILTER(WHERE is_active)::int AS active_count
      FROM ins_products
      GROUP BY product_category
      ORDER BY count DESC
    `);

    res.json({
      summary: summaryRes[0] || {},
      view,
      groupedData,
      products: productsRes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
