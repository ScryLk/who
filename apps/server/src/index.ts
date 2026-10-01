try {
  process.loadEnvFile?.();
} catch (e) {
  // Ignore missing .env file
}

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSocketHandlers } from './sockets/gameHandler';
import { searchTracks } from './services/musicService';
import { roomStore } from './services/roomStore';
import { redisRoomStore } from './services/redisStore';

const app = express();

const rawClientOrigin = process.env.CLIENT_ORIGIN;
const isProduction = process.env.NODE_ENV === 'production';

let clientOrigin: string | string[];
if (rawClientOrigin) {
  if (rawClientOrigin.includes(',')) {
    clientOrigin = rawClientOrigin.split(',').map((o) => o.trim()).filter(Boolean);
  } else {
    clientOrigin = rawClientOrigin.trim();
  }
} else {
  clientOrigin = '*';
}

if (isProduction) {
  if (!rawClientOrigin || clientOrigin === '*') {
    console.warn(
      '[SECURITY WARNING] CLIENT_ORIGIN is not defined or is set to wildcard "*" in production. ' +
      'It is strongly advised to configure CLIENT_ORIGIN with your explicit Railway frontend domain.'
    );
  } else {
    console.log(`[SECURITY] Configured CORS allowed origin(s): ${Array.isArray(clientOrigin) ? clientOrigin.join(', ') : clientOrigin}`);
  }
}

app.use(cors({ origin: clientOrigin }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ['GET', 'POST'],
  },
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', game: 'WHO', timestamp: new Date().toISOString() });
});

// Search tracks API endpoint
app.get('/api/search-tracks', async (req, res) => {
  const query = (req.query.q as string) || '';
  try {
    const results = await searchTracks(query);
    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[SERVER] Received ${signal}. Starting graceful shutdown...`);

  const shutdownTimer = setTimeout(() => {
    console.error('[SERVER] Shutdown timed out after 10s. Forcing exit.');
    process.exit(1);
  }, 10000);
  shutdownTimer.unref();

  try {
    await new Promise<void>((resolve) => {
      io.close(() => {
        console.log('[SERVER] Socket.IO connections closed.');
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          console.error('[SERVER] Error closing HTTP server:', err);
          return reject(err);
        }
        console.log('[SERVER] HTTP server closed.');
        resolve();
      });
    });

    await redisRoomStore.disconnect();

    console.log('[SERVER] Graceful shutdown completed cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('[SERVER] Error encountered during graceful shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function startServer() {
  console.log('--- WHO? Server Environment Summary ---');
  console.log(`[ENV] NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[ENV] REDIS_URL configured: ${Boolean(process.env.REDIS_URL)}`);
  console.log(`[ENV] YOUTUBE_API_KEY configured: ${Boolean(process.env.YOUTUBE_API_KEY)}`);
  console.log('---------------------------------------');

  try {
    const hydratedCount = await roomStore.hydrateFromPersistence();
    if (hydratedCount > 0) {
      console.log(`[PERSISTENCE] Successfully hydrated ${hydratedCount} rooms from persistence.`);
    }
  } catch (err) {
    console.warn('[PERSISTENCE] Error during initial hydration:', err);
  }

  setupSocketHandlers(io);

  const PORT = Number(process.env.PORT) || 4000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] WHO Server running on 0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SERVER FATAL] Failed to start server:', err);
  process.exit(1);
});
