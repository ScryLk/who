'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SecondaryPredictionKind, Player, RoomState, ChatMessage, requiresExpectedCount } from '@who/shared';
import { Play, Pause, Music, Volume2, Send, Crown, Check, Headphones, MessageSquare, Sparkles, Coins, Flame, Target, UserCheck, Users, Ban } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';

interface BettingPhaseProps {
  room: RoomState;
  myPlayerId: string;
  onPlaceOwnerBet: (
    predictionKind: SecondaryPredictionKind,
    chipAmount: number,
    targetPlayerIds?: string[],
    expectedCount?: number
  ) => void;
  onPlaceGuesserBet: (
    targetOwnerId: string,
    chipAmount: number,
    predictionKind?: SecondaryPredictionKind,
    targetPlayerIds?: string[],
    expectedCount?: number
  ) => void;
  onResolveRound: () => void;
}

const REACTION_LABELS = ['Bravos', 'Sensacional', 'Mestre', 'Genial'];
const QUICK_CHIP_AMOUNTS = [50, 100, 200, 500];

export const BettingPhase: React.FC<BettingPhaseProps> = ({
  room,
  myPlayerId,
  onPlaceOwnerBet,
  onPlaceGuesserBet,
  onResolveRound,
}) => {
  const currentTrack = room.currentTrack;
  const isOwner = currentTrack?.submittedByPlayerId === myPlayerId;
  const myPlayer = room.players.find((p) => p.id === myPlayerId);
  const myMaxChips = myPlayer?.chips || 1000;

  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(room.roundDurationSeconds || 30);

  // Form prediction state for both Owner and Guesser
  const [predictionKind, setPredictionKind] = useState<SecondaryPredictionKind | undefined>(undefined);
  const [selectedTargetPlayerIds, setSelectedTargetPlayerIds] = useState<string[]>([]);
  const [expectedCount, setExpectedCount] = useState<number>(1);
  const [chipBet, setChipBet] = useState(100);

  // Guesser specific: target owner selection
  const nonMePlayers = room.players.filter((p) => p.id !== myPlayerId);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(
    nonMePlayers.length > 0 ? nonMePlayers[0].id : ''
  );

  const [submittedBet, setSubmittedBet] = useState(false);
  const [chatText, setChatText] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-play preview audio
  useEffect(() => {
    if (currentTrack?.audioUrl) {
      const audio = new Audio(currentTrack.audioUrl);
      audioRef.current = audio;
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
      audio.onended = () => setIsPlaying(false);

      return () => {
        audio.pause();
      };
    }
  }, [currentTrack]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (room.hostId === myPlayerId) {
            onResolveRound();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [room.hostId, myPlayerId, onResolveRound]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room.chatMessages]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    const socket = getSocket();
    socket.emit('send_chat', {
      roomCode: room.code,
      senderName: myPlayer?.nickname || 'Jogador',
      text: chatText,
    });
    setChatText('');
  };

  const handleSendReaction = (emoji: string) => {
    const socket = getSocket();
    socket.emit('send_reaction', {
      roomCode: room.code,
      emoji,
      senderName: myPlayer?.nickname || 'Jogador',
    });
  };

  const toggleTargetPlayer = (playerId: string) => {
    setSelectedTargetPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const handleGuesserSubmit = () => {
    if (!selectedOwnerId) return;
    const finalBet = Math.min(chipBet, myMaxChips);
    onPlaceGuesserBet(
      selectedOwnerId,
      finalBet,
      predictionKind,
      predictionKind === 'SPECIFIC_PLAYERS' ? selectedTargetPlayerIds : undefined,
      requiresExpectedCount(predictionKind) ? expectedCount : undefined
    );
    setSubmittedBet(true);
  };

  const handleOwnerSubmit = () => {
    const finalBet = Math.min(chipBet, myMaxChips);
    onPlaceOwnerBet(
      predictionKind || 'NONE',
      finalBet,
      predictionKind === 'SPECIFIC_PLAYERS' ? selectedTargetPlayerIds : undefined,
      requiresExpectedCount(predictionKind) ? expectedCount : undefined
    );
    setSubmittedBet(true);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-orange-400 via-rose-400 to-rose-500 text-white p-4 md:p-6 flex flex-col justify-between font-outfit">
      {/* Top Header Bar */}
      <header className="w-full flex items-center justify-between max-w-7xl mx-auto mb-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow">
            <Music className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-wider drop-shadow">Who?</span>
        </div>

        {/* Circular Countdown Timer */}
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full border-4 border-yellow-300 bg-orange-500/80 flex flex-col items-center justify-center font-black shadow-lg">
            <span className="text-xl leading-none text-white">{timeLeft}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-yellow-200 mt-1">
            Tempo restante
          </span>
        </div>

        <div className="text-right">
          <span className="text-lg font-black text-white block drop-shadow">
            Rodada {room.currentRound} de {room.totalRounds}
          </span>
          <span className="text-xs text-yellow-100 font-semibold flex items-center gap-1 justify-end">
            <Coins className="w-3.5 h-3.5 text-yellow-300" /> Saldo: {myMaxChips} fichas
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Audio Player Card */}
          <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-6 border border-white/30 shadow-xl text-center relative overflow-hidden">
            <h3 className="text-lg md:text-xl font-bold mb-4 flex items-center justify-center gap-2">
              <Headphones className="w-5 h-5 text-yellow-300 animate-bounce-subtle" />
              <span>Escute e adivinhe quem escolheu esta música</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-pink-400 shadow-2xl bg-slate-900 flex items-center justify-center">
                  <img
                    src={currentTrack?.albumArt || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80'}
                    alt="Album Cover"
                    className={`w-full h-full object-cover ${isPlaying ? 'animate-spin' : ''}`}
                    style={{ animationDuration: '10s' }}
                  />
                  <button
                    onClick={toggleAudio}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-rose-500/90 text-white flex items-center justify-center shadow-lg hover:scale-110 transition"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 h-12">
                {[50, 90, 30, 100, 70, 40, 85, 60, 95, 30, 80, 50, 90, 40].map((h, i) => (
                  <div
                    key={i}
                    className={`w-2 rounded-full transition-all duration-300 ${
                      isPlaying ? 'bg-yellow-300 animate-pulse' : 'bg-white/30'
                    }`}
                    style={{ height: isPlaying ? `${h}%` : '25%' }}
                  />
                ))}
              </div>
            </div>

            <div className="w-full max-w-md mx-auto">
              <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden mb-1">
                <div
                  className="bg-gradient-to-r from-yellow-300 to-amber-400 h-full transition-all duration-1000"
                  style={{
                    width: `${((room.roundDurationSeconds - timeLeft) / room.roundDurationSeconds) * 100}%`,
                  }}
                />
              </div>
              <span className="text-[11px] font-semibold text-yellow-100">
                15-30 segundos de amostra
              </span>
            </div>
          </div>

          {/* Interactive Betting Section */}
          <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-6 border border-white/30 shadow-xl space-y-6">
            {isOwner ? (
              /* TRACK OWNER VIEW */
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-rose-600/40 border border-yellow-300/50 text-center shadow-lg">
                  <span className="text-yellow-300 font-black text-xl block flex items-center justify-center gap-2">
                    <Crown className="w-6 h-6 text-yellow-300" /> Você é o Dono desta Música!
                  </span>
                  <p className="text-xs text-white/90 mt-1">
                    Faça sua aposta de previsão do comportamento da sala nesta rodada:
                  </p>
                </div>

                {/* 3 Custom Prediction Options */}
                <div>
                  <label className="block text-xs font-bold text-yellow-200 uppercase mb-3 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-yellow-300" /> Escolha o Requisito da sua Aposta:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* SPECIFIC_PLAYERS */}
                    <button
                      type="button"
                      onClick={() =>
                        setPredictionKind(predictionKind === 'SPECIFIC_PLAYERS' ? undefined : 'SPECIFIC_PLAYERS')
                      }
                      className={`p-4 rounded-2xl text-left border-2 transition ${
                        predictionKind === 'SPECIFIC_PLAYERS'
                          ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-glow-yellow scale-102 font-black'
                          : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                      }`}
                    >
                      <div className="font-extrabold text-sm flex items-center gap-2">
                        <UserCheck className="w-4 h-4" /> Jogador específico(s) (3.5x)
                      </div>
                      <div className="text-[11px] opacity-80 mt-1">Escolha quem no lobby vai acertar!</div>
                    </button>

                    {/* PLAYER_COUNT */}
                    <button
                      type="button"
                      onClick={() =>
                        setPredictionKind(predictionKind === 'PLAYER_COUNT' ? undefined : 'PLAYER_COUNT')
                      }
                      className={`p-4 rounded-2xl text-left border-2 transition ${
                        predictionKind === 'PLAYER_COUNT'
                          ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-glow-yellow scale-102 font-black'
                          : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                      }`}
                    >
                      <div className="font-extrabold text-sm flex items-center gap-2">
                        <Users className="w-4 h-4" /> Quantos jogadores (3.0x)
                      </div>
                      <div className="text-[11px] opacity-80 mt-1">Preveja a quantidade exata de acertos!</div>
                    </button>

                    {/* NONE */}
                    <button
                      type="button"
                      onClick={() =>
                        setPredictionKind(predictionKind === 'NONE' ? undefined : 'NONE')
                      }
                      className={`p-4 rounded-2xl text-left border-2 transition ${
                        predictionKind === 'NONE'
                          ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-glow-yellow scale-102 font-black'
                          : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                      }`}
                    >
                      <div className="font-extrabold text-sm flex items-center gap-2">
                        <Ban className="w-4 h-4" /> Nenhum jogador (4.0x)
                      </div>
                      <div className="text-[11px] opacity-80 mt-1">Ninguém na sala vai acertar!</div>
                    </button>
                  </div>
                </div>

                {/* Sub-Selection: SPECIFIC_PLAYERS Player Picker */}
                {predictionKind === 'SPECIFIC_PLAYERS' && (
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-yellow-400/40 space-y-3 animate-fadeIn">
                    <label className="block text-xs font-bold text-yellow-300">
                      Selecione o(s) jogador(es) do lobby que você aposta que VÃO adivinhar sua música:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {nonMePlayers.map((p) => {
                        const isSelected = selectedTargetPlayerIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleTargetPlayer(p.id)}
                            className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition ${
                              isSelected
                                ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-md scale-102'
                                : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                            }`}
                          >
                            <PlayerAvatar avatar={p.avatar} size="sm" />
                            <span className="truncate">{p.nickname}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-Selection: PLAYER_COUNT Number Selector */}
                {predictionKind === 'PLAYER_COUNT' && (
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-yellow-400/40 space-y-3 animate-fadeIn text-center">
                    <label className="block text-xs font-bold text-yellow-300">
                      Escolha a quantidade exata de jogadores que vão acertar:
                    </label>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setExpectedCount(num)}
                          className={`w-12 h-12 rounded-2xl font-black text-base border transition ${
                            expectedCount === num
                              ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-glow-yellow scale-110'
                              : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chip Bet Amount Slider */}
                <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold text-white">
                    <span>Fichas Apostadas:</span>
                    <span className="text-emerald-300 font-mono font-black text-lg flex items-center gap-1">
                      <Coins className="w-5 h-5 text-yellow-300" /> {chipBet} / {myMaxChips}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max={myMaxChips}
                    step="10"
                    value={chipBet}
                    onChange={(e) => setChipBet(Number(e.target.value))}
                    className="w-full accent-yellow-400 h-2 bg-white/20 rounded-lg cursor-pointer"
                  />

                  {/* Quick Chip Buttons */}
                  <div className="flex gap-2">
                    {QUICK_CHIP_AMOUNTS.filter((val) => val <= myMaxChips).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setChipBet(val)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition border ${
                          chipBet === val
                            ? 'bg-yellow-400 text-slate-950 border-yellow-200'
                            : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                        }`}
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleOwnerSubmit}
                  disabled={submittedBet}
                  className={`w-full py-4 rounded-2xl font-black text-lg transition flex items-center justify-center gap-2 border-2 shadow-xl ${
                    submittedBet
                      ? 'bg-emerald-600 border-emerald-300 text-white shadow-glow-cyan cursor-default'
                      : 'bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 border-yellow-200 text-slate-950 shadow-glow-yellow hover:scale-[1.02] cursor-pointer'
                  }`}
                >
                  <Check className="w-6 h-6" />
                  <span>
                    {submittedBet
                      ? 'Voto Confirmado e Registrado!'
                      : `CONFIRMAR PREVISÃO (${chipBet} pts)`}
                  </span>
                </button>
              </div>
            ) : (
              /* GUESSER VIEW WITH 3 CUSTOM PREDICTION REQUIREMENTS */
              <div className="space-y-6">
                <h3 className="text-lg md:text-xl font-bold text-center flex items-center justify-center gap-2">
                  <Target className="w-5 h-5 text-yellow-300" /> 1. Clique no jogador que você acha ser o Dono:
                </h3>

                {/* 8 Player Avatar Selection Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {room.players.map((player: Player) => {
                    const isMe = player.id === myPlayerId;
                    const isSelected = selectedOwnerId === player.id;

                    return (
                      <div
                        key={player.id}
                        onClick={() => {
                          if (!isMe) {
                            setSelectedOwnerId(player.id);
                          }
                        }}
                        className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center transition border-2 ${
                          isMe
                            ? 'bg-white/10 border-white/20 opacity-40 cursor-not-allowed'
                            : isSelected
                            ? 'bg-yellow-400/30 border-yellow-300 shadow-glow-yellow scale-105 cursor-pointer'
                            : 'bg-white/15 border-white/20 hover:bg-white/25 hover:scale-102 cursor-pointer'
                        }`}
                      >
                        <div className="relative mb-2">
                          <PlayerAvatar avatar={player.avatar} size="lg" className="border-2 border-yellow-300 shadow-inner bg-white/20" />
                        </div>

                        <span className="font-bold text-white text-sm truncate max-w-full">
                          {player.nickname}
                        </span>
                        {isMe ? (
                          <span className="text-[10px] text-yellow-200 font-semibold">(Você)</span>
                        ) : (
                          isSelected && (
                            <span className="text-[10px] bg-yellow-400 text-slate-950 font-black px-2 py-0.5 rounded-full mt-1 inline-flex items-center gap-1">
                              <span>PALPITE</span>
                              <Check className="w-3 h-3" />
                            </span>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 2. REQUISITOS DE APOSTA SECUNDÁRIA (REPLACING OLD CATEGORIES BOX) */}
                <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/10 space-y-3">
                  <label className="block text-xs font-bold text-yellow-200 uppercase flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Previsão Secundária da Sala (Opcional):
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* SPECIFIC_PLAYERS */}
                    <button
                      type="button"
                      onClick={() =>
                        setPredictionKind(predictionKind === 'SPECIFIC_PLAYERS' ? undefined : 'SPECIFIC_PLAYERS')
                      }
                      className={`p-3 rounded-xl text-left border transition ${
                        predictionKind === 'SPECIFIC_PLAYERS'
                          ? 'bg-amber-400 text-slate-950 border-amber-200 font-bold shadow-md'
                          : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5" /> Jogador específico(s) (3.5x)
                      </div>
                    </button>

                    {/* PLAYER_COUNT */}
                    <button
                      type="button"
                      onClick={() =>
                        setPredictionKind(predictionKind === 'PLAYER_COUNT' ? undefined : 'PLAYER_COUNT')
                      }
                      className={`p-3 rounded-xl text-left border transition ${
                        predictionKind === 'PLAYER_COUNT'
                          ? 'bg-amber-400 text-slate-950 border-amber-200 font-bold shadow-md'
                          : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Quantos jogadores (3.0x)
                      </div>
                    </button>

                    {/* NONE */}
                    <button
                      type="button"
                      onClick={() =>
                        setPredictionKind(predictionKind === 'NONE' ? undefined : 'NONE')
                      }
                      className={`p-3 rounded-xl text-left border transition ${
                        predictionKind === 'NONE'
                          ? 'bg-amber-400 text-slate-950 border-amber-200 font-bold shadow-md'
                          : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <Ban className="w-3.5 h-3.5" /> Nenhum jogador (4.0x)
                      </div>
                    </button>
                  </div>

                  {/* Sub-Selection: SPECIFIC_PLAYERS */}
                  {predictionKind === 'SPECIFIC_PLAYERS' && (
                    <div className="pt-2 space-y-2 border-t border-white/10 animate-fadeIn">
                      <span className="text-[11px] text-yellow-200 block font-semibold">
                        Escolha quem no lobby você aposta que vai acertar o dono:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {nonMePlayers.map((p) => {
                          const isSelected = selectedTargetPlayerIds.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleTargetPlayer(p.id)}
                              className={`p-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition ${
                                isSelected
                                  ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-md'
                                  : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                              }`}
                            >
                              <PlayerAvatar avatar={p.avatar} size="sm" />
                              <span className="truncate">{p.nickname}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sub-Selection: PLAYER_COUNT */}
                  {predictionKind === 'PLAYER_COUNT' && (
                    <div className="pt-2 space-y-2 border-t border-white/10 animate-fadeIn text-center">
                      <span className="text-[11px] text-yellow-200 block font-semibold">
                        Quantidade exata de pessoas que vão acertar:
                      </span>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setExpectedCount(num)}
                            className={`w-10 h-10 rounded-xl font-bold text-xs border transition ${
                              expectedCount === num
                                ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow'
                                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Guesser Chip Bet Slider */}
                <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold text-white">
                    <span>Fichas Apostadas:</span>
                    <span className="text-emerald-300 font-mono font-black text-lg flex items-center gap-1">
                      <Coins className="w-5 h-5 text-yellow-300" /> {chipBet} / {myMaxChips}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max={myMaxChips}
                    step="10"
                    value={chipBet}
                    onChange={(e) => setChipBet(Number(e.target.value))}
                    className="w-full accent-yellow-400 h-2 bg-white/20 rounded-lg cursor-pointer"
                  />

                  {/* Quick Chip Buttons */}
                  <div className="flex gap-2">
                    {QUICK_CHIP_AMOUNTS.filter((val) => val <= myMaxChips).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setChipBet(val)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition border ${
                          chipBet === val
                            ? 'bg-yellow-400 text-slate-950 border-yellow-200'
                            : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                        }`}
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Bet Action Button */}
                <button
                  onClick={handleGuesserSubmit}
                  disabled={!selectedOwnerId || submittedBet}
                  className={`w-full py-4 rounded-2xl font-black text-lg transition flex items-center justify-center gap-2 border-2 shadow-xl ${
                    submittedBet
                      ? 'bg-emerald-600 border-emerald-300 text-white shadow-glow-cyan cursor-default'
                      : selectedOwnerId
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 border-yellow-200 text-slate-950 shadow-glow-yellow hover:scale-[1.02] cursor-pointer'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-6 h-6" />
                  <span>
                    {submittedBet
                      ? 'Voto Confirmado e Registrado!'
                      : selectedOwnerId
                      ? `CONFIRMAR VOTO (${chipBet} pts)`
                      : 'SELECIONE UM JOGADOR ACIMA'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat & Reações Sidebar */}
        <div className="lg:col-span-4 bg-white/20 backdrop-blur-xl rounded-3xl p-5 border border-white/30 shadow-xl flex flex-col h-[560px]">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/20">
            <MessageSquare className="w-5 h-5 text-yellow-300" />
            <h4 className="font-bold text-white text-base">Chat & Reações</h4>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
            {room.chatMessages.map((msg: ChatMessage) => {
              if (msg.isSystem) {
                return (
                  <div key={msg.id} className="text-center text-[10px] text-yellow-200 font-semibold bg-white/10 py-1 px-2 rounded-full">
                    {msg.text}
                  </div>
                );
              }

              const isMe = msg.senderName === myPlayer?.nickname;

              return (
                <div key={msg.id} className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs shrink-0">
                    {msg.senderName.charAt(0)}
                  </div>
                  <div className={`p-2.5 rounded-2xl max-w-[80%] ${isMe ? 'bg-rose-600 text-white' : 'bg-white/25 text-white'}`}>
                    <span className="font-bold block text-[10px] opacity-80">{msg.senderName}</span>
                    <span className="font-medium">{msg.text}</span>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <div className="flex items-center justify-around py-2 border-t border-white/20 my-2">
            {REACTION_LABELS.map((label) => (
              <button
                key={label}
                onClick={() => handleSendReaction(`[${label}]`)}
                className="px-2 py-1 rounded-xl bg-white/15 hover:bg-white/30 text-[10px] font-extrabold text-white transition hover:scale-105 border border-white/20"
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              placeholder="Digite sua mensagem..."
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/15 border border-white/20 text-white placeholder-white/60 text-xs focus:outline-none focus:border-yellow-300"
            />
            <button type="submit" className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Bottom DJ Host Bar */}
      <footer className="w-full max-w-7xl mx-auto mt-6 bg-slate-900/60 backdrop-blur-md rounded-2xl p-3 px-6 border border-white/20 flex items-center justify-between text-xs text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
            <Crown className="w-4 h-4 fill-current" />
          </div>
          <div>
            <span className="font-bold block text-yellow-300">DJ Host</span>
            <span className="text-white/80">Música escolhida por: ??? (Secreto)</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5 h-6">
          {[40, 80, 50, 90, 60, 100].map((h, i) => (
            <div key={i} className="w-1 bg-pink-400 rounded-full animate-pulse" style={{ height: `${h}%` }} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <Volume2 className="w-4 h-4 text-cyan-300" />
          </button>
        </div>
      </footer>
    </div>
  );
};
