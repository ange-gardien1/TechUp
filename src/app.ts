import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { authenticateRequest } from './middleware/authentication';
import { errorHandler } from './middleware/error-handler';
import { logRequest } from './middleware/request-logging';
import { registerRoutes } from './routes';

const app = express();
const serverStartedAt = Date.now();

app.use((req, _res, next) => {
  if (process.env.VERCEL) {
    const requestUrl = new URL(req.url, 'http://localhost');
    const vercelApiPath = requestUrl.searchParams.get('__teckup_path');
    if (vercelApiPath !== null) {
      requestUrl.searchParams.delete('__teckup_path');
      req.url = `/api${vercelApiPath ? `/${vercelApiPath}` : ''}${requestUrl.search}`;
    }
  }

  if (req.url === '/api' || req.url.startsWith('/api/') || req.url.startsWith('/api?')) {
    const apiPath = req.url.slice('/api'.length);
    req.url = apiPath.startsWith('?') ? `/${apiPath}` : apiPath || '/';
  }
  next();
});
app.use(cors({
  exposedHeaders: ['Server-Timing', 'X-API-Uptime-Seconds', 'Content-Length', 'WWW-Authenticate'],
}));
app.use(bodyParser.json({ limit: process.env.VERCEL ? '4mb' : '8mb' }));
app.use((_req, res, next) => {
  res.setHeader('X-API-Uptime-Seconds', String(Math.floor((Date.now() - serverStartedAt) / 1000)));
  res.setHeader('Timing-Allow-Origin', '*');
  next();
});
app.use(logRequest);
app.use(authenticateRequest);
registerRoutes(app);
app.use(errorHandler);

export default app;
