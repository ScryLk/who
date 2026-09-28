import { Server, Socket } from 'socket.io';
import { roomStore } from '../services/roomStore';
import { searchTracks } from '../services/musicService';

export function setupSocketHandlers(io: Server) {
  // Helper to safely broadcast room state without leaking secrets
  function broadcastRoomState(room: any) {
    if (!room) return;
    const roomSockets = io.sockets.adapter.rooms.get(room.code);
    if (roomSockets) {
      for (const sId of roomSockets) {
        const sanitized = roomStore.getSanitizedRoomState(room.code, sId) || room;
        io.to(sId).emit('room_updated', sanitized);
      }
    } else {
      io.to(room.code).emit('room_updated', room);
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
          room.turnTimeRemainingSeconds = (room.turnTimeRemainingSeconds ?? 50) - 1;
          if (room.turnTimeRemainingSeconds <= 0) {
            const updated = roomStore.advanceTurn(room.code);
            broadcastRoomState(updated || room);
          } else {
            broadcastRoomState(room);
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
      try {
        const results = await searchTracks(data.query);
        callback({ success: true, results });
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
          totalRounds?: number;
          options?: any;
        },
        callback
      ) => {
        try {
          const room = roomStore.createRoom(
            socket.id,
            data.nickname,
            data.avatar,
            data.settings,
            data.options
          );
          socket.join(room.code);
          callback({ success: true, room, playerId: socket.id });
          broadcastRoomState(room);
        } catch (err: any) {
          callback({ success: false, error: err.message });
        }
      }
    );

    // Update Room Settings
    socket.on('update_room_settings', (data: { roomCode: string; settings: any }, callback) => {
      try {
        const room = roomStore.updateRoomSettings(data.roomCode, data.settings);
        if (room) {
          if (typeof callback === 'function') callback({ success: true, room });
          broadcastRoomState(room);
        } else {
          if (typeof callback === 'function') callback({ success: false, error: 'Sala não encontrada.' });
        }
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Update Room Options (Backward compatibility)
    socket.on('update_room_options', (data: { roomCode: string; options: any }, callback) => {
      try {
        const room = roomStore.updateRoomOptions(data.roomCode, data.options);
        if (room) {
          if (typeof callback === 'function') callback({ success: true, room });
          broadcastRoomState(room);
        } else {
          if (typeof callback === 'function') callback({ success: false, error: 'Sala não encontrada.' });
        }
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Reconnect Session
    socket.on('reconnect_session', (data: { roomCode: string; previousPlayerId: string }, callback) => {
      try {
        const room = roomStore.getRoom(data.roomCode);
        if (!room) {
          return callback({ success: false, error: 'Sala não encontrada.' });
        }
        const existingPlayer = room.players.find((p) => p.id === data.previousPlayerId);
        if (existingPlayer) {
          const prevId = data.previousPlayerId;
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

          socket.join(room.code);
          const sanitized = roomStore.getSanitizedRoomState(room.code, newId) || room;
          if (typeof callback === 'function') callback({ success: true, room: sanitized, playerId: newId });
          broadcastRoomState(room);
        } else {
          if (typeof callback === 'function') callback({ success: false, error: 'Jogador não encontrado na sala.' });
        }
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Join Room
    socket.on('join_room', (data: { roomCode: string; nickname: string; avatar: string }, callback) => {
      try {
        const result = roomStore.joinRoom(data.roomCode, socket.id, data.nickname, data.avatar);
        if (result.error || !result.room) {
          return callback({ success: false, error: result.error });
        }
        socket.join(result.room.code);
        callback({ success: true, room: result.room, playerId: socket.id });
        broadcastRoomState(result.room);
      } catch (err: any) {
        callback({ success: false, error: err.message });
      }
    });

    // Set Player Ready
    socket.on('set_ready', (data: { roomCode: string; isReady: boolean }, callback) => {
      const room = roomStore.setPlayerReady(data.roomCode, socket.id, data.isReady);
      if (room) {
        if (typeof callback === 'function') callback({ success: true, room });
        broadcastRoomState(room);
      } else {
        if (typeof callback === 'function') callback({ success: false, error: 'Erro ao atualizar prontidão.' });
      }
    });

    // Add Bot Player (Host only)
    socket.on('add_bot', (data: { roomCode: string }, callback) => {
      const room = roomStore.getRoom(data.roomCode);
      if (!room || room.hostId !== socket.id) {
        return callback({ success: false, error: 'Apenas o líder pode adicionar bots.' });
      }
      const updated = roomStore.addBotPlayer(data.roomCode);
      if (updated) {
        callback({ success: true, room: updated });
        broadcastRoomState(updated);
      } else {
        callback({ success: false, error: 'Não foi possível adicionar bot.' });
      }
    });

    // Start Game (Host only)
    socket.on('start_game', (data: { roomCode: string }, callback) => {
      const room = roomStore.getRoom(data.roomCode);
      if (!room || room.hostId !== socket.id) {
        return callback({ success: false, error: 'Apenas o líder pode iniciar a partida.' });
      }
      const updated = roomStore.startMusicSelection(data.roomCode);
      if (updated) {
        callback({ success: true, room: updated });
        broadcastRoomState(updated);
      } else {
        callback({ success: false, error: 'Erro ao iniciar o jogo.' });
      }
    });

    // Submit Track
    socket.on('submit_track', (data: { roomCode: string; track: any }, callback) => {
      const room = roomStore.submitTrack(data.roomCode, socket.id, data.track);
      if (room) {
        callback({ success: true, room });
        broadcastRoomState(room);
      } else {
        callback({ success: false, error: 'Erro ao enviar música.' });
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
        const room = roomStore.placeOwnerBet(
          data.roomCode,
          socket.id,
          data.predictionKind,
          data.chipAmount,
          data.targetPlayerIds,
          data.expectedCount
        );
        if (room) {
          const sanitized = roomStore.getSanitizedRoomState(data.roomCode, socket.id);
          callback({ success: true, room: sanitized });
          broadcastRoomState(room);
        } else {
          callback({ success: false, error: 'Erro ao registrar aposta do dono.' });
        }
      }
    );

    // Place Guesser Bet (ACK returns only acceptance and balance; no outcome leak)
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
        const betResult = roomStore.placeGuesserBet(
          data.roomCode,
          socket.id,
          data.targetOwnerId,
          data.chipAmount,
          data.predictionKind,
          data.targetPlayerIds,
          data.expectedCount
        );

        if (betResult && betResult.room) {
          const sanitized = roomStore.getSanitizedRoomState(data.roomCode, socket.id);
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
          const allGuessed = guesserPlayers.length > 0 && guesserPlayers.every(
            (p) => betResult.room!.guesserBets[p.id] !== undefined
          );

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
            error: betResult?.error || 'Erro ao registrar aposta de adivinhador.',
          });
        }
      }
    );

    // Skip / Advance Reveal Step (Host only)
    socket.on('skip_reveal_step', (data: { roomCode: string }, callback) => {
      const room = roomStore.getRoom(data.roomCode);
      if (!room || room.hostId !== socket.id) {
        return callback?.({ success: false, error: 'Apenas o líder pode avançar a revelação.' });
      }
      if (room.phase === 'REVEAL') {
        const advanced = roomStore.advanceRevealStep(data.roomCode);
        if (advanced) {
          callback?.({ success: true, room: advanced });
          broadcastRoomState(advanced);
        }
      } else if (room.phase === 'BET_LOCKED') {
        const revealRoom = roomStore.startRevealSequence(data.roomCode);
        if (revealRoom) {
          callback?.({ success: true, room: revealRoom });
          broadcastRoomState(revealRoom);
        }
      }
    });

    // Resolve Round (Host only or automated fallback)
    socket.on('resolve_round', (data: { roomCode: string }, callback) => {
      const room = roomStore.resolveRound(data.roomCode);
      if (room && room.lastRoundResult) {
        callback({ success: true, room, roundResult: room.lastRoundResult });
        io.to(room.code).emit('round_resolved', { room, result: room.lastRoundResult });
        broadcastRoomState(room);
      } else {
        callback({ success: false, error: 'Erro ao resolver rodada.' });
      }
    });

    // Next Round (Host only)
    socket.on('next_round', (data: { roomCode: string }, callback) => {
      const room = roomStore.getRoom(data.roomCode);
      if (!room || room.hostId !== socket.id) {
        return callback({ success: false, error: 'Apenas o líder pode avançar a rodada.' });
      }
      const updated = roomStore.nextRound(data.roomCode);
      if (updated) {
        callback({ success: true, room: updated });
        broadcastRoomState(updated);
      } else {
        callback({ success: false, error: 'Erro ao avançar rodada.' });
      }
    });

    // Send Live Chat Message
    socket.on('send_chat', (data: { roomCode: string; senderName: string; text: string }) => {
      const room = roomStore.getRoom(data.roomCode);
      if (room) {
        const msg = roomStore.addChatMessage(room.code, socket.id, data.senderName, data.text);
        if (msg) {
          io.to(room.code).emit('chat_received', msg);
          broadcastRoomState(room);
        }
      }
    });

    // Broadcast Text Reaction (Zero Emojis Policy)
    socket.on('send_reaction', (data: { roomCode: string; label: string; senderName: string }) => {
      const room = roomStore.getRoom(data.roomCode);
      if (room) {
        const cleanLabel = (data.label || 'Bravos').replace(/[^\w\s\u00C0-\u00FF\[\]\?!-]/g, '').trim();
        const reactionMsg = roomStore.addChatMessage(
          room.code,
          socket.id,
          data.senderName,
          `reagiu: ${cleanLabel}`
        );
        if (reactionMsg) {
          io.to(room.code).emit('chat_received', reactionMsg);
          broadcastRoomState(room);
        }
        io.to(room.code).emit('reaction_received', {
          id: `reaction-${Date.now()}`,
          label: cleanLabel,
          senderName: data.senderName,
        });
      }
    });

    // Handle Disconnect with Host Migration and Room Preservation
    socket.on('disconnect', () => {
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

