'use client';

import React, { useState, useEffect } from 'react';
import {
  DEFAULT_ROOM_SETTINGS,
  RoomSettings,
  RoomState,
  SecondaryPredictionKind,
  generateRandomNickname,
  buildRoomInvitePath,
  extractRoomCodeFromUrl,
  normalizeRoomCode,
} from '@who/shared';
import { getSocket } from '@/lib/socket';

import { Header } from '@/components/landing/Header';
import { LandingHero } from '@/components/landing/LandingHero';
import { HowToPlayModal } from '@/components/landing/HowToPlayModal';

import { RoomLobby } from '@/components/game/RoomLobby';
import { GameOver } from '@/components/game/GameOver';
import { CreateRoomModal } from '@/components/game/CreateRoomModal';
import { InstantIdentityInput } from '@/components/common/InstantIdentityInput';

import { AVATAR_LIBRARY } from '@/lib/avatars';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { X, LogIn, Sparkles, Users, ArrowLeft } from 'lucide-react';

function formatJoinError(code?: string, rawError?: string, roomCode?: string): string {
  switch (code) {
    case 'ROOM_NOT_FOUND':
      return `Não encontramos a sala #${roomCode || ''}. Confira o código ou peça um novo convite.`;
    case 'ROOM_FULL':
      return 'A sala está cheia. Peça ao host para aumentar o limite ou liberar uma vaga.';
    case 'GAME_ALREADY_STARTED':
      return 'A partida já começou nesta sala. Novos jogadores só podem entrar enquanto a sala está no lobby.';
    case 'INVALID_ROOM_CODE':
      return 'Código da sala inválido. O código deve ter exatamente 4 letras.';
    default:
      return rawError || 'Erro ao entrar na sala. Tente novamente.';
  }
}

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
  const [isInviteMode, setIsInviteMode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Boot algorithm: priority between URL invite and saved reconnect session
  useEffect(() => {
    const socket = getSocket();

    if (typeof window !== 'undefined') {
      const inviteCode = extractRoomCodeFromUrl(window.location.search);
      const savedPlayerId = localStorage.getItem('who_player_id');
      const savedRoomCode = localStorage.getItem('who_room_code');
      const savedToken = localStorage.getItem('who_reconnect_token');

      // Case A: No invite code in URL
      if (!inviteCode) {
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
                window.history.replaceState(null, '', buildRoomInvitePath(res.room.code));
              } else {
                localStorage.removeItem('who_player_id');
                localStorage.removeItem('who_room_code');
                localStorage.removeItem('who_reconnect_token');
              }
            }
          );
        }
      }
      // Case B: inviteCode exists AND inviteCode === savedRoomCode
      else if (savedRoomCode && inviteCode === savedRoomCode && savedPlayerId) {
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
              window.history.replaceState(null, '', buildRoomInvitePath(res.room.code));
            } else {
              // Reconnect failed: clear invalid session for this room and open join invite mode
              localStorage.removeItem('who_player_id');
              localStorage.removeItem('who_room_code');
              localStorage.removeItem('who_reconnect_token');
              setJoinCode(inviteCode);
              setIsInviteMode(true);
              setErrorMessage('');
              setIsJoinModalOpen(true);
            }
          }
        );
      }
      // Case C: inviteCode exists AND inviteCode !== savedRoomCode (or no saved session)
      else {
        // Do NOT reconnect to old room! Explicit invite has precedence.
        setJoinCode(inviteCode);
        setIsInviteMode(true);
        setErrorMessage('');
        setIsJoinModalOpen(true);
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
            window.history.replaceState(null, '', buildRoomInvitePath(res.room.code));
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
    const cleanNick = nickname.trim();
    const cleanCode = normalizeRoomCode(joinCode);

    if (!cleanNick) return setErrorMessage('Por favor, informe seu apelido!');
    if (!cleanCode || cleanCode.length !== 4) {
      return setErrorMessage('Por favor, informe um código de sala válido com 4 letras!');
    }

    const socket = getSocket();
    socket.emit(
      'join_room',
      { roomCode: cleanCode, nickname: cleanNick, avatar },
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
            window.history.replaceState(null, '', buildRoomInvitePath(res.room.code));
          }
          setIsJoinModalOpen(false);
          setErrorMessage('');
        } else {
          setErrorMessage(formatJoinError(res?.code, res?.error, cleanCode));
        }
      }
    );
  };

  const handleCloseJoinModal = () => {
    setIsJoinModalOpen(false);
    setErrorMessage('');
    if (isInviteMode && typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleSwitchToManualJoin = () => {
    setIsInviteMode(false);
    setJoinCode('');
    setErrorMessage('');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
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
      window.history.replaceState(null, '', window.location.pathname);
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
    return (
      <main
        className="h-screen max-h-screen overflow-hidden bg-gradient-main flex flex-col justify-between relative"
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
          onJoinRoom={() => {
            setIsInviteMode(false);
            setJoinCode('');
            setErrorMessage('');
            setIsJoinModalOpen(true);
          }}
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

      {/* Join Room Modal (Supports both Manual Join and Direct Invite Mode) */}
      {isJoinModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-modal-title"
        >
          <div className="glass-card w-full max-w-md p-6 border-2 border-cyan-400/50 shadow-2xl relative">
            <button
              onClick={handleCloseJoinModal}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition focus:outline-none focus:ring-2 focus:ring-cyan-400"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header: Invite Mode vs Manual Join */}
            {isInviteMode ? (
              <div className="flex items-center justify-between mb-5 pr-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-yellow-400 text-slate-950 shadow-glow-yellow">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-yellow-300 block">
                      Você foi convidado
                    </span>
                    <h2 id="join-modal-title" className="text-2xl font-black text-white">
                      SALA <span className="font-mono text-yellow-300">#{joinCode}</span>
                    </h2>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-cyan-400 text-slate-950 shadow-glow-cyan">
                  <LogIn className="w-6 h-6" />
                </div>
                <h2 id="join-modal-title" className="text-2xl font-black text-white">
                  Entrar em uma Sala
                </h2>
              </div>
            )}

            {/* Error Message Box */}
            {errorMessage && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/20 border border-red-500 text-red-200 text-xs font-bold space-y-2">
                <p>{errorMessage}</p>
                {isInviteMode && (
                  <button
                    type="button"
                    onClick={handleSwitchToManualJoin}
                    className="text-[11px] underline text-cyan-300 hover:text-cyan-100 font-bold block"
                  >
                    Tentar outro código manualmente
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleJoinRoom} className="space-y-5">
              {/* Room Code Field: Shown only in Manual Join Mode */}
              {!isInviteMode ? (
                <div>
                  <label className="block text-xs font-bold text-blue-200 uppercase mb-2">
                    Código da Sala (4 letras):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ABCD"
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(normalizeRoomCode(e.target.value).slice(0, 4));
                      if (errorMessage) setErrorMessage('');
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-mono font-black text-center text-xl uppercase tracking-widest focus:outline-none focus:border-cyan-400"
                    maxLength={4}
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10">
                  <span className="text-xs text-blue-200 font-medium flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-cyan-400" />
                    Entrando na sala #{joinCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleSwitchToManualJoin}
                    className="text-xs font-bold text-cyan-300 hover:text-cyan-200 underline"
                  >
                    Usar outro código
                  </button>
                </div>
              )}

              <InstantIdentityInput
                value={nickname}
                onChange={(val, isAuto) => {
                  setNickname(val);
                  setIsGeneratedNickname(isAuto);
                  if (errorMessage) setErrorMessage('');
                }}
                isGenerated={isGeneratedNickname}
                label="Como vamos te chamar?"
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
                className="w-full py-4 rounded-xl bg-gradient-button-cyan font-black text-slate-950 text-lg shadow-glow-cyan hover:scale-[1.01] active:scale-[0.99] transition flex items-center justify-center gap-2"
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
