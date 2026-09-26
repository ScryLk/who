import { RoomState } from '@who/shared';

export class RedisRoomStore {
  private memoryFallback: Map<string, RoomState> = new Map();
  private redisClient: any = null;
  private isRedisAvailable = false;

  constructor() {
    if (process.env.REDIS_URL) {
      try {
        // Optional ioredis import if configured
        const Redis = require('ioredis');
        this.redisClient = new Redis(process.env.REDIS_URL);
        this.isRedisAvailable = true;
        console.log('[REDIS] Connected to Redis Store.');
      } catch (err) {
        console.warn('[REDIS] ioredis module not found or failed to connect. Falling back to in-memory store.');
      }
    } else {
      console.log('[REDIS] REDIS_URL not set. Running in-memory storage fallback.');
    }
  }

  async saveRoom(room: RoomState): Promise<void> {
    this.memoryFallback.set(room.code, room);
    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.set(`room:${room.code}`, JSON.stringify(room), 'EX', 86400); // 24h expiration
      } catch (e) {
        console.error('[REDIS] Error saving room to Redis:', e);
      }
    }
  }

  async getRoom(code: string): Promise<RoomState | undefined> {
    const formattedCode = code.toUpperCase();
    if (this.isRedisAvailable && this.redisClient) {
      try {
        const data = await this.redisClient.get(`room:${formattedCode}`);
        if (data) {
          return JSON.parse(data) as RoomState;
        }
      } catch (e) {
        console.error('[REDIS] Error getting room from Redis:', e);
      }
    }
    return this.memoryFallback.get(formattedCode);
  }

  async deleteRoom(code: string): Promise<void> {
    const formattedCode = code.toUpperCase();
    this.memoryFallback.delete(formattedCode);
    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.del(`room:${formattedCode}`);
      } catch (e) {}
    }
  }
}

export const redisRoomStore = new RedisRoomStore();
