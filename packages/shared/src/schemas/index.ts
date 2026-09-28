import { z } from 'zod';

export const roomSettingsSchema = z.object({
  maxPlayers: z.number().int().min(2).max(12).default(8),
  rounds: z.number().int().min(3).max(12).default(5),
  bettingTimeSeconds: z.number().int().min(15).max(60).default(30),
  startingChips: z.number().int().min(100).max(5000).default(1000),
  clipDurationSeconds: z.number().int().min(10).max(60).default(30),
  enableOwnerPrediction: z.boolean().default(true),
  enableVibeCombo: z.boolean().default(true),
  allowBots: z.boolean().default(true),
});

export const createRoomSchema = z.object({
  nickname: z.string().min(1).max(24),
  avatar: z.string(),
  settings: roomSettingsSchema.optional(),
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
    provider: z.enum(['preview', 'youtube']).optional(),
    durationSeconds: z.number().optional(),
    videoId: z.string().optional(),
    channelTitle: z.string().optional(),
    startTimeSeconds: z.number().optional(),
    endTimeSeconds: z.number().optional(),
    isVideo: z.boolean().optional(),
    youtubeId: z.string().optional(),
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
