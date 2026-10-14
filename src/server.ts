import './config/env';
import app from './app';

const port = process.env.PORT ?? 4000;
app.listen(port, () => {
  console.log(`TeckUP API running on port ${port}`);
});
