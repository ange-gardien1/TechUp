import type { Express } from 'express';
import { addTechnicianRepairNote, acceptCustomerSchedule, and, approveRepairQuote, assignRepairRequest, cancelRepairRequest, closeRepairRequest, completeRepair, confirmServiceFee, createRepairQuote, createRepairRequest, db, desc, eq, escalateRepairRequestToAdmin, finalizePayment, inArray, notifications, ratings, rejectIncompleteRequest, rejectCustomerSchedule, rejectRepairQuote, repairQuotes, repairRequestListColumns, repairRequests, repairUpdates, setRepairSchedule, submitRating, TECHUP_SUPPORT_PHONE, users } from '../../routes/context';

export function registerRepairRoutes(app: Express) {
  app.get('/repair-requests', async (req, res) => {
    const actor = req.auth;
    if (!actor) {
      return res.status(401).json({ error: 'A valid user id is required to view repair requests.' });
    }
    const userId = Number(req.query.userId);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(401).json({ error: 'A valid user id is required to view repair requests.' });
    }
    if (userId !== actor.userId) {
      return res.status(403).json({ error: 'You can only view repair requests for your own account.' });
    }

    const rows = actor.role === 'manager' || actor.role === 'admin'
      ? await db.select(repairRequestListColumns).from(repairRequests)
      : actor.role === 'technician'
        ? await db.select(repairRequestListColumns).from(repairRequests).where(eq(repairRequests.technicianId, actor.userId))
        : await db.select(repairRequestListColumns).from(repairRequests).where(eq(repairRequests.customerId, actor.userId));
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
      const customerPhone = String(req.body?.customerPhone ?? '').trim();
      const phoneDigits = customerPhone.replace(/\D/g, '');
      if (!/^\+?[0-9().\s-]+$/.test(customerPhone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
        return res.status(400).json({ error: 'Enter a valid customer phone number.' });
      }

      const [customer] = await db.select().from(users).where(eq(users.id, customerId));
      if (!customer || customer.role !== 'customer') {
        return res.status(403).json({ error: 'Only a customer can submit a repair request.' });
      }

      const images = req.body?.images;
      if (images !== undefined && (!Array.isArray(images) || images.length > 1 ||
        images.some((image: unknown) => typeof image !== 'string' || image.length > 5_500_000 ||
          !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(image)))) {
        return res.status(400).json({ error: 'Attach one supported image under 4 MB.' });
      }

      const row = await createRepairRequest({
        customerId,
        customerPhone,
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
      return res.json({
        id: row.id,
        deviceType: row.deviceType,
        brand: row.brand,
        model: row.model,
        status: row.status,
      });
    } catch (error) {
      console.error('Create repair request error', error);
      return res.status(500).json({ error: 'Unable to submit the repair request.' });
    }
  });

  app.get('/repair-requests/:id', async (req, res) => {
    const actor = req.auth;
    if (!actor) {
      return res.status(401).json({ error: 'A valid user id is required to view this repair request.' });
    }
    const userId = Number(req.query.userId);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(401).json({ error: 'A valid user id is required to view this repair request.' });
    }
    if (userId !== actor.userId) {
      return res.status(403).json({ error: 'You can only view repair requests for your own account.' });
    }

    const [request] = await db.select().from(repairRequests).where(eq(repairRequests.id, Number(req.params.id)));
    const canView = request && (
      actor.role === 'manager' ||
      actor.role === 'admin' ||
      (actor.role === 'customer' && request.customerId === actor.userId) ||
      (actor.role === 'technician' && request.technicianId === actor.userId)
    );
    if (!canView) {
      return res.status(404).json({ error: 'Repair request not found.' });
    }
    return res.json(request);
  });

  app.get('/repair-requests/:id/quotes', async (req, res) => {
    const actor = req.auth;
    if (!actor) {
      return res.status(401).json({ error: 'A valid user id is required to view this quotation.' });
    }
    const userId = Number(req.query.userId);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(401).json({ error: 'A valid user id is required to view this quotation.' });
    }
    if (userId !== actor.userId) {
      return res.status(403).json({ error: 'You can only view quotations for your own account.' });
    }

    const repairRequestId = Number(req.params.id);
    const [request] = await db.select().from(repairRequests).where(eq(repairRequests.id, repairRequestId));
    const canView = request && (
      actor.role === 'manager' ||
      actor.role === 'admin' ||
      (actor.role === 'customer' && request.customerId === actor.userId) ||
      (actor.role === 'technician' && request.technicianId === actor.userId)
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
    try {
      const userId = Number(req.body?.userId);
      if (!userId) {
        return res.status(400).json({ error: 'A customer user id is required.' });
      }
      const [customer] = await db.select().from(users).where(eq(users.id, userId));
      if (!customer || customer.role !== 'customer') {
        return res.status(403).json({ error: 'Only a customer can stop their repair request.' });
      }

      const row = await cancelRepairRequest(
        Number(req.params.id),
        customer.id,
        String(req.body?.reason ?? 'Customer stopped this request.'),
      );
      return res.json(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to stop the repair request.';
      if (message.startsWith('This request can no longer be stopped.')) {
        return res.status(409).json({ error: message });
      }
      console.error('Cancel repair request error', error);
      return res.status(500).json({ error: 'Unable to stop the repair request.' });
    }
  });

  app.post('/repair-requests/:id/escalate', async (req, res) => {
    const row = await escalateRepairRequestToAdmin(Number(req.params.id), String(req.body?.reason ?? 'Escalated by manager for admin review.'));
    res.json(row);
  });

  app.post('/repair-requests/:id/pay-service-fee', async (req, res) => {
    const repairRequestId = Number(req.params.id);
    const [request] = await db.select({ customerId: repairRequests.customerId })
      .from(repairRequests)
      .where(eq(repairRequests.id, repairRequestId));
    if (!request) return res.status(404).json({ error: 'Repair request not found.' });
    if (request.customerId !== req.auth?.userId) {
      return res.status(403).json({ error: 'Only the customer who owns this request can pay its service fee.' });
    }
    const row = await confirmServiceFee(repairRequestId);
    res.json(row);
  });

  app.post('/repair-requests/:id/diagnosis', async (req, res) => {
    try {
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

  app.post('/repair-requests/:id/approve-quote', async (req, res) => {
    const repairRequestId = Number(req.params.id);
    const [request] = await db.select({ customerId: repairRequests.customerId })
      .from(repairRequests)
      .where(eq(repairRequests.id, repairRequestId));
    if (!request) return res.status(404).json({ error: 'Repair request not found.' });
    if (request.customerId !== req.auth?.userId) {
      return res.status(403).json({ error: 'Only the customer who owns this request can approve its quotation.' });
    }
    const row = await approveRepairQuote(repairRequestId);
    res.json(row);
  });

  app.post('/repair-requests/:id/reject-quote', async (req, res) => {
    const repairRequestId = Number(req.params.id);
    const [request] = await db.select({ customerId: repairRequests.customerId })
      .from(repairRequests)
      .where(eq(repairRequests.id, repairRequestId));
    if (!request) return res.status(404).json({ error: 'Repair request not found.' });
    if (request.customerId !== req.auth?.userId) {
      return res.status(403).json({ error: 'Only the customer who owns this request can reject its quotation.' });
    }
    const row = await rejectRepairQuote(repairRequestId);
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
}
