'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Player, RoomState, SecondaryPredictionKind, canAffordBetIncrement } from '@who/shared';
import {
  Users,
  Music,
  MessageSquare,
  Link as LinkIcon,
  Search,
  Play,
  Pause,
  Shuffle,
  Send,
  Star,
  CheckCircle2,
  Headphones,
  Bot,
  Sparkles,
  Check,
  Clock,
  Coins,
  ArrowRight,
  ArrowLeft,
  Volume2,
  VolumeX,
  X,
  Radio,
  Disc3,
  Award,
  Zap,
  Lock,
  AlertCircle,
  Minus,
  RotateCcw,
  LogOut,
} from 'lucide-react';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { BackgroundMusic } from '@/components/common/BackgroundMusic';
import { CountdownModal } from '@/components/game/CountdownModal';
import { AudioWaveformScrubber } from '@/components/game/AudioWaveformScrubber';
import { YouTubeClipSelector } from '@/components/game/YouTubeClipSelector';
import { YouTubeRoundPlayer } from '@/components/game/YouTubeRoundPlayer';
import { SelectionCountdown } from '@/components/game/SelectionCountdown';
import { formatDurationDisplay } from '@who/shared';
import { BetRiskIndicator } from '@/components/game/BetRiskIndicator';
import { BetRevealStepper } from '@/components/game/BetRevealStepper';
import { OwnerRevealSequence } from '@/components/game/OwnerRevealSequence';
import { OwnerPredictionReveal } from '@/components/game/OwnerPredictionReveal';
import { SettlementReveal } from '@/components/game/SettlementReveal';
import { RoundSummaryCard } from '@/components/game/RoundSummaryCard';
import { getSocket } from '@/lib/socket';
import { useSoundEffects } from '@/lib/useSoundEffects';

interface RoomLobbyProps {
  room: RoomState;
  myPlayerId: string;
  onAddBot: () => void;
  onStartGame: () => void;
  onSubmitTrack?: (track: any) => void;
  onPlaceOwnerBet?: (
    predictionKind: SecondaryPredictionKind,
    chipAmount: number,
    targetPlayerIds?: string[],
    expectedCount?: number
  ) => void;
  onPlaceGuesserBet?: (
    targetOwnerId: string,
    chipAmount: number,
    predictionKind?: SecondaryPredictionKind,
    targetPlayerIds?: string[],
    expectedCount?: number
  ) => void;
  onResolveRound?: () => void;
  onNextRound?: () => void;
  onSkipRevealStep?: () => void;
  onLeaveRoom?: () => void;
}

const PLAYER_CARD_COLORS = [
  'from-amber-500/20 to-yellow-500/10 border-yellow-400/40 text-yellow-300',
  'from-cyan-500/20 to-blue-500/10 border-cyan-400/40 text-cyan-300',
  'from-pink-500/20 to-rose-500/10 border-pink-400/40 text-pink-300',
  'from-purple-500/20 to-indigo-500/10 border-purple-400/40 text-purple-300',
  'from-emerald-500/20 to-teal-500/10 border-emerald-400/40 text-emerald-300',
  'from-orange-500/20 to-red-500/10 border-orange-400/40 text-orange-300',
];

const REACTION_TAGS = ['Bravos', 'Sensacional', 'Genial', 'Eita', 'Chocou'];

export const RoomLobby: React.FC<RoomLobbyProps> = ({
  room,
  myPlayerId,
  onAddBot,
  onStartGame,
  onSubmitTrack,
  onPlaceOwnerBet,
  onPlaceGuesserBet,
  onNextRound,
  onSkipRevealStep,
  onLeaveRoom,
}) => {
  const isHost = room.hostId === myPlayerId;
  const [copied, setCopied] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Sound Effects Hook
  const {
    isMuted: isSfxMuted,
    toggleMute: toggleSfxMute,
    playChipSound,
    playTickSound,
    playPayoutSound,
    playRevealSound,
    playBetLockSound,
    playRevealStepSound,
    playOwnerRevealSound,
    playBlockedSound,
  } = useSoundEffects();

  // Chat Drawer & Unread Counter
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatText, setChatText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(room.chatMessages?.length || 0);

  // Search & Track Selection State (MUSIC_SELECTION)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);
  const [startTimeSeconds, setStartTimeSeconds] = useState(0);
  const [activeSelectionTab, setActiveSelectionTab] = useState<'MUSIC' | 'PREDICTION'>('MUSIC');
  const [isAudioReady, setIsAudioReady] = useState(false);

  // Preview Audio Engine (Music Selection)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [trackDuration, setTrackDuration] = useState<number>(30);

  // Round Audio Engine (Betting & Reveal)
  const roundAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingRound, setIsPlayingRound] = useState(false);
  const [roundCurrentTime, setRoundCurrentTime] = useState(0);
  const [roundDuration, setRoundDuration] = useState(30);

  // Betting State (Guesser during BETTING)
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [chipBet, setChipBet] = useState<number>(100);
  const [submittedBet, setSubmittedBet] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [betShake, setBetShake] = useState(false);
  const [betErrorMessage, setBetErrorMessage] = useState<string | null>(null);
  const betShakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Owner Prediction State (during MUSIC_SELECTION when it is my turn)
  const [ownerPredictionKind, setOwnerPredictionKind] = useState<SecondaryPredictionKind>('PLAYER_COUNT');
  const [ownerChipBet, setOwnerChipBet] = useState<number>(100);
  const [expectedCount, setExpectedCount] = useState<number>(1);
  const [selectedTargetPlayerIds, setSelectedTargetPlayerIds] = useState<string[]>([]);
  const [confirmedChoice, setConfirmedChoice] = useState(false);

  // Turn status checks
  const isMyTurn = room.phase === 'MUSIC_SELECTION' && room.currentTurnPlayerId === myPlayerId;
  const currentTurnPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
  const myPlayer = room.players.find((p) => p.id === myPlayerId);
  const myAvailableBalance = room.startingBalances?.[myPlayerId] ?? myPlayer?.chips ?? 0;
  const clipDuration = room.settings?.clipDurationSeconds || 20;

  // Immediate reject micro-feedback: audio + haptic + 250ms horizontal bump/shake
  const triggerBlockedFeedback = (message?: string) => {
    playBlockedSound();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(30);
      } catch (_) {
        // Silently ignore if not supported
      }
    }
    setBetShake(true);
    if (message) {
      setBetErrorMessage(message);
    }
    if (betShakeTimeoutRef.current) {
      clearTimeout(betShakeTimeoutRef.current);
    }
    betShakeTimeoutRef.current = setTimeout(() => {
      setBetShake(false);
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (betShakeTimeoutRef.current) clearTimeout(betShakeTimeoutRef.current);
    };
  }, []);

  // Ensure bet doesn't exceed available balance on phase change or chip updates
  useEffect(() => {
    if (room.phase === 'BETTING') {
      if (myAvailableBalance <= 0) {
        setChipBet(0);
      } else if (chipBet > myAvailableBalance) {
        setChipBet(Math.min(100, myAvailableBalance));
      }
      setBetErrorMessage(null);
    }
  }, [room.phase, myAvailableBalance]);

  const formatTime = (secsInput: number) => {
    const m = Math.floor(secsInput / 60);
    const s = Math.floor(secsInput % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Sound triggers on phase change
  const prevPhaseRef = useRef<string>(room.phase);
  useEffect(() => {
    if (prevPhaseRef.current !== room.phase) {
      if (room.phase === 'BET_LOCKED') {
        playBetLockSound();
      }
      prevPhaseRef.current = room.phase;
    }
  }, [room.phase, playBetLockSound]);

  // Reset local bet submit state if a new betting round starts
  useEffect(() => {
    if (room.phase === 'BETTING' && !room.guesserBets?.[myPlayerId]) {
      setSubmittedBet(false);
    }
  }, [room.phase, room.currentRound, room.guesserBets, myPlayerId]);

  // Tension tick in last 5 seconds of betting or countdown
  useEffect(() => {
    if (
      (room.phase === 'BETTING' || room.phase === 'COUNTDOWN') &&
      room.timeRemainingSeconds !== undefined &&
      room.timeRemainingSeconds > 0 &&
      room.timeRemainingSeconds <= 5
    ) {
      playTickSound();
    }
  }, [room.timeRemainingSeconds, room.phase, playTickSound]);

  // Chat notification badge & auto-scroll
  useEffect(() => {
    const currentCount = room.chatMessages?.length || 0;
    if (currentCount > lastMessageCountRef.current) {
      if (!isChatOpen) {
        setUnreadChatCount((prev) => prev + (currentCount - lastMessageCountRef.current));
      }
      lastMessageCountRef.current = currentCount;
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room.chatMessages, isChatOpen]);

  // Audio cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (roundAudioRef.current) {
        roundAudioRef.current.pause();
        roundAudioRef.current = null;
      }
    };
  }, []);

  // Stop preview audio if phase leaves MUSIC_SELECTION
  useEffect(() => {
    if (room.phase !== 'MUSIC_SELECTION' && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    }
  }, [room.phase]);

  // Reset round audio state on phase or round change
  useEffect(() => {
    if (roundAudioRef.current) {
      roundAudioRef.current.pause();
      roundAudioRef.current = null;
      setIsPlayingRound(false);
      setRoundCurrentTime(0);
    }
    setSubmittedBet(false);
  }, [room.phase, room.currentRound]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReady = () => {
    const newReady = !isReady;
    setIsReady(newReady);
    const socket = getSocket();
    socket.emit('set_ready', { roomCode: room.code, isReady: newReady });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setIsSearching(true);
    setSearchWarning(null);
    const socket = getSocket();
    socket.emit('search_tracks', { query: trimmed }, (res: any) => {
      setIsSearching(false);
      if (res && res.success && res.results) {
        setSearchResults(res.results);
        if (res.warning) {
          setSearchWarning(res.warning);
        }
      } else if (res && !res.success) {
        setSearchWarning(res.error || 'Erro ao buscar musicas no servidor.');
      }
    });
  };

  const handleSelectTrack = (track: any) => {
    setIsAudioReady(false);
    setSearchWarning(null);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setIsPlayingPreview(false);
      setPreviewCurrentTime(0);
    }
    setSelectedTrack(track);
    const startSec = track.startTimeSeconds || 0;
    setStartTimeSeconds(startSec);
    setSearchResults([]);
  };

  const handleStartTimeChange = (sec: number) => {
    setStartTimeSeconds(sec);
  };

  // Preview Audio Player with strict clip bounding
  const togglePlayPreview = () => {
    if (!selectedTrack?.audioUrl) return;

    if (isPlayingPreview) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setIsPlayingPreview(false);
    } else {
      let audio = previewAudioRef.current;
      const isNew = !audio || audio.src !== selectedTrack.audioUrl;

      if (isNew) {
        if (audio) audio.pause();
        audio = new Audio(selectedTrack.audioUrl);
        previewAudioRef.current = audio;

        audio.ontimeupdate = () => {
          if (!audio) return;
          setPreviewCurrentTime(audio.currentTime);

          // Stop playback at selection end
          const maxEnd = startTimeSeconds + clipDuration;
          if (audio.currentTime >= maxEnd) {
            audio.pause();
            audio.currentTime = startTimeSeconds;
            setIsPlayingPreview(false);
            setPreviewCurrentTime(startTimeSeconds);
          }
        };

        audio.onloadedmetadata = () => {
          if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            setTrackDuration(Math.floor(audio.duration));
          }
        };

        audio.onended = () => {
          setIsPlayingPreview(false);
          setPreviewCurrentTime(startTimeSeconds);
        };

        audio.onerror = () => {
          setIsPlayingPreview(false);
        };

        try {
          audio.currentTime = startTimeSeconds;
        } catch (e) {}
      }

      if (audio) {
        // Enforce head start position
        if (audio.currentTime < startTimeSeconds || audio.currentTime >= startTimeSeconds + clipDuration) {
          audio.currentTime = startTimeSeconds;
        }

        audio
          .play()
          .then(() => setIsPlayingPreview(true))
          .catch((err) => {
            console.warn('Audio preview play error:', err);
            setIsPlayingPreview(false);
          });
      }
    }
  };

  // Round Audio Player with authoritative clip boundaries (Preview Tracks only)
  const togglePlayRoundAudio = () => {
    const audioUrl = room.currentTrack?.audioUrl;
    if (!audioUrl || room.currentTrack?.provider === 'youtube' || room.currentTrack?.isVideo) return;

    const startSec = room.currentTrack?.startTimeSeconds || 0;
    const endSec = room.currentTrack?.endTimeSeconds || (startSec + clipDuration);

    if (isPlayingRound) {
      if (roundAudioRef.current) {
        roundAudioRef.current.pause();
      }
      setIsPlayingRound(false);
    } else {
      let audio = roundAudioRef.current;
      const isNew = !audio || audio.src !== audioUrl;

      if (isNew) {
        if (audio) audio.pause();
        audio = new Audio(audioUrl);
        roundAudioRef.current = audio;

        audio.ontimeupdate = () => {
          if (!audio) return;
          setRoundCurrentTime(audio.currentTime);

          // Enforce bounded clip window
          if (audio.currentTime >= endSec) {
            audio.pause();
            audio.currentTime = startSec;
            setIsPlayingRound(false);
            setRoundCurrentTime(startSec);
          }
        };

        audio.onloadedmetadata = () => {
          if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            setRoundDuration(Math.floor(audio.duration));
          }
        };

        audio.onended = () => {
          setIsPlayingRound(false);
          setRoundCurrentTime(startSec);
        };

        audio.onerror = () => {
          setIsPlayingRound(false);
        };

        try {
          audio.currentTime = startSec;
        } catch (e) {}
      }

      if (audio) {
        if (audio.currentTime < startSec || audio.currentTime >= endSec) {
          audio.currentTime = startSec;
        }

        audio
          .play()
          .then(() => setIsPlayingRound(true))
          .catch((err) => {
            console.warn('Round audio play error:', err);
            setIsPlayingRound(false);
          });
      }
    }
  };

  const handleConfirmChoice = () => {
    if (!selectedTrack) return;
    setConfirmedChoice(true);
    setIsReady(true);
    playChipSound();

    const trackToSubmit = {
      ...selectedTrack,
      startTimeSeconds: startTimeSeconds || selectedTrack.startTimeSeconds || 0,
      endTimeSeconds: (startTimeSeconds || 0) + clipDuration,
    };

    if (onSubmitTrack) {
      onSubmitTrack(trackToSubmit);
    }
    if (onPlaceOwnerBet) {
      const validatedOwnerBet = Math.max(0, Math.min(ownerChipBet, myAvailableBalance));
      onPlaceOwnerBet(ownerPredictionKind, validatedOwnerBet, selectedTargetPlayerIds, expectedCount);
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

  const handleSendReaction = (tag: string) => {
    const socket = getSocket();
    socket.emit('send_reaction', {
      roomCode: room.code,
      emoji: `[${tag}]`,
      senderName: myPlayer?.nickname || 'Jogador',
    });
  };

  const handleRandomizeTrack = () => {
    const randomQuery = ['pop hits', 'rock brasil', 'funk hits', 'mpb classico', 'pagode anos 90'][
      Math.floor(Math.random() * 5)
    ];
    setIsSearching(true);
    const socket = getSocket();
    socket.emit('search_tracks', { query: randomQuery }, (res: any) => {
      setIsSearching(false);
      if (res && res.success && res.results && res.results.length > 0) {
        const randomTrack = res.results[Math.floor(Math.random() * res.results.length)];
        handleSelectTrack(randomTrack);
      }
    });
  };

  const readyCount = room.players.filter(
    (p) =>
      p.isHost ||
      p.isReady ||
      (p.id === myPlayerId && isReady) ||
      room.submittedTracks.some((t) => t.submittedByPlayerId === p.id)
  ).length;

  const maxPlayers = room.settings?.maxPlayers || 8;

  // Active round progress in seconds
  const roundStartSec = room.currentTrack?.startTimeSeconds || 0;
  const roundEndSec = room.currentTrack?.endTimeSeconds || (roundStartSec + clipDuration);
  const activeClipTime = Math.max(0, Math.min(clipDuration, roundCurrentTime - roundStartSec));

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen w-full bg-gradient-main text-white p-3 md:p-5 flex flex-col justify-between overflow-y-auto lg:overflow-hidden font-outfit select-none relative">
      {/* 5-Second Countdown Modal Overlay */}
      {room.phase === 'COUNTDOWN' && (
        <CountdownModal seconds={room.timeRemainingSeconds ?? 5} />
      )}

      {/* 1. Header Superior */}
      <header className="w-full flex items-center justify-between mb-3 flex-shrink-0">
        {/* Logo Canto Superior Esquerdo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow">
              WHO<span className="text-yellow-400">?</span>
            </span>
            <Disc3 className="w-6 h-6 text-yellow-400 animate-spin-slow" />
          </div>

          <div className="glass-card px-3 py-1 rounded-xl flex items-center gap-2 border border-white/20 text-xs shadow-md">
            <span className="font-semibold text-blue-200">Sala:</span>
            <span className="font-mono font-black text-yellow-300">#{room.code}</span>
            <button
              onClick={handleCopyLink}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              title="Copiar link da sala"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>
            {copied && <span className="text-[10px] text-emerald-400 font-bold">Copiado!</span>}
          </div>
        </div>

        {/* Phase Pill / Timer Center */}
        <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-2xl glass-card border border-white/15 shadow-md">
          {room.phase === 'LOBBY' && (
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Lobby de Entrada ({room.players.length}/{maxPlayers})</span>
            </div>
          )}
          {room.phase === 'PREPARATION' && (
            <div className="flex items-center gap-2 text-xs font-bold text-yellow-300">
              <Sparkles className="w-4 h-4 animate-spin text-yellow-400" />
              <span>Preparando a Pista Musical...</span>
            </div>
          )}
          {room.phase === 'MUSIC_SELECTION' && (
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>
                Seleção Secreta (Turno {(room.turnIndex ?? 0) + 1}/{room.players.length})
              </span>
              <span className="text-white/30">•</span>
              <SelectionCountdown
                selectionDeadlineAt={room.selectionDeadlineAt}
                fallbackSeconds={room.turnTimeRemainingSeconds ?? 90}
                variant="header"
              />
            </div>
          )}
          {room.phase === 'BETTING' && (
            <div className="flex items-center gap-2 text-xs font-bold text-pink-300">
              <Radio className="w-4 h-4 animate-pulse text-pink-400" />
              <span>
                Rodada {room.currentRound}/{room.totalRounds} — Palpites: {room.timeRemainingSeconds ?? 30}s
              </span>
            </div>
          )}
          {room.phase === 'REVEAL' && (
            <div className="flex items-center gap-2 text-xs font-bold text-yellow-300">
              <Award className="w-4 h-4 text-yellow-400" />
              <span>
                Revelação da Rodada {room.currentRound}/{room.totalRounds} — {room.timeRemainingSeconds ?? 10}s
              </span>
            </div>
          )}
        </div>

        {/* Header Right: Audio & Chat Controls */}
        <div className="flex items-center gap-2">
          {/* Global SFX Mute Button */}
          <button
            onClick={toggleSfxMute}
            className={`p-2 rounded-xl transition border glass-card backdrop-blur-md text-xs flex items-center gap-1 ${
              isSfxMuted
                ? 'bg-white/5 border-white/10 text-slate-400'
                : 'bg-yellow-400/20 border-yellow-400/40 text-yellow-300 shadow-glow-yellow'
            }`}
            title={isSfxMuted ? 'Ativar Efeitos Sonoros' : 'Mutar Efeitos Sonoros'}
          >
            {isSfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Background Music Player */}
          <BackgroundMusic youtubeId="XCno3tliySo" />

          {/* Chat Drawer Toggle Button */}
          <button
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              if (!isChatOpen) setUnreadChatCount(0);
            }}
            className={`relative p-2 rounded-xl transition border glass-card backdrop-blur-md flex items-center gap-1.5 ${
              isChatOpen
                ? 'bg-purple-600 border-purple-300 text-white shadow-glow-purple'
                : 'bg-white/10 border-white/20 text-blue-200 hover:bg-white/20'
            }`}
            title="Abrir Chat da Sala"
          >
            <MessageSquare className="w-4 h-4" />
            {unreadChatCount > 0 && !isChatOpen && (
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-pink-500 text-white font-black text-[10px] shadow-glow-pink">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Leave Room Button */}
          {onLeaveRoom && (
            <button
              onClick={() => setShowLeaveModal(true)}
              className="p-2 px-2.5 rounded-xl transition border glass-card backdrop-blur-md text-xs font-bold flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/25 border-red-500/30 text-red-300 hover:text-white shadow-md cursor-pointer active:scale-95"
              title="Sair da Partida"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          )}
        </div>
      </header>

      {/* Leave Game Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-sm p-6 border-2 border-red-500/40 shadow-2xl relative text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Sair da Partida?</h3>
              <p className="text-xs text-slate-300 mt-1">
                Você sairá da sala atual e retornará ao menu principal.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition cursor-pointer"
              >
                Continuar
              </button>
              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  onLeaveRoom?.();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg transition cursor-pointer active:scale-95"
              >
                Sair da Sala
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Arena & Table Layout */}
      <div className="flex-1 flex gap-3 min-h-0 relative overflow-hidden">
        {/* Central Arena Screen */}
        <div className="flex-1 flex flex-col justify-between glass-card p-4 md:p-6 rounded-3xl border border-white/15 bg-slate-900/60 backdrop-blur-md overflow-hidden relative shadow-2xl">
          {/* Subtle Turntable Vinyl Background watermark */}
          <div className="absolute -top-12 -right-12 opacity-5 pointer-events-none text-white">
            <Disc3 className="w-96 h-96" />
          </div>

          {/* Arena Content Routed by Phase */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar relative z-10">
            {/* LOBBY PHASE */}
            {room.phase === 'LOBBY' && (
              <div className="flex-1 flex flex-col justify-between py-2 space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-xl md:text-2xl font-black text-white">Mesa de Jogadores</h2>
                  <p className="text-xs text-blue-200/80 font-medium">
                    Aguarde todos os participantes ficarem prontos para o líder iniciar a partida.
                  </p>
                </div>

                {/* Player Seating Arena */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-4xl mx-auto w-full my-auto">
                  {room.players.map((player: Player, index: number) => {
                    const isPlayerHost = player.isHost || player.id === room.hostId;
                    const isPlayerReady =
                      isPlayerHost ||
                      player.isReady ||
                      (player.id === myPlayerId && isReady);

                    return (
                      <div
                        key={player.id}
                        className={`p-3 rounded-2xl border transition-all duration-200 flex flex-col items-center text-center space-y-2 relative overflow-hidden bg-gradient-to-b ${
                          PLAYER_CARD_COLORS[index % PLAYER_CARD_COLORS.length]
                        } ${isPlayerReady ? 'shadow-glow-cyan' : 'opacity-85'}`}
                      >
                        <div className="relative">
                          <PlayerAvatar
                            avatar={player.avatar}
                            size="md"
                            className="bg-white/10 border-2 border-white/20"
                          />
                          {isPlayerHost && (
                            <div
                              className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-yellow-400 text-slate-950 shadow"
                              title="Líder da Sala"
                            >
                              <Star className="w-3 h-3 fill-current" />
                            </div>
                          )}
                          {player.isBot && (
                            <div
                              className="absolute -bottom-1 -right-1 p-1 rounded-full bg-purple-600 text-white shadow text-[9px]"
                              title="Bot"
                            >
                              <Bot className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 w-full">
                          <div className="font-extrabold text-xs text-white truncate">
                            {player.nickname} {player.id === myPlayerId && '(Você)'}
                          </div>
                          <div className="text-[11px] font-bold text-yellow-300 flex items-center justify-center gap-1 mt-0.5">
                            <Coins className="w-3 h-3" />
                            <span>{player.chips}</span>
                          </div>
                        </div>

                        <div className="w-full pt-1 border-t border-white/10">
                          {isPlayerReady ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Pronto</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-200/60">
                              <Clock className="w-3 h-3" />
                              <span>Aguardando</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Room Settings Snapshot */}
                <div className="max-w-2xl mx-auto w-full p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-around text-center text-xs text-blue-200">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-white/60">Clip</span>
                    <span className="font-black text-yellow-300">{clipDuration}s</span>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-white/60">Apostas</span>
                    <span className="font-black text-cyan-300">{room.settings?.bettingTimeSeconds || 30}s</span>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-white/60">Rodadas</span>
                    <span className="font-black text-pink-300">{room.settings?.rounds || room.totalRounds || 5}</span>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-white/60">Fichas Iniciais</span>
                    <span className="font-black text-emerald-300">{room.settings?.startingChips || 1000}</span>
                  </div>
                </div>
              </div>
            )}

            {/* PREPARATION PHASE */}
            {room.phase === 'PREPARATION' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-24 h-24 rounded-full bg-yellow-400/20 border-2 border-yellow-400 flex items-center justify-center text-yellow-300 shadow-glow-yellow animate-spin-slow">
                  <Disc3 className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-black text-white">Preparando a Mesa Secreta...</h3>
                <p className="text-sm text-blue-200/80 max-w-md">
                  As escolhas dos jogadores estão sendo embaralhadas para a primeira rodada de deduções e apostas!
                </p>
              </div>
            )}

            {/* MUSIC SELECTION PHASE */}
            {room.phase === 'MUSIC_SELECTION' && (
              <div className="flex-1 flex flex-col justify-between py-1 space-y-3">
                {!isMyTurn ? (
                  /* Waiting for another player */
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 my-auto">
                    <div className="w-20 h-20 rounded-full bg-yellow-400/10 border-2 border-dashed border-yellow-400/40 flex items-center justify-center text-yellow-300 shadow-glow-yellow animate-pulse">
                      <Clock className="w-10 h-10 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-white">
                        Vez de <span className="text-yellow-300">{currentTurnPlayer?.nickname || 'Jogador'}</span> escolher a música secreta!
                      </h3>
                      <p className="text-xs text-blue-200/80 max-w-sm mx-auto font-medium">
                        O jogador está selecionando a música e o trecho de {clipDuration} segundos no acervo.
                      </p>
                    </div>
                    <div className="pt-2">
                      <SelectionCountdown
                        selectionDeadlineAt={room.selectionDeadlineAt}
                        fallbackSeconds={room.turnTimeRemainingSeconds ?? 90}
                        isMuted={isSfxMuted}
                        onPlayTick={playTickSound}
                        variant="actionBar"
                      />
                    </div>
                  </div>
                ) : !selectedTrack ? (
                  /* MOMENT 1: SEARCH_MODE ("Qual música eu quero?") */
                  <div className="flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-3">
                      <div className="text-left space-y-0.5">
                        <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                          <Search className="w-5 h-5 text-yellow-400" />
                          <span>1. Escolha a Música da Partida</span>
                        </h3>
                        <p className="text-xs text-blue-200/80">
                          Pesquise um artista, clássico ou hit do acervo YouTube / Mídia
                        </p>
                      </div>

                      {/* Search Input Form */}
                      <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Digite artista ou música (ex: Evidências, Daft Punk, Queen...)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-yellow-400/40 text-white placeholder-blue-200/50 text-xs focus:outline-none focus:border-yellow-400 transition pr-8"
                          />
                          {isSearching && (
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
                          )}
                        </div>
                        <button
                          type="submit"
                          className="px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold transition flex items-center justify-center shadow-glow-yellow flex-shrink-0 cursor-pointer"
                          title="Buscar música"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                      </form>

                      {/* Search Warning */}
                      {searchWarning && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-2 shadow-md">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                          <span>{searchWarning}</span>
                        </div>
                      )}

                      {/* Search Results */}
                      {searchResults.length > 0 && (
                        <div className="max-h-56 sm:max-h-64 overflow-y-auto custom-scrollbar space-y-1 bg-slate-950/95 p-2 rounded-2xl border border-yellow-400/30 backdrop-blur-xl shadow-2xl">
                          {searchResults.map((track) => (
                            <div
                              key={track.id}
                              onClick={() => handleSelectTrack(track)}
                              className="p-2 rounded-xl cursor-pointer text-xs flex items-center justify-between gap-3 transition hover:bg-white/10 text-white"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {track.albumArt ? (
                                  <img
                                    src={track.albumArt}
                                    alt={track.title}
                                    className="w-9 h-9 rounded-lg object-cover shadow border border-white/15 flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-yellow-400/20 flex items-center justify-center text-yellow-300 flex-shrink-0">
                                    <Music className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0 text-left">
                                  <div className="font-extrabold truncate text-white flex items-center gap-1.5">
                                    <span className="truncate">{track.title}</span>
                                    {track.provider === 'youtube' || track.isVideo ? (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/30 flex-shrink-0">
                                        YouTube
                                      </span>
                                    ) : (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 flex-shrink-0">
                                        Preview
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-blue-200/80 truncate flex items-center gap-2">
                                    <span>{track.artist}</span>
                                    {track.durationSeconds && (
                                      <span className="text-slate-400 font-mono">
                                        ({formatDurationDisplay(track.durationSeconds)})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectTrack(track);
                                }}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-950 flex items-center gap-1 cursor-pointer transition active:scale-95"
                              >
                                <span>Escolher</span>
                                <Check className="w-3 h-3 stroke-[3]" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quick Suggestions when no results */}
                      {searchResults.length === 0 && (
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2">
                          <span className="text-[11px] font-bold text-yellow-300 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Sugestões Rápidas:</span>
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['Evidências', 'Billie Jean', 'Blinding Lights', 'Bohemian Rhapsody', 'Cheia de Manias', 'Levitating'].map((sug) => (
                              <button
                                key={sug}
                                type="button"
                                onClick={() => {
                                  setSearchQuery(sug);
                                  const socket = getSocket();
                                  socket.emit('search_tracks', { query: sug }, (res: any) => {
                                    if (res && res.success && res.results && res.results.length > 0) {
                                      handleSelectTrack(res.results[0]);
                                      if (res.warning) {
                                        setSearchWarning(res.warning);
                                      }
                                    }
                                  });
                                }}
                                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-yellow-400/20 text-white hover:text-yellow-300 text-[11px] font-semibold transition border border-white/10 cursor-pointer"
                              >
                                + {sug}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Bar for Search Mode */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
                      <SelectionCountdown
                        selectionDeadlineAt={room.selectionDeadlineAt}
                        fallbackSeconds={room.turnTimeRemainingSeconds ?? 90}
                        isMuted={isSfxMuted}
                        onPlayTick={playTickSound}
                        variant="actionBar"
                      />
                      <div className="text-[11px] text-blue-200/70 font-medium text-right hidden sm:block">
                        Selecione uma faixa para abrir o editor de trecho
                      </div>
                    </div>
                  </div>
                ) : activeSelectionTab === 'MUSIC' ? (
                  /* MOMENT 2: CLIP_EDIT_MODE ("Qual trecho dessa música eu quero?") */
                  <div className="flex-1 flex flex-col justify-between space-y-2">
                    {/* Top Track Summary Banner with "Trocar Faixa" */}
                    <div className="p-2 px-3 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-between gap-3 backdrop-blur-md">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {selectedTrack.albumArt ? (
                          <img
                            src={selectedTrack.albumArt}
                            alt={selectedTrack.title}
                            className="w-9 h-9 rounded-xl object-cover shadow border border-white/20 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-yellow-400/20 flex items-center justify-center text-yellow-300 flex-shrink-0">
                            <Music className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0 text-left">
                          <div className="font-extrabold text-xs sm:text-sm truncate text-white flex items-center gap-2">
                            <span className="truncate">{selectedTrack.title}</span>
                            {selectedTrack.provider === 'youtube' || selectedTrack.isVideo ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/30 flex-shrink-0">
                                YouTube
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 flex-shrink-0">
                                Preview
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-blue-200/80 truncate flex items-center gap-2">
                            <span>{selectedTrack.artist}</span>
                            {selectedTrack.durationSeconds && (
                              <span className="text-slate-400 font-mono">
                                • {formatDurationDisplay(selectedTrack.durationSeconds)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (previewAudioRef.current) {
                            previewAudioRef.current.pause();
                            previewAudioRef.current = null;
                            setIsPlayingPreview(false);
                          }
                          setSelectedTrack(null);
                          setIsAudioReady(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-bold transition border border-white/15 flex items-center gap-1.5 cursor-pointer flex-shrink-0 active:scale-95"
                        title="Buscar outra música"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Trocar Faixa</span>
                      </button>
                    </div>

                    {/* Arena: YouTube Clip Selector or Audio Scrubber */}
                    <div className="flex-1 flex flex-col justify-center">
                      {selectedTrack.provider === 'youtube' || selectedTrack.isVideo ? (
                        <YouTubeClipSelector
                          key={selectedTrack.id || selectedTrack.videoId || selectedTrack.youtubeId}
                          selectedTrack={selectedTrack}
                          startTimeSeconds={startTimeSeconds}
                          windowDurationSeconds={clipDuration}
                          onChangeStartTime={handleStartTimeChange}
                          onReady={(duration) => {
                            setIsAudioReady(true);
                            setTrackDuration(duration);
                          }}
                        />
                      ) : (
                        <AudioWaveformScrubber
                          key={selectedTrack.id}
                          selectedTrack={selectedTrack}
                          startTimeSeconds={startTimeSeconds}
                          windowDurationSeconds={clipDuration}
                          onChangeStartTime={handleStartTimeChange}
                          onReady={(duration) => {
                            setIsAudioReady(true);
                            setTrackDuration(duration);
                          }}
                        />
                      )}
                    </div>

                    {/* Action Bar for Clip Edit Mode */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
                      <SelectionCountdown
                        selectionDeadlineAt={room.selectionDeadlineAt}
                        fallbackSeconds={room.turnTimeRemainingSeconds ?? 90}
                        isMuted={isSfxMuted}
                        onPlayTick={playTickSound}
                        variant="actionBar"
                      />

                      <button
                        type="button"
                        disabled={!isAudioReady}
                        onClick={() => setActiveSelectionTab('PREDICTION')}
                        className={`px-5 py-2.5 rounded-2xl font-black text-xs transition shadow-glow-yellow flex items-center justify-center gap-2 cursor-pointer ${
                          !isAudioReady
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 active:scale-95'
                        }`}
                      >
                        <span>
                          {!isAudioReady ? 'Carregando trecho...' : 'Confirmar Trecho →'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* MOMENT 3: PREDICTION_MODE ("Como acho que os outros vão reagir?") */
                  <div className="flex-1 flex flex-col justify-between space-y-2">
                    {/* Top Track & Clip Summary Banner */}
                    <div className="p-2 px-3 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-between gap-3 backdrop-blur-md">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {selectedTrack.albumArt ? (
                          <img
                            src={selectedTrack.albumArt}
                            alt={selectedTrack.title}
                            className="w-9 h-9 rounded-xl object-cover shadow border border-white/20 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-yellow-400/20 flex items-center justify-center text-yellow-300 flex-shrink-0">
                            <Music className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0 text-left">
                          <div className="font-extrabold text-xs sm:text-sm truncate text-white">
                            {selectedTrack.title}
                          </div>
                          <div className="text-[11px] text-blue-200/80 truncate flex items-center gap-2">
                            <span>{selectedTrack.artist}</span>
                            <span className="text-yellow-300 font-mono font-bold">
                              • Trecho: {formatTime(startTimeSeconds)} → {formatTime(startTimeSeconds + clipDuration)} ({clipDuration}s)
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveSelectionTab('MUSIC')}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-bold transition border border-white/15 flex items-center gap-1.5 cursor-pointer flex-shrink-0 active:scale-95"
                        title="Voltar ao editor de trecho"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Editar Trecho</span>
                      </button>
                    </div>

                    {/* Prediction Arena */}
                    <div className="space-y-3 text-left">
                      <div className="p-3 rounded-2xl bg-white/10 border border-white/15 space-y-2.5 backdrop-blur-md">
                        <label className="text-xs font-extrabold text-yellow-300 flex items-center gap-1.5">
                          <Star className="w-4 h-4 fill-current text-yellow-400" />
                          <span>Como a sala vai reagir à sua música?</span>
                        </label>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { kind: 'PLAYER_COUNT', label: 'Quantidade Exata', sub: '3.0x retorno' },
                            { kind: 'MORE_THAN', label: 'Mais de X Jogadores', sub: '2.5x retorno' },
                            { kind: 'FEWER_THAN', label: 'Menos de X Jogadores', sub: '2.5x retorno' },
                            { kind: 'SPECIFIC_PLAYERS', label: 'Jogador Específico', sub: '3.5x retorno' },
                            { kind: 'NONE', label: 'Ninguém (0)', sub: '4.0x retorno' },
                          ].map((opt) => (
                            <button
                              key={opt.kind}
                              type="button"
                              onClick={() => {
                                playChipSound();
                                setOwnerPredictionKind(opt.kind as SecondaryPredictionKind);
                              }}
                              className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                                ownerPredictionKind === opt.kind
                                  ? 'bg-yellow-400 text-slate-950 border-yellow-300 font-extrabold shadow-glow-yellow'
                                  : 'bg-white/10 hover:bg-white/20 border-white/15 text-white font-semibold'
                              }`}
                            >
                              <div className="text-xs font-extrabold">{opt.label}</div>
                              <div className={`text-[10px] ${ownerPredictionKind === opt.kind ? 'text-slate-900 font-bold' : 'text-cyan-300'}`}>
                                {opt.sub}
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Target players if SPECIFIC_PLAYERS */}
                        {ownerPredictionKind === 'SPECIFIC_PLAYERS' && (
                          <div className="space-y-1.5 pt-2 border-t border-white/10">
                            <span className="text-xs font-bold text-blue-200">Quem vai acertar sua música?</span>
                            <div className="flex flex-wrap gap-1.5">
                              {room.players
                                .filter((p) => p.id !== myPlayerId)
                                .map((p) => {
                                  const isSelected = selectedTargetPlayerIds.includes(p.id);
                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => {
                                        playChipSound();
                                        if (isSelected) {
                                          setSelectedTargetPlayerIds(selectedTargetPlayerIds.filter((id) => id !== p.id));
                                        } else {
                                          setSelectedTargetPlayerIds([...selectedTargetPlayerIds, p.id]);
                                        }
                                      }}
                                      className={`px-3 py-1 rounded-xl border text-xs font-extrabold transition flex items-center gap-1 cursor-pointer ${
                                        isSelected
                                          ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-glow-yellow'
                                          : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                                      }`}
                                    >
                                      <span>{p.nickname}</span>
                                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* Chips to bet */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <span className="text-xs font-extrabold text-white flex items-center gap-1">
                            <Coins className="w-4 h-4 text-yellow-300" /> Fichas na previsão:
                          </span>
                          <div className="flex gap-1.5">
                            {[50, 100, 200, 500].map((amt) => {
                              const canAfford = amt <= myAvailableBalance;
                              return (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => {
                                    if (!canAfford) {
                                      triggerBlockedFeedback(
                                        `Saldo insuficiente. Máximo disponível: ${myAvailableBalance} fichas.`
                                      );
                                      return;
                                    }
                                    playChipSound();
                                    setOwnerChipBet(amt);
                                  }}
                                  aria-disabled={!canAfford}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                                    ownerChipBet === amt
                                      ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-glow-yellow'
                                      : canAfford
                                      ? 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                                      : 'bg-white/5 border-red-500/20 text-slate-500 cursor-not-allowed opacity-40'
                                  }`}
                                >
                                  +{amt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar for Prediction Mode */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
                      <SelectionCountdown
                        selectionDeadlineAt={room.selectionDeadlineAt}
                        fallbackSeconds={room.turnTimeRemainingSeconds ?? 90}
                        isMuted={isSfxMuted}
                        onPlayTick={playTickSound}
                        variant="actionBar"
                      />

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveSelectionTab('MUSIC')}
                          className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Voltar ao Trecho</span>
                        </button>

                        <button
                          disabled={!selectedTrack || !isAudioReady || confirmedChoice}
                          onClick={handleConfirmChoice}
                          className={`px-5 py-2.5 rounded-2xl font-black text-xs transition shadow-xl flex items-center justify-center gap-2 cursor-pointer ${
                            confirmedChoice
                              ? 'bg-emerald-500 text-white cursor-not-allowed'
                              : !selectedTrack || !isAudioReady
                              ? 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
                              : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-glow-yellow active:scale-95'
                          }`}
                        >
                          {confirmedChoice ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Música Confirmada!</span>
                            </>
                          ) : !isAudioReady ? (
                            <>
                              <Clock className="w-4 h-4 animate-pulse" />
                              <span>Aguardando Áudio...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>Confirmar Escolha</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BETTING PHASE — THE CORE GAMEPLAY ARENA */}
            {room.phase === 'BETTING' && (
              <div className="flex-1 flex flex-col justify-between py-1 space-y-3">
                {/* Round Player: YouTube Official vs Vinyl Turntable Mystery Player */}
                {room.currentTrack && (room.currentTrack.provider === 'youtube' || room.currentTrack.isVideo) ? (
                  <YouTubeRoundPlayer
                    track={room.currentTrack}
                    roundNumber={room.currentRound}
                    clipDurationSeconds={clipDuration}
                  />
                ) : (
                  <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-900/60 via-pink-900/40 to-slate-900/60 border border-pink-400/30 flex flex-col sm:flex-row items-center gap-4 shadow-xl backdrop-blur-md">
                    {/* Spinning Vinyl Record Disc */}
                    <div className="relative flex-shrink-0 flex items-center justify-center">
                      <div
                        className={`w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-950 border-4 border-slate-800 flex items-center justify-center shadow-2xl relative ${
                          isPlayingRound ? 'animate-spin-slow ring-4 ring-pink-500/40' : ''
                        }`}
                      >
                        {/* Vinyl Grooves pattern */}
                        <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center bg-gradient-to-tr from-pink-600 to-rose-500">
                            <Music className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </div>

                      {/* Overlay Play/Pause Button */}
                      <button
                        onClick={togglePlayRoundAudio}
                        className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 flex items-center justify-center shadow-glow-yellow transition active:scale-95 z-20"
                        title={isPlayingRound ? 'Pausar trecho' : 'Ouvir trecho'}
                      >
                        {isPlayingRound ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                      </button>
                    </div>

                    {/* Track Meta & Clip Timeline */}
                    <div className="flex-1 min-w-0 text-left w-full space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-pink-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5 animate-pulse" />
                          <span>Faixa Secreta da Rodada #{room.currentRound}</span>
                        </span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 font-mono font-bold border border-yellow-400/30">
                          Clip de {clipDuration}s
                        </span>
                      </div>

                      <div className="text-sm md:text-base font-extrabold text-white truncate">
                        {room.currentTrack?.title || 'Faixa Misteriosa'} — <span className="text-yellow-300">{room.currentTrack?.artist || 'Artista Oculto'}</span>
                      </div>

                      {/* Progress Bar of the Clip */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden relative border border-white/10">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full transition-all duration-150"
                            style={{
                              width: `${Math.min(100, Math.max(0, (activeClipTime / Math.max(1, clipDuration)) * 100))}%`,
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-blue-200">
                          {formatTime(activeClipTime)} / {formatTime(clipDuration)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Suspects Grid: Seated Players to Deduce */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Quem é o dono desta música? Clique para selecionar o suspeito:</span>
                    </span>
                    {selectedOwnerId && (
                      <span className="text-[11px] text-cyan-300 font-bold">
                        Suspeito: {room.players.find((p) => p.id === selectedOwnerId)?.nickname}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {room.players.map((p) => {
                      const isSelected = selectedOwnerId === p.id;
                      const hasBet = room.guesserBets?.[p.id] !== undefined;

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (room.guesserBets?.[myPlayerId]) return;
                            playChipSound();
                            setSelectedOwnerId(p.id);
                            if (betErrorMessage) setBetErrorMessage(null);
                          }}
                          disabled={!!room.guesserBets?.[myPlayerId]}
                          className={`p-2.5 rounded-2xl border transition-all flex flex-col items-center gap-1 text-center relative ${
                            isSelected
                              ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-glow-yellow scale-105 font-black'
                              : 'bg-white/10 hover:bg-white/20 border-white/15 text-white font-semibold'
                          } ${room.guesserBets?.[myPlayerId] ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <PlayerAvatar avatar={p.avatar} size="sm" />
                          <span className="text-[11px] truncate max-w-[90px]">
                            {p.nickname} {p.id === myPlayerId && '(Você)'}
                          </span>
                          <span className="text-[10px] font-bold text-yellow-300 flex items-center gap-0.5">
                            <Coins className="w-3 h-3" /> {p.chips}
                          </span>

                          {isSelected && (
                            <span className="absolute -top-2 px-2 py-0.5 rounded-full bg-slate-950 text-yellow-300 border border-yellow-400 text-[8px] font-black tracking-wider">
                              SUSPEITO
                            </span>
                          )}

                          {/* Safe Player Betting Status (Zero Leak) */}
                          <div className="absolute top-1 right-1">
                            {hasBet ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[8px] font-black flex items-center gap-0.5" title="Apostou">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                <span className="hidden sm:inline">APOSTOU</span>
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[8px] font-bold flex items-center gap-1" title="Pensando">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                <span className="hidden sm:inline">PENSANDO</span>
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Bet Action Bar / Confirmed State */}
                {room.guesserBets?.[myPlayerId] ? (
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-emerald-400 font-extrabold text-sm">
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Palpite Registrado com Sucesso!</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Você colocou <strong className="text-amber-400 font-mono">{room.guesserBets[myPlayerId].chipAmount} fichas</strong> em{' '}
                      <strong className="text-white">
                        {room.players.find((p) => p.id === room.guesserBets[myPlayerId].targetOwnerId)?.nickname || 'Suspeito'}
                      </strong>.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Aguardando os demais participantes confirmarem suas decisões...
                    </p>
                  </div>
                ) : (
                  <div
                    className={`p-3 rounded-2xl bg-white/5 border transition-all duration-200 space-y-2.5 ${
                      betShake
                        ? 'animate-shake border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
                        : 'border-white/10'
                    }`}
                  >
                    {/* Header: Title + Quick actions (Limpar / MÁX.) */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-200 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-yellow-300" /> Valor da aposta:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (chipBet === 0) return;
                            playChipSound();
                            setChipBet(0);
                            if (betErrorMessage) setBetErrorMessage(null);
                          }}
                          disabled={chipBet === 0}
                          title="Limpar valor da aposta"
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Limpar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (myAvailableBalance <= 0) {
                              triggerBlockedFeedback('Você não possui fichas disponíveis nesta rodada.');
                              return;
                            }
                            playChipSound();
                            setChipBet(myAvailableBalance);
                            if (betErrorMessage) setBetErrorMessage(null);
                          }}
                          disabled={myAvailableBalance <= 0}
                          title="Apostar todo o saldo disponível (All-In)"
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition ${
                            chipBet === myAvailableBalance && myAvailableBalance > 0
                              ? 'bg-rose-500 text-white border-rose-400 shadow-glow-pink'
                              : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/30'
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                          MÁX.
                        </button>
                      </div>
                    </div>

                    {/* Stepper & Increments Row */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Decrement Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (chipBet <= 0) {
                            triggerBlockedFeedback('Aposta já está em zero fichas.');
                            return;
                          }
                          playChipSound();
                          setChipBet((prev) => Math.max(0, prev - 50));
                          if (betErrorMessage) setBetErrorMessage(null);
                        }}
                        disabled={chipBet <= 0}
                        title="Diminuir 50 fichas"
                        className="px-2.5 py-1 rounded-xl text-xs font-extrabold border transition bg-white/10 hover:bg-white/20 border-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-0.5"
                      >
                        <Minus className="w-3 h-3 stroke-[3]" />
                        <span>50</span>
                      </button>

                      {/* Incremental Bet Buttons (+50, +100, +200, +500) */}
                      {[50, 100, 200, 500].map((amt) => {
                        const canAfford = canAffordBetIncrement(chipBet, amt, myAvailableBalance);
                        return (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => {
                              if (!canAfford) {
                                triggerBlockedFeedback(
                                  `Saldo insuficiente. Máximo disponível: ${myAvailableBalance} fichas.`
                                );
                                return;
                              }
                              playChipSound();
                              setChipBet((prev) => prev + amt);
                              if (betErrorMessage) setBetErrorMessage(null);
                            }}
                            aria-disabled={!canAfford}
                            className={`px-3 py-1 rounded-xl text-xs font-extrabold border transition ${
                              canAfford
                                ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white active:scale-95 cursor-pointer'
                                : 'bg-white/5 border-red-500/20 text-slate-500 cursor-not-allowed opacity-40 hover:border-red-500/40'
                            }`}
                          >
                            +{amt}
                          </button>
                        );
                      })}
                    </div>

                    {/* Contextual Error Message Banner */}
                    {betErrorMessage && (
                      <div
                        role="alert"
                        aria-live="polite"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-150"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>{betErrorMessage}</span>
                      </div>
                    )}

                    {/* Live Bet Risk Indicator */}
                    <BetRiskIndicator
                      stake={chipBet}
                      balanceBeforeBet={myAvailableBalance}
                    />

                    {/* Confirm Button */}
                    {(() => {
                      const isOverBalance = chipBet > myAvailableBalance;
                      const isZeroBet = chipBet <= 0;
                      const hasSelectedSuspect = Boolean(selectedOwnerId);
                      const isBetValid = hasSelectedSuspect && !isZeroBet && !isOverBalance;

                      let buttonLabel = `Confirmar Palpite (${chipBet} Fichas)`;
                      if (!hasSelectedSuspect) {
                        buttonLabel = 'Selecione um Suspeito acima';
                      } else if (isZeroBet) {
                        buttonLabel = 'Defina o valor da aposta (mín. 50)';
                      } else if (isOverBalance) {
                        buttonLabel = `Saldo Insuficiente (Máx: ${myAvailableBalance})`;
                      }

                      return (
                        <button
                          type="button"
                          onClick={() => {
                            if (!hasSelectedSuspect) {
                              triggerBlockedFeedback('Selecione um suspeito para apostar.');
                              return;
                            }
                            if (isZeroBet) {
                              triggerBlockedFeedback('Defina um valor maior que zero para apostar.');
                              return;
                            }
                            if (isOverBalance) {
                              triggerBlockedFeedback(
                                `Saldo insuficiente. Máximo disponível: ${myAvailableBalance} fichas.`
                              );
                              return;
                            }
                            playChipSound();
                            if (onPlaceGuesserBet) {
                              onPlaceGuesserBet(selectedOwnerId, chipBet);
                            }
                            setSubmittedBet(true);
                          }}
                          disabled={!isBetValid}
                          className={`w-full py-3.5 rounded-2xl font-black text-sm transition flex items-center justify-center gap-2 shadow-xl border ${
                            !isBetValid
                              ? 'bg-slate-800/80 border-slate-700/80 text-slate-500 cursor-not-allowed'
                              : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-300 text-slate-950 shadow-glow-green active:scale-95'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{buttonLabel}</span>
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* BET_LOCKED PHASE */}
            {room.phase === 'BET_LOCKED' && (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-glow-yellow animate-bounce">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs uppercase font-extrabold text-amber-400 tracking-widest">
                    Decisões Encerradas
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Apostas Fechadas!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-sm">
                    Todos os palpites foram travados. Nenhuma aposta pode ser alterada.
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-mono font-bold border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Revelando em {room.timeRemainingSeconds ?? 3}s...</span>
                </div>
              </div>
            )}

            {/* REVEAL PHASE WITH STEPPER ORCHESTRATION */}
            {room.phase === 'REVEAL' && (
              <div className="flex-1 flex flex-col justify-center items-center my-auto w-full">
                {(!room.revealStage || room.revealStage === 'INTRO') && (
                  <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-glow-yellow animate-pulse">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs uppercase font-extrabold text-amber-400 tracking-widest">
                        Momento Decisivo
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-white">
                        Hora da Revelação
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 max-w-sm">
                        Apresentando os palpites por ordem crescente de exposição financeira...
                      </p>
                    </div>
                  </div>
                )}

                {room.revealStage === 'GUESSER_STEPPER' && (
                  <BetRevealStepper
                    room={room}
                    myPlayerId={myPlayerId}
                    onSkipStep={onSkipRevealStep}
                    playStepSound={playRevealStepSound}
                  />
                )}

                {room.revealStage === 'OWNER_REVEAL' && (
                  <OwnerRevealSequence
                    room={room}
                    myPlayerId={myPlayerId}
                    onSkipStep={onSkipRevealStep}
                    playOwnerSound={playOwnerRevealSound}
                  />
                )}

                {room.revealStage === 'OWNER_PREDICTION_REVEAL' && (
                  <OwnerPredictionReveal
                    room={room}
                    myPlayerId={myPlayerId}
                    onSkipStep={onSkipRevealStep}
                  />
                )}

                {room.revealStage === 'SETTLEMENT' && (
                  <SettlementReveal
                    room={room}
                    myPlayerId={myPlayerId}
                    onSkipStep={onSkipRevealStep}
                    playPayoutSound={playPayoutSound}
                  />
                )}

                {room.revealStage === 'ROUND_SUMMARY' && (
                  <RoundSummaryCard
                    room={room}
                    myPlayerId={myPlayerId}
                    onNextRound={onNextRound}
                  />
                )}
              </div>
            )}
          </div>

          {/* Arena Bottom Action Dock */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              {room.phase === 'LOBBY' && !isHost && (
                <button
                  onClick={handleToggleReady}
                  className={`px-5 py-2 rounded-xl font-black text-xs transition flex items-center gap-1.5 border ${
                    isReady
                      ? 'bg-emerald-600 border-emerald-300 text-white shadow-glow-cyan'
                      : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-300 text-slate-950 shadow-glow-green'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{isReady ? 'Pronto!' : 'Ficar Pronto'}</span>
                </button>
              )}

              {isHost && room.phase === 'LOBBY' && (
                <>
                  <button
                    onClick={onAddBot}
                    disabled={room.players.length >= maxPlayers}
                    className="px-3 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold transition flex items-center gap-1 border border-purple-400/40"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>+ Bot</span>
                  </button>

                  <button
                    onClick={onStartGame}
                    disabled={room.players.length < 2}
                    className={`px-6 py-2 rounded-xl font-black text-xs transition flex items-center gap-2 border ${
                      room.players.length >= 2
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 text-white shadow-glow-pink cursor-pointer'
                        : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Iniciar Partida</span>
                  </button>
                </>
              )}

              {room.phase === 'MUSIC_SELECTION' && isMyTurn && (
                <button
                  onClick={handleRandomizeTrack}
                  className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 font-bold text-xs flex items-center gap-1.5"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Randomizar Faixa</span>
                </button>
              )}
            </div>

            <div className="text-right">
              <span className="text-xs font-black text-white block">
                {room.phase === 'LOBBY'
                  ? `${readyCount}/${room.players.length} jogadores prontos`
                  : `Rodada ${room.currentRound} de ${room.totalRounds}`}
              </span>
              <span className="text-[10px] text-blue-200/70 block">
                {room.phase === 'LOBBY'
                  ? readyCount >= room.players.length && room.players.length > 1
                    ? 'Todos prontos! Host pode iniciar.'
                    : 'Aguardando escolhas...'
                  : room.phase === 'MUSIC_SELECTION'
                  ? `Vez de escolher música`
                  : room.phase === 'BETTING'
                  ? 'Faça suas deduções'
                  : 'Fim da rodada'}
              </span>
            </div>
          </div>
        </div>

        {/* Collapsible Chat Drawer (Slide-Over) */}
        {isChatOpen && (
          <div className="w-80 glass-card p-3 rounded-3xl border border-white/15 flex flex-col justify-between backdrop-blur-xl bg-slate-950/80 shadow-2xl flex-shrink-0 animate-fade-in z-30">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-purple-300" />
                <span>Chat da Sala</span>
              </span>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                title="Fechar chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar py-2 my-1">
              {room.chatMessages && room.chatMessages.length > 0 ? (
                room.chatMessages.map((msg) => {
                  const isMe = msg.senderId === myPlayerId;
                  const isSystem = msg.isSystem || msg.senderId === 'SYSTEM';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-left">
                        <span className="text-[10px] font-extrabold text-cyan-300 block">{msg.senderName}</span>
                        <span className="text-xs text-cyan-100 font-medium block leading-tight">{msg.text}</span>
                      </div>
                    );
                  }

                  if (isMe) {
                    return (
                      <div key={msg.id} className="p-2 rounded-xl bg-amber-500/20 border border-yellow-400/30 text-right ml-4">
                        <span className="text-[10px] font-extrabold text-yellow-300 block">Você</span>
                        <span className="text-xs text-white font-semibold block leading-tight">{msg.text}</span>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="p-2 rounded-xl bg-slate-800/80 border border-white/10 text-left mr-4">
                      <span className="text-[10px] font-extrabold text-blue-200 block">{msg.senderName}</span>
                      <span className="text-xs text-white/90 font-medium block leading-tight">{msg.text}</span>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-blue-200/50">
                  Nenhuma mensagem ainda. Envie uma provocação!
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Footer with Reaction Tags & Input */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex gap-1 overflow-x-auto pb-1">
                {REACTION_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSendReaction(tag)}
                    className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white whitespace-nowrap"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendChat} className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Mensagem..."
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200/50 text-xs focus:outline-none focus:border-yellow-400"
                />
                <button
                  type="submit"
                  className="p-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold transition shadow-glow-yellow"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
