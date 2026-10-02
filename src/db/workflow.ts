import { db } from './client';
import { payments, repairQuotes, repairRequests, ratings, repairUpdates, notifications, users } from './schema';
import { eq } from 'drizzle-orm';

export async function createRepairRequest(input: {
  customerId: number;
  deviceType: string;
  brand?: string;
  model?: string;
  issueDescription: string;
  serviceAddress?: string;
  latitude?: number;
  longitude?: number;
  preferredTime?: string;
  images?: string[];
  serviceFee?: number;
  status?: string;
  paymentStatus?: string;
}) {
  const [request] = await db.insert(repairRequests).values({
    customerId: input.customerId,
    deviceType: input.deviceType,
    brand: input.brand,
    model: input.model,
    issueDescription: input.issueDescription,
    serviceAddress: input.serviceAddress,
    latitude: input.latitude,
    longitude: input.longitude,
    preferredTime: input.preferredTime,
    images: input.images ?? [],
    serviceFee: input.serviceFee ?? 0,
    status: input.status ?? 'submitted',
    paymentStatus: input.paymentStatus ?? 'pending',
  }).returning();

  await db.insert(notifications).values({
    userId: input.customerId,
    title: 'Repair request submitted',
    body: 'Your repair request has been received and is awaiting review.',
    type: 'repair',
    referenceId: request.id,
  });

  return request;
}

export async function assignRepairRequest(repairRequestId: number, technicianId: number, serviceFee: number) {
  const [request] = await db.update(repairRequests)
    .set({ technicianId, serviceFee, status: 'technician_assigned', updatedAt: new Date() })
    .where(eq(repairRequests.id, repairRequestId))
    .returning();

  await db.insert(notifications).values([
    { userId: request.customerId ?? 0, title: 'Technician assigned', body: 'A technician has been assigned to your request.', type: 'repair', referenceId: request.id },
    { userId: technicianId, title: 'New job assigned', body: 'A new repair request is ready for your review.', type: 'job', referenceId: request.id },
  ]);

  return request;
}

export async function setRepairSchedule(repairRequestId: number, preferredTime: string, technicianId?: number | null, note?: string) {
  const [request] = await db.update(repairRequests)
    .set({ preferredTime, technicianId: technicianId ?? repairRequests.technicianId, status: 'scheduled', updatedAt: new Date() })
    .where(eq(repairRequests.id, repairRequestId))
    .returning();

  await db.insert(notifications).values({
    userId: request.customerId ?? 0,
    title: 'Service schedule confirmed',
    body: note ? `The repair has been scheduled for ${preferredTime}. ${note}` : `The repair has been scheduled for ${preferredTime}.`,
    type: 'repair',
    referenceId: request.id,
  });

  return request;
}

export async function rejectIncompleteRequest(repairRequestId: number, reason: string) {
  const [request] = await db.update(repairRequests)
    .set({ status: 'rejected', updatedAt: new Date() })
    .where(eq(repairRequests.id, repairRequestId))
    .returning();

  await db.insert(notifications).values({
    userId: request.customerId ?? 0,
    title: 'Request rejected',
    body: reason || 'Your request has been rejected because the required information is missing or incomplete.',
    type: 'repair',
    referenceId: request.id,
  });

  return request;
}

export async function cancelRepairRequest(repairRequestId: number, reason?: string) {
  const [request] = await db.update(repairRequests)
    .set({ status: 'cancelled', paymentStatus: 'cancelled', updatedAt: new Date() })
    .where(eq(repairRequests.id, repairRequestId))
    .returning();

  await db.insert(notifications).values({
    userId: request.customerId ?? 0,
    title: 'Request stopped',
    body: reason || 'Your repair request has been stopped and the company has been notified.',
    type: 'repair',
    referenceId: request.id,
  });

  return request;
}

export async function escalateRepairRequestToAdmin(repairRequestId: number, reason?: string) {
  const [request] = await db.update(repairRequests)
    .set({ status: 'escalated', updatedAt: new Date() })
    .where(eq(repairRequests.id, repairRequestId))
    .returning();

  const admins = await db.select().from(users).where(eq(users.role, 'admin'));

  if (admins.length > 0) {
    await db.insert(notifications).values(
      admins.map((admin) => ({
        userId: admin.id,
        title: 'Manager escalation',
        body: reason || 'A repair request has been escalated for admin review and decision-making.',
        type: 'admin',
        referenceId: request.id,
      })),
    );
  }

  return request;
}

export async function confirmServiceFee(repairRequestId: number) {
  const [request] = await db.update(repairRequests)
    .set({ status: 'approved', paymentStatus: 'paid' })
    .where(eq(repairRequests.id, repairRequestId))
    .returning();

  await db.insert(notifications).values({
    userId: request.customerId ?? 0,
    title: 'Service fee paid',
    body: 'The service fee has been confirmed. The technician can now proceed.',
    type: 'payment',
    referenceId: request.id,
  });

  return request;
}

export async function addTechnicianRepairNote(repairRequestId: number, technicianId: number, message: string, status?: string) {
  const [update] = await db.insert(repairUpdates).values({
    repairRequestId,
    userId: technicianId,
    message: message.trim() || 'Technician updated this repair request.',
    status: status ?? 'diagnosis_update',
    isCustomerVisible: false,
  }).returning();

  return update;
}

export async function createRepairQuote(repairRequestId: number, technicianId: number, input: { laborCost: number; sparePartsCost: number; notes?: string; diagnosis?: string; quantity?: number; currency?: string; totalDue?: number }) {
  const laborCost = Number(input.laborCost ?? 0);
  const sparePartsCost = Number(input.sparePartsCost ?? 0);
  const quantity = Number(input.quantity ?? 1);
  const total = Number(input.totalDue ?? laborCost + sparePartsCost);
  const diagnosis = input.diagnosis ?? 'General diagnosis completed.';
  const noteText = [
    input.notes ?? 'Customer approval required before work begins.',
    `Diagnosis: ${diagnosis}`,
    `Quantity: ${quantity}`,
    `Total due: ${Number(total).toLocaleString()} ${input.currency ?? 'RWF'}`,
  ].join(' | ');

  const [quote] = await db.insert(repairQuotes).values({
    repairRequestId,
    technicianId,
    amount: total,
    laborHours: 1,
    estimatedCompletion: 'Within 24 hours',
    notes: noteText,
    status: 'pending',
  }).returning();

  const [request] = await db.update(repairRequests)
    .set({ technicianId, quoteAmount: total, status: 'customer_approval', updatedAt: new Date() })
    .where(eq(repairRequests.id, repairRequestId))
    .returning();

  await db.insert(notifications).values({
    userId: request.customerId ?? 0,
    title: 'Repair quote ready',
    body: `A repair quote has been prepared for ${request.deviceType || 'your device'} for ${Number(total).toLocaleString()} ${input.currency ?? 'RWF'}. Please review and approve or reject it.`,
    type: 'quote',
    referenceId: request.id,
  });

  return { quote, request };
}

export async function approveRepairQuote(repairRequestId: number) {
  const [request] = await db.update(repairRequests)
    .set({ status: 'repair_in_progress', paymentStatus: 'pending', updatedAt: new Date() })
    .where(eq(repairRequests.id, repairRequestId))
    .returning();

  await db.insert(notifications).values({
    userId: request.customerId ?? 0,
    title: 'Quote approved',
    body: 'The repair quote was approved and work has started.',
    type: 'repair',
    referenceId: request.id,
  });

  return request;
}

export async function rejectRepairQuote(repairRequestId: number) {
  const [request] = await db.update(repairRequests)
    .set({ status: 'rejected', updatedAt: new Date() })
    .where(eq(repairRequests.id, repairRequestId))
    .returning();

  await db.insert(notifications).values({
    userId: request.customerId ?? 0,
    title: 'Quote rejected',
    body: 'The repair quote was rejected and the request was sent back for review.',
    type: 'repair',
    referenceId: request.id,
  });

  return request;
}

export async function completeRepair(repairRequestId: number, notes: string, photoUrl?: string) {
  const [request] = await db.update(repairRequests)
    .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
    .where(eq(repairRequests.id, repairRequestId))
    .returning();

  await db.insert(repairUpdates).values({
    repairRequestId,
    userId: request.technicianId ?? null,
    message: notes,
    status: 'completed',
    isCustomerVisible: false,
  });

  if (photoUrl) {
    await db.insert(repairUpdates).values({
      repairRequestId,
      userId: request.technicianId ?? null,
      message: 'Repair photo uploaded',
      status: 'completed',
      isCustomerVisible: false,
    });
  }

  await db.insert(notifications).values({
    userId: request.customerId ?? 0,
    title: 'Repair completed',
    body: 'The technician has completed the repair and the manager will review the closure.',
    type: 'repair',
    referenceId: request.id,
  });

  return request;
}

export async function closeRepairRequest(repairRequestId: number, managerId: number, reason?: string) {
  const [request] = await db.update(repairRequests)
    .set({ status: 'closed', paymentStatus: 'paid', completedAt: new Date(), updatedAt: new Date() })
    .where(eq(repairRequests.id, repairRequestId))
    .returning();

  await db.insert(repairUpdates).values({
    repairRequestId,
    userId: managerId,
    message: reason ?? 'Manager approved the completion and closed the service request.',
    status: 'closed',
    isCustomerVisible: false,
  });

  await db.insert(notifications).values({
    userId: request.customerId ?? 0,
    title: 'Repair closed',
    body: 'Your repair request has been closed and marked complete. You can now rate the technician.',
    type: 'repair',
    referenceId: request.id,
  });

  return request;
}

export async function finalizePayment(repairRequestId: number, amount: number, paymentMethod: string) {
  const [request] = await db.update(repairRequests)
    .set({ paymentStatus: 'paid', updatedAt: new Date() })
    .where(eq(repairRequests.id, repairRequestId))
    .returning();

  await db.insert(payments).values({
    repairRequestId,
    payerId: request.customerId ?? 0,
    amount,
    method: paymentMethod,
    status: 'paid',
    transactionReference: `txn-${repairRequestId}-${Date.now()}`,
  });

  return request;
}

export async function submitRating(repairRequestId: number, customerId: number, technicianId: number, score: number, comment?: string) {
  return db.transaction(async (transaction) => {
    const [rating] = await transaction.insert(ratings).values({
      repairRequestId,
      customerId,
      technicianId,
      score,
      comment,
    }).returning();

    await transaction.update(repairRequests)
      .set({ status: 'closed', updatedAt: new Date() })
      .where(eq(repairRequests.id, repairRequestId));

    return rating;
  });
}
