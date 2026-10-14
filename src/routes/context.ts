import { and, desc, eq, getTableColumns, inArray } from 'drizzle-orm';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { db } from '../db/client';
import {
  customerProfiles,
  notifications,
  orders,
  payments,
  products,
  ratings,
  repairQuotes,
  repairRequests,
  repairUpdates,
  serviceCategories,
  users,
} from '../db/schema';
import {
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
} from '../db/workflow';
import {
  getAdminDashboardSummary,
  getDashboardSummary,
  getManagerDashboardSummary,
  getTechnicianDashboardSummary,
} from '../db/operations';
import { getAuthTokenSecret } from '../config/env';
import { hashPassword, issueSessionToken, verifyPassword } from '../server/security';

export {
  addTechnicianRepairNote,
  acceptCustomerSchedule,
  and,
  approveRepairQuote,
  assignRepairRequest,
  cancelRepairRequest,
  closeRepairRequest,
  completeRepair,
  confirmServiceFee,
  createRepairQuote,
  createRepairRequest,
  customerProfiles,
  db,
  desc,
  eq,
  escalateRepairRequestToAdmin,
  finalizePayment,
  getAdminDashboardSummary,
  getDashboardSummary,
  getManagerDashboardSummary,
  getTechnicianDashboardSummary,
  hashPassword,
  inArray,
  issueSessionToken,
  notifications,
  orders,
  payments,
  products,
  ratings,
  rejectIncompleteRequest,
  rejectCustomerSchedule,
  rejectRepairQuote,
  repairQuotes,
  repairRequests,
  repairUpdates,
  serviceCategories,
  setRepairSchedule,
  submitRating,
  users,
  verifyPassword,
};

export const authTokenSecret = getAuthTokenSecret();
export const TECHUP_SUPPORT_PHONE = '0782245728';
export const eventLoopDelayMonitor = monitorEventLoopDelay({ resolution: 20 });
eventLoopDelayMonitor.enable();
const eventLoopDelayReset = setInterval(() => eventLoopDelayMonitor.reset(), 10_000);
eventLoopDelayReset.unref();

const { passwordHash: _passwordHashColumn, ...userResponseColumns } = getTableColumns(users);
const { images: _repairImagesColumn, ...repairRequestListColumns } = getTableColumns(repairRequests);
export { repairRequestListColumns, userResponseColumns };

export function elapsedMilliseconds(startedAt: bigint) {
  return Number(process.hrtime.bigint() - startedAt) / 1_000_000;
}

export function sanitizeUser(row: any) {
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

export function omitPasswordHash<T extends { passwordHash: string | null }>(row: T) {
  const { passwordHash: _passwordHash, ...safeRow } = row;
  return safeRow;
}
