'use client';

import React, { useState, useEffect } from 'react';
import { RoomState, SecondaryPredictionKind } from '@who/shared';
import { getSocket } from '@/lib/socket';

import { Header } from '@/components/landing/Header';
import { LandingHero } from '@/components/landing/LandingHero';
import { HowToPlayModal } from '@/components/landing/HowToPlayModal';

import { RoomLobby } from '@/components/game/RoomLobby';
import { TrackSelector } from '@/components/game/TrackSelector';
import { BettingPhase } from '@/components/game/BettingPhase';
import { RevealPhase } from '@/components/game/RevealPhase';
import { GameOver } from '@/components/game/GameOver';
import { LiveChat } from '@/components/chat/LiveChat';

import { AVATAR_LIBRARY } from '@/lib/avatars';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { X, Headphones, LogIn, Sparkles } from 'lucide-react';

const AVATARS = ['🎧', '🎤', '🎸', '🥁', '🎷', '👑', '🧙‍♂️', '⚡'];

export default function Home() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(AVATAR_LIBRARY[0].url);
  const [alreadySubmittedTrack, setAlreadySubmittedTrack] = useState(false);

  // Modal states
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [selectedMode, setSelectedMode] = useState<'classic' | 'turbo' | 'epic'>('classic');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const socket = getSocket();

    socket.on('room_updated', (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
      if (updatedRoom.phase === 'MUSIC_SELECTION') {
        setAlreadySubmittedTrack(false);
      }
    });

    socket.on('round_resolved', (data: { room: RoomState }) => {
      setRoom(data.room);
    });

    return () => {
      socket.off('room_updated');
      socket.off('round_resolved');
    };
  }, []);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return setErrorMessage('Por favor, informe seu nickname!');

    const socket = getSocket();
    socket.emit(
      'create_room',
      { nickname, avatar, mode: selectedMode, totalRounds: selectedMode === 'turbo' ? 15 : 5 },
      (res: any) => {
        if (res && res.success) {
          setRoom(res.room);
          setMyPlayerId(res.playerId);
          setIsCreateModalOpen(false);
        } else {
          setErrorMessage(res?.error || 'Erro ao criar sala');
        }
      }
    );
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return setErrorMessage('Por favor, informe seu nickname!');
    if (!joinCode.trim()) return setErrorMessage('Por favor, informe o código da sala!');

    const socket = getSocket();
    socket.emit(
      'join_room',
      { roomCode: joinCode, nickname, avatar },
      (res: any) => {
        if (res && res.success) {
          setRoom(res.room);
          setMyPlayerId(res.playerId);
          setIsJoinModalOpen(false);
        } else {
          setErrorMessage(res?.error || 'Erro ao entrar na sala');
        }
      }
    );
  };

  const handleAddBot = () => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('add_bot', { roomCode: room.code }, (res: any) => {
      if (res && res.success) setRoom(res.room);
    });
  };

  const handleStartGame = () => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('start_game', { roomCode: room.code }, (res: any) => {
      if (res && res.success) setRoom(res.room);
    });
  };

  const handleSubmitTrack = (track: any) => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('submit_track', { roomCode: room.code, track }, (res: any) => {
      if (res && res.success) {
        setAlreadySubmittedTrack(true);
        setRoom(res.room);
      }
    });
  };

  const handlePlaceOwnerBet = (
    predictionKind: SecondaryPredictionKind,
    chipAmount: number,
    targetPlayerIds?: string[],
    expectedCount?: number
  ) => {
    if (!room) return;
    const socket = getSocket();
    socket.emit(
      'place_owner_bet',
      { roomCode: room.code, predictionKind, chipAmount, targetPlayerIds, expectedCount },
      (res: any) => {
        if (res && res.success) setRoom(res.room);
      }
    );
  };

  const handlePlaceGuesserBet = (
    targetOwnerId: string,
    chipAmount: number,
    predictionKind?: SecondaryPredictionKind,
    targetPlayerIds?: string[],
    expectedCount?: number
  ) => {
    if (!room) return;
    const socket = getSocket();
    socket.emit(
      'place_guesser_bet',
      { roomCode: room.code, targetOwnerId, chipAmount, predictionKind, targetPlayerIds, expectedCount },
      (res: any) => {
        if (res && res.success) setRoom(res.room);
      }
    );
  };

  const handleResolveRound = () => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('resolve_round', { roomCode: room.code }, (res: any) => {
      if (res && res.success) setRoom(res.room);
    });
  };

  const handleNextRound = () => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('next_round', { roomCode: room.code }, (res: any) => {
      if (res && res.success) setRoom(res.room);
    });
  };

  // Render Game Screens if player is in an active room
  if (room) {
    const myPlayer = room.players.find((p) => p.id === myPlayerId);

    return (
      <main className="h-screen max-h-screen overflow-hidden bg-gradient-main flex flex-col justify-between relative">

        {room.phase === 'LOBBY' && (
          <RoomLobby
            room={room}
            myPlayerId={myPlayerId}
            onAddBot={handleAddBot}
            onStartGame={handleStartGame}
            onSubmitTrack={handleSubmitTrack}
          />
        )}

        {room.phase === 'MUSIC_SELECTION' && (
          <TrackSelector
            roomCode={room.code}
            onSubmitTrack={handleSubmitTrack}
            alreadySubmitted={alreadySubmittedTrack}
          />
        )}

        {room.phase === 'BETTING' && (
          <BettingPhase
            room={room}
            myPlayerId={myPlayerId}
            onPlaceOwnerBet={handlePlaceOwnerBet}
            onPlaceGuesserBet={handlePlaceGuesserBet}
            onResolveRound={handleResolveRound}
          />
        )}

        {room.phase === 'REVEAL' && (
          <RevealPhase
            room={room}
            myPlayerId={myPlayerId}
            result={room.lastRoundResult}
            onNextRound={handleNextRound}
          />
        )}

        {room.phase === 'GAME_OVER' && (
          <GameOver room={room} onPlayAgain={handleStartGame} />
        )}

        {room.phase !== 'LOBBY' && (
          <LiveChat
            roomCode={room.code}
            myNickname={myPlayer?.nickname || 'Jogador'}
            chatMessages={room.chatMessages || []}
          />
        )}

        <HowToPlayModal
          isOpen={isHowToPlayOpen}
          onClose={() => setIsHowToPlayOpen(false)}
        />
      </main>
    );
  }

  // Render Game Portal Home if not in a room
  return (
    <main className="min-h-screen bg-gradient-main text-white flex flex-col justify-between relative overflow-hidden">
      <Header onOpenHowToPlay={() => setIsHowToPlayOpen(true)} />

      <div className="flex-1 flex items-center justify-center my-auto">
        <LandingHero
          onCreateRoom={() => setIsCreateModalOpen(true)}
          onJoinRoom={() => setIsJoinModalOpen(true)}
          onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
        />
      </div>

      {/* Create Room Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card w-full max-w-md p-6 border-2 border-yellow-400/50 shadow-2xl relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-yellow-400 text-slate-950 shadow-glow-yellow">
                <Headphones className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white">Criar Nova Sala</h2>
            </div>

            {errorMessage && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/20 border border-red-500 text-red-200 text-xs font-bold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-blue-200 uppercase mb-2">
                  Seu Nickname:
                </label>
                <input
                  type="text"
                  placeholder="Ex: DJ Master"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold placeholder-blue-200/50 focus:outline-none focus:border-yellow-400"
                  maxLength={20}
                  required
                />
              </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-blue-200 uppercase">
                      Escolha seu Avatar:
                    </label>
                    <span className="text-[10px] text-yellow-300 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> DiceBear Avatars
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto pr-1 p-1.5 bg-slate-900/50 rounded-2xl border border-white/10">
                    {AVATAR_LIBRARY.map((item) => {
                      const isSelected = avatar === item.url;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setAvatar(item.url)}
                          className={`p-1 rounded-xl transition border flex items-center justify-center ${
                            isSelected
                              ? 'bg-yellow-400 border-yellow-200 scale-105 shadow-glow-yellow'
                              : 'bg-white/10 border-white/10 hover:bg-white/20'
                          }`}
                          title={item.name}
                        >
                          <PlayerAvatar avatar={item.url} size="sm" />
                        </button>
                      );
                    })}
                  </div>
                </div>

              <div>
                <label className="block text-xs font-bold text-blue-200 uppercase mb-2">
                  Modo de Jogo:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['classic', 'turbo', 'epic'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSelectedMode(mode)}
                      className={`py-2 rounded-xl text-xs font-bold capitalize transition border ${
                        selectedMode === mode
                          ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-glow-yellow'
                          : 'bg-white/10 text-white border-white/10'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-button-yellow font-black text-slate-950 text-lg shadow-glow-yellow hover:scale-[1.01] transition"
              >
                CRIAR SALA 🚀
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card w-full max-w-md p-6 border-2 border-cyan-400/50 shadow-2xl relative">
            <button
              onClick={() => setIsJoinModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-cyan-400 text-slate-950 shadow-glow-cyan">
                <LogIn className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white">Entrar em uma Sala</h2>
            </div>

            {errorMessage && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/20 border border-red-500 text-red-200 text-xs font-bold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleJoinRoom} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-blue-200 uppercase mb-2">
                  Código da Sala (4 letras):
                </label>
                <input
                  type="text"
                  placeholder="Ex: ABCD"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-mono font-black text-center text-xl uppercase tracking-widest focus:outline-none focus:border-cyan-400"
                  maxLength={4}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-200 uppercase mb-2">
                  Seu Nickname:
                </label>
                <input
                  type="text"
                  placeholder="Ex: RhythmRocker"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold placeholder-blue-200/50 focus:outline-none focus:border-cyan-400"
                  maxLength={20}
                  required
                />
              </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-blue-200 uppercase">
                      Escolha seu Avatar:
                    </label>
                    <span className="text-[10px] text-cyan-300 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> DiceBear Avatars
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto pr-1 p-1.5 bg-slate-900/50 rounded-2xl border border-white/10">
                    {AVATAR_LIBRARY.map((item) => {
                      const isSelected = avatar === item.url;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setAvatar(item.url)}
                          className={`p-1 rounded-xl transition border flex items-center justify-center ${
                            isSelected
                              ? 'bg-cyan-400 border-cyan-200 scale-105 shadow-glow-cyan'
                              : 'bg-white/10 border-white/10 hover:bg-white/20'
                          }`}
                          title={item.name}
                        >
                          <PlayerAvatar avatar={item.url} size="sm" />
                        </button>
                      );
                    })}
                  </div>
                </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-button-cyan font-black text-slate-950 text-lg shadow-glow-cyan hover:scale-[1.01] transition"
              >
                ENTRAR NA SALA 🎵
              </button>
            </form>
          </div>
        </div>
      )}

      <HowToPlayModal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
      />
    </main>
  );
}
