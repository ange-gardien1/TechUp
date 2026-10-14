import type { Express } from 'express';
import { sql } from 'drizzle-orm';
import { db, elapsedMilliseconds, eventLoopDelayMonitor, getAdminDashboardSummary, getDashboardSummary, getManagerDashboardSummary, getTechnicianDashboardSummary } from '../../routes/context';

export function registerDashboardRoutes(app: Express) {
  app.get('/', (_req, res) => {
    res.json({ ok: true, service: 'TeckUP API', version: '1.0.0' });
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/ready', async (_req, res) => {
    try {
      const result = await db.execute(sql`SELECT to_regclass('public.users') AS users_table`);
      if (!result[0]?.users_table) {
        return res.status(503).json({ ok: false, error: 'Database schema is not ready.' });
      }
      return res.json({ ok: true });
    } catch (error) {
      console.error('Database readiness check failed', error);
      return res.status(503).json({ ok: false, error: 'Database is unavailable.' });
    }
  });

  app.get('/database/summary', async (_req, res) => {
    try {
      const summary = await getDashboardSummary();
      res.json(summary);
    } catch (error) {
      console.error('Database summary error', error);
      res.status(500).json({ error: 'Unable to load database summary' });
    }
  });

  app.get('/admin/dashboard', async (req, res) => {
    const routeStartedAt = process.hrtime.bigint();
    try {
      if (req.auth?.role !== 'admin') {
        const serverMs = elapsedMilliseconds(routeStartedAt);
        res.setHeader(
          'Server-Timing',
          [
            `event_loop_p99;dur=${(eventLoopDelayMonitor.percentile(99) / 1_000_000).toFixed(1)}`,
            `app;dur=${serverMs.toFixed(1)}`,
          ].join(', '),
        );
        return res.status(403).json({ error: 'Only an admin can load the admin dashboard.' });
      }

      const dashboardStartedAt = process.hrtime.bigint();
      const queryTimings: Record<string, number> = {};
      const summary = await getAdminDashboardSummary((name: string, duration: number) => {
        queryTimings[name] = duration;
      });
      const dashboardMs = elapsedMilliseconds(dashboardStartedAt);
      const serverMs = elapsedMilliseconds(routeStartedAt);
      const queryTimingEntries = Object.entries(queryTimings)
        .map(([name, duration]) => `db_query_${name};dur=${duration.toFixed(1)}`);
      res.setHeader(
        'Server-Timing',
        [
          `dashboard_db;dur=${dashboardMs.toFixed(1)}`,
          `event_loop_p99;dur=${(eventLoopDelayMonitor.percentile(99) / 1_000_000).toFixed(1)}`,
          `app;dur=${serverMs.toFixed(1)}`,
          ...queryTimingEntries,
        ].join(', '),
      );
      res.json(summary);
    } catch (error) {
      res.setHeader('Server-Timing', `app;dur=${elapsedMilliseconds(routeStartedAt).toFixed(1)}`);
      console.error('Admin dashboard error', error);
      res.status(500).json({ error: 'Unable to load admin dashboard' });
    }
  });

  app.get('/manager/dashboard', async (req, res) => {
    try {
      if (req.auth?.role !== 'manager') {
        return res.status(403).json({ error: 'Only a manager can load the manager dashboard.' });
      }

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
      if (req.auth?.role !== 'technician' || req.auth.userId !== technicianId) {
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
}
