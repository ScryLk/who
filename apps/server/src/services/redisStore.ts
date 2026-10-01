import Redis from 'ioredis';
import { RoomState } from '@who/shared';

export class RedisRoomStore {
  private memoryFallback: Map<string, RoomState> = new Map();
  private redisClient: Redis | null = null;
  private isRedisAvailable = false;

  constructor() {
    if (process.env.REDIS_URL) {
      try {
        this.redisClient = new Redis(process.env.REDIS_URL, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          connectTimeout: 5000,
        });

        this.redisClient
          .connect()
          .then(() => {
            this.isRedisAvailable = true;
            console.log('[REDIS] Connected to Redis Store.');
          })
          .catch((err) => {
            this.isRedisAvailable = false;
            console.warn(`[REDIS] Failed to connect (${err.message}). Running in-memory storage fallback.`);
          });
      } catch (err: any) {
        this.isRedisAvailable = false;
        console.warn(`[REDIS] Initialization error (${err?.message}). Running in-memory storage fallback.`);
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

  async getAllPersistedRooms(): Promise<RoomState[]> {
    if (this.isRedisAvailable && this.redisClient) {
      try {
        const keys = await this.redisClient.keys('room:*');
        if (keys.length === 0) return [];
        const records = await this.redisClient.mget(keys);
        const rooms: RoomState[] = [];
        for (const item of records) {
          if (item) {
            try {
              rooms.push(JSON.parse(item));
            } catch {}
          }
        }
        return rooms;
      } catch (e) {
        console.error('[REDIS] Error fetching all persisted rooms:', e);
      }
    }
    return Array.from(this.memoryFallback.values());
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

  async disconnect(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
        this.isRedisAvailable = false;
        console.log('[REDIS] Disconnected from Redis Store.');
      } catch (err: any) {
        console.warn(`[REDIS] Error disconnecting Redis client (${err?.message || err}).`);
      }
    }
  }
}

export const redisRoomStore = new RedisRoomStore();
