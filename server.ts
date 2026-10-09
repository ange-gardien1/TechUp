import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import crypto from 'node:crypto';
import { db } from './src/db/client';
import { customerProfiles, users } from './src/db/schema';

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

const { products, repairRequests, repairUpdates, serviceCategories, orders, payments, notifications, repairQuotes, ratings } = require('./src/db/schema');
const { and, eq, desc, inArray } = require('drizzle-orm');
const {
  addTechnicianRepairNote,
  acceptCustomerSchedule,
  approveRepairQuote,
  assignRepairRequest,
  cancelRepairRequest,
  closeRepairRequest,
  completeRepair,
  confirmServiceFee,
  createRepairQuote,
  createRepairRequest,
  escalateRepairRequestToAdmin,
  finalizePayment,
  rejectIncompleteRequest,
  rejectCustomerSchedule,
  rejectRepairQuote,
  setRepairSchedule,
  submitRating,
} = require('./src/db/workflow');
const { getAdminDashboardSummary, getDashboardSummary, getManagerDashboardSummary, getTechnicianDashboardSummary, initializeDatabase } = require('./src/db/operations');

const app = express();
const allowedRoles = ['customer', 'technician', 'manager', 'admin'] as const;
const TECHUP_SUPPORT_PHONE = '0782245728';

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
    isVerified: row.is_verified ?? row.isVerified,
    createdAt: row.created_at ?? row.createdAt,
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

app.get('/admin/dashboard', async (req, res) => {
  try {
    await initializeDatabase();
    const adminId = Number(req.query.userId);
    const [admin] = await db.select().from(users).where(eq(users.id, adminId));
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only an admin can load the admin dashboard.' });
    }
    await seedDefaultUsers();
    const summary = await getAdminDashboardSummary();
    res.json(summary);
  } catch (error) {
    console.error('Admin dashboard error', error);
    res.status(500).json({ error: 'Unable to load admin dashboard' });
  }
});

app.get('/manager/dashboard', async (req, res) => {
  try {
    await initializeDatabase();
    const managerId = Number(req.query.userId);
    const [manager] = await db.select().from(users).where(eq(users.id, managerId));
    if (!manager || manager.role !== 'manager') {
      return res.status(403).json({ error: 'Only a manager can load the manager dashboard.' });
    }

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
    await initializeDatabase();
    const technicianId = Number(req.params.id);
    const [technician] = await db.select().from(users).where(eq(users.id, technicianId));
    if (!technician || technician.role !== 'technician') {
      return res.status(403).json({ error: 'Only a technician can load an assigned-job dashboard.' });
    }

    const summary = await getTechnicianDashboardSummary(technicianId);
    res.json(summary);
  } catch (error) {
    console.error('Technician dashboard error', error);
    res.status(500).json({ error: 'Unable to load technician dashboard' });
  }
});

app.patch('/admin/repair-requests/:id/status', async (req, res) => {
  try {
    return res.status(403).json({ error: 'Repair requests must be reviewed and assigned by a manager.' });
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

app.get('/users/:id/profile', async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(400).json({ error: 'A valid user ID is required.' });
  }

  try {
    const [account] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!account) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const [customerProfile] = account.role === 'customer'
      ? await db.select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1)
      : [];

    return res.json({
      user: sanitizeUser(account),
      customerProfile: customerProfile
        ? {
            address: customerProfile.address,
            city: customerProfile.city,
            emergencyContactName: customerProfile.emergencyContactName,
            emergencyContactPhone: customerProfile.emergencyContactPhone,
            preferredLanguage: customerProfile.preferredLanguage,
          }
        : null,
    });
  } catch (error) {
    console.error('User profile lookup error', error);
    return res.status(500).json({ error: 'Unable to load user profile.' });
  }
});

app.put('/users/:id/profile', async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(400).json({ error: 'A valid user ID is required.' });
  }

  const body = req.body;
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
  const profileFields = [
    ['address', 'address', 300],
    ['city', 'city', 100],
    ['emergencyContactName', 'emergencyContactName', 120],
    ['emergencyContactPhone', 'emergencyContactPhone', 40],
  ] as const;
  const customerProfileUpdate: {
    address?: string | null;
    city?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    preferredLanguage?: string;
  } = {};

  if (!fullName || fullName.length > 120) {
    return res.status(400).json({ error: 'Full name is required and must be 120 characters or fewer.' });
  }
  if (phone.length > 40) {
    return res.status(400).json({ error: 'Phone number must be 40 characters or fewer.' });
  }

  for (const [inputKey, profileKey, maxLength] of profileFields) {
    if (body?.[inputKey] === undefined) continue;
    const value = body[inputKey];
    if (value !== null && typeof value !== 'string') {
      return res.status(400).json({ error: `Invalid ${inputKey}.` });
    }
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (normalized.length > maxLength) {
      return res.status(400).json({ error: `${inputKey} must be ${maxLength} characters or fewer.` });
    }
    customerProfileUpdate[profileKey] = normalized || null;
  }

  if (body?.preferredLanguage !== undefined) {
    if (!['en', 'fr', 'rw'].includes(body.preferredLanguage)) {
      return res.status(400).json({ error: 'Preferred language must be English, French, or Kinyarwanda.' });
    }
    customerProfileUpdate.preferredLanguage = body.preferredLanguage;
  }

  try {
    const [account] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!account) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    if (account.role !== 'customer' && Object.keys(customerProfileUpdate).length > 0) {
      return res.status(400).json({ error: 'Customer details are only available for customer accounts.' });
    }

    const result = await db.transaction(async (tx) => {
      const [updatedAccount] = await tx.update(users)
        .set({ fullName, phone: phone || null, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      if (Object.keys(customerProfileUpdate).length > 0) {
        const [existingProfile] = await tx.select().from(customerProfiles)
          .where(eq(customerProfiles.userId, userId))
          .limit(1);

        if (existingProfile) {
          await tx.update(customerProfiles)
            .set(customerProfileUpdate)
            .where(eq(customerProfiles.id, existingProfile.id));
        } else {
          await tx.insert(customerProfiles).values({
            userId,
            ...customerProfileUpdate,
          });
        }
      }

      const [updatedCustomerProfile] = updatedAccount.role === 'customer'
        ? await tx.select().from(customerProfiles).where(eq(customerProfiles.userId, userId)).limit(1)
        : [];

      return { account: updatedAccount, customerProfile: updatedCustomerProfile };
    });

    return res.json({
      user: sanitizeUser(result.account),
      customerProfile: result.customerProfile
        ? {
            address: result.customerProfile.address,
            city: result.customerProfile.city,
            emergencyContactName: result.customerProfile.emergencyContactName,
            emergencyContactPhone: result.customerProfile.emergencyContactPhone,
            preferredLanguage: result.customerProfile.preferredLanguage,
          }
        : null,
    });
  } catch (error) {
    console.error('User profile update error', error);
    return res.status(500).json({ error: 'Unable to save user profile.' });
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

app.get('/repair-requests', async (req, res) => {
  const userId = Number(req.query.userId);
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    return res.status(401).json({ error: 'A valid user id is required to view repair requests.' });
  }

  const rows = user.role === 'manager' || user.role === 'admin'
    ? await db.select().from(repairRequests)
    : user.role === 'technician'
      ? await db.select().from(repairRequests).where(eq(repairRequests.technicianId, user.id))
      : await db.select().from(repairRequests).where(eq(repairRequests.customerId, user.id));
  res.json(rows);
});

app.get('/customers/:id/rated-repair-requests', async (req, res) => {
  const rows = await db.select({ repairRequestId: ratings.repairRequestId })
    .from(ratings)
    .where(eq(ratings.customerId, Number(req.params.id)));
  const repairRequestIds = [...new Set(rows.map((row: { repairRequestId: number }) => row.repairRequestId))];

  if (repairRequestIds.length > 0) {
    await db.update(repairRequests)
      .set({ status: 'closed', updatedAt: new Date() })
      .where(and(
        eq(repairRequests.status, 'completed'),
        inArray(repairRequests.id, repairRequestIds),
      ));
  }

  res.json(repairRequestIds);
});

app.post('/repair-requests', async (req, res) => {
  try {
    const customerId = Number(req.body?.customerId);
    const [customer] = await db.select().from(users).where(eq(users.id, customerId));
    if (!customer || customer.role !== 'customer') {
      return res.status(403).json({ error: 'Only a customer can submit a repair request.' });
    }

    const row = await createRepairRequest({
      customerId,
      deviceType: String(req.body?.deviceType ?? ''),
      brand: req.body?.brand,
      model: req.body?.model,
      issueDescription: String(req.body?.issueDescription ?? ''),
      serviceAddress: req.body?.serviceAddress,
      latitude: req.body?.latitude,
      longitude: req.body?.longitude,
      preferredTime: req.body?.preferredTime,
      images: req.body?.images,
      status: 'submitted',
      paymentStatus: 'pending',
      serviceFee: 0,
    });
    return res.json(row);
  } catch (error) {
    console.error('Create repair request error', error);
    return res.status(500).json({ error: 'Unable to submit the repair request.' });
  }
});

app.get('/repair-requests/:id', async (req, res) => {
  const userId = Number(req.query.userId);
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    return res.status(401).json({ error: 'A valid user id is required to view this repair request.' });
  }

  const [request] = await db.select().from(repairRequests).where(eq(repairRequests.id, Number(req.params.id)));
  const canView = request && (
    user.role === 'manager' ||
    user.role === 'admin' ||
    (user.role === 'customer' && request.customerId === user.id) ||
    (user.role === 'technician' && request.technicianId === user.id)
  );
  if (!canView) {
    return res.status(404).json({ error: 'Repair request not found.' });
  }
  return res.json(request);
});

app.get('/repair-requests/:id/quotes', async (req, res) => {
  const userId = Number(req.query.userId);
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    return res.status(401).json({ error: 'A valid user id is required to view this quotation.' });
  }

  const repairRequestId = Number(req.params.id);
  const [request] = await db.select().from(repairRequests).where(eq(repairRequests.id, repairRequestId));
  const canView = request && (
    user.role === 'manager' ||
    user.role === 'admin' ||
    (user.role === 'customer' && request.customerId === user.id) ||
    (user.role === 'technician' && request.technicianId === user.id)
  );
  if (!canView) {
    return res.status(404).json({ error: 'Repair request not found.' });
  }

  const rows = await db.select().from(repairQuotes)
    .where(eq(repairQuotes.repairRequestId, repairRequestId))
    .orderBy(desc(repairQuotes.createdAt));
  return res.json({ quote: rows[0] ?? null });
});

app.put('/repair-requests/:id', async (req, res) => {
  return res.status(405).json({ error: 'Use the role-specific repair request actions.' });
});

app.post('/repair-requests/:id/review', async (req, res) => {
  try {
    const managerId = Number(req.body?.userId);
    const [manager] = await db.select().from(users).where(eq(users.id, managerId));
    if (!manager || manager.role !== 'manager') {
      return res.status(403).json({ error: 'Only a manager can review a repair request.' });
    }

    const requestId = Number(req.params.id);
    const [request] = await db.select().from(repairRequests).where(eq(repairRequests.id, requestId));
    if (!request) {
      return res.status(404).json({ error: 'Repair request not found.' });
    }
    if (request.status !== 'submitted') {
      return res.status(409).json({ error: 'Only newly submitted requests can be moved into review.' });
    }

    const [reviewed] = await db.update(repairRequests)
      .set({ status: 'under_review', updatedAt: new Date() })
      .where(eq(repairRequests.id, requestId))
      .returning();
    if (request.customerId) {
      await db.insert(notifications).values({
        userId: request.customerId,
        title: 'Repair request under review',
        body: 'A manager is reviewing your repair request before assigning a technician.',
        type: 'repair',
        referenceId: request.id,
      });
    }
    return res.json(reviewed);
  } catch (error) {
    console.error('Review repair request error', error);
    return res.status(500).json({ error: 'Unable to review the repair request.' });
  }
});

app.post('/repair-requests/:id/assign', async (req, res) => {
  try {
    const managerId = Number(req.body?.userId);
    const [manager] = await db.select().from(users).where(eq(users.id, managerId));
    if (!manager || manager.role !== 'manager') {
      return res.status(403).json({ error: 'Only a manager can assign a technician.' });
    }

    const technicianId = Number(req.body?.technicianId);
    const [technician] = await db.select().from(users).where(eq(users.id, technicianId));
    if (!technician || technician.role !== 'technician') {
      return res.status(400).json({ error: 'Select a valid technician.' });
    }

    const requestId = Number(req.params.id);
    const [request] = await db.select().from(repairRequests).where(eq(repairRequests.id, requestId));
    if (!request) {
      return res.status(404).json({ error: 'Repair request not found.' });
    }
    if (!['under_review', 'technician_assigned', 'schedule_rejected'].includes(request.status)) {
      return res.status(409).json({ error: 'A manager must review this request before assigning a technician.' });
    }

    const row = await assignRepairRequest(requestId, technicianId, Number(req.body.serviceFee ?? 0));
    return res.json(row);
  } catch (error) {
    console.error('Assign technician error', error);
    return res.status(500).json({ error: 'Unable to assign a technician.' });
  }
});

app.post('/repair-requests/:id/schedule', async (req, res) => {
  try {
    const repairRequestId = Number(req.params.id);
    const [request] = await db.select().from(repairRequests).where(eq(repairRequests.id, repairRequestId));

    if (!request) {
      return res.status(404).json({ error: 'Repair request not found.' });
    }

    const userId = Number(req.body?.userId);
    const [technician] = await db.select().from(users).where(eq(users.id, userId));
    if (!technician || technician.role !== 'technician' || request.technicianId !== technician.id) {
      return res.status(403).json({ error: 'Only the assigned technician can schedule this repair.' });
    }

    const currentStatus = String(request.status ?? 'submitted').toLowerCase();
    if (!['technician_assigned', 'scheduled'].includes(currentStatus)) {
      return res.status(409).json({ error: 'The repair must be assigned to you before you can schedule it.' });
    }
    if (['completed', 'cancelled', 'rejected'].includes(currentStatus)) {
      return res.status(400).json({ error: 'This request cannot be scheduled because it is already closed.' });
    }

    const preferredTime = String(req.body?.preferredTime ?? '').trim();
    if (currentStatus === 'technician_assigned' && request.preferredTime) {
      return res.status(409).json({ error: 'Please accept or decline the customer preferred time.' });
    }
    if (!preferredTime) {
      return res.status(400).json({ error: 'Enter a date and time agreed with the customer.' });
    }
    const note = String(req.body?.note ?? 'The assigned technician confirmed this time with you.');

    const row = await setRepairSchedule(repairRequestId, preferredTime, technician.id, note);
    return res.json(row);
  } catch (error) {
    console.error('Schedule repair request error', error);
    return res.status(500).json({ error: 'Unable to schedule repair request.' });
  }
});

app.post('/repair-requests/:id/schedule/decision', async (req, res) => {
  try {
    const repairRequestId = Number(req.params.id);
    const userId = Number(req.body?.userId);
    const decision = String(req.body?.decision ?? '');
    const [technician] = await db.select().from(users).where(eq(users.id, userId));
    if (!technician || technician.role !== 'technician') {
      return res.status(403).json({ error: 'Only a technician can respond to a customer preferred time.' });
    }

    const [request] = await db.select().from(repairRequests).where(eq(repairRequests.id, repairRequestId));
    if (!request || request.technicianId !== technician.id) {
      return res.status(404).json({ error: 'This repair request is not assigned to you.' });
    }
    if (request.status !== 'technician_assigned' || !request.preferredTime) {
      return res.status(409).json({ error: 'There is no pending customer preferred time to respond to.' });
    }

    if (decision === 'accept') {
      const row = await acceptCustomerSchedule(repairRequestId, technician.id);
      return res.json(row);
    }
    if (decision === 'reject') {
      const row = await rejectCustomerSchedule(repairRequestId, technician.id);
      return res.json(row);
    }
    return res.status(400).json({ error: 'Choose whether to accept or decline the customer preferred time.' });
  } catch (error) {
    console.error('Respond to customer schedule error', error);
    return res.status(500).json({ error: 'Unable to respond to the customer preferred time.' });
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

app.post('/repair-requests/:id/diagnosis', async (req, res) => {
  try {
    await initializeDatabase();
    const repairRequestId = Number(req.params.id);
    const userId = Number(req.body?.userId ?? 0);
    const note = String(req.body?.note ?? '').trim();
    const diagnosis = String(req.body?.diagnosis ?? '').trim();

    if (!userId) {
      return res.status(400).json({ error: 'A technician user id is required.' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.role !== 'technician') {
      return res.status(403).json({ error: 'Only a technician can add a diagnosis update.' });
    }

    const [request] = await db.select().from(repairRequests).where(eq(repairRequests.id, repairRequestId));
    if (!request || request.technicianId !== user.id) {
      return res.status(403).json({ error: 'Only the assigned technician can update this repair request.' });
    }

    if (!note && !diagnosis) {
      return res.status(400).json({ error: 'A diagnosis note is required.' });
    }

    const update = await addTechnicianRepairNote(repairRequestId, userId, note || diagnosis, 'diagnosis_update');
    return res.json(update);
  } catch (error) {
    console.error('Technician diagnosis update error', error);
    return res.status(500).json({ error: 'Unable to save the diagnosis update.' });
  }
});

app.post('/repair-requests/:id/quotes', async (req, res) => {
  try {
    await initializeDatabase();
    const repairRequestId = Number(req.params.id);
    const [request] = await db.select().from(repairRequests).where(eq(repairRequests.id, repairRequestId));
    if (!request) {
      return res.status(404).json({ error: 'Repair request not found.' });
    }

    const userId = Number(req.body?.userId ?? 0);
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !['admin', 'manager'].includes(String(user.role ?? ''))) {
      return res.status(403).json({ error: 'Only an admin or manager can send a quotation.' });
    }

    const currentStatus = String(request.status ?? 'submitted').toLowerCase();
    if (!['scheduled', 'customer_approval'].includes(currentStatus)) {
      return res.status(400).json({ error: 'This request must be reviewed, assigned, and scheduled before a quotation can be sent.' });
    }

    const diagnosis = String(req.body?.diagnosis ?? '').trim();
    const partName = String(req.body?.partName ?? '').trim();
    const partCost = Number(req.body?.partCost ?? 0);
    const laborCost = Number(req.body?.laborCost);
    const partCondition = String(req.body?.partCondition ?? 'not_required');
    if (!diagnosis) {
      return res.status(400).json({ error: 'Enter the repair diagnosis before sending the quotation.' });
    }
    if (!Number.isFinite(laborCost) || laborCost < 0 || !Number.isFinite(partCost) || partCost < 0) {
      return res.status(400).json({ error: 'Part and labor costs must be valid non-negative amounts.' });
    }
    if (partName && !['new', 'second_hand'].includes(partCondition)) {
      return res.status(400).json({ error: 'Choose whether the replacement part is new or second-hand.' });
    }
    if (!partName && partCost !== 0) {
      return res.status(400).json({ error: 'Enter the replacement part name or set the part cost to zero.' });
    }

    const row = await createRepairQuote(
      repairRequestId,
      Number(req.body?.technicianId ?? request.technicianId ?? 0),
      {
        diagnosis,
        partName,
        partCondition: partCondition as 'new' | 'second_hand' | 'not_required',
        partCost,
        laborCost,
        contactPhone: TECHUP_SUPPORT_PHONE,
      },
    );
    return res.json(row);
  } catch (error) {
    console.error('Create repair quotation error', error);
    return res.status(500).json({ error: 'Unable to create the repair quotation.' });
  }
});

app.get('/notifications/:userId', async (req, res) => {
  const rows = await db.select().from(notifications).where(eq(notifications.userId, Number(req.params.userId))).orderBy(desc(notifications.createdAt));
  res.json(rows);
});

app.post('/notifications/:userId/read', async (req, res) => {
  const userId = Number(req.params.userId);
  const notificationIds = Array.isArray(req.body?.notificationIds)
    ? [...new Set(req.body.notificationIds.map(Number).filter(Number.isInteger))]
    : [];

  if (!userId || notificationIds.length === 0) {
    return res.json({ updated: 0 });
  }

  const updatedRows = await db.update(notifications)
    .set({ isRead: true })
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false),
      inArray(notifications.id, notificationIds),
    ))
    .returning({ id: notifications.id });

  res.json({ updated: updatedRows.length });
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
  try {
    const userId = Number(req.body?.userId ?? 0);
    let notes = String(req.body?.notes ?? '').trim();

    if (!userId) {
      return res.status(400).json({ error: 'A technician user id is required.' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.role !== 'technician') {
      return res.status(403).json({ error: 'Only a technician can complete a repair request.' });
    }

    const [request] = await db.select().from(repairRequests).where(eq(repairRequests.id, Number(req.params.id)));
    if (!request || request.technicianId !== user.id) {
      return res.status(403).json({ error: 'Only the assigned technician can complete this repair request.' });
    }

    if (!notes) {
      const [diagnosisUpdate] = await db.select({ message: repairUpdates.message })
        .from(repairUpdates)
        .where(and(
          eq(repairUpdates.repairRequestId, Number(req.params.id)),
          eq(repairUpdates.status, 'diagnosis_update'),
        ))
        .orderBy(desc(repairUpdates.createdAt))
        .limit(1);
      notes = diagnosisUpdate?.message.trim() ?? '';
    }

    if (!notes) {
      return res.status(400).json({ error: 'A completion note is required.' });
    }

    const row = await completeRepair(Number(req.params.id), notes, req.body.photoUrl);
    return res.json(row);
  } catch (error) {
    console.error('Complete repair request error', error);
    return res.status(500).json({ error: 'Unable to complete the repair request.' });
  }
});

app.post('/repair-requests/:id/close', async (req, res) => {
  try {
    const userId = Number(req.body?.userId ?? 0);
    const reason = String(req.body?.reason ?? 'Manager approved the repair completion and closed the request.');

    if (!userId) {
      return res.status(400).json({ error: 'A manager user id is required.' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.role !== 'manager') {
      return res.status(403).json({ error: 'Only a manager can approve closure.' });
    }

    const row = await closeRepairRequest(Number(req.params.id), userId, reason);
    return res.json(row);
  } catch (error) {
    console.error('Close repair request error', error);
    return res.status(500).json({ error: 'Unable to close the repair request.' });
  }
});

app.post('/repair-requests/:id/final-payment', async (req, res) => {
  const row = await finalizePayment(Number(req.params.id), Number(req.body.amount), req.body.paymentMethod ?? 'cash');
  res.json(row);
});

app.post('/repair-requests/:id/ratings', async (req, res) => {
  try {
    const repairRequestId = Number(req.params.id);
    const customerId = Number(req.body?.customerId ?? 0);
    const technicianId = Number(req.body?.technicianId ?? 0);
    const score = Number(req.body?.score ?? 0);
    const comment = String(req.body?.comment ?? '').trim();

    if (!customerId || !technicianId) {
      return res.status(400).json({ error: 'Customer and technician ids are required.' });
    }

    if (score < 1 || score > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    const [request] = await db.select().from(repairRequests).where(eq(repairRequests.id, repairRequestId));
    if (!request) {
      return res.status(404).json({ error: 'Repair request not found.' });
    }

    if (request.customerId !== customerId || request.technicianId !== technicianId) {
      return res.status(403).json({ error: 'This repair request cannot be rated by this customer.' });
    }

    if (!['completed', 'closed'].includes(String(request.status ?? '').toLowerCase())) {
      return res.status(409).json({ error: 'Only completed repair requests can be rated.' });
    }

    const [existingRating] = await db.select().from(ratings)
      .where(eq(ratings.repairRequestId, repairRequestId));
    if (existingRating) {
      return res.status(409).json({ error: 'This repair request has already been rated.' });
    }

    const row = await submitRating(repairRequestId, customerId, technicianId, score, comment || undefined);
    return res.json(row);
  } catch (error) {
    console.error('Submit rating error', error);
    return res.status(500).json({ error: 'Unable to submit technician rating.' });
  }
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
