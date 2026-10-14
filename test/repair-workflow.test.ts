import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizationFailure } from '../src/server/authorization';
import {
  formatRepairStatus,
  getRepairStatusIndex,
  isActiveTechnicianJob,
  repairStatusFlow,
} from '../src/lib/repairWorkflow';

const roles = ['customer', 'technician', 'manager', 'admin'] as const;
type Role = typeof roles[number];

const roleCases: Array<{ path: string; method: string; allowed: Role[] }> = [
  { path: '/admin/dashboard', method: 'GET', allowed: ['admin'] },
  { path: '/database/summary', method: 'GET', allowed: ['admin'] },
  { path: '/manager/dashboard', method: 'GET', allowed: ['manager'] },
  { path: '/technician/dashboard/42', method: 'GET', allowed: ['technician'] },
  { path: '/users', method: 'GET', allowed: ['admin'] },
  { path: '/users/42', method: 'GET', allowed: ['customer', 'technician', 'manager', 'admin'] },
  { path: '/users/42/profile', method: 'GET', allowed: ['customer', 'technician', 'manager', 'admin'] },
  { path: '/users/42/profile', method: 'PUT', allowed: ['customer', 'technician', 'manager', 'admin'] },
  { path: '/repair-requests', method: 'POST', allowed: ['customer'] },
  { path: '/repair-requests/13/review', method: 'POST', allowed: ['manager'] },
  { path: '/repair-requests/13/assign', method: 'POST', allowed: ['manager'] },
  { path: '/repair-requests/13/schedule', method: 'POST', allowed: ['technician'] },
  { path: '/repair-requests/13/schedule/decision', method: 'POST', allowed: ['technician'] },
  { path: '/repair-requests/13/reject-incomplete', method: 'POST', allowed: ['admin', 'manager'] },
  { path: '/repair-requests/13/cancel', method: 'POST', allowed: ['customer'] },
  { path: '/repair-requests/13/escalate', method: 'POST', allowed: ['admin', 'manager'] },
  { path: '/repair-requests/13/pay-service-fee', method: 'POST', allowed: ['customer'] },
  { path: '/repair-requests/13/diagnosis', method: 'POST', allowed: ['technician'] },
  { path: '/repair-requests/13/quotes', method: 'POST', allowed: ['admin', 'manager'] },
  { path: '/repair-requests/13/approve-quote', method: 'POST', allowed: ['customer'] },
  { path: '/repair-requests/13/reject-quote', method: 'POST', allowed: ['customer'] },
  { path: '/repair-requests/13/complete', method: 'POST', allowed: ['technician'] },
  { path: '/repair-requests/13/close', method: 'POST', allowed: ['manager'] },
  { path: '/repair-requests/13/final-payment', method: 'POST', allowed: ['admin', 'manager'] },
  { path: '/repair-requests/13/ratings', method: 'POST', allowed: ['customer'] },
  { path: '/products', method: 'POST', allowed: ['admin', 'manager'] },
  { path: '/service-categories', method: 'POST', allowed: ['admin', 'manager'] },
  { path: '/orders', method: 'GET', allowed: ['admin', 'manager'] },
  { path: '/orders', method: 'POST', allowed: ['customer', 'admin', 'manager'] },
  { path: '/payments', method: 'GET', allowed: ['admin', 'manager'] },
  { path: '/payments', method: 'POST', allowed: ['customer', 'admin', 'manager'] },
];

test('existing workflow and business endpoints preserve role restrictions', async (t) => {
  for (const route of roleCases) {
    await t.test(`${route.method} ${route.path}`, () => {
      for (const role of roles) {
        const actorId = 42;
        const failure = authorizationFailure(route.path, route.method, { userId: actorId, role });
        if (route.allowed.includes(role)) {
          assert.equal(failure, null, `${role} should be allowed`);
        } else {
          assert.ok(failure, `${role} should be denied`);
        }
      }
    });
  }
});

test('notification and profile routes remain scoped to the authenticated user', () => {
  const customer = { userId: 42, role: 'customer' };

  assert.equal(authorizationFailure('/notifications/42', 'GET', customer), null);
  assert.equal(authorizationFailure('/notifications/42/read', 'POST', customer), null);
  assert.match(authorizationFailure('/notifications/43', 'GET', customer) ?? '', /own notifications/);
  assert.match(authorizationFailure('/notifications/43/read', 'POST', customer) ?? '', /own notifications/);
  assert.match(authorizationFailure('/users/43/profile', 'GET', customer) ?? '', /own profile/);
});

test('repair status steps and legacy aliases preserve their display positions', () => {
  assert.deepEqual(repairStatusFlow.map(({ key }) => key), [
    'submitted',
    'under_review',
    'technician_assigned',
    'scheduled',
    'customer_approval',
    'repair_in_progress',
    'completed',
    'closed',
  ]);

  const expectedIndexes: Record<string, number> = {
    pending: 0,
    review: 1,
    schedule_rejected: 1,
    assigned: 2,
    approved: 4,
    in_progress: 5,
    completed: 6,
    rejected: 7,
    cancelled: 7,
  };
  for (const [status, index] of Object.entries(expectedIndexes)) {
    assert.equal(getRepairStatusIndex(status), index, status);
  }

  assert.equal(formatRepairStatus('schedule_rejected'), 'Technician being reassigned');
  assert.equal(formatRepairStatus('repair_in_progress'), 'repair in progress');
});

test('terminal request states do not count as active technician jobs', () => {
  for (const status of ['closed', 'cancelled', 'rejected']) {
    assert.equal(isActiveTechnicianJob(status), false, status);
  }
  for (const status of ['submitted', 'under_review', 'technician_assigned', 'scheduled', 'customer_approval', 'repair_in_progress', 'completed']) {
    assert.equal(isActiveTechnicianJob(status), true, status);
  }
  assert.equal(isActiveTechnicianJob(null), true);
});
