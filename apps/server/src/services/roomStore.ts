import {
  ChatMessage,
  GameMode,
  GuesserBet,
  OwnerBet,
  Player,
  RoomState,
  SecondaryPredictionKind,
  Track,
  calculateRoundResolution,
} from '@who/shared';

const BOT_NAMES = ['DJ MixMaster 🎧', 'BeatsHunter 🥁', 'SoundWizard 🧙‍♂️', 'MelodyQueen 👑', 'RhythmRocker 🎸'];
const BOT_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=DJMixMaster&backgroundColor=facc15',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=BeatsHunter&backgroundColor=ec4899',
  'https://api.dicebear.com/7.x/bottts/svg?seed=SoundWizard&backgroundColor=8b5cf6',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=MelodyQueen&backgroundColor=06b6d4',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=RhythmRocker&backgroundColor=10b981',
];

class RoomStore {
  private rooms: Map<string, RoomState> = new Map();

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

  createRoom(hostId: string, hostNickname: string, avatar: string, mode: GameMode = 'classic', totalRounds: number = 5): RoomState {
    const code = this.generateRoomCode();
    const hostPlayer: Player = {
      id: hostId,
      nickname: hostNickname,
      avatar: avatar || '🎧',
      chips: 1000,
      isHost: true,
      isBot: false,
      isReady: true,
    };

    const duration = mode === 'turbo' ? 15 : 30;

    const room: RoomState = {
      code,
      hostId,
      mode,
      phase: 'LOBBY',
      currentRound: 1,
      totalRounds,
      roundDurationSeconds: duration,
      timeRemainingSeconds: duration,
      players: [hostPlayer],
      submittedTracks: [],
      guesserBets: {},
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
    return room;
  }

  getRoom(code: string): RoomState | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  getAllRooms(): RoomState[] {
    return Array.from(this.rooms.values());
  }

  joinRoom(code: string, playerId: string, nickname: string, avatar: string): { room?: RoomState; error?: string } {
    const room = this.getRoom(code);
    if (!room) {
      return { error: 'Sala não encontrada!' };
    }
    if (room.phase !== 'LOBBY') {
      return { error: 'A partida já começou nesta sala!' };
    }
    if (room.players.length >= 12) {
      return { error: 'A sala está cheia (máximo 12 jogadores)!' };
    }

    const existing = room.players.find((p) => p.id === playerId);
    if (!existing) {
      const newPlayer: Player = {
        id: playerId,
        nickname,
        avatar: avatar || '🎤',
        chips: 1000,
        isHost: false,
        isBot: false,
        isReady: false,
      };
      room.players.push(newPlayer);
      this.addChatMessage(room.code, 'SYSTEM', 'WHO Bot', `${nickname} entrou na sala!`, true);
    }

    return { room };
  }

  setPlayerReady(code: string, playerId: string, isReady: boolean): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.isReady = isReady;
    }
    return room;
  }

  addBotPlayer(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room || room.players.length >= 12) return undefined;

    const botCount = room.players.filter((p) => p.isBot).length;
    const botIndex = botCount % BOT_NAMES.length;
    const botId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const botPlayer: Player = {
      id: botId,
      nickname: `${BOT_NAMES[botIndex]}`,
      avatar: BOT_AVATARS[botIndex],
      chips: 1000,
      isHost: false,
      isBot: true,
      isReady: true,
    };

    room.players.push(botPlayer);
    this.addChatMessage(room.code, 'SYSTEM', 'WHO Bot', `${botPlayer.nickname} (Bot) entrou na sala!`, true);
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
    room.turnTimeRemainingSeconds = 50;

    const activePlayer = room.players[0];
    if (activePlayer) {
      this.addChatMessage(
        room.code,
        'SYSTEM',
        'WHO Bot',
        `É a vez de ${activePlayer.nickname} escolher a música!`,
        true
      );
    }

    return room;
  }

  advanceTurn(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;

    const nextIndex = (room.turnIndex ?? 0) + 1;

    if (nextIndex < room.players.length) {
      room.turnIndex = nextIndex;
      const nextPlayer = room.players[nextIndex];
      room.currentTurnPlayerId = nextPlayer.id;
      room.turnTimeRemainingSeconds = 50;

      this.addChatMessage(
        room.code,
        'SYSTEM',
        'WHO Bot',
        `É a vez de ${nextPlayer.nickname} escolher a música!`,
        true
      );
    } else {
      // All turns completed! Advance to BETTING phase
      this.startBettingRound(code);
    }

    return room;
  }

  startMusicSelection(code: string): RoomState | undefined {
    return this.startPreGameCountdown(code);
  }

  submitTrack(code: string, playerId: string, trackData: Omit<Track, 'submittedByPlayerId'>): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return undefined;

    const track: Track = {
      ...trackData,
      submittedByPlayerId: playerId,
    };

    player.selectedTrack = track;

    // Filter existing submission from same player if re-submitting
    room.submittedTracks = room.submittedTracks.filter((t) => t.submittedByPlayerId !== playerId);
    room.submittedTracks.push(track);

    // If submitted during turn sequence, advance turn
    if (room.phase === 'MUSIC_SELECTION') {
      return this.advanceTurn(code);
    }

    return room;
  }

  startBettingRound(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;

    // 1. Ensure every player has a secret track assigned
    const fallbackCatalog = [
      { title: 'Superstition', artist: 'Stevie Wonder', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3', genre: 'Funk/Soul' },
      { title: 'Billie Jean', artist: 'Michael Jackson', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3', genre: 'Pop' },
      { title: 'Take On Me', artist: 'a-ha', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a1e2f8.mp3', genre: 'Synthpop' },
      { title: 'Evidências', artist: 'Chitãozinho & Xororó', audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3', genre: 'Sertanejo' },
    ];

    room.players.forEach((p, idx) => {
      const hasTrack = room.submittedTracks.some((t) => t.submittedByPlayerId === p.id);
      if (!hasTrack) {
        const fallback = fallbackCatalog[idx % fallbackCatalog.length];
        const track: Track = {
          id: `auto-track-${p.id}-${Date.now()}`,
          title: fallback.title,
          artist: fallback.artist,
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

    room.phase = 'BETTING';
    const duration = room.mode === 'turbo' ? 15 : 30;
    room.timeRemainingSeconds = duration;

    // Pick track for current round
    const trackIndex = (room.currentRound - 1) % room.submittedTracks.length;
    room.currentTrack = room.submittedTracks[trackIndex];
    room.guesserBets = {};
    delete room.ownerBet;

    // Auto-place bot bets
    const ownerId = room.currentTrack.submittedByPlayerId;

    room.players.forEach((player) => {
      if (player.isBot) {
        if (player.id === ownerId) {
          // Bot is owner
          const predictions = ['NONE', 'PLAYER_COUNT', 'SPECIFIC_PLAYERS'] as const;
          const randPred = predictions[Math.floor(Math.random() * predictions.length)];
          room.ownerBet = {
            ownerId: player.id,
            predictionKind: randPred,
            chipAmount: 150,
          };
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
    predictionKind: 'SPECIFIC_PLAYERS' | 'PLAYER_COUNT' | 'NONE',
    chipAmount: number,
    targetPlayerIds?: string[],
    expectedCount?: number
  ): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room || !room.currentTrack) return undefined;
    if (room.currentTrack.submittedByPlayerId !== ownerId) return undefined;

    room.ownerBet = {
      ownerId,
      predictionKind,
      targetPlayerIds,
      expectedCount,
      chipAmount,
    };
    return room;
  }

  placeGuesserBet(
    code: string,
    guesserId: string,
    targetOwnerId: string,
    chipAmount: number,
    predictionKind?: SecondaryPredictionKind,
    targetPlayerIds?: string[],
    expectedCount?: number
  ): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;

    const bet: GuesserBet = {
      guesserId,
      targetOwnerId,
      predictionKind,
      targetPlayerIds,
      expectedCount,
      chipAmount,
    };
    room.guesserBets[guesserId] = bet;
    return room;
  }

  resolveRound(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room || !room.currentTrack) return undefined;

    room.phase = 'REVEAL';
    room.timeRemainingSeconds = 10;

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
      }
    });

    this.addChatMessage(
      room.code,
      'SYSTEM',
      'WHO Bot',
      `Fim da rodada ${room.currentRound}! Revelando o dono e distribuindo fichas...`,
      true
    );

    return room;
  }

  nextRound(code: string): RoomState | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;

    if (room.currentRound >= room.totalRounds) {
      room.phase = 'GAME_OVER';
      this.addChatMessage(room.code, 'SYSTEM', 'WHO Bot', 'Fim de jogo! Confira o ranking final.', true);
      return room;
    }

    room.currentRound += 1;
    return this.startMusicSelection(code);
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
}

export const roomStore = new RoomStore();
