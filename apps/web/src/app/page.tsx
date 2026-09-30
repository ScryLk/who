'use client';

import React, { useState, useEffect } from 'react';
import {
  DEFAULT_ROOM_SETTINGS,
  RoomSettings,
  RoomState,
  SecondaryPredictionKind,
  generateRandomNickname,
} from '@who/shared';
import { getSocket } from '@/lib/socket';

import { Header } from '@/components/landing/Header';
import { LandingHero } from '@/components/landing/LandingHero';
import { HowToPlayModal } from '@/components/landing/HowToPlayModal';

import { RoomLobby } from '@/components/game/RoomLobby';
import { GameOver } from '@/components/game/GameOver';
import { CreateRoomModal } from '@/components/game/CreateRoomModal';
import { InstantIdentityInput } from '@/components/common/InstantIdentityInput';
import { RoomSettingsConfig } from '@/components/game/RoomSettingsConfig';

import { AVATAR_LIBRARY } from '@/lib/avatars';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { X, Headphones, LogIn, Sparkles } from 'lucide-react';

export default function Home() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [nickname, setNickname] = useState(() => generateRandomNickname());
  const [isGeneratedNickname, setIsGeneratedNickname] = useState(true);
  const [avatar, setAvatar] = useState(AVATAR_LIBRARY[0].url);
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_ROOM_SETTINGS);

  // Modal states
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-reconnect session and detect direct room link on mount
  useEffect(() => {
    const socket = getSocket();

    // Check for direct room code in URL query string (e.g. ?room=ABCD or ?code=ABCD)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get('room') || urlParams.get('code');
      if (codeFromUrl && codeFromUrl.length === 4) {
        setJoinCode(codeFromUrl.toUpperCase());
        setIsJoinModalOpen(true);
      }

      // Check for active existing session in localStorage
      const savedPlayerId = localStorage.getItem('who_player_id');
      const savedRoomCode = localStorage.getItem('who_room_code');
      const savedToken = localStorage.getItem('who_reconnect_token');
      if (savedPlayerId && savedRoomCode) {
        socket.emit(
          'reconnect_session',
          { roomCode: savedRoomCode, previousPlayerId: savedPlayerId, reconnectToken: savedToken || undefined },
          (res: any) => {
            if (res && res.success && res.room) {
              setRoom(res.room);
              setMyPlayerId(res.playerId);
              localStorage.setItem('who_player_id', res.playerId);
              localStorage.setItem('who_room_code', res.room.code);
              if (res.reconnectToken) {
                localStorage.setItem('who_reconnect_token', res.reconnectToken);
              }
            } else {
              localStorage.removeItem('who_player_id');
              localStorage.removeItem('who_room_code');
              localStorage.removeItem('who_reconnect_token');
            }
          }
        );
      }
    }

    socket.on('room_updated', (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
    });

    socket.on('round_resolved', (data: { room: RoomState }) => {
      setRoom(data.room);
    });

    return () => {
      socket.off('room_updated');
      socket.off('round_resolved');
    };
  }, []);

  const handleCreateRoom = (nick: string, av: string, customSettings: RoomSettings) => {
    if (!nick.trim()) return setErrorMessage('Por favor, informe seu apelido!');

    const socket = getSocket();
    socket.emit(
      'create_room',
      { nickname: nick.trim(), avatar: av, settings: customSettings },
      (res: any) => {
        if (res && res.success) {
          setRoom(res.room);
          setMyPlayerId(res.playerId);
          if (typeof window !== 'undefined') {
            localStorage.setItem('who_player_id', res.playerId);
            localStorage.setItem('who_room_code', res.room.code);
            if (res.reconnectToken) {
              localStorage.setItem('who_reconnect_token', res.reconnectToken);
            }
          }
          setIsCreateModalOpen(false);
        } else {
          setErrorMessage(res?.error || 'Erro ao criar sala');
        }
      }
    );
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return setErrorMessage('Por favor, informe seu apelido!');
    if (!joinCode.trim()) return setErrorMessage('Por favor, informe o código da sala!');

    const socket = getSocket();
    socket.emit(
      'join_room',
      { roomCode: joinCode.trim().toUpperCase(), nickname: nickname.trim(), avatar },
      (res: any) => {
        if (res && res.success) {
          setRoom(res.room);
          setMyPlayerId(res.playerId);
          if (typeof window !== 'undefined') {
            localStorage.setItem('who_player_id', res.playerId);
            localStorage.setItem('who_room_code', res.room.code);
            if (res.reconnectToken) {
              localStorage.setItem('who_reconnect_token', res.reconnectToken);
            }
          }
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
        if (res && res.success && res.room) setRoom(res.room);
      }
    );
  };

  const handleSkipRevealStep = () => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('skip_reveal_step', { roomCode: room.code }, (res: any) => {
      if (res && res.success && res.room) setRoom(res.room);
    });
  };

  const handleResolveRound = () => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('resolve_round', { roomCode: room.code }, (res: any) => {
      if (res && res.success && res.room) setRoom(res.room);
    });
  };

  const handleNextRound = () => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('next_round', { roomCode: room.code }, (res: any) => {
      if (res && res.success && res.room) setRoom(res.room);
    });
  };

  const handleLeaveRoom = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('who_player_id');
      localStorage.removeItem('who_room_code');
      localStorage.removeItem('who_reconnect_token');
    }
    if (room) {
      const socket = getSocket();
      socket.emit('leave_room', { roomCode: room.code, playerId: myPlayerId });
    }
    setRoom(null);
    setMyPlayerId('');
  };

  // Render Game Screens if player is in an active room
  if (room) {
    const myPlayer = room.players.find((p) => p.id === myPlayerId);

    return (
      <main
        className={`h-screen max-h-screen ${
          room.phase === 'GAME_OVER' ? 'overflow-y-auto' : 'overflow-hidden'
        } bg-gradient-main flex flex-col justify-between relative`}
      >
        {(room.phase === 'LOBBY' ||
          room.phase === 'COUNTDOWN' ||
          room.phase === 'PREPARATION' ||
          room.phase === 'MUSIC_SELECTION' ||
          room.phase === 'BETTING' ||
          room.phase === 'BET_LOCKED' ||
          room.phase === 'REVEAL') && (
          <RoomLobby
            room={room}
            myPlayerId={myPlayerId}
            onAddBot={handleAddBot}
            onStartGame={handleStartGame}
            onSubmitTrack={handleSubmitTrack}
            onPlaceOwnerBet={handlePlaceOwnerBet}
            onPlaceGuesserBet={handlePlaceGuesserBet}
            onResolveRound={handleResolveRound}
            onNextRound={handleNextRound}
            onSkipRevealStep={handleSkipRevealStep}
            onLeaveRoom={handleLeaveRoom}
          />
        )}

        {room.phase === 'GAME_OVER' && (
          <GameOver
            room={room}
            onPlayAgain={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
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
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateRoom}
        initialNickname={nickname}
        initialAvatar={avatar}
        initialSettings={settings}
        errorMessage={errorMessage}
      />

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

              <InstantIdentityInput
                value={nickname}
                onChange={(val, isAuto) => {
                  setNickname(val);
                  setIsGeneratedNickname(isAuto);
                }}
                isGenerated={isGeneratedNickname}
                label="Seu Apelido"
              />

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
                ENTRAR NA SALA
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
