import type { Express } from 'express';
import { registerAuthRoutes } from '../modules/auth/auth.routes';
import { registerCatalogRoutes } from '../modules/catalog/catalog.routes';
import { registerDashboardRoutes } from '../modules/dashboards/dashboard.routes';
import { registerNotificationRoutes } from '../modules/notifications/notifications.routes';
import { registerRepairRoutes } from '../modules/repairs/repairs.routes';
import { registerUserRoutes } from '../modules/users/users.routes';

export function registerRoutes(app: Express) {
  registerDashboardRoutes(app);
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerNotificationRoutes(app);
  registerRepairRoutes(app);
  registerCatalogRoutes(app);
}
