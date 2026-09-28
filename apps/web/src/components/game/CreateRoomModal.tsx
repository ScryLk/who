'use client';

import React, { useState } from 'react';
import { RoomSettings } from '@who/shared';
import { X, Disc3, Sparkles } from 'lucide-react';
import { AVATAR_LIBRARY } from '@/lib/avatars';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { InstantIdentityInput } from '@/components/common/InstantIdentityInput';
import { RoomSettingsConfig } from '@/components/game/RoomSettingsConfig';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (nickname: string, avatar: string, settings: RoomSettings) => void;
  initialNickname: string;
  initialAvatar: string;
  initialSettings: RoomSettings;
  errorMessage?: string;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialNickname,
  initialAvatar,
  initialSettings,
  errorMessage,
}) => {
  const [nickname, setNickname] = useState(initialNickname);
  const [isGeneratedNickname, setIsGeneratedNickname] = useState(true);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [settings, setSettings] = useState<RoomSettings>(initialSettings);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    onSubmit(nickname.trim(), avatar, settings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col justify-between rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 text-stone-100 shadow-2xl overflow-hidden">
        {/* Subtle Vinyl Turntable Light Element */}
        <div className="absolute -top-16 -right-16 opacity-5 pointer-events-none text-white">
          <Disc3 className="w-64 h-64" />
        </div>

        {/* Modal Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Rock'n'roll stylized pompadour ? mark badge */}
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-sm tracking-tighter">
              <span className="font-serif italic font-extrabold text-2xl leading-none translate-y-[-1px]">?</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-50 tracking-tight flex items-center gap-1.5">
                <span>Crie sua Partida</span>
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Monte a mesa musical de dedução para sua galera
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition flex items-center justify-center border border-white/10"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="px-5 py-4 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          <form id="create-room-form" onSubmit={handleSubmit} className="space-y-6">
            {/* MOMENTO 1: SUA IDENTIDADE */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                1. Sua Identidade na Mesa
              </span>

              <div className="flex flex-col sm:flex-row items-center gap-4 p-3 rounded-2xl bg-slate-900/40 border border-white/10">
                {/* Active Avatar Feature */}
                <div className="relative flex-shrink-0">
                  <PlayerAvatar
                    avatar={avatar}
                    size="lg"
                    className="border-2 border-amber-400/80 shadow-md bg-slate-800"
                  />
                  <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-slate-950 border border-amber-400/60 text-[8px] font-mono font-bold text-amber-300">
                    DJ
                  </div>
                </div>

                {/* Nickname Input & Shuffle */}
                <div className="flex-1 w-full">
                  <InstantIdentityInput
                    value={nickname}
                    onChange={(val, isAuto) => {
                      setNickname(val);
                      setIsGeneratedNickname(isAuto);
                    }}
                    isGenerated={isGeneratedNickname}
                    label="Seu Apelido"
                  />
                </div>
              </div>

              {/* Horizontal Avatar Selector */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Escolha o visual do seu personagem:</span>
                  <span className="text-[10px] text-amber-300/80 font-mono">
                    {AVATAR_LIBRARY.length} visuais disponíveis
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1.5 pt-1 px-0.5 custom-scrollbar">
                  {AVATAR_LIBRARY.map((item) => {
                    const isSelected = avatar === item.url;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAvatar(item.url)}
                        className={`p-1 rounded-xl transition-all flex items-center justify-center flex-shrink-0 border ${
                          isSelected
                            ? 'bg-amber-400 border-amber-300 scale-105 shadow-sm'
                            : 'bg-white/5 border-white/10 hover:bg-white/15'
                        }`}
                        title={item.name}
                        aria-label={`Selecionar avatar ${item.name}`}
                      >
                        <PlayerAvatar avatar={item.url} size="sm" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* MOMENTO 2: A MESA DA PARTIDA (CONFIGURAÇÕES) */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                2. A Mesa da Partida
              </span>

              <RoomSettingsConfig
                settings={settings}
                onChange={setSettings}
                showSummary={false}
              />
            </div>
          </form>
        </div>

        {/* Modal Footer: Compact Summary & Primary CTA */}
        <div className="p-4 border-t border-white/10 bg-slate-950/80 space-y-2.5 flex-shrink-0">
          {/* Editorial One-Line Summary */}
          <div className="text-center text-[11px] font-mono text-slate-400">
            <span className="text-stone-200 font-bold">{settings.maxPlayers} jogadores</span> ·{' '}
            <span className="text-stone-200 font-bold">{settings.rounds} rodadas</span> ·{' '}
            <span className="text-stone-200 font-bold">{settings.bettingTimeSeconds}s aposta</span> ·{' '}
            <span className="text-stone-200 font-bold">trecho {settings.clipDurationSeconds}s</span> ·{' '}
            <span className="text-stone-200 font-bold">{settings.startingChips.toLocaleString('pt-BR')} fichas</span>
          </div>

          <button
            type="submit"
            form="create-room-form"
            className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-slate-950 font-black text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>CRIAR PARTIDA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
