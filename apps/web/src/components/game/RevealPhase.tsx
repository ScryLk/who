'use client';

import React, { useState, useEffect } from 'react';
import { Player, RoomState, RoundResult } from '@who/shared';
import { Crown, Trophy, Sparkles, Disc, Music, ArrowRight, MessageSquare, Check } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';

interface RevealPhaseProps {
  room: RoomState;
  myPlayerId: string;
  result?: RoundResult;
  onNextRound: () => void;
}

const REACTION_LABELS = ['Bravos', 'Sensacional', 'Mestre', 'Genial'];

export const RevealPhase: React.FC<RevealPhaseProps> = ({
  room,
  myPlayerId,
  result,
  onNextRound,
}) => {
  const isHost = room.hostId === myPlayerId;
  const ownerPlayer = room.players.find((p) => p.id === result?.actualOwnerId);
  const [countdown, setCountdown] = useState(5);

  const sortedPlayers = [...room.players].sort((a, b) => b.chips - a.chips);
  const maxChips = Math.max(...room.players.map((p) => p.chips), 1000);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (isHost) {
            onNextRound();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isHost, onNextRound]);

  const handleSendReaction = (label: string) => {
    const socket = getSocket();
    const myPlayer = room.players.find((p) => p.id === myPlayerId);
    socket.emit('send_reaction', {
      roomCode: room.code,
      emoji: `[${label}]`,
      senderName: myPlayer?.nickname || 'Jogador',
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-teal-400 via-cyan-600 to-emerald-700 text-white p-4 md:p-6 flex flex-col justify-between font-outfit">
      {/* Header Title matching Image 2 */}
      <header className="w-full text-center py-4">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight drop-shadow-md flex items-center justify-center gap-3">
          <Disc className="w-10 h-10 text-yellow-300 animate-spin" />
          <span>E quem escolheu foi...</span>
        </h1>
      </header>

      {/* Main Grid Layout (Left Reveal Box + Right Ranking Parcial Sidebar) */}
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-center">
        {/* Left Column: Reveal Card + Quem Acertou Grid */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Reveal Card matching Image 2 */}
          <div className="bg-teal-900/60 backdrop-blur-xl rounded-3xl p-8 border-4 border-purple-400 shadow-glow-purple text-center relative overflow-hidden">
            {/* Owner Avatar Circle */}
            <div className="relative w-28 h-28 mx-auto mb-3">
              <PlayerAvatar avatar={ownerPlayer?.avatar} size="xl" className="border-4 border-yellow-300 shadow-2xl bg-gradient-to-tr from-pink-500 to-purple-600" />
              <div className="absolute top-0 right-0 p-1.5 rounded-full bg-yellow-400 text-slate-950 shadow">
                <Crown className="w-5 h-5 fill-current" />
              </div>
            </div>

            <h2 className="text-3xl font-black text-white mb-4">{ownerPlayer?.nickname}</h2>

            {/* Inner Song Card */}
            <div className="bg-teal-800/80 rounded-2xl p-4 border border-teal-400/40 flex items-center gap-4 max-w-md mx-auto mb-3 text-left">
              <img
                src={result?.track.albumArt || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=150&q=80'}
                alt="Track Art"
                className="w-16 h-16 rounded-xl object-cover shadow"
              />
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">
                  {result?.track.title || 'Blinding Lights'}
                </h3>
                <p className="text-xs text-cyan-200">{result?.track.artist || 'The Weeknd'}</p>
                <span className="text-[11px] font-semibold text-yellow-300 block mt-1 flex items-center gap-1">
                  <Music className="w-3.5 h-3.5 inline" />
                  <span>Essa era a escolha secreta de {ownerPlayer?.nickname}!</span>
                </span>
              </div>
            </div>
          </div>

          {/* "Quem acertou!" Card matching Image 2 */}
          <div className="bg-teal-900/50 backdrop-blur-xl rounded-3xl p-6 border border-teal-300/30 text-center">
            <h3 className="text-lg font-bold mb-4 flex items-center justify-center gap-2 text-emerald-300">
              <Sparkles className="w-5 h-5" /> Quem acertou!
            </h3>

            <div className="flex flex-wrap items-center justify-center gap-6">
              {result?.guesserBetResults.filter((r) => r.correctOwner).length === 0 ? (
                <p className="text-xs text-cyan-100 italic">Ninguém acertou nesta rodada!</p>
              ) : (
                result?.guesserBetResults
                  .filter((r) => r.correctOwner)
                  .map((r) => {
                    const p = room.players.find((item) => item.id === r.guesserId);
                    return (
                      <div key={r.guesserId} className="flex flex-col items-center">
                        <div className="relative">
                          <PlayerAvatar avatar={p?.avatar} size="md" className="border-2 border-emerald-400 bg-white/20" />
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        </div>
                        <span className="text-xs font-bold text-white mt-1">{p?.nickname}</span>
                        <span className="text-[10px] bg-emerald-500/30 px-2 py-0.5 rounded text-emerald-200 font-semibold mt-0.5">
                          {r.secondarySuccess ? 'COMBO! 3.5x' : 'Acertei!'}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Ranking Parcial Sidebar matching Image 2 */}
        <div className="lg:col-span-4 bg-teal-900/60 backdrop-blur-xl rounded-3xl p-6 border border-teal-300/30 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/20">
            <Trophy className="w-6 h-6 text-yellow-300" />
            <h3 className="font-black text-white text-lg">Ranking Parcial</h3>
          </div>

          <div className="space-y-3">
            {sortedPlayers.map((player: Player, index: number) => {
              const percentage = Math.round((player.chips / maxChips) * 100);

              return (
                <div key={player.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <PlayerAvatar avatar={player.avatar} size="sm" className="bg-white/20" />
                      <span className="text-white truncate max-w-[120px]">{player.nickname}</span>
                    </div>
                    <span className="text-yellow-300 font-mono">{player.chips} pts</span>
                  </div>

                  {/* Score Progress Bar */}
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-glow-purple transition flex items-center justify-center gap-2">
            <span>Ver ranking completo</span>
            <Trophy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Bar matching Image 2 */}
      <footer className="w-full max-w-6xl mx-auto mt-6 flex items-center justify-between">
        {/* Reaction Labels Left */}
        <div className="flex items-center gap-2">
          {REACTION_LABELS.map((label) => (
            <button
              key={label}
              onClick={() => handleSendReaction(label)}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/30 text-xs font-extrabold text-white transition hover:scale-105 border border-white/20"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Center Action Button */}
        {isHost ? (
          <button
            onClick={onNextRound}
            className="px-8 py-4 rounded-2xl bg-gradient-button-green text-slate-950 font-black text-base shadow-glow-cyan hover:scale-105 transition flex items-center gap-2"
          >
            <span>Iniciando em {countdown}s — Próxima Rodada</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <div className="px-6 py-3 rounded-2xl bg-white/10 text-cyan-100 text-xs font-bold animate-pulse">
            Aguardando Host para a Próxima Rodada ({countdown}s)...
          </div>
        )}

        {/* Chat Toggle Right */}
        <div className="p-3 rounded-full bg-white/15 text-white">
          <MessageSquare className="w-5 h-5" />
        </div>
      </footer>
    </div>
  );
};
