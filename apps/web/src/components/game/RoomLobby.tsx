'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Player, RoomState, SecondaryPredictionKind } from '@who/shared';
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
  Film,
  Video,
  ArrowRight,
} from 'lucide-react';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { CustomSelect, SelectOption } from '@/components/common/CustomSelect';
import { BackgroundMusic } from '@/components/common/BackgroundMusic';
import { CountdownModal } from '@/components/game/CountdownModal';
import { AudioWaveformScrubber } from '@/components/game/AudioWaveformScrubber';
import { getSocket } from '@/lib/socket';

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
}

const PLAYER_CARD_COLORS = [
  {
    bg: 'bg-amber-400 text-slate-950 border-amber-300 shadow-glow-yellow rounded-2xl overflow-hidden backdrop-blur-md',
    isYellow: true,
  },
  {
    bg: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-300 shadow-glow-pink rounded-2xl overflow-hidden backdrop-blur-md',
    isPink: true,
  },
  {
    bg: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-300 shadow-glow-cyan rounded-2xl overflow-hidden backdrop-blur-md',
    isBlue: true,
  },
  {
    bg: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-purple-300 shadow-glow-purple rounded-2xl overflow-hidden backdrop-blur-md',
    isPurple: true,
  },
];

const PREDICTION_OPTIONS: SelectOption<SecondaryPredictionKind>[] = [
  {
    value: 'SPECIFIC_PLAYERS',
    label: 'Jogador especifico(s) adivinharem a música',
  },
  {
    value: 'PLAYER_COUNT',
    label: 'Quantos jogadores',
  },
  {
    value: 'NONE',
    label: 'Nenhum jogador',
  },
];

function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export const RoomLobby: React.FC<RoomLobbyProps> = ({
  room,
  myPlayerId,
  onAddBot,
  onStartGame,
  onSubmitTrack,
  onPlaceOwnerBet,
  onPlaceGuesserBet,
  onResolveRound,
  onNextRound,
}) => {
  const isHost = room.hostId === myPlayerId;
  const [copied, setCopied] = useState(false);

  // Chat Auto-scroll Ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Search & Track Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

  // Snippet Start Time Offset State
  const [startTimeSeconds, setStartTimeSeconds] = useState(0);

  // Dedicated Active Tab for Music Selection Phase ('MUSIC' | 'PREDICTION')
  const [activeSelectionTab, setActiveSelectionTab] = useState<'MUSIC' | 'PREDICTION'>('MUSIC');

  // Preview Audio Engine (MUSIC_SELECTION phase)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [trackDuration, setTrackDuration] = useState<number>(30);

  // Round Secret Audio Engine (BETTING phase)
  const roundAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingRound, setIsPlayingRound] = useState(false);
  const [roundCurrentTime, setRoundCurrentTime] = useState(0);
  const [roundDuration, setRoundDuration] = useState(30);

  // Prediction Category & Betting State
  const [selectedCategory, setSelectedCategory] = useState<SecondaryPredictionKind>('SPECIFIC_PLAYERS');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [chipBet, setChipBet] = useState<number>(100);
  const [confirmedChoice, setConfirmedChoice] = useState(false);
  const [submittedBet, setSubmittedBet] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Owner Prediction State (during MUSIC_SELECTION when it's my turn)
  const [ownerPredictionKind, setOwnerPredictionKind] = useState<SecondaryPredictionKind>('PLAYER_COUNT');
  const [ownerChipBet, setOwnerChipBet] = useState<number>(100);
  const [expectedCount, setExpectedCount] = useState<number>(1);
  const [selectedTargetPlayerIds, setSelectedTargetPlayerIds] = useState<string[]>([]);

  // Chat Input State
  const [chatText, setChatText] = useState('');

  // Turn status checks
  const isMyTurn = room.phase === 'MUSIC_SELECTION' && room.currentTurnPlayerId === myPlayerId;
  const currentTurnPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);

  const formatTime = (secsInput: number) => {
    const m = Math.floor(secsInput / 60);
    const s = Math.floor(secsInput % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Cleanup audios on unmount
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

  // When phase is not MUSIC_SELECTION, pause preview
  useEffect(() => {
    if (room.phase !== 'MUSIC_SELECTION' && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    }
  }, [room.phase]);

  // When phase is not BETTING or round changes, reset round audio
  useEffect(() => {
    if (roundAudioRef.current) {
      roundAudioRef.current.pause();
      roundAudioRef.current = null;
      setIsPlayingRound(false);
      setRoundCurrentTime(0);
    }
  }, [room.phase, room.currentRound]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room.chatMessages]);

  useEffect(() => {
    // Reset submitted bet on round change
    setSubmittedBet(false);
  }, [room.currentRound, room.phase]);

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

  // Live debounced search as user types
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      const socket = getSocket();
      socket.emit('search_tracks', { query: trimmed }, (res: any) => {
        setIsSearching(false);
        if (res && res.success && res.results) {
          setSearchResults(res.results);
        }
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setIsSearching(true);
    const socket = getSocket();
    socket.emit('search_tracks', { query: trimmed }, (res: any) => {
      setIsSearching(false);
      if (res && res.success && res.results) {
        setSearchResults(res.results);
      }
    });
  };

  const handleSelectTrack = (track: any) => {
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
    if (previewAudioRef.current) {
      try {
        previewAudioRef.current.currentTime = sec;
        setPreviewCurrentTime(sec);
      } catch (e) {}
    }
  };

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
          if (audio) setPreviewCurrentTime(audio.currentTime);
        };
        audio.onloadedmetadata = () => {
          if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            setTrackDuration(Math.floor(audio.duration));
          }
        };
        audio.onended = () => {
          setIsPlayingPreview(false);
        };
        audio.onerror = () => {
          setIsPlayingPreview(false);
        };

        try {
          audio.currentTime = startTimeSeconds;
        } catch (e) {}
      }

      if (audio) {
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

  const togglePlayRoundAudio = () => {
    const audioUrl = room.currentTrack?.audioUrl;
    if (!audioUrl) return;

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
          if (audio) setRoundCurrentTime(audio.currentTime);
        };
        audio.onloadedmetadata = () => {
          if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            setRoundDuration(Math.floor(audio.duration));
          }
        };
        audio.onended = () => {
          setIsPlayingRound(false);
          setRoundCurrentTime(0);
        };
        audio.onerror = () => {
          setIsPlayingRound(false);
        };

        if (room.currentTrack?.startTimeSeconds) {
          try {
            audio.currentTime = room.currentTrack.startTimeSeconds;
          } catch (e) {}
        }
      }

      if (audio) {
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
    const trackToSubmit = {
      ...selectedTrack,
      startTimeSeconds: startTimeSeconds || selectedTrack.startTimeSeconds || 0,
    };
    if (onSubmitTrack) {
      onSubmitTrack(trackToSubmit);
    }
    if (onPlaceOwnerBet) {
      onPlaceOwnerBet(ownerPredictionKind, ownerChipBet, selectedTargetPlayerIds, expectedCount);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    const socket = getSocket();
    const myPlayer = room.players.find((p) => p.id === myPlayerId);
    socket.emit('send_chat', {
      roomCode: room.code,
      senderName: myPlayer?.nickname || 'Jogador',
      text: chatText,
    });
    setChatText('');
  };

  const handleSendEmoji = (emoji: string) => {
    const socket = getSocket();
    const myPlayer = room.players.find((p) => p.id === myPlayerId);
    socket.emit('send_reaction', {
      roomCode: room.code,
      emoji,
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

  // Real ready count calculated dynamically from isReady state and submittedTracks
  const readyCount = room.players.filter(
    (p) => p.isHost || p.isReady || (p.id === myPlayerId && isReady) || room.submittedTracks.some((t) => t.submittedByPlayerId === p.id)
  ).length;
  const maxPlayers = 8;

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen w-full bg-gradient-main text-white p-3 md:p-5 flex flex-col justify-between overflow-y-auto lg:overflow-hidden font-outfit select-none relative">
      {/* 5-Second Countdown Modal Overlay */}
      {room.phase === 'COUNTDOWN' && (
        <CountdownModal seconds={room.timeRemainingSeconds ?? 5} />
      )}

      {/* 1. Header Superior */}
      <header className="w-full flex items-center justify-between mb-3 flex-shrink-0">
        {/* Logo Canto Superior Esquerdo */}
        <div className="flex items-center gap-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow flex items-center gap-1">
            <span>Who</span><span className="text-yellow-400">?</span>
            <Music className="w-8 h-8 text-yellow-400 inline-block ml-1" />
          </h1>
        </div>

        {/* Informações da Sala (Centro Superior) */}
        <div className="glass-card px-4 py-2 rounded-2xl flex items-center gap-3 border border-white/20 shadow-lg backdrop-blur-md overflow-hidden">
          <span className="text-sm font-bold text-blue-100">
            Sala <span className="text-white font-mono font-black">#{room.code}</span>
          </span>
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-glow-yellow"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
          </button>
        </div>

        {/* Background Soundtrack Controller (Right Corner) */}
        <div className="flex items-center gap-2">
          <BackgroundMusic youtubeId="XCno3tliySo" />
        </div>
      </header>

      {/* 3-Column Main Dashboard Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 overflow-visible lg:overflow-hidden min-h-0">
        
        {/* 2. PAINEL ESQUERDO: Lista de Jogadores Reais (col-span-3) */}
        <div className="lg:col-span-3 glass-card p-4 rounded-3xl border border-white/15 flex flex-col justify-between overflow-hidden backdrop-blur-md bg-slate-900/40 lg:h-full min-h-[300px]">
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-300" />
                <span>Jogadores ({room.players.length}/{maxPlayers})</span>
              </h2>
              {isHost && room.players.length < maxPlayers && room.phase === 'LOBBY' && (
                <button
                  onClick={onAddBot}
                  className="p-1.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold transition flex items-center gap-1 shadow-glow-purple"
                  title="Adicionar Bot"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span className="text-[10px]">+ Bot</span>
                </button>
              )}
            </div>

            {/* List of Real Players with readiness & turn highlighting */}
            <div className="space-y-2.5 flex-1 min-h-0 overflow-y-auto pr-1.5 custom-scrollbar mb-2">
              {room.players.map((player: Player, index: number) => {
                const isPlayerHost = player.isHost || player.id === room.hostId;
                const isCurrentTurn = room.phase === 'MUSIC_SELECTION' && room.currentTurnPlayerId === player.id;
                const playerHasSubmitted = room.submittedTracks.some(
                  (t) => t.submittedByPlayerId === player.id
                );
                const isPlayerReady =
                  isPlayerHost ||
                  player.isReady ||
                  (player.id === myPlayerId && isReady) ||
                  playerHasSubmitted;

                let cardBgClass = PLAYER_CARD_COLORS[index % PLAYER_CARD_COLORS.length].bg;
                let statusText = '';
                let statusIcon = null;

                if (isCurrentTurn) {
                  cardBgClass =
                    'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 border-2 border-yellow-100 shadow-glow-yellow animate-pulse rounded-2xl overflow-hidden backdrop-blur-md';
                  statusText = `Escolhendo... (${room.turnTimeRemainingSeconds ?? 50}s)`;
                  statusIcon = <Clock className="w-3 h-3 text-slate-950 animate-spin" />;
                } else if (isPlayerHost) {
                  statusText = 'Líder da sala';
                  statusIcon = <Star className="w-3 h-3 text-yellow-300 fill-current" />;
                } else if (isPlayerReady) {
                  cardBgClass =
                    'bg-emerald-500 text-slate-950 border-emerald-300 shadow-glow-green rounded-2xl overflow-hidden backdrop-blur-md';
                  statusText = 'Pronto!';
                  statusIcon = <CheckCircle2 className="w-3 h-3 text-emerald-950 fill-emerald-300" />;
                } else {
                  statusText = 'Não pronto';
                  statusIcon = <span className="w-2 h-2 rounded-full bg-white/40" />;
                }

                return (
                  <div
                    key={player.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all duration-300 overflow-hidden backdrop-blur-md ${cardBgClass}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative">
                        <PlayerAvatar
                          avatar={player.avatar}
                          size="sm"
                          className="bg-white/20 border border-white/30"
                        />
                        {isPlayerHost && (
                          <div className="absolute -top-1 -right-1 p-0.5 rounded-full bg-purple-600 text-white text-[9px] shadow">
                            <Star className="w-2.5 h-2.5 fill-current text-yellow-300" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 text-left">
                        <div className="font-extrabold text-xs truncate max-w-[120px]">
                          {player.nickname} {player.id === myPlayerId && '(Você)'}
                        </div>
                        <div className="text-[10px] font-extrabold flex items-center gap-1 opacity-95">
                          {statusIcon}
                          <span>{statusText}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-extrabold text-yellow-300 flex items-center gap-1">
                        <Coins className="w-3 h-3" /> {player.chips}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rodapé do Painel Esquerdo */}
          <div className="pt-3 border-t border-white/10 text-center text-xs text-blue-200/80 font-medium flex items-center justify-center gap-2 flex-shrink-0">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-300 border-t-transparent animate-spin" />
            <span>
              {room.phase === 'LOBBY'
                ? maxPlayers - room.players.length > 0
                  ? `Esperando mais ${maxPlayers - room.players.length} jogadores...`
                  : 'Sala cheia!'
                : `Rodada ${room.currentRound} de ${room.totalRounds}`}
            </span>
          </div>
        </div>

        {/* 3. PAINEL CENTRAL: Escolha de Música, Aposta & Revelação (col-span-6) */}
        <div className="lg:col-span-6 glass-card p-5 rounded-3xl border-2 border-cyan-400/30 flex flex-col justify-between relative overflow-hidden backdrop-blur-md bg-slate-900/60 shadow-2xl h-full">
          {/* Headphones Watermark in Top Right */}
          <div className="absolute top-4 right-4 opacity-15 pointer-events-none text-cyan-200">
            <Headphones className="w-24 h-24 stroke-[1]" />
          </div>

          <div className="space-y-4 relative z-10 flex-1 flex flex-col justify-start">
            {/* Título do Painel Central */}
            <div className="flex items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-pink-400" />
                <h2 className="text-lg font-extrabold text-white">
                  {room.phase === 'BETTING'
                    ? `Palpites — Rodada ${room.currentRound}/${room.totalRounds}`
                    : room.phase === 'REVEAL'
                    ? `Resultado — Rodada ${room.currentRound}/${room.totalRounds}`
                    : 'Escolha sua Música'}
                </h2>
              </div>
              {(room.phase === 'MUSIC_SELECTION' || room.phase === 'BETTING' || room.phase === 'REVEAL') && (
                <div className="px-3 py-1 rounded-full bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 font-extrabold text-xs flex items-center gap-1.5 shadow-glow-yellow">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    Tempo: 0:{room.phase === 'BETTING' ? (room.timeRemainingSeconds ?? 30) : room.phase === 'REVEAL' ? (room.timeRemainingSeconds ?? 10) : (room.turnTimeRemainingSeconds ?? 50)}s
                  </span>
                </div>
              )}
            </div>

            {/* FASE 1: LOBBY */}
            {room.phase === 'LOBBY' && (
              <div className="p-8 rounded-2xl bg-white/5 border border-dashed border-cyan-400/30 text-center space-y-3 backdrop-blur-md mt-2">
                <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center mx-auto text-cyan-300 shadow-glow-cyan">
                  <Music className="w-7 h-7 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-white">A partida ainda não começou!</h3>
                  <p className="text-xs text-blue-200/80 max-w-sm mx-auto font-medium leading-relaxed">
                    Aguarde o líder iniciar a partida para que todos os jogadores possam escolher suas músicas secretas.
                  </p>
                </div>
              </div>
            )}

            {/* FASE 2: MUSIC_SELECTION (Outro Jogador) */}
            {room.phase === 'MUSIC_SELECTION' && !isMyTurn && (
              <div className="p-8 rounded-2xl bg-white/5 border border-dashed border-yellow-400/30 text-center space-y-3 backdrop-blur-md mt-2">
                <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mx-auto text-yellow-300 shadow-glow-yellow">
                  <Clock className="w-7 h-7 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-white">
                    Vez de <span className="text-yellow-300">{currentTurnPlayer?.nickname || 'Jogador'}</span> escolher a música!
                  </h3>
                  <p className="text-xs text-blue-200/80 max-w-sm mx-auto font-medium leading-relaxed">
                    Aguarde o término do tempo ou a confirmação secreta do jogador...
                  </p>
                  {currentTurnPlayer?.isBot && (
                    <span className="inline-block mt-2 px-3 py-1 rounded-full bg-purple-600/30 border border-purple-400/40 text-purple-300 text-[10px] font-bold">
                      <span>Bot aguardando cronômetro...</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* FASE 2: MUSIC_SELECTION (Seu Turno com Abas Dedicadas) */}
            {room.phase === 'MUSIC_SELECTION' && isMyTurn && (
              <div className="space-y-3 flex-1 flex flex-col justify-between custom-scrollbar overflow-y-auto pr-1">
                {/* Abas Dedicadas no Topo do Painel Central */}
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setActiveSelectionTab('MUSIC')}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 ${
                      activeSelectionTab === 'MUSIC'
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-950 shadow-glow-yellow'
                        : 'text-white/80 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Music className="w-4 h-4" />
                    <span>1. Escolher Música & Trecho</span>
                    {selectedTrack && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSelectionTab('PREDICTION')}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 ${
                      activeSelectionTab === 'PREDICTION'
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-950 shadow-glow-yellow'
                        : 'text-white/80 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Star className="w-4 h-4" />
                    <span>2. Previsão do Dono</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500/30 text-pink-300 border border-pink-400/30 font-bold">
                      Apostas
                    </span>
                  </button>
                </div>

                {/* CONTEÚDO DA ABA 1: MÚSICA & GRÁFICO SONORO */}
                {activeSelectionTab === 'MUSIC' && (
                  <div className="space-y-3">
                    {/* Campo de Busca Superior (Moveu para o Topo) */}
                    <div className="text-left space-y-1.5">
                      <label className="text-xs font-semibold text-yellow-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Sua vez! Digite o nome da música ou artista</span>
                        </span>
                        {selectedTrack && (
                          <span className="text-[10px] text-cyan-300 font-mono">
                            Faixa selecionada
                          </span>
                        )}
                      </label>
                      <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Digite para buscar músicas (ex: Evidências, Billie Jean, Pop...)"
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
                          className="px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold transition flex items-center justify-center shadow-glow-yellow flex-shrink-0"
                          title="Buscar música"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                      </form>
                    </div>

                    {/* Resultados de Busca Instantâneos (Aparece logo abaixo do campo sem precisar da lupa) */}
                    {searchResults.length > 0 && (
                      <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 bg-slate-950/90 p-2.5 rounded-2xl border border-yellow-400/30 backdrop-blur-xl shadow-2xl">
                        <div className="text-[10px] font-bold text-yellow-300 px-1 pb-1 flex items-center justify-between border-b border-white/10">
                          <span>Músicas Encontradas:</span>
                          <span className="text-white/60">Clique para selecionar</span>
                        </div>
                        {searchResults.map((track) => {
                          const isCurrent = selectedTrack?.id === track.id;
                          return (
                            <div
                              key={track.id}
                              onClick={() => handleSelectTrack(track)}
                              className={`p-2 rounded-xl cursor-pointer text-xs flex items-center justify-between gap-3 transition ${
                                isCurrent
                                  ? 'bg-yellow-400/20 text-yellow-300 font-bold border border-yellow-400/30'
                                  : 'hover:bg-white/10 text-white border border-transparent'
                              }`}
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
                                  <div className="font-extrabold truncate text-white">{track.title}</div>
                                  <div className="text-[10px] text-blue-200/80 truncate">{track.artist}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {track.genre && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-cyan-200 border border-white/10">
                                    {track.genre}
                                  </span>
                                )}
                                <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-yellow-400 text-slate-950 shadow-glow-yellow flex items-center gap-1">
                                  <span>Escolher</span>
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Sugestões Rápidas quando nenhuma busca foi digitada e nenhuma faixa foi selecionada */}
                    {!selectedTrack && searchResults.length === 0 && (
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2">
                        <div className="text-[11px] font-bold text-yellow-300 flex items-center gap-1">
                          <Music className="w-3.5 h-3.5" />
                          <span>Sugestões Populares para a Sala:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            'Evidências',
                            'Billie Jean',
                            'Blinding Lights',
                            'Bohemian Rhapsody',
                            'Baile de Favela',
                            'Shape of You',
                            'Cheia de Manias',
                            'Levitating',
                            'Deixa Acontecer',
                          ].map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => {
                                setSearchQuery(sug);
                                const socket = getSocket();
                                socket.emit('search_tracks', { query: sug }, (res: any) => {
                                  if (res && res.success && res.results && res.results.length > 0) {
                                    handleSelectTrack(res.results[0]);
                                  }
                                });
                              }}
                              className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-yellow-400/20 text-white hover:text-yellow-300 text-[11px] font-semibold transition border border-white/10 hover:border-yellow-400/40"
                            >
                              + {sug}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedTrack ? (
                      <>
                        {/* Componente de Gráfico Sonoro exibido após a escolha da música */}
                        <AudioWaveformScrubber
                          selectedTrack={selectedTrack}
                          startTimeSeconds={startTimeSeconds}
                          maxDurationSeconds={trackDuration > 0 ? trackDuration : 180}
                          onChangeStartTime={handleStartTimeChange}
                          isPlaying={isPlayingPreview}
                          onTogglePlay={togglePlayPreview}
                          currentPlaybackTime={previewCurrentTime}
                        />

                        {/* Botão de Avanço para a Aba de Previsão */}
                        <button
                          type="button"
                          onClick={() => setActiveSelectionTab('PREDICTION')}
                          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs transition shadow-glow-yellow flex items-center justify-center gap-2"
                        >
                          <span>Ir para Previsão do Dono (Apostas)</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </>
                    ) : null}
                  </div>
                )}

                {/* CONTEÚDO DA ABA 2: PREVISÃO DO DONO (ÁREA DEDICADA) */}
                {activeSelectionTab === 'PREDICTION' && (
                  <div className="space-y-4 text-left">
                    <div className="p-4 rounded-2xl bg-white/10 border border-white/15 space-y-3 backdrop-blur-md">
                      <label className="text-xs font-extrabold text-yellow-300 flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-current text-yellow-400" />
                        <span>Previsão do Dono: Como a sala vai reagir à sua música?</span>
                      </label>

                      {/* Seletor de Tipo de Previsão */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { kind: 'PLAYER_COUNT', label: 'Quantidade Exata', sub: '3.0x retorno' },
                          { kind: 'MORE_THAN', label: 'Mais de X Jogadores', sub: '2.5x retorno' },
                          { kind: 'FEWER_THAN', label: 'Menos de X Jogadores', sub: '2.5x retorno' },
                          { kind: 'SPECIFIC_PLAYERS', label: 'Jogador(es) Específico(s)', sub: '3.5x retorno' },
                          { kind: 'NONE', label: 'Nenhum Jogador (0)', sub: '4.0x retorno' },
                        ].map((opt) => (
                          <button
                            key={opt.kind}
                            type="button"
                            onClick={() => setOwnerPredictionKind(opt.kind as SecondaryPredictionKind)}
                            className={`p-2.5 rounded-2xl border text-left transition-all ${
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

                      {/* Se escolher Quantidade Exata / Mais de X / Menos de X */}
                      {(ownerPredictionKind === 'PLAYER_COUNT' || ownerPredictionKind === 'MORE_THAN' || ownerPredictionKind === 'FEWER_THAN') && (
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <span className="text-xs font-bold text-blue-200">
                            {ownerPredictionKind === 'PLAYER_COUNT'
                              ? 'Quantos jogadores vão acertar?'
                              : ownerPredictionKind === 'MORE_THAN'
                              ? 'Mais do que quantos jogadores?'
                              : 'Menos do que quantos jogadores?'}
                          </span>
                          <div className="flex gap-1.5">
                            {Array.from({ length: room.players.length }).map((_, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setExpectedCount(idx)}
                                className={`w-8 h-8 rounded-xl font-extrabold text-xs border transition ${
                                  expectedCount === idx
                                    ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-glow-yellow'
                                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                                }`}
                              >
                                {idx}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Se escolher Jogadores Específicos (SPECIFIC_PLAYERS) */}
                      {ownerPredictionKind === 'SPECIFIC_PLAYERS' && (
                        <div className="space-y-2 pt-2 border-t border-white/10">
                          <span className="text-xs font-bold text-blue-200">Quem vai acertar sua música?</span>
                          <div className="flex flex-wrap gap-2">
                            {room.players
                              .filter((p) => p.id !== myPlayerId)
                              .map((p) => {
                                const isSelected = selectedTargetPlayerIds.includes(p.id);
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedTargetPlayerIds(selectedTargetPlayerIds.filter((id) => id !== p.id));
                                      } else {
                                        setSelectedTargetPlayerIds([...selectedTargetPlayerIds, p.id]);
                                      }
                                    }}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold transition flex items-center gap-1.5 ${
                                      isSelected
                                        ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-glow-yellow'
                                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                                    }`}
                                  >
                                    <span>{p.nickname}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Fichas para Apostar */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <span className="text-xs font-extrabold text-white flex items-center gap-1">
                          <Coins className="w-4 h-4 text-yellow-300" /> Fichas para apostar:
                        </span>
                        <div className="flex gap-1.5">
                          {[50, 100, 200, 500].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setOwnerChipBet(amt)}
                              className={`px-3 py-1 rounded-xl text-xs font-extrabold border transition ${
                                ownerChipBet === amt
                                  ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-glow-yellow'
                                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                              }`}
                            >
                              +{amt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Botão de Confirmação Final */}
                    <button
                      disabled={!selectedTrack || confirmedChoice}
                      onClick={handleConfirmChoice}
                      className={`w-full py-4 rounded-2xl font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
                        confirmedChoice
                          ? 'bg-emerald-500 text-white cursor-not-allowed'
                          : !selectedTrack
                          ? 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
                          : 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 shadow-glow-yellow active:scale-[0.99]'
                      }`}
                    >
                      {confirmedChoice ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Música e Previsão Confirmadas!</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5 stroke-[3]" />
                          <span>Confirmar Música & Previsão</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* FASE 3: BETTING (Palpites e Apostas na Mesma Tela) */}
            {room.phase === 'BETTING' && (
              <div className="space-y-4 flex-1 flex flex-col justify-between custom-scrollbar overflow-y-auto pr-1">
                {/* 1. Track Anônima em Destaque com Áudio Oficial */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-600/40 via-pink-600/40 to-rose-600/40 border border-pink-400/40 flex items-center gap-4 shadow-xl backdrop-blur-md">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-lg border border-pink-300/40 flex-shrink-0">
                    <Music className="w-7 h-7 text-white animate-pulse" />
                  </div>

                  <div className="flex-1 min-w-0 text-left space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-white text-sm truncate">
                        Música Secreta da Rodada #{room.currentRound}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 font-mono font-bold border border-yellow-400/30">
                        {room.currentTrack?.genre || 'Faixa Secreta'}
                      </span>
                    </div>
                    <p className="text-xs text-yellow-300 font-bold truncate">
                      {room.currentTrack?.title || 'Faixa Misteriosa'} — {room.currentTrack?.artist || 'Artista Secreto'}
                    </p>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={togglePlayRoundAudio}
                        className="w-9 h-9 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 flex items-center justify-center transition shadow-glow-yellow flex-shrink-0 active:scale-95"
                        title={isPlayingRound ? 'Pausar áudio da rodada' : 'Ouvir faixa secreta'}
                      >
                        {isPlayingRound ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-white/20 overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full transition-all duration-150"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, Math.round((roundCurrentTime / Math.max(1, roundDuration)) * 100))
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-blue-200/90">
                          {formatTime(roundCurrentTime)} / {formatTime(roundDuration)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Seleção do Dono da Música */}
                <div className="text-left space-y-2">
                  <label className="text-xs font-extrabold text-yellow-300 flex items-center gap-1.5">
                    <span>1. Clique no jogador que você acha ser o Dono:</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {room.players.map((p) => {
                      const isSelected = selectedOwnerId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedOwnerId(p.id)}
                          className={`p-2 rounded-2xl border transition-all flex flex-col items-center gap-1 text-center ${
                            isSelected
                              ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-glow-yellow scale-105 font-black'
                              : 'bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold'
                          }`}
                        >
                          <PlayerAvatar avatar={p.avatar} size="sm" />
                          <span className="text-[11px] truncate max-w-[80px]">
                            {p.nickname} {p.id === myPlayerId && '(Você)'}
                          </span>
                          {isSelected && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-slate-950 text-yellow-300 font-extrabold inline-flex items-center gap-0.5">
                              <span>PALPITE</span>
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Apostar Fichas & Botão de Confirmação */}
                <div className="pt-1 text-center space-y-2 relative z-10 flex-shrink-0">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-blue-200">Fichas para apostar:</span>
                    <div className="flex gap-1.5">
                      {[50, 100, 200, 500].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setChipBet(amt)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-black border transition ${
                            chipBet === amt
                              ? 'bg-yellow-400 text-slate-950 border-yellow-300 shadow-glow-yellow'
                              : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                          }`}
                        >
                          +{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedOwnerId) return;
                      if (onPlaceGuesserBet) {
                        onPlaceGuesserBet(selectedOwnerId, chipBet, selectedCategory);
                      }
                      setSubmittedBet(true);
                    }}
                    disabled={!selectedOwnerId}
                    className={`w-full py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl border-2 overflow-hidden ${
                      !selectedOwnerId
                        ? 'bg-slate-800/80 border-slate-700 text-slate-400 cursor-not-allowed'
                        : submittedBet
                        ? 'bg-emerald-600 border-emerald-300 text-white shadow-glow-cyan'
                        : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-300 text-slate-950 shadow-glow-green hover:scale-[1.01] cursor-pointer'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{submittedBet ? 'Palpite Confirmado!' : `Confirmar Palpite (${chipBet} 🪙)`}</span>
                  </button>
                </div>
              </div>
            )}

            {/* FASE 4: REVEAL (Revelação do Dono na Mesma Tela) */}
            {room.phase === 'REVEAL' && (
              <div className="space-y-4 flex-1 flex flex-col justify-center text-center p-4">
                <div className="w-16 h-16 rounded-full bg-yellow-400/20 border-2 border-yellow-400/50 flex items-center justify-center mx-auto text-yellow-300 shadow-glow-yellow">
                  <Sparkles className="w-8 h-8 animate-spin" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white">
                    O Dono da Música era: <span className="text-yellow-300">{room.players.find(p => p.id === room.currentTrack?.submittedByPlayerId)?.nickname || 'Jogador'}</span>!
                  </h3>
                  <p className="text-xs text-blue-200/80 font-medium">
                    Música: {room.currentTrack?.title} — {room.currentTrack?.artist}
                  </p>
                </div>

                {onNextRound && (
                  <div className="pt-4">
                    <button
                      onClick={onNextRound}
                      className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 border border-pink-300 text-white font-black text-base shadow-glow-pink transition hover:scale-105 cursor-pointer mx-auto inline-flex items-center gap-2"
                    >
                      <Sparkles className="w-5 h-5" />
                      <span>Próxima Rodada ({room.timeRemainingSeconds ?? 10}s)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4. PAINEL DIREITO: Chat Real (col-span-3) */}
        <div className="lg:col-span-3 glass-card p-4 rounded-3xl border border-white/15 flex flex-col justify-between backdrop-blur-md overflow-hidden bg-slate-900/40 lg:h-full min-h-[350px]">
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-300" />
                <span>Chat</span>
              </h2>
            </div>

            {/* List of Real Live Messages - Occupies 100% space with custom scrollbar */}
            <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1.5 custom-scrollbar mb-2">
              {room.chatMessages && room.chatMessages.length > 0 ? (
                room.chatMessages.map((msg) => {
                  const isMe = msg.senderId === myPlayerId;
                  const isSystem = msg.isSystem || msg.senderId === 'SYSTEM';

                  if (isSystem) {
                    return (
                      <div
                        key={msg.id}
                        className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 text-left space-y-0.5 overflow-hidden backdrop-blur-md"
                      >
                        <div className="text-[11px] font-extrabold text-cyan-300 flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5 inline text-cyan-300" />
                          <span>{msg.senderName}</span>
                        </div>
                        <div className="text-xs text-cyan-100/90 font-medium leading-tight">{msg.text}</div>
                      </div>
                    );
                  }

                  if (isMe) {
                    return (
                      <div
                        key={msg.id}
                        className="p-2.5 rounded-2xl rounded-tr-xs bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-amber-400/30 border border-yellow-400/40 text-right space-y-0.5 overflow-hidden backdrop-blur-md ml-6 shadow-glow-yellow"
                      >
                        <div className="text-[11px] font-extrabold text-yellow-300">Você</div>
                        <div className="text-xs text-white font-semibold leading-tight">{msg.text}</div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className="p-2.5 rounded-2xl rounded-tl-xs bg-slate-800/70 border border-white/15 text-left space-y-0.5 overflow-hidden backdrop-blur-md mr-6 shadow-md"
                    >
                      <div className="text-[11px] font-extrabold text-yellow-300">{msg.senderName}</div>
                      <div className="text-xs text-white/95 font-medium leading-tight">{msg.text}</div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-blue-200/60 font-medium">
                  Nenhuma mensagem ainda. Envie uma provocação abaixo!
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          <div className="pt-2 space-y-2 border-t border-white/10 flex-shrink-0">
            {/* Barra de Reações Rápida */}
            <div className="flex items-center justify-between gap-1 px-1">
              {['Bravos', 'Sensacional', 'Genial'].map((label) => (
                <button
                  key={label}
                  onClick={() => handleSendEmoji(`[${label}]`)}
                  className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-extrabold text-white transition border border-white/15"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Campo de Entrada de Chat Real */}
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                placeholder="Conte quem vai errar feio..."
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200/50 text-xs focus:outline-none focus:border-emerald-400 transition"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-glow-green"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* 5. Barra Inferior de Ações (Footer/Dock) Real */}
      <footer className="w-full glass-card p-3 rounded-3xl border border-white/15 flex items-center justify-between mt-3 bg-slate-900/60 overflow-hidden backdrop-blur-md flex-shrink-0">
        {/* Controles Principais */}
        <div className="flex items-center gap-3">
          {/* Botão verde: Pronto! (Exibido apenas em LOBBY para não-hosts) */}
          {room.phase === 'LOBBY' && !isHost && (
            <button
              onClick={handleToggleReady}
              className={`px-5 py-2.5 rounded-2xl font-black text-sm transition flex items-center gap-2 border overflow-hidden ${
                isReady
                  ? 'bg-emerald-600 border-emerald-300 text-white shadow-glow-cyan'
                  : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-300 text-slate-950 shadow-glow-green'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isReady ? 'Pronto!' : 'Pronto!'}</span>
            </button>
          )}

          {/* Botão azul: Randomizar Música */}
          {room.phase === 'MUSIC_SELECTION' && (
            <button
              onClick={handleRandomizeTrack}
              className="px-4 py-2.5 rounded-2xl bg-cyan-500/30 hover:bg-cyan-500/50 border border-cyan-400/40 text-cyan-200 font-bold text-xs transition flex items-center gap-2 overflow-hidden"
            >
              <Shuffle className="w-4 h-4" />
              <span>Randomizar Música</span>
            </button>
          )}

          {/* Botão magenta: Iniciar Partida (Host / Líder) */}
          {isHost && room.phase === 'LOBBY' && (
            <button
              onClick={onStartGame}
              disabled={room.players.length < 2}
              className={`px-6 py-2.5 rounded-2xl font-black text-sm transition flex items-center gap-2 border overflow-hidden ${
                room.players.length >= 2
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 border-pink-300 text-white shadow-glow-pink cursor-pointer'
                  : 'bg-slate-700/60 border-slate-600 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Iniciar Partida</span>
            </button>
          )}
        </div>

        {/* Status no Canto Direito com dados reais */}
        <div className="text-right">
          <div className="text-xs font-extrabold text-white">
            {room.phase === 'LOBBY'
              ? `${readyCount}/${room.players.length} jogadores prontos`
              : `Rodada ${room.currentRound} de ${room.totalRounds}`}
          </div>
          <div className="text-[10px] font-semibold text-blue-200/70">
            {room.phase === 'LOBBY'
              ? readyCount >= room.players.length && room.players.length > 1
                ? 'Todos prontos! Host pode iniciar.'
                : 'Aguardando escolhas...'
              : room.phase === 'MUSIC_SELECTION'
              ? `Turno do jogador ${(room.turnIndex ?? 0) + 1}`
              : room.phase === 'BETTING'
              ? 'Faça seus palpites!'
              : 'Resultado da rodada'}
          </div>
        </div>
      </footer>
    </div>
  );
};
