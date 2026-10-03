import { createApp } from '../infrastructure/adapters/in/http/app';

export function startServer(port: number): void {
  const server = createApp().listen(port, () => {
    console.log(`API listening on port ${port}`);
  });

  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
}
