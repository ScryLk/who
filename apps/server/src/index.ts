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

const app = express();

const rawClientOrigin = process.env.CLIENT_ORIGIN;
const clientOrigin = rawClientOrigin
  ? rawClientOrigin.includes(',')
    ? rawClientOrigin.split(',').map((o) => o.trim())
    : rawClientOrigin.trim()
  : '*';

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

async function startServer() {
  try {
    const hydratedCount = await roomStore.hydrateFromPersistence();
    if (hydratedCount > 0) {
      console.log(`[PERSISTENCE] Successfully hydrated ${hydratedCount} rooms from persistence.`);
    }
  } catch (err) {
    console.warn('[PERSISTENCE] Error during initial hydration:', err);
  }

  setupSocketHandlers(io);

  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => {
    console.log(`[SERVER] WHO Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SERVER FATAL] Failed to start server:', err);
  process.exit(1);
});
