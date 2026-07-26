'use client';

import React from 'react';
import { Users, MessageSquare, Share2, QrCode, Link, Smile, Zap, Trophy } from 'lucide-react';

export const ConnectSection: React.FC = () => {
  return (
    <section className="py-14 px-4 max-w-5xl mx-auto text-center">
      <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-wide">
        Conecte-se!
      </h2>
      <p className="text-blue-200 text-lg mb-12">Jogue com amigos e faça novos!</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-8 flex flex-col items-center border-t-4 border-t-pink-400">
          <div className="w-16 h-16 rounded-full bg-pink-400 flex items-center justify-center mb-4 shadow-glow-pink">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Convide Amigos</h3>
          <p className="text-sm text-blue-100/80 mb-6 max-w-sm">
            Compartilhe o código da sala e chame a galera toda para se divertir juntos!
          </p>

          <ul className="space-y-2.5 text-left text-sm text-blue-100/90 font-medium">
            <li className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-pink-300" />
              <span>Compartilhamento fácil</span>
            </li>
            <li className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-pink-300" />
              <span>QR Code para entrada</span>
            </li>
            <li className="flex items-center gap-2">
              <Link className="w-4 h-4 text-pink-300" />
              <span>Link direto da sala</span>
            </li>
          </ul>
        </div>

        <div className="glass-card p-8 flex flex-col items-center border-t-4 border-t-cyan-400">
          <div className="w-16 h-16 rounded-full bg-cyan-400 flex items-center justify-center mb-4 shadow-glow-cyan">
            <MessageSquare className="w-8 h-8 text-slate-950" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Chat ao Vivo</h3>
          <p className="text-sm text-blue-100/80 mb-6 max-w-sm">
            Converse, provoque e comemore com outros jogadores durante as partidas!
          </p>

          <ul className="space-y-2.5 text-left text-sm text-blue-100/90 font-medium">
            <li className="flex items-center gap-2">
              <Smile className="w-4 h-4 text-cyan-300" />
              <span>Emojis e reações</span>
            </li>
            <li className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-300" />
              <span>Mensagens rápidas</span>
            </li>
            <li className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-cyan-300" />
              <span>Celebre as vitórias</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};
