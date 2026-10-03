import { startServer } from './main/server';

startServer(Number(process.env.PORT ?? 3333));
