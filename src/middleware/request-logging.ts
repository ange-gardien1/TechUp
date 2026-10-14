import type { Request, Response, NextFunction } from 'express';
import { performance } from 'node:perf_hooks';

export function logRequest(req: Request, res: Response, next: NextFunction) {
  const startedAt = performance.now();
  res.once('finish', () => {
    const elapsedMs = performance.now() - startedAt;
    const message = `${req.method} ${req.path} ${res.statusCode} ${elapsedMs.toFixed(1)}ms`;
    if (res.statusCode >= 500 || elapsedMs >= 1_000) {
      console.warn(message);
      return;
    }
    console.info(message);
  });
  next();
}
