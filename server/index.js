import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

import uploadRouter from './src/routes/upload.js';
import programsRouter from './src/routes/programs.js';
import kpisRouter from './src/routes/kpis.js';
import payoutsRouter from './src/routes/payouts.js';
import calculateRouter from './src/routes/calculate.js';
import groupsRouter from './src/routes/groups.js';
import incentiveResultsRouter from './src/routes/incentiveResults.js';
import leaderboardRouter from './src/routes/leaderboard.js';
import dashboardRouter from './src/routes/dashboard.js';
import performanceRouter from './src/routes/performance.js';
import derivedVariablesRouter from './src/routes/derivedVariables.js';
import policyTransactionsRouter from './src/routes/policyTransactions.js';
import agentsRouter from './src/routes/agents.js';
import persistencyDataRouter from './src/routes/persistencyData.js';
import productsRouter from './src/routes/products.js';
import incentiveRatesRouter from './src/routes/incentiveRates.js';
import pentaRouter        from './src/routes/integration/penta.js';
import lifeAsiaRouter     from './src/routes/integration/lifeasia.js';
import exportRouter       from './src/routes/integration/export.js';
import integrationStatus  from './src/routes/integration/status.js';
import systemTokenRouter  from './src/routes/auth/systemToken.js';
import systemAuth         from './src/middleware/systemAuth.js';
import userAuth           from './src/middleware/userAuth.js';
import maskResponse       from './src/middleware/maskResponse.js';
import { startSftpPollers } from './src/jobs/sftpPoller.js';
import { startHierarchySync } from './src/jobs/hierarchySync.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(maskResponse);

// --- Swagger UI at /api/docs ---
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const specPath   = join(__dirname, '..', 'docs', 'api', 'openapi.yaml');
const swaggerDoc = YAML.parse(readFileSync(specPath, 'utf8'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
  customSiteTitle: 'Incentive Mgmt API Docs',
}));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/upload',             uploadRouter);
app.use('/api/programs',           programsRouter);
app.use('/api/kpis',               kpisRouter);
app.use('/api/payouts',            payoutsRouter);
app.use('/api/calculate',          calculateRouter);
app.use('/api/groups',             groupsRouter);
app.use('/api/incentive-results',  incentiveResultsRouter);
app.use('/api/leaderboard',        leaderboardRouter);
app.use('/api/dashboard',          dashboardRouter);
app.use('/api/performance',        performanceRouter);
app.use('/api/derived-variables',  derivedVariablesRouter);
app.use('/api/policy-transactions', policyTransactionsRouter);
app.use('/api/agents',             agentsRouter);
app.use('/api/persistency-data',   persistencyDataRouter);
app.use('/api/products',           productsRouter);
app.use('/api/incentive-rates',    incentiveRatesRouter);
app.use('/api/auth',                         systemTokenRouter);
app.use('/api/integration/penta',  systemAuth, pentaRouter);
app.use('/api/integration/lifeasia', systemAuth, lifeAsiaRouter);
app.use('/api/integration/export', userAuth,   exportRouter);
app.use('/api/integration',        userAuth,   integrationStatus);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startSftpPollers();
  startHierarchySync();
});

export default app;
