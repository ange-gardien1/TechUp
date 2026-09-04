import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import crypto from 'node:crypto';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const { db } = require('./src/db/client');
const { users, products, repairRequests, serviceCategories, orders, payments, notifications, repairQuotes } = require('./src/db/schema');
const { eq, desc } = require('drizzle-orm');
const {
  approveRepairQuote,
  assignRepairRequest,
  cancelRepairRequest,
  completeRepair,
  confirmServiceFee,
  createRepairQuote,
  createRepairRequest,
  escalateRepairRequestToAdmin,
  finalizePayment,
  rejectIncompleteRequest,
  rejectRepairQuote,
  setRepairSchedule,
  submitRating,
} = require('./src/db/workflow');
const { getAdminDashboardSummary, getDashboardSummary, getManagerDashboardSummary, getTechnicianDashboardSummary, initializeDatabase } = require('./src/db/operations');

const app = express();
const allowedRoles = ['customer', 'technician', 'manager', 'admin'] as const;

app.use(cors());
app.use(bodyParser.json());

function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function normalizeRole(_role: unknown) {
  return 'customer';
}

function sanitizeUser(row: any) {
  return {
    id: row.id,
    fullName: row.full_name ?? row.fullName,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
  };
}

async function seedDefaultUsers() {
  const existing = await db.select().from(users);
  if (existing.length > 0) {
    return;
  }

  const adminPasswordHash = hashPassword('Password123');
  const customerPasswordHash = hashPassword('Password123');
  const technicianPasswordHash = hashPassword('Password123');
  const managerPasswordHash = hashPassword('Password123');

  await db.insert(users).values([
    {
      fullName: 'System Administrator',
      email: 'admin@teckup.com',
      passwordHash: adminPasswordHash,
      phone: '+250788000001',
      role: 'admin',
      status: 'active',
      isVerified: true,
    },
    {
      fullName: 'Maya Customer',
      email: 'customer@teckup.com',
      passwordHash: customerPasswordHash,
      phone: '+250788000002',
      role: 'customer',
      status: 'active',
      isVerified: true,
    },
    {
      fullName: 'Kevin Technician',
      email: 'technician@teckup.com',
      passwordHash: technicianPasswordHash,
      phone: '+250788000003',
      role: 'technician',
      status: 'active',
      isVerified: true,
    },
    {
      fullName: 'Alice Manager',
      email: 'manager@teckup.com',
      passwordHash: managerPasswordHash,
      phone: '+250788000004',
      role: 'manager',
      status: 'active',
      isVerified: true,
    },
  ]);
}

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'TeckUP API', version: '1.0.0' });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/database/summary', async (_req, res) => {
  try {
    await initializeDatabase();
    await seedDefaultUsers();
    const summary = await getDashboardSummary();
    res.json(summary);
  } catch (error) {
    console.error('Database summary error', error);
    res.status(500).json({ error: 'Unable to load database summary' });
  }
});

app.get('/admin/dashboard', async (_req, res) => {
  try {
    await initializeDatabase();
    await seedDefaultUsers();
    const summary = await getAdminDashboardSummary();
    res.json(summary);
  } catch (error) {
    console.error('Admin dashboard error', error);
    res.status(500).json({ error: 'Unable to load admin dashboard' });
  }
});

app.get('/manager/dashboard', async (_req, res) => {
  try {
    await initializeDatabase();
    await seedDefaultUsers();
    const summary = await getManagerDashboardSummary();
    res.json(summary);
  } catch (error) {
    console.error('Manager dashboard error', error);
    res.status(500).json({ error: 'Unable to load manager dashboard' });
  }
});

app.get('/technician/dashboard/:id', async (req, res) => {
  try {
    const technicianId = Number(req.params.id);
    const summary = await getTechnicianDashboardSummary(technicianId);
    res.json(summary);
  } catch (error) {
    console.error('Technician dashboard error', error);
    res.status(500).json({ error: 'Unable to load technician dashboard' });
  }
});

app.patch('/admin/repair-requests/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const nextStatus = String(req.body?.status ?? 'under_review');

    const [row] = await db.update(repairRequests)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
        paymentStatus: nextStatus === 'approved' ? 'pending' : repairRequests.paymentStatus,
      })
      .where(eq(repairRequests.id, id))
      .returning();

    if (!row) {
      return res.status(404).json({ error: 'Repair request not found.' });
    }

    res.json(row);
  } catch (error) {
    console.error('Admin repair request update error', error);
    res.status(500).json({ error: 'Unable to update repair request.' });
  }
});

app.post('/auth/register', async (req, res) => {
  try {
    const fullName = String(req.body?.fullName ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const phone = String(req.body?.phone ?? '').trim();
    const role = normalizeRole(req.body?.role);

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }

    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const result = await db.insert(users).values({
      fullName,
      email,
      passwordHash: hashPassword(password),
      phone: phone || null,
      role,
      status: 'active',
      isVerified: true,
    }).returning();

    return res.status(201).json({ user: sanitizeUser(result[0]) });
  } catch (error) {
    console.error('Register error', error);
    return res.status(500).json({ error: 'Unable to create account.' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await db.select().from(users).where(eq(users.email, email));
    const account = result[0];

    if (!account || account.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    return res.json({ user: sanitizeUser(account) });
  } catch (error) {
    console.error('Login error', error);
    return res.status(500).json({ error: 'Unable to sign in.' });
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
  const payload = {
    ...req.body,
    status: req.body?.status ?? 'submitted',
    paymentStatus: req.body?.paymentStatus ?? 'pending',
    serviceFee: Number(req.body?.serviceFee ?? 0),
  };

  const row = await createRepairRequest(payload);
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

app.post('/repair-requests/:id/schedule', async (req, res) => {
  try {
    const repairRequestId = Number(req.params.id);
    const [request] = await db.select().from(repairRequests).where(eq(repairRequests.id, repairRequestId));

    if (!request) {
      return res.status(404).json({ error: 'Repair request not found.' });
    }

    const currentStatus = String(request.status ?? 'submitted').toLowerCase();
    if (['completed', 'cancelled', 'rejected'].includes(currentStatus)) {
      return res.status(400).json({ error: 'This request cannot be scheduled because it is already closed.' });
    }

    const technicianId = req.body?.technicianId != null ? Number(req.body.technicianId) : request.technicianId ?? null;
    const preferredTime = String(req.body?.preferredTime ?? request.preferredTime ?? 'To be confirmed');
    const note = String(req.body?.note ?? 'Schedule confirmed by the team.');

    const row = await setRepairSchedule(repairRequestId, preferredTime, technicianId, note);
    return res.json(row);
  } catch (error) {
    console.error('Schedule repair request error', error);
    return res.status(500).json({ error: 'Unable to schedule repair request.' });
  }
});

app.post('/repair-requests/:id/reject-incomplete', async (req, res) => {
  const row = await rejectIncompleteRequest(Number(req.params.id), String(req.body.reason ?? 'Missing customer information.'));
  res.json(row);
});

app.post('/repair-requests/:id/cancel', async (req, res) => {
  const row = await cancelRepairRequest(Number(req.params.id), String(req.body?.reason ?? 'Customer stopped this request.'));
  res.json(row);
});

app.post('/repair-requests/:id/escalate', async (req, res) => {
  const row = await escalateRepairRequestToAdmin(Number(req.params.id), String(req.body?.reason ?? 'Escalated by manager for admin review.'));
  res.json(row);
});

app.post('/repair-requests/:id/pay-service-fee', async (req, res) => {
  const row = await confirmServiceFee(Number(req.params.id));
  res.json(row);
});

app.get('/repair-requests/:id/quotes', async (req, res) => {
  const repairRequestId = Number(req.params.id);
  const rows = await db.select().from(repairQuotes).where(eq(repairQuotes.repairRequestId, repairRequestId)).orderBy(desc(repairQuotes.createdAt));
  res.json({ quote: rows[0] ?? null });
});

app.post('/repair-requests/:id/quotes', async (req, res) => {
  const repairRequestId = Number(req.params.id);
  const requestRow = await db.select().from(repairRequests).where(eq(repairRequests.id, repairRequestId));
  const request = requestRow[0];

  if (!request) {
    return res.status(404).json({ error: 'Repair request not found.' });
  }

  const currentStatus = String(request.status ?? 'submitted').toLowerCase();
  if (!['scheduled', 'customer_approval'].includes(currentStatus)) {
    return res.status(400).json({ error: 'This request must be reviewed, assigned, and scheduled before a quotation can be sent.' });
  }

  const row = await createRepairQuote(repairRequestId, Number(req.body.technicianId), req.body);
  res.json(row);
});

app.get('/notifications/:userId', async (req, res) => {
  const rows = await db.select().from(notifications).where(eq(notifications.userId, Number(req.params.userId))).orderBy(desc(notifications.createdAt));
  res.json(rows);
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
