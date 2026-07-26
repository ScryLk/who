'use client';

import React, { useState } from 'react';
import { Player, RoomState } from '@who/shared';
import { Copy, Bot, Play, Users, Coins, Crown, CheckCircle } from 'lucide-react';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';

interface RoomLobbyProps {
  room: RoomState;
  myPlayerId: string;
  onAddBot: () => void;
  onStartGame: () => void;
}

export const RoomLobby: React.FC<RoomLobbyProps> = ({
  room,
  myPlayerId,
  onAddBot,
  onStartGame,
}) => {
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === myPlayerId;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 flex flex-col items-center">
      {/* Header Room Code Card */}
      <div className="glass-card w-full p-6 text-center border-2 border-yellow-400/40 shadow-glow-yellow mb-8 relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-300 text-xs font-bold uppercase tracking-wider mb-2">
          Código da Sala
        </div>
        <div className="flex items-center justify-center gap-4">
          <span className="text-5xl md:text-7xl font-black text-white tracking-widest font-mono">
            {room.code}
          </span>
          <button
            onClick={handleCopyCode}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 transition flex items-center gap-2 text-white text-sm font-semibold"
            title="Copiar Código"
          >
            {copied ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <Copy className="w-5 h-5 text-yellow-300" />
            )}
            <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>
        <p className="text-xs text-blue-200 mt-2 font-medium">
          Modo: <span className="text-yellow-300 capitalize font-bold">{room.mode}</span> • Fichas Iniciais: <span className="text-emerald-400 font-bold">1.000 🪙</span>
        </p>
      </div>

      {/* Players List Grid */}
      <div className="w-full mb-8">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-300" />
            Jogadores na Sala ({room.players.length}/12)
          </h3>

          {isHost && room.players.length < 12 && (
            <button
              onClick={onAddBot}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/60 hover:bg-purple-600 border border-purple-400/50 text-white text-sm font-bold transition shadow-glow-purple"
            >
              <Bot className="w-4 h-4 text-purple-200" />
              + Adicionar Bot (Teste)
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {room.players.map((player: Player) => {
            const isMe = player.id === myPlayerId;
            return (
              <div
                key={player.id}
                className={`glass-card p-4 flex flex-col items-center text-center relative border-2 ${
                  isMe ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/10'
                }`}
              >
                {player.isHost && (
                  <div className="absolute top-2 right-2 p-1 rounded-lg bg-amber-400 text-slate-950" title="Host da Sala">
                    <Crown className="w-3.5 h-3.5 fill-current" />
                  </div>
                )}
                <PlayerAvatar avatar={player.avatar} size="lg" className="mb-3 bg-white/10 shadow-inner border border-white/20" />
                <span className="font-bold text-white text-sm truncate max-w-full">
                  {player.nickname} {isMe && '(Você)'}
                </span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                  <Coins className="w-3.5 h-3.5" /> {player.chips}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Start Game Action Button */}
      {isHost ? (
        <button
          onClick={onStartGame}
          disabled={room.players.length < 2}
          className={`w-full max-w-md py-4 px-8 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition shadow-glow-green ${
            room.players.length >= 2
              ? 'bg-gradient-button-green text-slate-950 hover:scale-105 active:scale-95 border-2 border-emerald-200'
              : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
          }`}
        >
          <Play className="w-6 h-6 fill-current" />
          <span>INICIAR PARTIDA</span>
        </button>
      ) : (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center text-blue-200 text-sm animate-pulse">
          Aguardando o Host iniciar a partida... ⏳
        </div>
      )}
    </div>
  );
};
