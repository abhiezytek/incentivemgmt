import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './src/config/swagger.js';

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
import reviewAdjustmentsRouter from './src/routes/reviewAdjustments.js';
import exceptionLogRouter      from './src/routes/exceptionLog.js';
import executiveSummaryRouter  from './src/routes/executiveSummary.js';
import systemStatusRouter      from './src/routes/systemStatus.js';
import notificationsRouter     from './src/routes/notifications.js';
import orgDomainMappingRouter  from './src/routes/orgDomainMapping.js';
import kpiConfigRouter         from './src/routes/kpiConfig.js';
import { startSftpPollers } from './src/jobs/sftpPoller.js';
import { startHierarchySync } from './src/jobs/hierarchySync.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(maskResponse);

// --- Swagger UI at /api/docs ---
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Incentive System API Docs',
  customCss: '.swagger-ui .topbar { background-color: #0D9488; }',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
  },
}));

// Expose raw JSON spec
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// --- v1 routes (stable) ---
app.use('/api/v1/upload',              uploadRouter);
app.use('/api/v1/programs',            programsRouter);
app.use('/api/v1/kpis',                kpisRouter);
app.use('/api/v1/payouts',             payoutsRouter);
app.use('/api/v1/calculate',           calculateRouter);
app.use('/api/v1/groups',              groupsRouter);
app.use('/api/v1/incentive-results',   incentiveResultsRouter);
app.use('/api/v1/leaderboard',         leaderboardRouter);
app.use('/api/v1/dashboard',           dashboardRouter);
app.use('/api/v1/performance',         performanceRouter);
app.use('/api/v1/derived-variables',   derivedVariablesRouter);
app.use('/api/v1/policy-transactions', policyTransactionsRouter);
app.use('/api/v1/agents',              agentsRouter);
app.use('/api/v1/persistency-data',    persistencyDataRouter);
app.use('/api/v1/products',            productsRouter);
app.use('/api/v1/incentive-rates',     incentiveRatesRouter);
app.use('/api/v1/auth',                systemTokenRouter);
app.use('/api/v1/integration/penta',   systemAuth, pentaRouter);
app.use('/api/v1/integration/lifeasia', systemAuth, lifeAsiaRouter);
app.use('/api/v1/integration/export',  userAuth,   exportRouter);
app.use('/api/v1/integration',         userAuth,   integrationStatus);
app.use('/api/v1/review-adjustments',  userAuth,   reviewAdjustmentsRouter);
app.use('/api/v1/exception-log',       userAuth,   exceptionLogRouter);
app.use('/api/v1/dashboard',           executiveSummaryRouter);
app.use('/api/v1/system-status',       userAuth,   systemStatusRouter);
app.use('/api/v1/notifications',       userAuth,   notificationsRouter);
app.use('/api/v1/org-domain-mapping',  userAuth,   orgDomainMappingRouter);
app.use('/api/v1/kpi-config',          userAuth,   kpiConfigRouter);

// --- Unversioned aliases (default to v1 for backward compatibility) ---
app.use('/api/upload',              uploadRouter);
app.use('/api/programs',            programsRouter);
app.use('/api/kpis',                kpisRouter);
app.use('/api/payouts',             payoutsRouter);
app.use('/api/calculate',           calculateRouter);
app.use('/api/groups',              groupsRouter);
app.use('/api/incentive-results',   incentiveResultsRouter);
app.use('/api/leaderboard',         leaderboardRouter);
app.use('/api/dashboard',           dashboardRouter);
app.use('/api/performance',         performanceRouter);
app.use('/api/derived-variables',   derivedVariablesRouter);
app.use('/api/policy-transactions', policyTransactionsRouter);
app.use('/api/agents',              agentsRouter);
app.use('/api/persistency-data',    persistencyDataRouter);
app.use('/api/products',            productsRouter);
app.use('/api/incentive-rates',     incentiveRatesRouter);
app.use('/api/auth',                systemTokenRouter);
app.use('/api/integration/penta',   systemAuth, pentaRouter);
app.use('/api/integration/lifeasia', systemAuth, lifeAsiaRouter);
app.use('/api/integration/export',  userAuth,   exportRouter);
app.use('/api/integration',         userAuth,   integrationStatus);
app.use('/api/review-adjustments',  userAuth,   reviewAdjustmentsRouter);
app.use('/api/exception-log',       userAuth,   exceptionLogRouter);
app.use('/api/dashboard',           executiveSummaryRouter);
app.use('/api/system-status',       userAuth,   systemStatusRouter);
app.use('/api/notifications',       userAuth,   notificationsRouter);
app.use('/api/org-domain-mapping',  userAuth,   orgDomainMappingRouter);
app.use('/api/kpi-config',          userAuth,   kpiConfigRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startSftpPollers();
  startHierarchySync();
});

export default app;
