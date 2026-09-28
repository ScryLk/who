'use client';

import React, { useRef, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { generateRandomNickname } from '@who/shared';

interface InstantIdentityInputProps {
  value: string;
  onChange: (value: string, isAuto: boolean) => void;
  isGenerated: boolean;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  label?: string;
}

export const InstantIdentityInput: React.FC<InstantIdentityInputProps> = ({
  value,
  onChange,
  isGenerated,
  maxLength = 20,
  placeholder = 'Seu nome no jogo...',
  className = '',
  label = 'Seu Apelido',
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);

  const handleShuffle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsShuffling(true);
    const newNick = generateRandomNickname();
    onChange(newNick, true);
    setTimeout(() => setIsShuffling(false), 300);

    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;

    if (isGenerated) {
      // First edit replacing the generated nickname
      if (rawVal.startsWith(value) && rawVal.length > value.length) {
        const newlyTyped = rawVal.slice(value.length);
        onChange(newlyTyped, false);
        return;
      }
      if (rawVal.endsWith(value) && rawVal.length > value.length) {
        const newlyTyped = rawVal.slice(0, rawVal.length - value.length);
        onChange(newlyTyped, false);
        return;
      }
      onChange(rawVal, false);
    } else {
      onChange(rawVal, false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isGenerated && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      onChange(e.key, false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (isGenerated) {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text');
      if (pasted) {
        onChange(pasted.slice(0, maxLength), false);
      }
    }
  };

  return (
    <div className="space-y-1.5 text-left w-full">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
          {label}
        </label>
        {isGenerated && (
          <span className="text-[10px] font-semibold text-amber-300/80 tracking-tight">
            Nome aleatório gerado
          </span>
        )}
      </div>

      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          maxLength={maxLength}
          placeholder={placeholder}
          className={`w-full pl-4 pr-12 py-3 rounded-xl bg-slate-900/60 border text-sm font-black tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 ${
            isGenerated
              ? 'text-amber-100 border-amber-400/30'
              : 'text-stone-50 border-white/15'
          } ${className}`}
        />

        <button
          type="button"
          onClick={handleShuffle}
          className="absolute right-1.5 w-9 h-9 rounded-lg text-amber-300 hover:text-amber-200 bg-white/5 hover:bg-amber-400/20 transition-all active:scale-90 flex items-center justify-center border border-white/10"
          title="Embaralhar apelido"
          aria-label="Embaralhar apelido"
        >
          <Shuffle className={`w-4 h-4 transition-transform duration-300 ${isShuffling ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
};
