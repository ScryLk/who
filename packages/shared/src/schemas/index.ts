import { z } from 'zod';

export const createRoomSchema = z.object({
  nickname: z.string().min(2).max(16),
  avatar: z.string(),
  mode: z.enum(['classic', 'turbo', 'epic']).default('classic'),
  totalRounds: z.number().min(3).max(10).default(5),
});

export const joinRoomSchema = z.object({
  roomCode: z.string().length(4),
  nickname: z.string().min(2).max(16),
  avatar: z.string(),
});

export const submitTrackSchema = z.object({
  roomCode: z.string(),
  playerId: z.string(),
  track: z.object({
    id: z.string(),
    title: z.string(),
    artist: z.string(),
    albumArt: z.string().optional(),
    audioUrl: z.string(),
    genre: z.string().optional(),
  }),
});

export const ownerBetSchema = z.object({
  roomCode: z.string(),
  playerId: z.string(),
  predictionKind: z.enum(['SPECIFIC_PLAYERS', 'PLAYER_COUNT', 'NONE']),
  targetPlayerIds: z.array(z.string()).optional(),
  expectedCount: z.number().optional(),
  chipAmount: z.number().min(10).max(10000),
});

export const guesserBetSchema = z.object({
  roomCode: z.string(),
  guesserId: z.string(),
  targetOwnerId: z.string(),
  predictionKind: z.enum(['SPECIFIC_PLAYERS', 'PLAYER_COUNT', 'NONE']).optional(),
  targetPlayerIds: z.array(z.string()).optional(),
  expectedCount: z.number().optional(),
  chipAmount: z.number().min(10).max(10000),
});
