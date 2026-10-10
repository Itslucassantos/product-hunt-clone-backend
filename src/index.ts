import { startServer } from './main/server';

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
