import { Server, Socket } from 'socket.io';
import {
  createRoomSchema,
  guesserBetSchema,
  joinRoomSchema,
  ownerBetSchema,
  reconnectSessionSchema,
  roomSettingsSchema,
  saveTrackDraftSchema,
  sendChatSchema,
  sendReactionSchema,
  submitTrackSchema,
} from '@who/shared';
import { roomStore } from '../services/roomStore';
import { searchTracks } from '../services/musicService';

export function setupSocketHandlers(io: Server) {
  const searchRateLimits = new Map<string, number[]>();

  function checkSearchRateLimit(socketId: string): boolean {
    const now = Date.now();
    const windowMs = 10000;
    const maxRequests = 15;
    const timestamps = (searchRateLimits.get(socketId) || []).filter((t) => now - t < windowMs);
    if (timestamps.length >= maxRequests) {
      return false;
    }
    timestamps.push(now);
    searchRateLimits.set(socketId, timestamps);
    return true;
  }

  // Helper to safely broadcast room state without leaking secrets
  function broadcastRoomState(room: any) {
    if (!room || !room.code) return;
    const roomSockets = io.sockets.adapter.rooms.get(room.code);
    if (roomSockets) {
      for (const sId of roomSockets) {
        const sanitized = roomStore.getSanitizedRoomState(room.code, sId) || room;
        io.to(sId).emit('room_updated', sanitized);
      }
    }
  }

  // 1-second Room Timer Interval for COUNTDOWN, MUSIC_SELECTION, BETTING, BET_LOCKED, REVEAL
  setInterval(() => {
    const rooms = roomStore.getAllRooms();
    rooms.forEach((room) => {
      if (room.phase === 'COUNTDOWN') {
        room.timeRemainingSeconds = (room.timeRemainingSeconds ?? 5) - 1;
        if (room.timeRemainingSeconds <= 0) {
          roomStore.startTurnSequence(room.code);
        }
        broadcastRoomState(room);
      } else if (room.phase === 'MUSIC_SELECTION') {
        const currentTurnPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
        if (currentTurnPlayer?.isBot) {
          const updated = roomStore.handleBotTurnIfActive(room.code);
          broadcastRoomState(updated || room);
        } else {
          const now = Date.now();
          if (room.selectionDeadlineAt) {
            const remainingMs = Math.max(0, room.selectionDeadlineAt - now);
            room.turnTimeRemainingSeconds = Math.ceil(remainingMs / 1000);
          } else {
            room.turnTimeRemainingSeconds = (room.turnTimeRemainingSeconds ?? 90) - 1;
          }

          if ((room.turnTimeRemainingSeconds ?? 0) <= 0) {
            const updated = roomStore.handleTurnTimeout(room.code);
            broadcastRoomState(updated || room);
          }
        }
      } else if (room.phase === 'BETTING') {
        room.timeRemainingSeconds = (room.timeRemainingSeconds ?? 30) - 1;
        if (room.timeRemainingSeconds <= 0) {
          const lockedRoom = roomStore.lockBets(room.code);
          broadcastRoomState(lockedRoom || room);
        } else {
          broadcastRoomState(room);
        }
      } else if (room.phase === 'BET_LOCKED') {
        room.timeRemainingSeconds = (room.timeRemainingSeconds ?? 3) - 1;
        if (room.timeRemainingSeconds <= 0) {
          const revealRoom = roomStore.startRevealSequence(room.code);
          broadcastRoomState(revealRoom || room);
        } else {
          broadcastRoomState(room);
        }
      } else if (room.phase === 'REVEAL') {
        room.timeRemainingSeconds = (room.timeRemainingSeconds ?? 3) - 1;
        if (room.timeRemainingSeconds <= 0) {
          if (room.revealStage === 'ROUND_SUMMARY') {
            const nextRoom = roomStore.nextRound(room.code);
            broadcastRoomState(nextRoom || room);
          } else {
            const advanced = roomStore.advanceRevealStep(room.code);
            broadcastRoomState(advanced || room);
          }
        } else {
          broadcastRoomState(room);
        }
      }
    });
  }, 1000);

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket Connected] ID: ${socket.id}`);

    // Search music tracks
    socket.on('search_tracks', async (data: { query: string }, callback) => {
      if (typeof callback !== 'function') return;
      if (!checkSearchRateLimit(socket.id)) {
        return callback({ success: false, error: 'Muitas buscas em sequência. Aguarde alguns segundos.' });
      }
      const rawQuery = (data?.query || '').trim();
      if (!rawQuery || rawQuery.length > 100) {
        return callback({ success: false, error: 'Busca inválida.' });
      }
      try {
        const results = await searchTracks(rawQuery);
        callback({
          success: true,
          results,
          provider: results.provider || 'preview',
          fallbackApplied: results.fallbackApplied,
          warning: results.warning,
          errorCode: results.errorCode,
        });
      } catch (err: any) {
        callback({ success: false, error: err.message });
      }
    });

    // Create Room
    socket.on(
      'create_room',
      (
        data: {
          nickname: string;
          avatar: string;
          settings?: any;
          options?: any;
        },
        callback
      ) => {
        if (typeof callback !== 'function') return;
        try {
          const nick = (data?.nickname || '').trim().slice(0, 30);
          if (!nick) {
            return callback({ success: false, error: 'Apelido é obrigatório.' });
          }
          const room = roomStore.createRoom(
            socket.id,
            nick,
            data.avatar,
            data.settings,
            data.options
          );
          socket.join(room.code);
          const reconnectToken = roomStore.getReconnectToken(room.code, socket.id);
          const sanitized = roomStore.getSanitizedRoomState(room.code, socket.id) || room;
          callback({ success: true, room: sanitized, playerId: socket.id, reconnectToken });
          broadcastRoomState(room);
        } catch (err: any) {
          callback({ success: false, error: err.message });
        }
      }
    );

    // Update Room Settings
    socket.on('update_room_settings', (data: { roomCode: string; settings: any }, callback) => {
      try {
        const code = (data?.roomCode || '').trim().toUpperCase();
        const room = roomStore.getRoom(code);
        if (!room) {
          if (typeof callback === 'function') callback({ success: false, error: 'Sala não encontrada.' });
          return;
        }
        if (room.hostId !== socket.id) {
          if (typeof callback === 'function') callback({ success: false, error: 'Apenas o líder pode alterar as configurações.' });
          return;
        }
        if (room.phase !== 'LOBBY') {
          if (typeof callback === 'function') callback({ success: false, error: 'Configurações só podem ser alteradas no lobby.' });
          return;
        }
        const parsedSettings = roomSettingsSchema.partial().safeParse(data.settings);
        if (!parsedSettings.success) {
          if (typeof callback === 'function') callback({ success: false, error: 'Configurações inválidas.' });
          return;
        }
        const updated = roomStore.updateRoomSettings(code, parsedSettings.data);
        if (updated) {
          const sanitized = roomStore.getSanitizedRoomState(code, socket.id) || updated;
          if (typeof callback === 'function') callback({ success: true, room: sanitized });
          broadcastRoomState(updated);
        } else {
          if (typeof callback === 'function') callback({ success: false, error: 'Erro ao atualizar configurações.' });
        }
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Update Room Options (Backward compatibility)
    socket.on('update_room_options', (data: { roomCode: string; options: any }, callback) => {
      try {
        const code = (data?.roomCode || '').trim().toUpperCase();
        const room = roomStore.getRoom(code);
        if (!room) {
          if (typeof callback === 'function') callback({ success: false, error: 'Sala não encontrada.' });
          return;
        }
        if (room.hostId !== socket.id) {
          if (typeof callback === 'function') callback({ success: false, error: 'Apenas o líder pode alterar as opções.' });
          return;
        }
        if (room.phase !== 'LOBBY') {
          if (typeof callback === 'function') callback({ success: false, error: 'Opções só podem ser alteradas no lobby.' });
          return;
        }
        const updated = roomStore.updateRoomOptions(code, data.options);
        if (updated) {
          const sanitized = roomStore.getSanitizedRoomState(code, socket.id) || updated;
          if (typeof callback === 'function') callback({ success: true, room: sanitized });
          broadcastRoomState(updated);
        } else {
          if (typeof callback === 'function') callback({ success: false, error: 'Erro ao atualizar opções.' });
        }
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Reconnect Session
    socket.on('reconnect_session', (data: { roomCode: string; previousPlayerId: string; reconnectToken?: string }, callback) => {
      if (typeof callback !== 'function') return;
      try {
        const parsed = reconnectSessionSchema.safeParse(data);
        if (!parsed.success) {
          return callback({ success: false, error: 'Parâmetros de reconexão inválidos.' });
        }
        const { roomCode, previousPlayerId, reconnectToken } = parsed.data;
        const room = roomStore.getRoom(roomCode);
        if (!room) {
          return callback({ success: false, error: 'Sala não encontrada.' });
        }

        const existingPlayer = room.players.find((p) => p.id === previousPlayerId);
        if (!existingPlayer) {
          return callback({ success: false, error: 'Jogador não encontrado na sala.' });
        }

        // Validate cryptographically signed reconnect token if present in store
        const storedToken = roomStore.getReconnectToken(roomCode, previousPlayerId);
        if (storedToken) {
          if (!reconnectToken || reconnectToken !== storedToken) {
            return callback({ success: false, error: 'Token de reconexão inválido ou sessão expirada.' });
          }
        }

        const prevId = previousPlayerId;
        const newId = socket.id;

        // Reassign player identity safely across all room registries
        existingPlayer.id = newId;

        if (room.hostId === prevId) {
          room.hostId = newId;
        }
        if (room.currentTurnPlayerId === prevId) {
          room.currentTurnPlayerId = newId;
        }

        // Transfer submitted tracks
        room.submittedTracks.forEach((t) => {
          if (t.submittedByPlayerId === prevId) {
            t.submittedByPlayerId = newId;
          }
        });
        if (room.currentTrack && room.currentTrack.submittedByPlayerId === prevId) {
          room.currentTrack.submittedByPlayerId = newId;
        }

        // Transfer bets
        if (room.guesserBets[prevId]) {
          room.guesserBets[newId] = {
            ...room.guesserBets[prevId],
            guesserId: newId,
          };
          delete room.guesserBets[prevId];
        }
        if (room.ownerBet && room.ownerBet.ownerId === prevId) {
          room.ownerBet.ownerId = newId;
        }
        if (room.pendingOwnerBets && room.pendingOwnerBets[prevId]) {
          room.pendingOwnerBets[newId] = {
            ...room.pendingOwnerBets[prevId],
            ownerId: newId,
          };
          delete room.pendingOwnerBets[prevId];
        }

        // Rotate reconnect token
        const newToken =
          roomStore.rotateReconnectToken(roomCode, prevId, newId, reconnectToken || storedToken || '') ||
          roomStore.createReconnectToken(roomCode, newId);

        socket.join(room.code);
        const sanitized = roomStore.getSanitizedRoomState(room.code, newId) || room;
        callback({ success: true, room: sanitized, playerId: newId, reconnectToken: newToken });
        broadcastRoomState(room);
      } catch (err: any) {
        callback({ success: false, error: err.message });
      }
    });

    // Join Room
    socket.on('join_room', (data: { roomCode: string; nickname: string; avatar: string }, callback) => {
      if (typeof callback !== 'function') return;
      try {
        const parsed = joinRoomSchema.safeParse(data);
        if (!parsed.success) {
          return callback({
            success: false,
            error: 'Código da sala ou apelido inválido.',
            code: 'INVALID_ROOM_CODE',
          });
        }
        const { roomCode: code, nickname: nick, avatar } = parsed.data;
        const result = roomStore.joinRoom(code, socket.id, nick, avatar);
        if (result.error || !result.room) {
          return callback({
            success: false,
            error: result.error,
            code: result.errorCode || 'JOIN_FAILED',
          });
        }
        socket.join(result.room.code);
        const sanitized = roomStore.getSanitizedRoomState(result.room.code, socket.id) || result.room;
        callback({
          success: true,
          room: sanitized,
          playerId: socket.id,
          reconnectToken: result.reconnectToken,
        });
        broadcastRoomState(result.room);
      } catch (err: any) {
        callback({ success: false, error: err.message, code: 'JOIN_ERROR' });
      }
    });

    // Leave Room (strictly uses socket.id to prevent third-party kicks)
    socket.on('leave_room', (data: { roomCode: string }, callback) => {
      try {
        const roomCode = (data?.roomCode || '').trim().toUpperCase();
        if (!roomCode) {
          if (typeof callback === 'function') callback({ success: false, error: 'Código da sala não fornecido.' });
          return;
        }

        const result = roomStore.leaveRoom(roomCode, socket.id);
        socket.leave(roomCode);

        if (typeof callback === 'function') {
          callback({ success: true, deleted: result.deleted });
        }

        if (result.room) {
          broadcastRoomState(result.room);
        }
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Set Player Ready
    socket.on('set_ready', (data: { roomCode: string; isReady: boolean }, callback) => {
      const code = (data?.roomCode || '').trim().toUpperCase();
      const room = roomStore.getRoom(code);
      if (!room || room.phase !== 'LOBBY') {
        if (typeof callback === 'function') callback({ success: false, error: 'Prontidão só pode ser alterada no lobby.' });
        return;
      }
      const updated = roomStore.setPlayerReady(code, socket.id, Boolean(data?.isReady));
      if (updated) {
        const sanitized = roomStore.getSanitizedRoomState(code, socket.id) || updated;
        if (typeof callback === 'function') callback({ success: true, room: sanitized });
        broadcastRoomState(updated);
      } else {
        if (typeof callback === 'function') callback({ success: false, error: 'Erro ao atualizar prontidão.' });
      }
    });

    // Add Bot Player (Host only)
    socket.on('add_bot', (data: { roomCode: string }, callback) => {
      if (typeof callback !== 'function') return;
      const code = (data?.roomCode || '').trim().toUpperCase();
      const room = roomStore.getRoom(code);
      if (!room) {
        return callback({ success: false, error: 'Sala não encontrada.' });
      }
      if (room.hostId !== socket.id) {
        return callback({ success: false, error: 'Apenas o líder pode adicionar bots.' });
      }
      if (room.phase !== 'LOBBY') {
        return callback({ success: false, error: 'Bots só podem ser adicionados no lobby.' });
      }
      if (room.settings?.allowBots === false) {
        return callback({ success: false, error: 'A adição de bots está desativada nas configurações desta sala.' });
      }
      const max = room.settings?.maxPlayers || 12;
      if (room.players.length >= max) {
        return callback({ success: false, error: `A sala já atingiu o limite de ${max} jogadores.` });
      }
      const updated = roomStore.addBotPlayer(code);
      if (updated) {
        const sanitized = roomStore.getSanitizedRoomState(code, socket.id) || updated;
        callback({ success: true, room: sanitized });
        broadcastRoomState(updated);
      } else {
        callback({ success: false, error: 'Não foi possível adicionar bot.' });
      }
    });

    // Start Game (Host only)
    socket.on('start_game', (data: { roomCode: string }, callback) => {
      if (typeof callback !== 'function') return;
      const code = (data?.roomCode || '').trim().toUpperCase();
      const room = roomStore.getRoom(code);
      if (!room) {
        return callback({ success: false, error: 'Sala não encontrada.' });
      }
      if (room.hostId !== socket.id) {
        return callback({ success: false, error: 'Apenas o líder pode iniciar a partida.' });
      }
      if (room.phase !== 'LOBBY') {
        return callback({ success: false, error: 'A partida já foi iniciada.' });
      }
      if (room.players.length < 2) {
        return callback({ success: false, error: 'São necessários pelo menos 2 jogadores para iniciar a partida.' });
      }
      const unreadyHumans = room.players.filter((p) => !p.isBot && !p.isReady);
      if (unreadyHumans.length > 0) {
        return callback({ success: false, error: 'Todos os jogadores devem estar prontos para iniciar!' });
      }
      const updated = roomStore.startMusicSelection(code);
      if (updated) {
        const sanitized = roomStore.getSanitizedRoomState(code, socket.id) || updated;
        callback({ success: true, room: sanitized });
        broadcastRoomState(updated);
      } else {
        callback({ success: false, error: 'Erro ao iniciar o jogo.' });
      }
    });

    // Save Track Draft (on Confirmar Trecho)
    socket.on('save_track_draft', (data: { roomCode: string; track?: any; draft?: any }, callback) => {
      const parsed = saveTrackDraftSchema.safeParse(data);
      if (!parsed.success) {
        if (typeof callback === 'function') callback({ success: false, error: 'Dados do rascunho inválidos.' });
        return;
      }
      const { roomCode, track, draft } = parsed.data;
      const targetDraft = draft || track;
      if (!targetDraft) {
        if (typeof callback === 'function') callback({ success: false, error: 'Nenhum rascunho fornecido.' });
        return;
      }
      const room = roomStore.getRoom(roomCode);
      if (!room || room.phase !== 'MUSIC_SELECTION' || room.currentTurnPlayerId !== socket.id) {
        if (typeof callback === 'function') callback({ success: false, error: 'Não autorizado ou fase incorreta.' });
        return;
      }
      const saved = roomStore.saveTrackDraft(roomCode, socket.id, targetDraft);
      if (typeof callback === 'function') callback({ success: saved });
    });

    // Submit Track
    socket.on('submit_track', (data: { roomCode: string; track: any }, callback) => {
      if (typeof callback !== 'function') return;
      const parsed = submitTrackSchema.safeParse(data);
      if (!parsed.success) {
        return callback({ success: false, error: 'Dados da música inválidos.' });
      }
      const { roomCode, track } = parsed.data;
      const room = roomStore.getRoom(roomCode);
      if (!room) {
        return callback({ success: false, error: 'Sala não encontrada.' });
      }
      if (room.phase !== 'MUSIC_SELECTION') {
        return callback({ success: false, error: 'Seleção de música fechada no momento.' });
      }
      if (room.currentTurnPlayerId !== socket.id) {
        return callback({ success: false, error: 'Aguarde sua vez de escolher a música!' });
      }
      const result = roomStore.submitTrack(roomCode, socket.id, track);
      if (result.error === 'TRACK_ALREADY_SELECTED') {
        return callback({ success: false, error: 'Esta música já foi escolhida nesta sala. Escolha outra!' });
      }
      if (result.room) {
        const sanitized = roomStore.getSanitizedRoomState(roomCode, socket.id) || result.room;
        callback({ success: true, room: sanitized });
        broadcastRoomState(result.room);
      } else {
        callback({ success: false, error: result.error || 'Erro ao enviar música.' });
      }
    });

    // Place Owner Bet
    socket.on(
      'place_owner_bet',
      (
        data: {
          roomCode: string;
          predictionKind: any;
          chipAmount: number;
          targetPlayerIds?: string[];
          expectedCount?: number;
        },
        callback
      ) => {
        const parsed = ownerBetSchema.safeParse(data);
        if (!parsed.success) {
          if (typeof callback === 'function') callback({ success: false, error: 'Previsão de dono inválida.' });
          return;
        }
        const { roomCode, predictionKind, chipAmount, targetPlayerIds, expectedCount } = parsed.data;
        const result = roomStore.placeOwnerBet(
          roomCode,
          socket.id,
          predictionKind,
          chipAmount,
          targetPlayerIds,
          expectedCount
        );
        if (result.accepted && result.room) {
          const sanitized = roomStore.getSanitizedRoomState(roomCode, socket.id) || result.room;
          if (typeof callback === 'function') callback({ success: true, room: sanitized });
          broadcastRoomState(result.room);
        } else {
          if (typeof callback === 'function') callback({ success: false, error: result.error || 'Erro ao registrar previsão.' });
        }
      }
    );

    // Place Guesser Bet
    socket.on(
      'place_guesser_bet',
      (
        data: {
          roomCode: string;
          targetOwnerId: string;
          chipAmount: number;
          predictionKind?: any;
          targetPlayerIds?: string[];
          expectedCount?: number;
        },
        callback
      ) => {
        if (typeof callback !== 'function') return;
        const parsed = guesserBetSchema.safeParse(data);
        if (!parsed.success) {
          return callback({ success: false, error: 'Aposta inválida.' });
        }
        const { roomCode, targetOwnerId, chipAmount, predictionKind, targetPlayerIds, expectedCount } = parsed.data;
        const betResult = roomStore.placeGuesserBet(
          roomCode,
          socket.id,
          targetOwnerId,
          chipAmount,
          predictionKind,
          targetPlayerIds,
          expectedCount
        );

        if (betResult && betResult.accepted && betResult.room) {
          const sanitized = roomStore.getSanitizedRoomState(roomCode, socket.id) || betResult.room;
          callback({
            success: true,
            accepted: true,
            stake: betResult.stake,
            remainingBalance: betResult.remainingBalance,
            room: sanitized,
          });
          broadcastRoomState(betResult.room);

          // Check if all non-owner players have placed their bets -> auto trigger BET_LOCKED
          const ownerId = betResult.room.currentTrack?.submittedByPlayerId;
          const guesserPlayers = betResult.room.players.filter((p) => p.id !== ownerId);
          const allGuessed =
            guesserPlayers.length > 0 &&
            guesserPlayers.every((p) => betResult.room!.guesserBets[p.id] !== undefined);

          if (allGuessed && betResult.room.phase === 'BETTING') {
            const lockedRoom = roomStore.lockBets(betResult.room.code);
            if (lockedRoom) {
              broadcastRoomState(lockedRoom);
            }
          }
        } else {
          callback({
            success: false,
            code: betResult?.code,
            error: betResult?.error || 'Erro ao registrar aposta.',
          });
        }
      }
    );

    // Skip / Advance Reveal Step (Host only)
    socket.on('skip_reveal_step', (data: { roomCode: string }, callback) => {
      const code = (data?.roomCode || '').trim().toUpperCase();
      const room = roomStore.getRoom(code);
      if (!room || room.hostId !== socket.id) {
        return callback?.({ success: false, error: 'Apenas o líder pode avançar a revelação.' });
      }
      if (room.phase === 'REVEAL') {
        const advanced = roomStore.advanceRevealStep(code);
        if (advanced) {
          const sanitized = roomStore.getSanitizedRoomState(code, socket.id) || advanced;
          callback?.({ success: true, room: sanitized });
          broadcastRoomState(advanced);
        }
      } else if (room.phase === 'BET_LOCKED') {
        const revealRoom = roomStore.startRevealSequence(code);
        if (revealRoom) {
          const sanitized = roomStore.getSanitizedRoomState(code, socket.id) || revealRoom;
          callback?.({ success: true, room: sanitized });
          broadcastRoomState(revealRoom);
        }
      }
    });

    // Resolve Round (Host only)
    socket.on('resolve_round', (data: { roomCode: string }, callback) => {
      const code = (data?.roomCode || '').trim().toUpperCase();
      const room = roomStore.getRoom(code);
      if (!room || room.hostId !== socket.id) {
        if (typeof callback === 'function') callback({ success: false, error: 'Apenas o líder pode resolver a rodada.' });
        return;
      }
      const updated = roomStore.resolveRound(code);
      if (updated && updated.lastRoundResult) {
        const roomSockets = io.sockets.adapter.rooms.get(code);
        if (roomSockets) {
          for (const sId of roomSockets) {
            const sanitized = roomStore.getSanitizedRoomState(code, sId) || updated;
            io.to(sId).emit('round_resolved', { room: sanitized, result: updated.lastRoundResult });
          }
        }
        if (typeof callback === 'function') {
          const sanitized = roomStore.getSanitizedRoomState(code, socket.id) || updated;
          callback({ success: true, room: sanitized, roundResult: updated.lastRoundResult });
        }
        broadcastRoomState(updated);
      } else {
        if (typeof callback === 'function') callback({ success: false, error: 'Erro ao resolver rodada.' });
      }
    });

    // Next Round (Host only)
    socket.on('next_round', (data: { roomCode: string }, callback) => {
      const code = (data?.roomCode || '').trim().toUpperCase();
      const room = roomStore.getRoom(code);
      if (!room || room.hostId !== socket.id) {
        if (typeof callback === 'function') callback({ success: false, error: 'Apenas o líder pode avançar a rodada.' });
        return;
      }
      const updated = roomStore.nextRound(code);
      if (updated) {
        const sanitized = roomStore.getSanitizedRoomState(code, socket.id) || updated;
        if (typeof callback === 'function') callback({ success: true, room: sanitized });
        broadcastRoomState(updated);
      } else {
        if (typeof callback === 'function') callback({ success: false, error: 'Erro ao avançar rodada.' });
      }
    });

    // Send Live Chat Message
    socket.on('send_chat', (data: { roomCode: string; text: string }) => {
      const parsed = sendChatSchema.safeParse(data);
      if (!parsed.success) return;
      const { roomCode, text } = parsed.data;
      const room = roomStore.getRoom(roomCode);
      if (!room) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      const msg = roomStore.addChatMessage(room.code, socket.id, player.nickname, text.trim());
      if (msg) {
        io.to(room.code).emit('chat_received', msg);
        broadcastRoomState(room);
      }
    });

    // Broadcast Text Reaction (Strict Zero Emojis Policy)
    socket.on('send_reaction', (data: { roomCode: string; label: string }) => {
      const parsed = sendReactionSchema.safeParse(data);
      if (!parsed.success) return;
      const { roomCode, label } = parsed.data;
      const room = roomStore.getRoom(roomCode);
      if (!room) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      const cleanLabel = (label || 'Bravos').replace(/[^\w\s\u00C0-\u00FF\[\]\?!-]/g, '').trim().slice(0, 30);
      const reactionMsg = roomStore.addChatMessage(
        room.code,
        socket.id,
        player.nickname,
        `reagiu: ${cleanLabel}`
      );
      if (reactionMsg) {
        io.to(room.code).emit('chat_received', reactionMsg);
        broadcastRoomState(room);
      }
      io.to(room.code).emit('reaction_received', {
        id: `reaction-${Date.now()}`,
        label: cleanLabel,
        senderName: player.nickname,
      });
    });

    // Handle Disconnect with Host Migration and Room Preservation
    socket.on('disconnect', () => {
      searchRateLimits.delete(socket.id);
      console.log(`[Socket Disconnected] ID: ${socket.id}`);
      const rooms = roomStore.getAllRooms();
      for (const room of rooms) {
        const pIndex = room.players.findIndex((p) => p.id === socket.id);
        if (pIndex !== -1) {
          const disconnectedPlayer = room.players[pIndex];
          if (room.phase === 'LOBBY') {
            if (!disconnectedPlayer.isBot) {
              room.players.splice(pIndex, 1);
              if (room.hostId === socket.id && room.players.length > 0) {
                const nextHost = room.players.find((p) => !p.isBot) || room.players[0];
                room.hostId = nextHost.id;
                nextHost.isHost = true;
                roomStore.addChatMessage(
                  room.code,
                  'SYSTEM',
                  'WHO Bot',
                  `${nextHost.nickname} agora é o líder da sala.`,
                  true
                );
              }
              broadcastRoomState(room);
            }
          } else {
            // Mid-game: preserve state for reconnection; migrate host if disconnected host
            if (room.hostId === socket.id) {
              const activeHuman = room.players.find((p) => !p.isBot && p.id !== socket.id);
              if (activeHuman) {
                room.hostId = activeHuman.id;
                activeHuman.isHost = true;
                roomStore.addChatMessage(
                  room.code,
                  'SYSTEM',
                  'WHO Bot',
                  `Liderança transferida para ${activeHuman.nickname}.`,
                  true
                );
                broadcastRoomState(room);
              }
            }
          }
        }
      }
    });
  });
}
