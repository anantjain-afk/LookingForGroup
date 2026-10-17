import 'dotenv/config';
import { createApplication } from './app.js';
import { initCleanupService } from './services/cleanup.service.js';
import prisma from './db/config.js';

const { httpServer, io, close } = await createApplication();
const cleanup = initCleanupService();
const port = Number(process.env.PORT || 3000);
httpServer.listen(port, '0.0.0.0', () => console.info(`Server listening on ${port}`));
async function shutdown() {
  cleanup?.stop();
  io.disconnectSockets(true);
  await close();
  await prisma.$disconnect();
  process.exit(0);
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
