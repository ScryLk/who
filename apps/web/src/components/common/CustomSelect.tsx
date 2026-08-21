'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption<T = string> {
  value: T;
  label: string;
  icon?: string | React.ReactNode;
}

interface CustomSelectProps<T = string> {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  className?: string;
}

export function CustomSelect<T = string>({
  options,
  value,
  onChange,
  label,
  className = '',
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative text-left z-30 ${className}`} ref={containerRef}>
      {label && <label className="block text-xs font-semibold text-blue-200 mb-1.5">{label}</label>}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 rounded-xl border flex items-center justify-between transition-all duration-200 glass-card backdrop-blur-md cursor-pointer text-xs font-bold text-white shadow-lg ${
          isOpen
            ? 'border-yellow-400/80 bg-yellow-400/10 shadow-glow-yellow'
            : 'border-white/20 hover:border-white/40 hover:bg-white/15'
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon && <span>{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption?.label}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-cyan-300 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-yellow-400' : ''
          }`}
        />
      </button>

      {/* Custom Dropdown Menu with scroll (max-h-36 overflow-y-auto) */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-[100] p-1.5 rounded-2xl glass-card border-2 border-yellow-400/50 backdrop-blur-xl bg-slate-950/95 shadow-2xl space-y-1 animate-fadeIn max-h-36 overflow-y-auto drop-shadow-2xl">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  {option.icon && <span>{option.icon}</span>}
                  <span className="truncate">{option.label}</span>
                </span>
                {isSelected && <Check className="w-4 h-4 text-yellow-400 stroke-[3] flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
