import crypto from 'crypto';
import {
  ChatMessage,
  DEFAULT_ROOM_SETTINGS,
  GuesserBet,
  OwnerBet,
  Player,
  RoomOptions,
  RoomSettings,
  RoomState,
  SecondaryPredictionKind,
  Track,
  calculateRoundResolution,
  createRevealOrder,
  generateUniqueNickname,
  getTrackUniqueKey,
  normalizeOwnerPrediction,
  validateOwnerPrediction,
} from '@who/shared';
import { FEATURED_CATALOG } from './musicService';
import { redisRoomStore } from './redisStore';

const BOT_NAMES = ['DJ MixMaster', 'BeatsHunter', 'SoundWizard', 'MelodyQueen', 'RhythmRocker'];
const BOT_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=DJMixMaster&backgroundColor=facc15',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=BeatsHunter&backgroundColor=ec4899',
  'https://api.dicebear.com/7.x/bottts/svg?seed=SoundWizard&backgroundColor=8b5cf6',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=MelodyQueen&backgroundColor=06b6d4',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=RhythmRocker&backgroundColor=10b981',
];

class RoomStore {
  private rooms: Map<string, RoomState> = new Map();
  private reconnectTokens: Map<string, string> = new Map();
  private privateTrackDrafts: Map<string, Omit<Track, 'submittedByPlayerId'>> = new Map();

  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (this.rooms.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  createReconnectToken(code: string, playerId: string): string {
    const token = crypto.randomUUID();
    this.reconnectTokens.set(`${code.toUpperCase()}:${playerId}`, token);
    return token;
  }

  getReconnectToken(code: string, playerId: string): string | undefined {
    return this.reconnectTokens.get(`${code.toUpperCase()}:${playerId}`);
  }

  validateReconnectToken(code: string, playerId: string, token: string): boolean {
    if (!token) return false;
    const stored = this.reconnectTokens.get(`${code.toUpperCase()}:${playerId}`);
    return stored === token;
  }

  rotateReconnectToken(code: string, oldPlayerId: string, newPlayerId: string, token: string): string | null {
    if (!this.validateReconnectToken(code, oldPlayerId, token)) {
      return null;
    }
    this.reconnectTokens.delete(`${code.toUpperCase()}:${oldPlayerId}`);
    return this.createReconnectToken(code, newPlayerId);
  }

  saveTrackDraft(code: string, playerId: string, draft: Omit<Track, 'submittedByPlayerId'>): boolean {
    const room = this.getRoom(code);
    if (!room || room.phase !== 'MUSIC_SELECTION' || room.currentTurnPlayerId !== playerId) {
      return false;
    }
    this.privateTrackDrafts.set(`${code.toUpperCase()}:${playerId}`, draft);
    return true;
  }

  getTrackDraft(code: string, playerId: string): Omit<Track, 'submittedByPlayerId'> | undefined {
    return this.privateTrackDrafts.get(`${code.toUpperCase()}:${playerId}`);
  }

  async hydrateFromPersistence(): Promise<number> {
    try {
      const persisted = await redisRoomStore.getAllPersistedRooms();
      let count = 0;
      for (const room of persisted) {
        if (!this.rooms.has(room.code.toUpperCase())) {
          this.rooms.set(room.code.toUpperCase(), room);
          count++;
        }
      }
      return count;
    } catch (err) {
      console.warn('[RoomStore] Persistence hydration failed:', err);
      return 0;
    }
  }

  createRoom(
    hostId: string,
    hostNickname: string,
    avatar: string,
    customSettings?: Partial<RoomSettings>,
    options?: RoomOptions
  ): RoomState {
    const code = this.generateRoomCode();
    const settings: RoomSettings = {
      ...DEFAULT_ROOM_SETTINGS,
      ...customSettings,
    };
    const startingChips = settings.startingChips;
    const hostPlayer: Player = {
      id: hostId,
      nickname: hostNickname,
      avatar: avatar || 'party-1',
      chips: startingChips,
      isHost: true,
      isBot: false,
      isReady: true,
    };

    const bettingDuration = settings.bettingTimeSeconds;
    const turnDuration = 45;

    const room: RoomState = {
      code,
      hostId,
      settings,
      phase: 'LOBBY',
      currentRound: 1,
      totalRounds: settings.rounds,
      roundDurationSeconds: bettingDuration,
      timeRemainingSeconds: bettingDuration,
      turnTimeRemainingSeconds: turnDuration,
      players: [hostPlayer],
      submittedTracks: [],
      guesserBets: {},
      pendingOwnerBets: {},
      options,
      chatMessages: [
        {
          id: 'sys-1',
          senderId: 'SYSTEM',
          senderName: 'WHO Bot',
          text: `Sala ${code} criada! Convide seus amigos com este código.`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
    };

    this.rooms.set(code, room);
    this.createReconnectToken(code, hostId);
    redisRoomStore.saveRoom(room).catch(() => {});
    return room;
  }

  updateRoomSettings(code: string, newSettings: Partial<RoomSettings>): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;
    room.settings = { ...room.settings, ...newSettings };
    if (newSettings.rounds) {
      room.totalRounds = newSettings.rounds;
    }
    if (newSettings.bettingTimeSeconds) {
      room.roundDurationSeconds = newSettings.bettingTimeSeconds;
      room.timeRemainingSeconds = newSettings.bettingTimeSeconds;
    }
    if (newSettings.startingChips) {
      room.players.forEach((p) => {
        p.chips = newSettings.startingChips!;
      });
    }
    redisRoomStore.saveRoom(room).catch(() => {});
    return room;
  }

  updateRoomOptions(code: string, options: RoomOptions): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;
    room.options = { ...room.options, ...options };
    if (options.bettingDurationSeconds) {
      room.roundDurationSeconds = options.bettingDurationSeconds;
      room.timeRemainingSeconds = options.bettingDurationSeconds;
      room.settings.bettingTimeSeconds = options.bettingDurationSeconds;
    }
    if (options.turnDurationSeconds) {
      room.turnTimeRemainingSeconds = options.turnDurationSeconds;
    }
    if (options.startingChips) {
      room.settings.startingChips = options.startingChips;
      room.players.forEach((p) => {
        p.chips = options.startingChips!;
      });
    }
    redisRoomStore.saveRoom(room).catch(() => {});
    return room;
  }

  getRoom(code: string): RoomState | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  getAllRooms(): RoomState[] {
    return Array.from(this.rooms.values());
  }

  joinRoom(code: string, playerId: string, nickname: string, avatar: string): { room?: RoomState; reconnectToken?: string; error?: string } {
    const room = this.getRoom(code);
    if (!room) {
      return { error: 'Sala não encontrada!' };
    }
    if (room.phase !== 'LOBBY') {
      return { error: 'A partida já começou nesta sala!' };
    }
    const max = room.settings?.maxPlayers || 12;
    if (room.players.length >= max) {
      return { error: `A sala está cheia (máximo ${max} jogadores)!` };
    }

    const existing = room.players.find((p) => p.id === playerId);
    if (!existing) {
      // Deduplicate nickname
      const existingNicknames = room.players.map((p) => p.nickname);
      const isDuplicate = existingNicknames.some((n) => n.toLowerCase() === nickname.toLowerCase().trim());
      const finalNickname = isDuplicate ? generateUniqueNickname(existingNicknames) : nickname.trim();

      const newPlayer: Player = {
        id: playerId,
        nickname: finalNickname,
        avatar: avatar || 'party-2',
        chips: room.settings?.startingChips || 1000,
        isHost: false,
        isBot: false,
        isReady: false,
      };
      room.players.push(newPlayer);
      this.createReconnectToken(room.code, playerId);
      this.addChatMessage(room.code, 'SYSTEM', 'WHO Bot', `${finalNickname} entrou na sala!`, true);
      redisRoomStore.saveRoom(room).catch(() => {});
    }

    return { room, reconnectToken: this.getReconnectToken(room.code, playerId) };
  }

  leaveRoom(code: string, playerId: string): { room?: RoomState; deleted?: boolean; error?: string } {
    const room = this.getRoom(code);
    if (!room) {
      return { error: 'Sala não encontrada!' };
    }

    const pIndex = room.players.findIndex((p) => p.id === playerId);
    if (pIndex === -1) {
      return { error: 'Jogador não encontrado na sala!' };
    }

    const player = room.players[pIndex];
    room.players.splice(pIndex, 1);

    if (room.guesserBets) {
      delete room.guesserBets[playerId];
    }

    this.reconnectTokens.delete(`${code.toUpperCase()}:${playerId}`);
    this.privateTrackDrafts.delete(`${code.toUpperCase()}:${playerId}`);

    const remainingHumans = room.players.filter((p) => !p.isBot);

    // If no human players remain in the room, clean up and delete the room completely
    if (remainingHumans.length === 0) {
      this.rooms.delete(code.toUpperCase());
      for (const key of Array.from(this.reconnectTokens.keys())) {
        if (key.startsWith(`${code.toUpperCase()}:`)) {
          this.reconnectTokens.delete(key);
        }
      }
      for (const key of Array.from(this.privateTrackDrafts.keys())) {
        if (key.startsWith(`${code.toUpperCase()}:`)) {
          this.privateTrackDrafts.delete(key);
        }
      }
      redisRoomStore.deleteRoom(code).catch(() => {});
      return { deleted: true };
    }

    // If leaving player was the host, migrate to next human
    if (room.hostId === playerId) {
      const newHost = remainingHumans[0];
      room.hostId = newHost.id;
      newHost.isHost = true;
      this.addChatMessage(
        room.code,
        'SYSTEM',
        'WHO Bot',
        `${player.nickname} saiu da sala. ${newHost.nickname} agora é o líder.`,
        true
      );
    } else {
      this.addChatMessage(
        room.code,
        'SYSTEM',
        'WHO Bot',
        `${player.nickname} saiu da sala.`,
        true
      );
    }

    redisRoomStore.saveRoom(room).catch(() => {});
    return { room };
  }

  setPlayerReady(code: string, playerId: string, isReady: boolean): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.isReady = isReady;
    }
    redisRoomStore.saveRoom(room).catch(() => {});
    return room;
  }

  addBotPlayer(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    const max = room?.settings?.maxPlayers || 12;
    if (!room || room.players.length >= max) return undefined;

    const botCount = room.players.filter((p) => p.isBot).length;
    const botIndex = botCount % BOT_NAMES.length;
    const botId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const botPlayer: Player = {
      id: botId,
      nickname: `${BOT_NAMES[botIndex]}`,
      avatar: BOT_AVATARS[botIndex],
      chips: room.settings?.startingChips || 1000,
      isHost: false,
      isBot: true,
      isReady: true,
    };

    room.players.push(botPlayer);
    this.addChatMessage(room.code, 'SYSTEM', 'WHO Bot', `${botPlayer.nickname} (Bot) entrou na sala!`, true);
    redisRoomStore.saveRoom(room).catch(() => {});
    return room;
  }

  startPreGameCountdown(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;

    room.phase = 'COUNTDOWN';
    room.timeRemainingSeconds = 5;
    room.submittedTracks = [];
    room.guesserBets = {};
    delete room.ownerBet;
    room.pendingOwnerBets = {};
    delete room.currentTrack;

    this.addChatMessage(
      room.code,
      'SYSTEM',
      'WHO Bot',
      'A partida vai começar em 5 segundos!',
      true
    );

    return room;
  }

  startTurnSequence(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;

    room.phase = 'MUSIC_SELECTION';
    room.turnIndex = 0;
    room.currentTurnPlayerId = room.players[0]?.id;
    const durationSec = room.options?.turnDurationSeconds || room.settings?.musicSelectionDurationSeconds || 90;
    room.turnTimeRemainingSeconds = durationSec;
    room.selectionDeadlineAt = Date.now() + durationSec * 1000;

    const activePlayer = room.players[0];
    if (activePlayer) {
      this.addChatMessage(
        room.code,
        'SYSTEM',
        'WHO Bot',
        `É a vez de ${activePlayer.nickname} escolher a música!`,
        true
      );
      if (activePlayer.isBot) {
        return this.handleBotTurnIfActive(code);
      }
    }

    return room;
  }

  handleBotTurnIfActive(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room || room.phase !== 'MUSIC_SELECTION') return undefined;

    const currentTurnPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
    if (!currentTurnPlayer || !currentTurnPlayer.isBot) return room;

    // Pick a track from FEATURED_CATALOG not yet submitted in this room
    const submittedKeys = new Set(room.submittedTracks.map((t) => getTrackUniqueKey(t)));
    const available = FEATURED_CATALOG.filter((t) => !submittedKeys.has(getTrackUniqueKey(t)));
    const chosen = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : FEATURED_CATALOG[Math.floor(Math.random() * FEATURED_CATALOG.length)];

    const botTrack: Omit<Track, 'submittedByPlayerId'> = {
      id: `bot-track-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: chosen.title,
      artist: chosen.artist,
      albumArt: chosen.albumArt,
      audioUrl: chosen.audioUrl,
      genre: chosen.genre,
      startTimeSeconds: 0,
      durationSeconds: 30,
      provider: 'preview',
    };

    return this.submitTrack(code, currentTurnPlayer.id, botTrack).room;
  }

  handleTurnTimeout(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room || room.phase !== 'MUSIC_SELECTION') return undefined;

    const currentTurnPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
    if (!currentTurnPlayer) return this.advanceTurn(code);

    if (!room.pendingOwnerBets) room.pendingOwnerBets = {};
    if (!room.pendingOwnerBets[currentTurnPlayer.id]) {
      room.pendingOwnerBets[currentTurnPlayer.id] = {
        ownerId: currentTurnPlayer.id,
        predictionKind: 'NONE',
        chipAmount: 0,
      };
    }

    // 1. Check if player saved a track draft on Confirmar Trecho
    const draftKey = `${code.toUpperCase()}:${currentTurnPlayer.id}`;
    const draft = this.privateTrackDrafts.get(draftKey);
    if (draft) {
      this.privateTrackDrafts.delete(draftKey);
      this.addChatMessage(
        room.code,
        'SYSTEM',
        'WHO Bot',
        `Tempo esgotado! O trecho selecionado por ${currentTurnPlayer.nickname} foi confirmado automaticamente.`,
        true
      );
      return this.submitTrack(code, currentTurnPlayer.id, draft).room;
    }

    // 2. If player already selected a track, auto-confirm it!
    if (currentTurnPlayer.selectedTrack) {
      this.addChatMessage(
        room.code,
        'SYSTEM',
        'WHO Bot',
        `Tempo esgotado! A seleção de ${currentTurnPlayer.nickname} foi confirmada automaticamente.`,
        true
      );
      return this.submitTrack(code, currentTurnPlayer.id, currentTurnPlayer.selectedTrack).room;
    }

    // 3. Otherwise pick a unique fallback track from FEATURED_CATALOG
    const submittedKeys = new Set(room.submittedTracks.map((t) => getTrackUniqueKey(t)));
    const available = FEATURED_CATALOG.filter((t) => !submittedKeys.has(getTrackUniqueKey(t)));
    const chosen = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : FEATURED_CATALOG[Math.floor(Math.random() * FEATURED_CATALOG.length)];

    const fallbackTrack: Omit<Track, 'submittedByPlayerId'> = {
      id: `timeout-track-${currentTurnPlayer.id}-${Date.now()}`,
      title: chosen.title,
      artist: chosen.artist,
      albumArt: chosen.albumArt,
      audioUrl: chosen.audioUrl,
      genre: chosen.genre,
      durationSeconds: 30,
      provider: 'preview',
      startTimeSeconds: 0,
    };

    this.addChatMessage(
      room.code,
      'SYSTEM',
      'WHO Bot',
      `Tempo esgotado! Uma faixa foi selecionada automaticamente para ${currentTurnPlayer.nickname}.`,
      true
    );

    return this.submitTrack(code, currentTurnPlayer.id, fallbackTrack).room;
  }

  advanceTurn(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;

    const nextIndex = (room.turnIndex ?? 0) + 1;

    if (nextIndex < room.players.length) {
      room.turnIndex = nextIndex;
      const nextPlayer = room.players[nextIndex];
      room.currentTurnPlayerId = nextPlayer.id;
      const durationSec = room.options?.turnDurationSeconds || room.settings?.musicSelectionDurationSeconds || 90;
      room.turnTimeRemainingSeconds = durationSec;
      room.selectionDeadlineAt = Date.now() + durationSec * 1000;

      this.addChatMessage(
        room.code,
        'SYSTEM',
        'WHO Bot',
        `É a vez de ${nextPlayer.nickname} escolher a música!`,
        true
      );

      if (nextPlayer.isBot) {
        return this.handleBotTurnIfActive(code);
      }
    } else {
      // All turns completed! Advance to BETTING phase
      delete room.selectionDeadlineAt;
      this.startBettingRound(code);
    }

    return room;
  }

  startMusicSelection(code: string): RoomState | undefined {
    return this.startPreGameCountdown(code);
  }

  submitTrack(
    code: string,
    playerId: string,
    trackData: Omit<Track, 'submittedByPlayerId'>
  ): { room?: RoomState; error?: string } {
    const room = this.getRoom(code);
    if (!room) return { error: 'Sala não encontrada.' };

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { error: 'Jogador não encontrado na sala.' };

    const newKey = getTrackUniqueKey(trackData);
    const isDuplicate = room.submittedTracks.some(
      (t) => t.submittedByPlayerId !== playerId && getTrackUniqueKey(t) === newKey
    );
    if (isDuplicate) {
      return { error: 'TRACK_ALREADY_SELECTED' };
    }

    const clipDuration = room.settings?.clipDurationSeconds || 30;
    let startSec = Math.max(0, trackData.startTimeSeconds || 0);

    // Clamp head if media duration is known
    if (trackData.durationSeconds && trackData.durationSeconds > 0) {
      const maxStart = Math.max(0, trackData.durationSeconds - clipDuration);
      startSec = Math.min(startSec, maxStart);
    }

    const endSec = startSec + clipDuration;
    const provider = trackData.provider || (trackData.videoId || trackData.youtubeId ? 'youtube' : 'preview');

    const track: Track = {
      ...trackData,
      provider,
      startTimeSeconds: startSec,
      endTimeSeconds: endSec,
      submittedByPlayerId: playerId,
    };

    player.selectedTrack = track;
    this.privateTrackDrafts.delete(`${code.toUpperCase()}:${playerId}`);

    // Filter existing submission from same player if re-submitting
    room.submittedTracks = room.submittedTracks.filter((t) => t.submittedByPlayerId !== playerId);
    room.submittedTracks.push(track);

    // If submitted during turn sequence, advance turn
    if (room.phase === 'MUSIC_SELECTION') {
      return { room: this.advanceTurn(code) };
    }

    return { room };
  }

  startBettingRound(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;

    // 1. Ensure every player has a secret track assigned with guaranteed working audio preview
    const submittedTitles = new Set(room.submittedTracks.map((t) => t.title.toLowerCase()));
    room.players.forEach((p, idx) => {
      const hasTrack = room.submittedTracks.some((t) => t.submittedByPlayerId === p.id);
      if (!hasTrack) {
        const available = FEATURED_CATALOG.filter((t) => !submittedTitles.has(t.title.toLowerCase()));
        const fallback = available.length > 0 ? available[0] : FEATURED_CATALOG[idx % FEATURED_CATALOG.length];
        submittedTitles.add(fallback.title.toLowerCase());
        const track: Track = {
          id: `auto-track-${p.id}-${Date.now()}`,
          title: fallback.title,
          artist: fallback.artist,
          albumArt: fallback.albumArt,
          audioUrl: fallback.audioUrl,
          genre: fallback.genre,
          submittedByPlayerId: p.id,
        };
        room.submittedTracks.push(track);
      }
    });

    // 2. Shuffle submitted tracks randomly so owner identities are hidden
    for (let i = room.submittedTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [room.submittedTracks[i], room.submittedTracks[j]] = [room.submittedTracks[j], room.submittedTracks[i]];
    }

    room.totalRounds = room.submittedTracks.length;
    room.currentRound = 1;
    room.phase = 'BETTING';
    const duration = room.settings?.bettingTimeSeconds || 30;
    room.roundDurationSeconds = duration;
    room.timeRemainingSeconds = duration;

    // Record pre-bet starting balances for risk calculations and reset reserved chips
    room.startingBalances = {};
    room.players.forEach((p) => {
      room.startingBalances![p.id] = p.chips;
      p.reservedChips = 0;
    });
    room.revealStage = undefined;
    room.revealIndex = undefined;
    room.revealOrder = undefined;
    room.betLockedAt = undefined;
    delete room.lastRoundResult;

    // Pick first track for round 1
    room.currentTrack = room.submittedTracks[0];
    room.guesserBets = {};
    const ownerId = room.currentTrack.submittedByPlayerId;
    room.ownerBet = room.pendingOwnerBets?.[ownerId];

    // Auto-place bot bets
    room.players.forEach((player) => {
      if (player.isBot) {
        if (player.id === ownerId) {
          if (!room.ownerBet) {
            const predictions = ['NONE', 'PLAYER_COUNT', 'SPECIFIC_PLAYERS'] as const;
            const randPred = predictions[Math.floor(Math.random() * predictions.length)];
            room.ownerBet = {
              ownerId: player.id,
              predictionKind: randPred,
              chipAmount: 150,
            };
          }
        } else {
          // Bot is guesser -> pick random target player
          const nonOwnerPlayers = room.players.filter((p) => p.id !== ownerId);
          const targetPlayer =
            nonOwnerPlayers[Math.floor(Math.random() * nonOwnerPlayers.length)] || room.players[0];
          room.guesserBets[player.id] = {
            guesserId: player.id,
            targetOwnerId: targetPlayer.id,
            chipAmount: 100,
          };
        }
      }
    });

    this.addChatMessage(
      room.code,
      'SYSTEM',
      'WHO Bot',
      `Rodada ${room.currentRound}/${room.totalRounds}! Ouçam a música e façam suas apostas.`,
      true
    );

    return room;
  }

  placeOwnerBet(
    code: string,
    ownerId: string,
    predictionKind: SecondaryPredictionKind,
    chipAmount: number,
    targetPlayerIds?: string[],
    expectedCount?: number
  ): { room?: RoomState; accepted: boolean; error?: string } {
    const room = this.getRoom(code);
    if (!room) return { accepted: false, error: 'Sala não encontrada.' };

    if (room.settings?.enableOwnerPrediction === false) {
      return { accepted: false, error: 'Previsões do dono estão desativadas nesta sala.' };
    }

    const player = room.players.find((p) => p.id === ownerId);
    if (!player) return { accepted: false, error: 'Jogador não encontrado.' };

    const eligibleGuessers = room.players.filter((p) => p.id !== ownerId);
    const eligibleCount = eligibleGuessers.length;
    const eligibleIds = eligibleGuessers.map((p) => p.id);

    const availableBalance = room.startingBalances?.[ownerId] ?? player.chips;

    const validation = validateOwnerPrediction(
      {
        predictionKind,
        expectedCount,
        targetPlayerIds,
        chipAmount,
        availableBalance,
      },
      eligibleCount,
      eligibleIds
    );

    if (!validation.valid) {
      return { accepted: false, error: validation.error || 'Previsão de dono inválida.' };
    }

    const normalized = normalizeOwnerPrediction(
      {
        predictionKind,
        expectedCount,
        targetPlayerIds,
        chipAmount,
      },
      eligibleCount
    );

    const validatedChipAmount = Math.max(0, Math.min(normalized.chipAmount, availableBalance));
    player.reservedChips = validatedChipAmount;

    const finalBet: OwnerBet = {
      ownerId,
      predictionKind: normalized.predictionKind,
      targetPlayerIds: normalized.targetPlayerIds,
      expectedCount: normalized.expectedCount,
      chipAmount: validatedChipAmount,
    };

    if (!room.pendingOwnerBets) {
      room.pendingOwnerBets = {};
    }
    room.pendingOwnerBets[ownerId] = finalBet;

    // If current round belongs to this owner, set active ownerBet
    if (room.currentTrack?.submittedByPlayerId === ownerId) {
      room.ownerBet = finalBet;
    }

    redisRoomStore.saveRoom(room).catch(() => {});
    return { room, accepted: true };
  }

  placeGuesserBet(
    code: string,
    guesserId: string,
    targetOwnerId: string,
    chipAmount: number,
    predictionKind?: SecondaryPredictionKind,
    targetPlayerIds?: string[],
    expectedCount?: number
  ): {
    room?: RoomState;
    accepted: boolean;
    code?: 'INSUFFICIENT_CHIPS' | 'INVALID_BET' | 'ROOM_NOT_FOUND' | 'PHASE_CLOSED' | 'PLAYER_NOT_FOUND';
    stake?: number;
    remainingBalance?: number;
    error?: string;
  } {
    const room = this.getRoom(code);
    if (!room) return { accepted: false, code: 'ROOM_NOT_FOUND', error: 'Sala não encontrada.' };
    if (room.phase !== 'BETTING' || (room.timeRemainingSeconds ?? 0) <= 0) {
      return { accepted: false, code: 'PHASE_CLOSED', error: 'Apostas encerradas para esta rodada.' };
    }

    const player = room.players.find((p) => p.id === guesserId);
    if (!player) return { accepted: false, code: 'PLAYER_NOT_FOUND', error: 'Jogador não encontrado.' };

    if (room.currentTrack?.submittedByPlayerId === guesserId) {
      return { accepted: false, code: 'INVALID_BET', error: 'O dono da música não pode apostar como adivinhador.' };
    }

    if (targetOwnerId === guesserId) {
      return { accepted: false, code: 'INVALID_BET', error: 'Você não pode apostar em você mesmo.' };
    }

    const targetPlayer = room.players.find((p) => p.id === targetOwnerId);
    if (!targetPlayer) {
      return { accepted: false, code: 'INVALID_BET', error: 'Jogador suspeito inválido.' };
    }

    if (!Number.isInteger(chipAmount) || chipAmount <= 0) {
      return {
        accepted: false,
        code: 'INVALID_BET',
        error: 'O valor da aposta deve ser um número inteiro maior que zero.',
      };
    }

    const baseBalance = room.startingBalances?.[guesserId] ?? player.chips;
    const availableBalance = baseBalance - (player.reservedChips || 0);

    if (chipAmount > availableBalance) {
      return {
        accepted: false,
        code: 'INSUFFICIENT_CHIPS',
        error: `Saldo insuficiente. Disponível: ${availableBalance} fichas.`,
      };
    }

    const bet: GuesserBet = {
      guesserId,
      targetOwnerId,
      predictionKind,
      targetPlayerIds,
      expectedCount,
      chipAmount,
    };
    room.guesserBets[guesserId] = bet;

    return {
      room,
      accepted: true,
      stake: chipAmount,
      remainingBalance: availableBalance - chipAmount,
    };
  }

  lockBets(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room || room.phase !== 'BETTING') return room;

    room.phase = 'BET_LOCKED';
    room.timeRemainingSeconds = 3;
    room.betLockedAt = Date.now();
    room.revealStage = 'INTRO';
    room.revealIndex = 0;
    room.revealOrder = createRevealOrder(room.guesserBets, room.players, room.startingBalances);

    this.addChatMessage(
      room.code,
      'SYSTEM',
      'WHO Bot',
      'Apostas fechadas! Nenhuma aposta pode ser alterada. Preparando revelação...',
      true
    );

    return room;
  }

  startRevealSequence(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;

    room.phase = 'REVEAL';
    if (room.revealOrder && room.revealOrder.length > 0) {
      room.revealStage = 'GUESSER_STEPPER';
      room.revealIndex = 0;
      room.timeRemainingSeconds = room.revealOrder.length > 6 ? 2 : 3;
    } else {
      room.revealStage = 'OWNER_REVEAL';
      room.timeRemainingSeconds = 4;
    }

    return room;
  }

  advanceRevealStep(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room || room.phase !== 'REVEAL') return room;

    if (room.revealStage === 'INTRO') {
      if (room.revealOrder && room.revealOrder.length > 0) {
        room.revealStage = 'GUESSER_STEPPER';
        room.revealIndex = 0;
        room.timeRemainingSeconds = room.revealOrder.length > 6 ? 2 : 3;
      } else {
        room.revealStage = 'OWNER_REVEAL';
        room.timeRemainingSeconds = 4;
      }
    } else if (room.revealStage === 'GUESSER_STEPPER') {
      const currentIdx = room.revealIndex ?? 0;
      const totalSteps = room.revealOrder?.length ?? 0;
      if (currentIdx + 1 < totalSteps) {
        room.revealIndex = currentIdx + 1;
        room.timeRemainingSeconds = totalSteps > 6 ? 2 : 3;
      } else {
        room.revealStage = 'OWNER_REVEAL';
        room.timeRemainingSeconds = 4;
        this.addChatMessage(room.code, 'SYSTEM', 'WHO Bot', 'Quem escolheu esta música?', true);
      }
    } else if (room.revealStage === 'OWNER_REVEAL') {
      if (room.settings?.enableOwnerPrediction && room.ownerBet) {
        room.revealStage = 'OWNER_PREDICTION_REVEAL';
        room.timeRemainingSeconds = 4;
      } else {
        this.performSettlement(room);
        room.revealStage = 'SETTLEMENT';
        room.timeRemainingSeconds = 5;
      }
    } else if (room.revealStage === 'OWNER_PREDICTION_REVEAL') {
      this.performSettlement(room);
      room.revealStage = 'SETTLEMENT';
      room.timeRemainingSeconds = 5;
    } else if (room.revealStage === 'SETTLEMENT') {
      room.revealStage = 'ROUND_SUMMARY';
      room.timeRemainingSeconds = 10;
    }

    return room;
  }

  performSettlement(room: RoomState): void {
    if (room.lastRoundResult || !room.currentTrack) return;

    const guesserBetsList = Object.values(room.guesserBets);
    const result = calculateRoundResolution(
      room.currentTrack,
      room.players,
      guesserBetsList,
      room.ownerBet,
      room.currentRound,
      room.totalRounds
    );

    room.lastRoundResult = result;

    // Apply updated chip balances to room.players
    result.playerSummaries.forEach((summary) => {
      const p = room.players.find((player) => player.id === summary.playerId);
      if (p) {
        p.chips = summary.endingChips;
        p.reservedChips = 0;
      }
    });
    room.players.forEach((p) => {
      p.reservedChips = 0;
    });

    this.addChatMessage(
      room.code,
      'SYSTEM',
      'WHO Bot',
      `Fim da rodada ${room.currentRound}! Fichas distribuídas com sucesso.`,
      true
    );
  }

  resolveRound(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room || !room.currentTrack) return undefined;

    this.performSettlement(room);
    room.phase = 'REVEAL';
    room.revealStage = 'ROUND_SUMMARY';
    room.timeRemainingSeconds = 10;

    return room;
  }

  nextRound(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;

    if (room.currentRound >= room.totalRounds || room.currentRound >= room.submittedTracks.length) {
      room.phase = 'GAME_OVER';
      this.addChatMessage(room.code, 'SYSTEM', 'WHO Bot', 'Fim de jogo! Confira o ranking final.', true);
      return room;
    }

    // Advance directly to the next secret track in the playlist
    room.currentRound += 1;
    const nextTrackIndex = room.currentRound - 1;
    room.currentTrack = room.submittedTracks[nextTrackIndex];

    room.phase = 'BETTING';
    const duration = room.settings?.bettingTimeSeconds || 30;
    room.roundDurationSeconds = duration;
    room.timeRemainingSeconds = duration;
    room.guesserBets = {};
    const ownerId = room.currentTrack.submittedByPlayerId;
    room.ownerBet = room.pendingOwnerBets?.[ownerId];

    // Record pre-bet starting balances for risk calculations and reset reserved chips
    room.startingBalances = {};
    room.players.forEach((p) => {
      room.startingBalances![p.id] = p.chips;
      p.reservedChips = 0;
    });
    room.revealStage = undefined;
    room.revealIndex = undefined;
    room.revealOrder = undefined;
    room.betLockedAt = undefined;
    delete room.lastRoundResult;

    // Setup bot bets for this round
    room.players.forEach((player) => {
      if (player.isBot) {
        if (player.id === ownerId) {
          if (!room.ownerBet) {
            const predictions: SecondaryPredictionKind[] = ['NONE', 'PLAYER_COUNT', 'SPECIFIC_PLAYERS'];
            const randPred = predictions[Math.floor(Math.random() * predictions.length)];
            room.ownerBet = {
              ownerId: player.id,
              predictionKind: randPred,
              chipAmount: 150,
            };
          }
        } else {
          const nonOwnerPlayers = room.players.filter((p) => p.id !== ownerId);
          const targetPlayer =
            nonOwnerPlayers[Math.floor(Math.random() * nonOwnerPlayers.length)] || room.players[0];
          room.guesserBets[player.id] = {
            guesserId: player.id,
            targetOwnerId: targetPlayer.id,
            chipAmount: 100,
          };
        }
      }
    });

    this.addChatMessage(
      room.code,
      'SYSTEM',
      'WHO Bot',
      `Rodada ${room.currentRound}/${room.totalRounds}! Ouçam a música e façam suas apostas.`,
      true
    );

    return room;
  }

  addChatMessage(code: string, senderId: string, senderName: string, text: string, isSystem = false): ChatMessage | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;

    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      senderId,
      senderName,
      text,
      timestamp: Date.now(),
      isSystem,
    };

    room.chatMessages.push(msg);
    if (room.chatMessages.length > 50) {
      room.chatMessages.shift();
    }
    return msg;
  }

  /**
   * Returns a sanitized room state for a specific player,
   * shielding secret track submissions, owner identities and other players' bets during BETTING, BET_LOCKED and early REVEAL stages.
   */
  getSanitizedRoomState(code: string, forPlayerId: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;

    // During GAME_OVER, full state can be displayed
    if (room.phase === 'GAME_OVER') {
      return room;
    }

    const sanitizedPlayers = room.players.map((p) => {
      if (p.id === forPlayerId || room.phase === 'GAME_OVER') {
        return p;
      }
      const { selectedTrack, ...safePlayer } = p;
      return safePlayer as Player;
    });

    const isOwner = room.currentTrack?.submittedByPlayerId === forPlayerId;

    // 1. Secret Track Owner masking:
    // Revealed ONLY in OWNER_REVEAL, OWNER_PREDICTION_REVEAL, SETTLEMENT, ROUND_SUMMARY
    const shouldRevealOwner =
      room.phase === 'REVEAL' &&
      (room.revealStage === 'OWNER_REVEAL' ||
        room.revealStage === 'OWNER_PREDICTION_REVEAL' ||
        room.revealStage === 'SETTLEMENT' ||
        room.revealStage === 'ROUND_SUMMARY');

    const sanitizedCurrentTrack = room.currentTrack
      ? {
          ...room.currentTrack,
          submittedByPlayerId: shouldRevealOwner || isOwner ? room.currentTrack.submittedByPlayerId : 'SECRET_OWNER',
        }
      : undefined;

    let sanitizedSubmittedTracks = room.submittedTracks;

    if (room.phase === 'MUSIC_SELECTION') {
      sanitizedSubmittedTracks = room.submittedTracks.map((t) => {
        if (t.submittedByPlayerId === forPlayerId) {
          return t;
        }
        return {
          id: 'submitted-secret',
          title: 'Faixa Secreta',
          artist: 'Artista Secreto',
          audioUrl: '',
          submittedByPlayerId: 'SECRET_OWNER',
        };
      });
    } else if (
      room.phase === 'BETTING' ||
      room.phase === 'BET_LOCKED' ||
      room.phase === 'REVEAL'
    ) {
      sanitizedSubmittedTracks = room.submittedTracks.map((t, idx) => {
        const isCurrentOrPast = idx < (room.currentRound ?? 1);
        if (isCurrentOrPast) {
          return {
            ...t,
            submittedByPlayerId:
              shouldRevealOwner || t.submittedByPlayerId === forPlayerId ? t.submittedByPlayerId : 'SECRET_OWNER',
          };
        }
        return {
          id: 'future-secret',
          title: 'Faixa Futura',
          artist: 'Artista Secreto',
          audioUrl: '',
          submittedByPlayerId: 'SECRET_OWNER',
        };
      });
    } else if (room.phase === 'LOBBY' || room.phase === 'COUNTDOWN') {
      sanitizedSubmittedTracks = [];
    }

    // 2. Guesser Bets masking:
    const sanitizedGuesserBets: Record<string, GuesserBet> = {};

    if (
      room.phase === 'BETTING' ||
      room.phase === 'BET_LOCKED' ||
      (room.phase === 'REVEAL' && room.revealStage === 'INTRO')
    ) {
      // In BETTING, BET_LOCKED, and INTRO:
      // Player sees their own bet.
      // Other players' bets are masked to { guesserId: pId, targetOwnerId: '', chipAmount: 0 }
      // so clients can display "APOSTOU" vs "PENSANDO" without leaking target or stake.
      Object.keys(room.guesserBets).forEach((pId) => {
        if (pId === forPlayerId) {
          sanitizedGuesserBets[pId] = room.guesserBets[pId];
        } else {
          sanitizedGuesserBets[pId] = {
            guesserId: pId,
            targetOwnerId: '',
            chipAmount: 0,
          };
        }
      });
    } else if (room.phase === 'REVEAL' && room.revealStage === 'GUESSER_STEPPER') {
      // In GUESSER_STEPPER:
      // Bets of players up to room.revealIndex in room.revealOrder are revealed (who & how much)!
      const revealedIds = new Set(
        (room.revealOrder || []).slice(0, (room.revealIndex ?? 0) + 1)
      );
      Object.keys(room.guesserBets).forEach((pId) => {
        if (revealedIds.has(pId) || pId === forPlayerId) {
          sanitizedGuesserBets[pId] = room.guesserBets[pId];
        } else {
          sanitizedGuesserBets[pId] = {
            guesserId: pId,
            targetOwnerId: '',
            chipAmount: 0,
          };
        }
      });
    } else {
      // OWNER_REVEAL, OWNER_PREDICTION_REVEAL, SETTLEMENT, ROUND_SUMMARY:
      // All bets are fully visible!
      Object.assign(sanitizedGuesserBets, room.guesserBets);
    }

    // 3. Owner Bet masking:
    // Only actual owner can see it until OWNER_PREDICTION_REVEAL, SETTLEMENT, ROUND_SUMMARY
    const shouldRevealOwnerBet =
      isOwner ||
      (room.phase === 'REVEAL' &&
        (room.revealStage === 'OWNER_PREDICTION_REVEAL' ||
          room.revealStage === 'SETTLEMENT' ||
          room.revealStage === 'ROUND_SUMMARY'));

    const sanitizedOwnerBet = shouldRevealOwnerBet ? room.ownerBet : undefined;

    // 4. lastRoundResult masking:
    // Sent ONLY in SETTLEMENT and ROUND_SUMMARY!
    const shouldSendRoundResult =
      room.phase === 'REVEAL' &&
      (room.revealStage === 'SETTLEMENT' || room.revealStage === 'ROUND_SUMMARY');

    const sanitizedLastRoundResult = shouldSendRoundResult ? room.lastRoundResult : undefined;

    // 5. pendingOwnerBets masking: only the requesting player sees their own pending prediction
    const sanitizedPendingOwnerBets =
      forPlayerId && room.pendingOwnerBets?.[forPlayerId]
        ? { [forPlayerId]: room.pendingOwnerBets[forPlayerId] }
        : undefined;

    return {
      ...room,
      players: sanitizedPlayers,
      currentTrack: sanitizedCurrentTrack,
      submittedTracks: sanitizedSubmittedTracks,
      guesserBets: sanitizedGuesserBets,
      ownerBet: sanitizedOwnerBet,
      pendingOwnerBets: sanitizedPendingOwnerBets,
      lastRoundResult: sanitizedLastRoundResult,
    };
  }
}

export const roomStore = new RoomStore();
