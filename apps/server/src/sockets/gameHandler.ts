import { Server, Socket } from 'socket.io';
import { roomStore } from '../services/roomStore';
import { searchTracks } from '../services/musicService';

export function setupSocketHandlers(io: Server) {
  // 1-second Room Timer Interval for COUNTDOWN and MUSIC_SELECTION turns
  setInterval(() => {
    const rooms = roomStore.getAllRooms();
    rooms.forEach((room) => {
      if (room.phase === 'COUNTDOWN') {
        room.timeRemainingSeconds = (room.timeRemainingSeconds ?? 5) - 1;
        if (room.timeRemainingSeconds <= 0) {
          roomStore.startTurnSequence(room.code);
        }
        io.to(room.code).emit('room_updated', room);
      } else if (room.phase === 'MUSIC_SELECTION') {
        const currentTurnPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
        if (currentTurnPlayer?.isBot) {
          const updated = roomStore.handleBotTurnIfActive(room.code);
          io.to(room.code).emit('room_updated', updated || room);
        } else {
          room.turnTimeRemainingSeconds = (room.turnTimeRemainingSeconds ?? 50) - 1;
          if (room.turnTimeRemainingSeconds <= 0) {
            const updated = roomStore.advanceTurn(room.code);
            io.to(room.code).emit('room_updated', updated || room);
          } else {
            io.to(room.code).emit('room_updated', room);
          }
        }
      } else if (room.phase === 'BETTING') {
        room.timeRemainingSeconds = (room.timeRemainingSeconds ?? 30) - 1;
        if (room.timeRemainingSeconds <= 0) {
          const resRoom = roomStore.resolveRound(room.code);
          if (resRoom && resRoom.lastRoundResult) {
            io.to(room.code).emit('round_resolved', { room: resRoom, result: resRoom.lastRoundResult });
          }
        }
        io.to(room.code).emit('room_updated', room);
      } else if (room.phase === 'REVEAL') {
        room.timeRemainingSeconds = (room.timeRemainingSeconds ?? 10) - 1;
        if (room.timeRemainingSeconds <= 0) {
          const nextRoom = roomStore.nextRound(room.code);
          io.to(room.code).emit('room_updated', nextRoom);
        } else {
          io.to(room.code).emit('room_updated', room);
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
    socket.on('create_room', (data: { nickname: string; avatar: string; mode?: any; totalRounds?: number; options?: any }, callback) => {
      try {
        const room = roomStore.createRoom(
          socket.id,
          data.nickname,
          data.avatar,
          data.mode || 'classic',
          data.totalRounds || 5,
          data.options
        );
        socket.join(room.code);
        callback({ success: true, room, playerId: socket.id });
        io.to(room.code).emit('room_updated', room);
      } catch (err: any) {
        callback({ success: false, error: err.message });
      }
    });

    // Update Room Options
    socket.on('update_room_options', (data: { roomCode: string; options: any }, callback) => {
      try {
        const room = roomStore.updateRoomOptions(data.roomCode, data.options);
        if (room) {
          if (typeof callback === 'function') callback({ success: true, room });
          io.to(room.code).emit('room_updated', room);
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
          existingPlayer.id = socket.id;
          if (room.hostId === data.previousPlayerId) {
            room.hostId = socket.id;
          }
          if (room.currentTurnPlayerId === data.previousPlayerId) {
            room.currentTurnPlayerId = socket.id;
          }
          socket.join(room.code);
          if (typeof callback === 'function') callback({ success: true, room, playerId: socket.id });
          io.to(room.code).emit('room_updated', room);
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
        io.to(result.room.code).emit('room_updated', result.room);
      } catch (err: any) {
        callback({ success: false, error: err.message });
      }
    });

    // Set Player Ready
    socket.on('set_ready', (data: { roomCode: string; isReady: boolean }, callback) => {
      const room = roomStore.setPlayerReady(data.roomCode, socket.id, data.isReady);
      if (room) {
        if (typeof callback === 'function') callback({ success: true, room });
        io.to(room.code).emit('room_updated', room);
      } else {
        if (typeof callback === 'function') callback({ success: false, error: 'Erro ao atualizar prontidão.' });
      }
    });

    // Add Bot Player
    socket.on('add_bot', (data: { roomCode: string }, callback) => {
      const room = roomStore.addBotPlayer(data.roomCode);
      if (room) {
        callback({ success: true, room });
        io.to(room.code).emit('room_updated', room);
      } else {
        callback({ success: false, error: 'Não foi possível adicionar bot.' });
      }
    });

    // Start Game (Host only)
    socket.on('start_game', (data: { roomCode: string }, callback) => {
      const room = roomStore.startMusicSelection(data.roomCode);
      if (room) {
        callback({ success: true, room });
        io.to(room.code).emit('room_updated', room);
      } else {
        callback({ success: false, error: 'Erro ao iniciar o jogo.' });
      }
    });

    // Submit Track
    socket.on('submit_track', (data: { roomCode: string; track: any }, callback) => {
      const room = roomStore.submitTrack(data.roomCode, socket.id, data.track);
      if (room) {
        callback({ success: true, room });
        io.to(room.code).emit('room_updated', room);
      } else {
        callback({ success: false, error: 'Erro ao enviar música.' });
      }
    });

    // Place Owner Bet & Category
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
          callback({ success: true, room });
          io.to(room.code).emit('room_updated', room);
        } else {
          callback({ success: false, error: 'Erro ao registrar aposta do dono.' });
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
        const room = roomStore.placeGuesserBet(
          data.roomCode,
          socket.id,
          data.targetOwnerId,
          data.chipAmount,
          data.predictionKind,
          data.targetPlayerIds,
          data.expectedCount
        );
        if (room) {
          callback({ success: true, room });
          io.to(room.code).emit('room_updated', room);
        } else {
          callback({ success: false, error: 'Erro ao registrar aposta de adivinhador.' });
        }
      }
    );

    // Resolve Round
    socket.on('resolve_round', (data: { roomCode: string }, callback) => {
      const room = roomStore.resolveRound(data.roomCode);
      if (room && room.lastRoundResult) {
        callback({ success: true, room, roundResult: room.lastRoundResult });
        io.to(room.code).emit('round_resolved', { room, result: room.lastRoundResult });

        // Auto-advance to next round (music selection) after 5 seconds
        setTimeout(() => {
          const currentRoom = roomStore.getRoom(data.roomCode);
          if (currentRoom && currentRoom.phase === 'REVEAL') {
            const updatedRoom = roomStore.nextRound(data.roomCode);
            if (updatedRoom) {
              io.to(updatedRoom.code).emit('room_updated', updatedRoom);
            }
          }
        }, 5000);
      } else {
        callback({ success: false, error: 'Erro ao resolver rodada.' });
      }
    });

    // Next Round
    socket.on('next_round', (data: { roomCode: string }, callback) => {
      const room = roomStore.nextRound(data.roomCode);
      if (room) {
        callback({ success: true, room });
        io.to(room.code).emit('room_updated', room);
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
          io.to(room.code).emit('room_updated', room);
        }
      }
    });

    // Broadcast Emoji Reaction
    socket.on('send_reaction', (data: { roomCode: string; emoji: string; senderName: string }) => {
      const room = roomStore.getRoom(data.roomCode);
      if (room) {
        const reactionMsg = roomStore.addChatMessage(
          room.code,
          socket.id,
          data.senderName,
          `reagiu ${data.emoji}`
        );
        if (reactionMsg) {
          io.to(room.code).emit('chat_received', reactionMsg);
          io.to(room.code).emit('room_updated', room);
        }
        io.to(room.code).emit('reaction_received', {
          id: `reaction-${Date.now()}`,
          emoji: data.emoji,
          senderName: data.senderName,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] ID: ${socket.id}`);
    });
  });
}
