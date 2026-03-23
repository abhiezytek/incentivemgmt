import { Router } from 'express';
import { findAll, findById, insertRow, updateRow, deleteRow } from '../db/queryHelper.js';
import { ERRORS, apiError } from '../utils/errorCodes.js';

const router = Router();
const TABLE = 'incentive_programs';

/**
 * @swagger
 * /api/programs:
 *   get:
 *     tags:
 *       - Programs
 *     summary: List all incentive programs
 *     description: Returns every incentive program in the system.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of incentive programs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: Q3 Auto Policy Growth Bonus
 *                   description:
 *                     type: string
 *                     example: Rewards agents who exceed quarterly auto policy sales targets
 *                   start_date:
 *                     type: string
 *                     format: date
 *                     example: "2025-07-01"
 *                   end_date:
 *                     type: string
 *                     format: date
 *                     example: "2025-09-30"
 *                   is_active:
 *                     type: boolean
 *                     example: true
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Database connection failed
 */
router.get('/', async (_req, res) => {
  try {
    const rows = await findAll(TABLE);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/programs/{id}:
 *   get:
 *     tags:
 *       - Programs
 *     summary: Get a single incentive program
 *     description: Returns one incentive program by its unique ID.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Program ID
 *         example: 1
 *     responses:
 *       200:
 *         description: The requested program
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 name:
 *                   type: string
 *                   example: Q3 Auto Policy Growth Bonus
 *                 description:
 *                   type: string
 *                   example: Rewards agents who exceed quarterly auto policy sales targets
 *                 start_date:
 *                   type: string
 *                   format: date
 *                   example: "2025-07-01"
 *                 end_date:
 *                   type: string
 *                   format: date
 *                   example: "2025-09-30"
 *                 is_active:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       404:
 *         description: Program not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Program not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Database connection failed
 */
router.get('/:id', async (req, res) => {
  try {
    const row = await findById(TABLE, req.params.id);
    if (!row) return res.status(404).json(apiError('VAL_006', { field: 'program' }));
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/programs:
 *   post:
 *     tags:
 *       - Programs
 *     summary: Create a new incentive program
 *     description: Inserts a new incentive program record and returns it.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Q3 Auto Policy Growth Bonus
 *               description:
 *                 type: string
 *                 example: Rewards agents who exceed quarterly auto policy sales targets
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-07-01"
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-09-30"
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Program created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 5
 *                 name:
 *                   type: string
 *                   example: Q3 Auto Policy Growth Bonus
 *                 description:
 *                   type: string
 *                   example: Rewards agents who exceed quarterly auto policy sales targets
 *                 start_date:
 *                   type: string
 *                   format: date
 *                   example: "2025-07-01"
 *                 end_date:
 *                   type: string
 *                   format: date
 *                   example: "2025-09-30"
 *                 is_active:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Database connection failed
 */
router.post('/', async (req, res) => {
  try {
    const row = await insertRow(TABLE, req.body);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/programs/{id}:
 *   put:
 *     tags:
 *       - Programs
 *     summary: Update an incentive program
 *     description: Updates the specified incentive program and returns the updated record.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Program ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Q4 Homeowners Retention Incentive
 *               description:
 *                 type: string
 *                 example: Encourages policy renewals for homeowners coverage
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-01"
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-31"
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Program updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 name:
 *                   type: string
 *                   example: Q4 Homeowners Retention Incentive
 *                 description:
 *                   type: string
 *                   example: Encourages policy renewals for homeowners coverage
 *                 start_date:
 *                   type: string
 *                   format: date
 *                   example: "2025-10-01"
 *                 end_date:
 *                   type: string
 *                   format: date
 *                   example: "2025-12-31"
 *                 is_active:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       404:
 *         description: Program not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Program not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Database connection failed
 */
router.put('/:id', async (req, res) => {
  try {
    const row = await updateRow(TABLE, req.params.id, req.body);
    if (!row) return res.status(404).json(apiError('VAL_006', { field: 'program' }));
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/programs/{id}:
 *   delete:
 *     tags:
 *       - Programs
 *     summary: Delete an incentive program
 *     description: Removes the specified incentive program and returns the deleted record.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Program ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Program deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 name:
 *                   type: string
 *                   example: Q3 Auto Policy Growth Bonus
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       404:
 *         description: Program not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Program not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Database connection failed
 */
router.delete('/:id', async (req, res) => {
  try {
    const row = await deleteRow(TABLE, req.params.id);
    if (!row) return res.status(404).json(apiError('VAL_006', { field: 'program' }));
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
