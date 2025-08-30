import { configDotenv } from 'dotenv';

configDotenv({ override: true, encoding: 'utf-8', debug: true });

import main from './src/main';

const abortController = new AbortController();
let cleanup: (() => Promise<void>) | undefined;

main(abortController.signal)
  .then((c) => (cleanup = c))
  .catch((err) => {
    console.error('Unhandled error in main:', err);
    process.exit(1);
  });

async function shutdown(signal: string) {
  console.log(`\nReceived ${signal}. Gracefully shutting down.`);
  abortController.abort();
  if (cleanup) {
    await cleanup();
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
