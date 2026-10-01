'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { buildRoomInviteUrl } from '@who/shared';
import { copyToClipboard } from '@/lib/clipboard';
import { X, Copy, Check, Share2, Users, QrCode, Link as LinkIcon } from 'lucide-react';

interface RoomInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  playerCount?: number;
  maxPlayers?: number;
}

export const RoomInviteModal: React.FC<RoomInviteModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  playerCount,
  maxPlayers,
}) => {
  const [copyCodeSuccess, setCopyCodeSuccess] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const codeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const linkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const inviteUrl = buildRoomInviteUrl(roomCode);

  // Compute a clean display URL without protocols if appropriate
  let displayUrl = inviteUrl;
  try {
    const urlObj = new URL(inviteUrl);
    displayUrl = `${urlObj.host}${urlObj.pathname}${urlObj.search}`;
  } catch {
    displayUrl = inviteUrl;
  }

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (codeTimeoutRef.current) clearTimeout(codeTimeoutRef.current);
      if (linkTimeoutRef.current) clearTimeout(linkTimeoutRef.current);
    };
  }, []);

  // Reset statuses when modal opens
  useEffect(() => {
    if (isOpen) {
      setCopyCodeSuccess(false);
      setCopyLinkSuccess(false);
      setShareError(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    const success = await copyToClipboard(roomCode);
    if (success) {
      setCopyCodeSuccess(true);
      if (codeTimeoutRef.current) clearTimeout(codeTimeoutRef.current);
      codeTimeoutRef.current = setTimeout(() => setCopyCodeSuccess(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(inviteUrl);
    if (success) {
      setCopyLinkSuccess(true);
      if (linkTimeoutRef.current) clearTimeout(linkTimeoutRef.current);
      linkTimeoutRef.current = setTimeout(() => setCopyLinkSuccess(false), 2000);
    }
  };

  const handleShare = async () => {
    setShareError(null);
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'WHO?',
          text: `Entre na minha sala do WHO? Código ${roomCode}`,
          url: inviteUrl,
        });
      } catch (err: any) {
        // AbortError indicates user cancelled native sheet — not a technical error
        if (err?.name !== 'AbortError') {
          // If share failed unexpectedly, fallback to copy
          await handleCopyLink();
        }
      }
    } else {
      // Fallback if Web Share is unsupported
      await handleCopyLink();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-invite-title"
    >
      <div
        ref={modalRef}
        className="glass-card w-full max-w-sm sm:max-w-md p-5 sm:p-6 border-2 border-cyan-400/40 shadow-2xl relative flex flex-col items-center text-center max-h-[92vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition focus:outline-none focus:ring-2 focus:ring-cyan-400"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-xl bg-yellow-400/20 text-yellow-300">
            <Users className="w-5 h-5" />
          </div>
          <h2 id="room-invite-title" className="text-xl sm:text-2xl font-black text-white tracking-wide">
            CONVIDE A GALERA
          </h2>
        </div>

        {/* Capacity / Status info */}
        {playerCount !== undefined && maxPlayers !== undefined && (
          <p className="text-xs font-semibold text-blue-200 mb-4">
            {playerCount} de {maxPlayers} na sala
          </p>
        )}

        {/* QR Code Card */}
        <div className="my-2 p-3 sm:p-4 bg-white rounded-2xl shadow-xl border-4 border-yellow-400/30 flex flex-col items-center justify-center">
          <QRCodeSVG
            value={inviteUrl}
            size={180}
            bgColor="#ffffff"
            fgColor="#0f172a"
            level="M"
            includeMargin={false}
            className="w-[160px] h-[160px] sm:w-[180px] sm:h-[180px]"
          />
        </div>

        <p className="text-xs text-slate-300 font-medium mt-1 mb-3 flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5 text-cyan-400" />
          Escaneie o QR com a câmera do celular
        </p>

        {/* Room Code Badge */}
        <div className="w-full bg-slate-900/70 border border-white/10 rounded-2xl p-3 mb-3 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-blue-300 block">
              Código da Sala
            </span>
            <span className="text-2xl font-black font-mono tracking-widest text-yellow-300">
              #{roomCode}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            type="button"
            className={`px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              copyCodeSuccess
                ? 'bg-emerald-500 text-slate-950 shadow-glow-emerald'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {copyCodeSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar
              </>
            )}
          </button>
        </div>

        {/* Invite Link Row */}
        <div className="w-full bg-slate-900/70 border border-white/10 rounded-2xl p-3 mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden text-left">
            <LinkIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-xs font-mono text-cyan-200 truncate select-all">
              {displayUrl}
            </span>
          </div>
          <button
            onClick={handleCopyLink}
            type="button"
            className={`px-3 py-2 rounded-xl text-xs font-black transition flex-shrink-0 flex items-center gap-1.5 ${
              copyLinkSuccess
                ? 'bg-emerald-500 text-slate-950 shadow-glow-emerald'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {copyLinkSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar
              </>
            )}
          </button>
        </div>

        {/* Share CTA button */}
        <button
          onClick={handleShare}
          type="button"
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-button-cyan font-black text-slate-950 text-sm shadow-glow-cyan hover:scale-[1.01] active:scale-[0.99] transition flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          COMPARTILHAR SALA
        </button>

        {shareError && (
          <p className="text-[11px] text-red-300 font-bold mt-2">{shareError}</p>
        )}
      </div>
    </div>
  );
};
