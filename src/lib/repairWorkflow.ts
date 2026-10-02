export const repairStatusFlow = [
  { label: 'Submitted', key: 'submitted' },
  { label: 'Review', key: 'under_review' },
  { label: 'Assigned', key: 'technician_assigned' },
  { label: 'Scheduled', key: 'scheduled' },
  { label: 'Approval', key: 'customer_approval' },
  { label: 'Repair', key: 'repair_in_progress' },
  { label: 'Done', key: 'completed' },
  { label: 'Closed', key: 'closed' },
] as const;

const repairStatusIndexMap: Record<string, number> = {
  submitted: 0,
  pending: 0,
  under_review: 1,
  review: 1,
  technician_assigned: 2,
  assigned: 2,
  scheduled: 3,
  customer_approval: 4,
  approved: 4,
  repair_in_progress: 5,
  in_progress: 5,
  completed: 6,
  closed: 7,
  rejected: 7,
  cancelled: 7,
};

export function getRepairStatusIndex(status: string | null | undefined): number {
  const normalized = String(status ?? 'submitted').toLowerCase().replace(/\s+/g, '_');
  return repairStatusIndexMap[normalized] ?? 0;
}

export function formatRepairStatus(status: string | null | undefined): string {
  return String(status ?? 'submitted').replace(/_/g, ' ');
}
