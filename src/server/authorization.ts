export type AuthenticatedActor = {
  userId: number;
  role: string;
};

export function authorizationFailure(
  path: string,
  method: string,
  actor: AuthenticatedActor,
): string | null {
  const role = actor.role;
  const pathMatch = path.match(/^\/([^/]+)\/(\d+)(?:\/(.*))?$/);
  const resource = pathMatch?.[1];
  const resourceId = pathMatch ? Number(pathMatch[2]) : null;
  const action = pathMatch?.[3] ?? '';

  if (['/admin/dashboard', '/database/summary'].includes(path) && role !== 'admin') {
    return 'Only an admin can access this resource.';
  }
  if (path === '/manager/dashboard' && role !== 'manager') return 'Only a manager can access this resource.';
  if (/^\/technician\/dashboard\/\d+$/.test(path) && role !== 'technician') {
    return 'Only a technician can access this resource.';
  }
  if (path === '/users') {
    if (role !== 'admin') return 'Only an admin can access user management.';
  } else if (resource === 'users' && resourceId !== null) {
    if (action === 'profile') {
      if (method !== 'GET' && method !== 'PUT') return 'This profile action is not allowed.';
      if (resourceId !== actor.userId && role !== 'admin') return 'You can only access your own profile.';
    } else if (method === 'GET') {
      if (resourceId !== actor.userId && role !== 'admin') return 'You can only access your own account.';
    } else if (role !== 'admin') {
      return 'Only an admin can modify user accounts.';
    }
  }

  if (path === '/repair-requests' && method === 'POST' && role !== 'customer') {
    return 'Only a customer can create a repair request.';
  }
  if (resource === 'repair-requests' && method === 'DELETE' && !['admin', 'manager'].includes(role)) {
    return 'Only an admin or manager can delete repair requests.';
  }
  if (resource === 'repair-requests' && action) {
    const roleRequirements: Record<string, string[]> = {
      review: ['manager'],
      assign: ['manager'],
      schedule: ['technician'],
      'schedule/decision': ['technician'],
      'reject-incomplete': ['admin', 'manager'],
      cancel: ['customer'],
      escalate: ['admin', 'manager'],
      'pay-service-fee': ['customer'],
      diagnosis: ['technician'],
      'approve-quote': ['customer'],
      'reject-quote': ['customer'],
      complete: ['technician'],
      close: ['manager'],
      'final-payment': ['admin', 'manager'],
      ratings: ['customer'],
    };
    const allowed = roleRequirements[action];
    if (allowed && !allowed.includes(role)) return 'Your role cannot perform this repair request action.';
    if (action === 'quotes' && method === 'POST' && !['admin', 'manager'].includes(role)) {
      return 'Only an admin or manager can create a quotation.';
    }
  }
  if (resource === 'notifications' && resourceId !== actor.userId) {
    return 'You can only access your own notifications.';
  }
  if (resource === 'customers' && action === 'rated-repair-requests' && resourceId !== actor.userId) {
    return 'You can only access your own rated repair requests.';
  }
  const technicianDashboard = path.match(/^\/technician\/dashboard\/(\d+)$/);
  if (technicianDashboard && Number(technicianDashboard[1]) !== actor.userId) {
    return 'You can only access your own technician dashboard.';
  }
  if ((path === '/products' || resource === 'products') && method !== 'GET' && !['admin', 'manager'].includes(role)) {
    return 'Only an admin or manager can modify products.';
  }
  if (path === '/service-categories' && method !== 'GET' && !['admin', 'manager'].includes(role)) {
    return 'Only an admin or manager can modify service categories.';
  }
  if (['/orders', '/payments'].includes(path) && method === 'GET' && !['admin', 'manager'].includes(role)) {
    return 'Only an admin or manager can access this resource.';
  }
  if (['/orders', '/payments'].includes(path) && method === 'POST' && !['admin', 'manager', 'customer'].includes(role)) {
    return 'Your role cannot create this record.';
  }
  if (path.startsWith('/admin/') && role !== 'admin') {
    return 'Only an admin can access this resource.';
  }

  return null;
}
