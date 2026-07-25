import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { db } from './src/db/client';
import { users, products, repairRequests, serviceCategories, orders, payments } from './src/db/schema';
import { eq } from 'drizzle-orm';
import {
  approveRepairQuote,
  assignRepairRequest,
  completeRepair,
  confirmServiceFee,
  createRepairQuote,
  createRepairRequest,
  finalizePayment,
  rejectRepairQuote,
  submitRating,
} from './src/db/workflow';
import { getDashboardSummary, initializeDatabase } from './src/db/operations';

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'TeckUP API', version: '1.0.0' });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/database/summary', async (_req, res) => {
  try {
    await initializeDatabase();
    const summary = await getDashboardSummary();
    res.json(summary);
  } catch (error) {
    console.error('Database summary error', error);
    res.status(500).json({ error: 'Unable to load database summary' });
  }
});

app.get('/users', async (_req, res) => {
  const rows = await db.select().from(users);
  res.json(rows);
});

app.post('/users', async (req, res) => {
  const row = await db.insert(users).values(req.body).returning();
  res.json(row[0]);
});

app.get('/users/:id', async (req, res) => {
  const row = await db.select().from(users).where(eq(users.id, Number(req.params.id)));
  res.json(row[0] ?? null);
});

app.put('/users/:id', async (req, res) => {
  const row = await db.update(users).set(req.body).where(eq(users.id, Number(req.params.id))).returning();
  res.json(row[0]);
});

app.delete('/users/:id', async (req, res) => {
  await db.delete(users).where(eq(users.id, Number(req.params.id)));
  res.json({ deleted: true });
});

app.get('/repair-requests', async (_req, res) => {
  const rows = await db.select().from(repairRequests);
  res.json(rows);
});

app.post('/repair-requests', async (req, res) => {
  const row = await createRepairRequest(req.body);
  res.json(row);
});

app.get('/repair-requests/:id', async (req, res) => {
  const row = await db.select().from(repairRequests).where(eq(repairRequests.id, Number(req.params.id)));
  res.json(row[0] ?? null);
});

app.put('/repair-requests/:id', async (req, res) => {
  const row = await db.update(repairRequests).set(req.body).where(eq(repairRequests.id, Number(req.params.id))).returning();
  res.json(row[0]);
});

app.post('/repair-requests/:id/assign', async (req, res) => {
  const row = await assignRepairRequest(Number(req.params.id), Number(req.body.technicianId), Number(req.body.serviceFee ?? 2000));
  res.json(row);
});

app.post('/repair-requests/:id/pay-service-fee', async (req, res) => {
  const row = await confirmServiceFee(Number(req.params.id));
  res.json(row);
});

app.post('/repair-requests/:id/quotes', async (req, res) => {
  const row = await createRepairQuote(Number(req.params.id), Number(req.body.technicianId), req.body);
  res.json(row);
});

app.post('/repair-requests/:id/approve-quote', async (req, res) => {
  const row = await approveRepairQuote(Number(req.params.id));
  res.json(row);
});

app.post('/repair-requests/:id/reject-quote', async (req, res) => {
  const row = await rejectRepairQuote(Number(req.params.id));
  res.json(row);
});

app.post('/repair-requests/:id/complete', async (req, res) => {
  const row = await completeRepair(Number(req.params.id), req.body.notes ?? 'Repair completed', req.body.photoUrl);
  res.json(row);
});

app.post('/repair-requests/:id/final-payment', async (req, res) => {
  const row = await finalizePayment(Number(req.params.id), Number(req.body.amount), req.body.paymentMethod ?? 'cash');
  res.json(row);
});

app.post('/repair-requests/:id/ratings', async (req, res) => {
  const row = await submitRating(Number(req.params.id), Number(req.body.customerId), Number(req.body.technicianId), Number(req.body.score), req.body.comment);
  res.json(row);
});

app.delete('/repair-requests/:id', async (req, res) => {
  await db.delete(repairRequests).where(eq(repairRequests.id, Number(req.params.id)));
  res.json({ deleted: true });
});

app.get('/products', async (_req, res) => {
  const rows = await db.select().from(products);
  res.json(rows);
});

app.post('/products', async (req, res) => {
  const row = await db.insert(products).values(req.body).returning();
  res.json(row[0]);
});

app.get('/products/:id', async (req, res) => {
  const row = await db.select().from(products).where(eq(products.id, Number(req.params.id)));
  res.json(row[0] ?? null);
});

app.put('/products/:id', async (req, res) => {
  const row = await db.update(products).set(req.body).where(eq(products.id, Number(req.params.id))).returning();
  res.json(row[0]);
});

app.delete('/products/:id', async (req, res) => {
  await db.delete(products).where(eq(products.id, Number(req.params.id)));
  res.json({ deleted: true });
});

app.get('/service-categories', async (_req, res) => {
  const rows = await db.select().from(serviceCategories);
  res.json(rows);
});

app.post('/service-categories', async (req, res) => {
  const row = await db.insert(serviceCategories).values(req.body).returning();
  res.json(row[0]);
});

app.get('/orders', async (_req, res) => {
  const rows = await db.select().from(orders);
  res.json(rows);
});

app.post('/orders', async (req, res) => {
  const row = await db.insert(orders).values(req.body).returning();
  res.json(row[0]);
});

app.get('/payments', async (_req, res) => {
  const rows = await db.select().from(payments);
  res.json(rows);
});

app.post('/payments', async (req, res) => {
  const row = await db.insert(payments).values(req.body).returning();
  res.json(row[0]);
});

const port = process.env.PORT ?? 4000;
app.listen(port, () => {
  console.log(`TeckUP API running on port ${port}`);
});
