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
    serviceFee: input.serviceFee ?? 2000,
    status: 'pending',
    paymentStatus: 'pending',
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
    .set({ technicianId, serviceFee, status: 'assigned' })
    .where(eq(repairRequests.id, repairRequestId))
    .returning();

  await db.insert(notifications).values([
    { userId: request.customerId ?? 0, title: 'Technician assigned', body: 'A technician has been assigned to your request.', type: 'repair', referenceId: request.id },
    { userId: technicianId, title: 'New job assigned', body: 'A new repair request is ready for your review.', type: 'job', referenceId: request.id },
  ]);

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

export async function createRepairQuote(repairRequestId: number, technicianId: number, input: { laborCost: number; sparePartsCost: number; notes?: string }) {
  const total = input.laborCost + input.sparePartsCost;
  const [quote] = await db.insert(repairQuotes).values({
    repairRequestId,
    technicianId,
    amount: total,
    laborHours: 1,
    estimatedCompletion: 'Within 24 hours',
    notes: input.notes,
    status: 'pending',
  }).returning();

  const [request] = await db.update(repairRequests)
    .set({ quoteAmount: total, status: 'quoted' })
    .where(eq(repairRequests.id, repairRequestId))
    .returning();

  await db.insert(notifications).values({
    userId: request.customerId ?? 0,
    title: 'Repair quote ready',
    body: 'A repair quote has been prepared for your approval.',
    type: 'quote',
    referenceId: request.id,
  });

  return { quote, request };
}

export async function approveRepairQuote(repairRequestId: number) {
  const [request] = await db.update(repairRequests)
    .set({ status: 'in-progress' })
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
    .set({ status: 'cancelled' })
    .where(eq(repairRequests.id, repairRequestId))
    .returning();

  await db.insert(notifications).values({
    userId: request.customerId ?? 0,
    title: 'Quote rejected',
    body: 'The repair quote was rejected. The request was cancelled.',
    type: 'repair',
    referenceId: request.id,
  });

  return request;
}

export async function completeRepair(repairRequestId: number, notes: string, photoUrl?: string) {
  const [request] = await db.update(repairRequests)
    .set({ status: 'completed' })
    .where(eq(repairRequests.id, repairRequestId))
    .returning();

  await db.insert(repairUpdates).values({
    repairRequestId,
    userId: request.technicianId ?? null,
    message: notes,
    status: 'completed',
  });

  if (photoUrl) {
    await db.insert(repairUpdates).values({
      repairRequestId,
      userId: request.technicianId ?? null,
      message: 'Repair photo uploaded',
      status: 'completed',
    });
  }

  await db.insert(notifications).values({
    userId: request.customerId ?? 0,
    title: 'Repair completed',
    body: 'Your repair has been completed. Please review and pay the remaining balance.',
    type: 'repair',
    referenceId: request.id,
  });

  return request;
}

export async function finalizePayment(repairRequestId: number, amount: number, paymentMethod: string) {
  const [request] = await db.update(repairRequests)
    .set({ paymentStatus: 'paid' })
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
  const [rating] = await db.insert(ratings).values({
    repairRequestId,
    customerId,
    technicianId,
    score,
    comment,
  }).returning();

  return rating;
}
