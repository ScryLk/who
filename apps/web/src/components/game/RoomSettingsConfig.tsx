'use client';

import React, { useState } from 'react';
import { RoomSettings } from '@who/shared';
import { Minus, Plus, ChevronDown, ChevronUp, Star, Bot } from 'lucide-react';

interface RoomSettingsConfigProps {
  settings: RoomSettings;
  onChange: (newSettings: RoomSettings) => void;
  showSummary?: boolean;
}

export const RoomSettingsConfig: React.FC<RoomSettingsConfigProps> = ({
  settings,
  onChange,
  showSummary = false,
}) => {
  const [areAdvancedRulesOpen, setAreAdvancedRulesOpen] = useState(false);

  const updateSetting = <K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-5 text-left w-full">
      {/* 1. Capacidade da Mesa */}
      <div className="pt-1">
        <div className="flex flex-col items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 border border-white/10">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Limite de Jogadores
            </span>
            <span className="text-[10px] text-amber-300 font-mono font-bold">
              1 rodada por participante
            </span>
          </div>
          <div className="flex items-center justify-between w-full mt-2.5">
            <button
              type="button"
              onClick={() => updateSetting('maxPlayers', Math.max(2, settings.maxPlayers - 1))}
              disabled={settings.maxPlayers <= 2}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 text-slate-200 hover:text-white flex items-center justify-center transition-all active:scale-95 disabled:opacity-25 disabled:pointer-events-none border border-white/5"
              title="Diminuir jogadores"
              aria-label="Diminuir limite de jogadores"
            >
              <Minus className="w-4 h-4 stroke-[2.5]" />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-amber-300 font-mono tracking-tight">
                {settings.maxPlayers}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                2 a 12 participantes
              </span>
            </div>
            <button
              type="button"
              onClick={() => updateSetting('maxPlayers', Math.min(12, settings.maxPlayers + 1))}
              disabled={settings.maxPlayers >= 12}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 text-slate-200 hover:text-white flex items-center justify-center transition-all active:scale-95 disabled:opacity-25 disabled:pointer-events-none border border-white/5"
              title="Aumentar jogadores"
              aria-label="Aumentar limite de jogadores"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Ritmo da Partida (Tempo de Palpite) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Ritmo da Partida
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            tempo para deduzir e apostar
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[15, 30, 45, 60].map((sec) => {
            const isSelected = settings.bettingTimeSeconds === sec;
            return (
              <button
                key={sec}
                type="button"
                onClick={() => updateSetting('bettingTimeSeconds', sec)}
                className={`py-2 rounded-xl text-xs font-mono font-black transition-all border ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm font-black'
                    : 'bg-slate-900/50 text-slate-200 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {sec}s
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Trecho Musical */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Trecho Musical
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            duração da amostra da música
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[15, 20, 30].map((dur) => {
            const isSelected = settings.clipDurationSeconds === dur;
            return (
              <button
                key={dur}
                type="button"
                onClick={() => updateSetting('clipDurationSeconds', dur)}
                className={`py-2 rounded-xl text-xs font-mono font-black transition-all border ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm font-black'
                    : 'bg-slate-900/50 text-slate-200 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {dur}s
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Fichas Iniciais */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Fichas Iniciais
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            saldo para apostas por jogador
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[500, 1000, 1500, 2000].map((chips) => {
            const isSelected = settings.startingChips === chips;
            return (
              <button
                key={chips}
                type="button"
                onClick={() => updateSetting('startingChips', chips)}
                className={`py-2 rounded-xl text-xs font-mono font-black transition-all border ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm font-black'
                    : 'bg-slate-900/50 text-slate-200 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {chips.toLocaleString('pt-BR')}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Progressive Disclosure: Personalizar Regras */}
      <div className="pt-1 border-t border-white/10">
        <button
          type="button"
          onClick={() => setAreAdvancedRulesOpen(!areAdvancedRulesOpen)}
          className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-300 hover:text-amber-300 transition-colors"
        >
          <span>Personalizar Regras Avançadas</span>
          {areAdvancedRulesOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {areAdvancedRulesOpen && (
          <div className="space-y-2.5 pt-2 pb-1 animate-fade-in text-xs">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/10 cursor-pointer">
              <div className="space-y-0.5 pr-2">
                <span className="font-extrabold text-stone-100 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-300 fill-current" />
                  <span>Previsão do Dono</span>
                </span>
                <p className="text-[10px] text-slate-400">
                  Dono pode apostar em como a sala responderá à sua faixa.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableOwnerPrediction}
                onChange={(e) => updateSetting('enableOwnerPrediction', e.target.checked)}
                className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/10 cursor-pointer">
              <div className="space-y-0.5 pr-2">
                <span className="font-extrabold text-stone-100 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Permitir Adição de Bots</span>
                </span>
                <p className="text-[10px] text-slate-400">
                  Líder pode preencher lugares vagos com participantes automáticos.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.allowBots}
                onChange={(e) => updateSetting('allowBots', e.target.checked)}
                className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
              />
            </label>
          </div>
        )}
      </div>

      {/* 6. Resumo Opcional da Partida */}
      {showSummary && (
        <div className="text-center pt-1 text-[11px] font-mono text-slate-400 border-t border-white/10">
          <span className="text-stone-200 font-bold">Até {settings.maxPlayers} jogadores</span> ·{' '}
          <span className="text-stone-200 font-bold">{settings.bettingTimeSeconds}s aposta</span> ·{' '}
          <span className="text-stone-200 font-bold">trecho {settings.clipDurationSeconds}s</span> ·{' '}
          <span className="text-stone-200 font-bold">{settings.startingChips.toLocaleString('pt-BR')} fichas</span>
        </div>
      )}
    </div>
  );
};
