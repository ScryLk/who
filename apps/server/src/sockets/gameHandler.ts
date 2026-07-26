import { Server, Socket } from 'socket.io';
import { roomStore } from '../services/roomStore';
import { searchTracks } from '../services/musicService';

export function setupSocketHandlers(io: Server) {
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
    socket.on('create_room', (data: { nickname: string; avatar: string; mode?: any; totalRounds?: number }, callback) => {
      try {
        const room = roomStore.createRoom(
          socket.id,
          data.nickname,
          data.avatar,
          data.mode || 'classic',
          data.totalRounds || 5
        );
        socket.join(room.code);
        callback({ success: true, room, playerId: socket.id });
        io.to(room.code).emit('room_updated', room);
      } catch (err: any) {
        callback({ success: false, error: err.message });
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
      const msg = roomStore.addChatMessage(data.roomCode, socket.id, data.senderName, data.text);
      if (msg) {
        io.to(data.roomCode).emit('chat_received', msg);
      }
    });

    // Broadcast Emoji Reaction
    socket.on('send_reaction', (data: { roomCode: string; emoji: string; senderName: string }) => {
      io.to(data.roomCode).emit('reaction_received', {
        id: `reaction-${Date.now()}`,
        emoji: data.emoji,
        senderName: data.senderName,
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] ID: ${socket.id}`);
    });
  });
}
