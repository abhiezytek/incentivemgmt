import 'dotenv/config';
import express from 'express';
import cors from 'cors';

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
import { startSftpPollers } from './src/jobs/sftpPoller.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startSftpPollers();
});

export default app;
