import { app } from './app';
import { PORT } from './config';

const server = app.listen(PORT, () => {
  console.log(`Courier Service API running on port ${PORT}`);
});

// Graceful shutdown — finish in-flight requests before exiting
function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
