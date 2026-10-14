import '../src/config/env';
import { initializeDevelopmentDatabase } from '../src/db/operations';
import { closeDatabaseConnection } from '../src/db/client';

if (process.env.NODE_ENV !== 'development' || process.env.ALLOW_DEVELOPMENT_SEED !== 'true') {
  throw new Error(
    'Development seeding requires NODE_ENV=development and ALLOW_DEVELOPMENT_SEED=true.',
  );
}

async function seedDevelopmentData() {
  try {
    await initializeDevelopmentDatabase();
    console.info('Development database schema and seed data are ready.');
  } catch (error) {
    console.error('Development database seeding failed', error);
    process.exitCode = 1;
  } finally {
    await closeDatabaseConnection();
  }
}

void seedDevelopmentData().catch((error: unknown) => {
  console.error('Unable to close the development database connection', error);
  process.exitCode = 1;
});
