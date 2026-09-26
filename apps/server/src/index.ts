import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSocketHandlers } from './sockets/gameHandler';
import { searchTracks } from './services/musicService';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
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

setupSocketHandlers(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[SERVER] WHO Server running on http://localhost:${PORT}`);
});
