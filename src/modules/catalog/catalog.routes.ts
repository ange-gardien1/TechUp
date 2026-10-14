import type { Express } from 'express';
import { db, eq, orders, payments, products, serviceCategories } from '../../routes/context';

export function registerCatalogRoutes(app: Express) {
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
}
