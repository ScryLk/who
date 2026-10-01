import { z } from 'zod';

export const secondaryPredictionKindSchema = z.enum([
  'SPECIFIC_PLAYERS',
  'PLAYER_COUNT',
  'MORE_THAN',
  'FEWER_THAN',
  'NONE',
]);

export const roomSettingsSchema = z.object({
  maxPlayers: z.number().int().min(2).max(12).default(8),
  rounds: z.number().int().min(1).max(20).default(8), // Backward compat: derived from submitted tracks in V1
  bettingTimeSeconds: z.number().int().min(15).max(60).default(30),
  startingChips: z.number().int().min(100).max(5000).default(1000),
  clipDurationSeconds: z.number().int().min(10).max(60).default(30),
  enableOwnerPrediction: z.boolean().default(true),
  enableVibeCombo: z.boolean().default(true), // Backward compat: unused in active V1 gameplay
  allowBots: z.boolean().default(true),
});

export const createRoomSchema = z.object({
  nickname: z.string().trim().min(1).max(24),
  avatar: z.string().trim().min(1),
  settings: roomSettingsSchema.partial().optional(),
});

import { normalizeRoomCode, isValidRoomCode } from '../room/inviteUtils';

export const roomCodeSchema = z
  .string()
  .transform((val) => normalizeRoomCode(val))
  .refine((val) => isValidRoomCode(val), {
    message: 'Código da sala inválido. Deve conter exatamente 4 caracteres alfanuméricos.',
  });

export const joinRoomSchema = z.object({
  roomCode: roomCodeSchema,
  nickname: z.string().trim().min(1).max(24),
  avatar: z.string().trim().min(1),
});

export const trackPayloadSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().min(1),
  albumArt: z.string().optional(),
  audioUrl: z.string().min(1),
  genre: z.string().optional(),
  provider: z.enum(['preview', 'youtube']).optional(),
  durationSeconds: z.number().positive().optional(),
  videoId: z.string().optional(),
  channelTitle: z.string().optional(),
  startTimeSeconds: z.number().min(0).optional(),
  endTimeSeconds: z.number().min(0).optional(),
  isVideo: z.boolean().optional(),
  youtubeId: z.string().optional(),
});

export const submitTrackSchema = z.object({
  roomCode: z.string().trim().min(2).max(10),
  track: trackPayloadSchema,
});

export const saveTrackDraftSchema = z.object({
  roomCode: z.string().trim().min(2).max(10),
  draft: trackPayloadSchema.optional(),
  track: trackPayloadSchema.optional(),
});

export const ownerBetSchema = z.object({
  roomCode: z.string().trim().min(2).max(10),
  predictionKind: secondaryPredictionKindSchema,
  targetPlayerIds: z.array(z.string()).optional(),
  expectedCount: z.number().int().optional(),
  chipAmount: z.number().int().min(0).max(100000),
});

export const guesserBetSchema = z.object({
  roomCode: z.string().trim().min(2).max(10),
  targetOwnerId: z.string().min(1),
  chipAmount: z.number().int().positive(),
  predictionKind: secondaryPredictionKindSchema.optional(),
  targetPlayerIds: z.array(z.string()).optional(),
  expectedCount: z.number().int().optional(),
});

export const reconnectSessionSchema = z.object({
  roomCode: z.string().trim().min(2).max(10),
  previousPlayerId: z.string().min(1),
  reconnectToken: z.string().optional(),
});

export const sendChatSchema = z.object({
  roomCode: z.string().trim().min(2).max(10),
  text: z.string().trim().min(1).max(300),
});

export const sendReactionSchema = z.object({
  roomCode: z.string().trim().min(2).max(10),
  label: z.string().trim().min(1).max(50),
});
