'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { CustomSelect, SelectOption } from '@/components/common/CustomSelect';
import { BackgroundMusic } from '@/components/common/BackgroundMusic';
import { getSocket } from '@/lib/socket';

interface RoomLobbyProps {
  room: RoomState;
  myPlayerId: string;
  onAddBot: () => void;
  onStartGame: () => void;
  onSubmitTrack?: (track: any) => void;
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

const DEFAULT_EMOJIS = ['😂', '🎉', '❤️', '🎤', '🔥'];

const PREDICTION_OPTIONS: SelectOption<SecondaryPredictionKind>[] = [
  {
    value: 'SPECIFIC_PLAYERS',
    label: 'Jogador especifico(s) adivinharem a música',
    icon: '🎯',
  },
  {
    value: 'PLAYER_COUNT',
    label: 'Quantos jogadores',
    icon: '🎯',
  },
  {
    value: 'NONE',
    label: 'Nenhum jogador',
    icon: '🎯',
  },
];

export const RoomLobby: React.FC<RoomLobbyProps> = ({
  room,
  myPlayerId,
  onAddBot,
  onStartGame,
  onSubmitTrack,
}) => {
  const isHost = room.hostId === myPlayerId;
  const [copied, setCopied] = useState(false);

  // Search & Track Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);

  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);

  // Prediction Category State
  const [selectedCategory, setSelectedCategory] = useState<SecondaryPredictionKind>('SPECIFIC_PLAYERS');
  const [confirmedChoice, setConfirmedChoice] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Chat Input State
  const [chatText, setChatText] = useState('');

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const socket = getSocket();
    socket.emit('search_tracks', { query: searchQuery }, (res: any) => {
      setIsSearching(false);
      if (res && res.success && res.results.length > 0) {
        setSearchResults(res.results);
        setSelectedTrack(res.results[0]);
      }
    });
  };

  const togglePlayTrack = () => {
    if (!selectedTrack) return;
    if (isPlayingPreview) {
      audioObj?.pause();
      setIsPlayingPreview(false);
    } else {
      audioObj?.pause();
      const audio = new Audio(selectedTrack.audioUrl);
      audio.play().catch(() => {});
      setAudioObj(audio);
      setIsPlayingPreview(true);
      audio.onended = () => setIsPlayingPreview(false);
    }
  };

  const handleConfirmChoice = () => {
    if (!selectedTrack) return;
    setConfirmedChoice(true);
    setIsReady(true);
    if (onSubmitTrack) {
      onSubmitTrack(selectedTrack);
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
    const randomQuery = ['pop 80s', 'rock brasil', 'funk hits', 'mpb classico', 'dance synth'][
      Math.floor(Math.random() * 5)
    ];
    setIsSearching(true);
    const socket = getSocket();
    socket.emit('search_tracks', { query: randomQuery }, (res: any) => {
      setIsSearching(false);
      if (res && res.success && res.results.length > 0) {
        const randomTrack = res.results[Math.floor(Math.random() * res.results.length)];
        setSelectedTrack(randomTrack);
      }
    });
  };

  // Real ready count calculated dynamically from submittedTracks
  const readyCount = room.submittedTracks.length;
  const maxPlayers = 8;

  return (
    <div className="h-screen max-h-screen w-full bg-gradient-main text-white p-3 md:p-5 flex flex-col justify-between overflow-hidden font-outfit select-none">
      {/* 1. Header Superior */}
      <header className="w-full flex items-center justify-between mb-3">
        {/* Logo Canto Superior Esquerdo */}
        <div className="flex items-center gap-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow">
            Who<span className="text-yellow-400">?</span> <span className="text-yellow-400 text-2xl">🎵</span>
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 overflow-hidden min-h-0">
        
        {/* 2. PAINEL ESQUERDO: Lista de Jogadores Reais (col-span-3) */}
        <div className="lg:col-span-3 glass-card p-4 rounded-3xl border border-white/15 flex flex-col justify-between overflow-hidden backdrop-blur-md bg-slate-900/40">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-300" />
                <span>Jogadores ({room.players.length}/{maxPlayers})</span>
              </h2>
              {isHost && room.players.length < maxPlayers && (
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

            {/* List of Real Players */}
            <div className="space-y-2.5 max-h-[52vh] overflow-y-auto pr-1">
              {room.players.map((player: Player, index: number) => {
                const colorTheme = PLAYER_CARD_COLORS[index % PLAYER_CARD_COLORS.length];
                const playerHasSubmitted = room.submittedTracks.some(
                  (t) => t.submittedByPlayerId === player.id
                );

                return (
                  <div
                    key={player.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all overflow-hidden backdrop-blur-md ${colorTheme.bg}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative">
                        <PlayerAvatar
                          avatar={player.avatar}
                          size="sm"
                          className="bg-white/20 border border-white/30"
                        />
                        {player.isHost && (
                          <div className="absolute -top-1 -right-1 p-0.5 rounded-full bg-purple-600 text-white text-[9px] shadow">
                            <Star className="w-2.5 h-2.5 fill-current text-yellow-300" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 text-left">
                        <div className="font-extrabold text-xs truncate max-w-[120px]">
                          {player.nickname} {player.id === myPlayerId && '(Você)'}
                        </div>
                        <div className="text-[10px] font-semibold flex items-center gap-1 opacity-90">
                          {playerHasSubmitted ? (
                            <span className="flex items-center gap-0.5 text-emerald-950 font-black">
                              <CheckCircle2 className="w-3 h-3 text-emerald-900 fill-emerald-400" /> Pronto!
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 opacity-90">
                              🎵 Escolhendo...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rodapé do Painel Esquerdo */}
          <div className="pt-3 border-t border-white/10 text-center text-xs text-blue-200/80 font-medium flex items-center justify-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-300 border-t-transparent animate-spin" />
            <span>
              {maxPlayers - room.players.length > 0
                ? `Esperando mais ${maxPlayers - room.players.length} jogadores...`
                : 'Sala cheia!'}
            </span>
          </div>
        </div>

        {/* 3. PAINEL CENTRAL: Escolha de Música & Aposta (col-span-6) */}
        <div className="lg:col-span-6 glass-card p-5 rounded-3xl border-2 border-cyan-400/30 flex flex-col justify-between relative overflow-hidden backdrop-blur-md bg-slate-900/60 shadow-2xl">
          {/* Headphones Watermark in Top Right */}
          <div className="absolute top-4 right-4 opacity-15 pointer-events-none text-cyan-200">
            <Headphones className="w-24 h-24 stroke-[1]" />
          </div>

          <div className="space-y-4 relative z-10">
            {/* Título do Painel Central */}
            <div className="flex items-center gap-2 text-left">
              <Music className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-extrabold text-white">Escolha sua Música</h2>
            </div>

            {/* Informative Banner when in pre-game Lobby phase */}
            {room.phase === 'LOBBY' ? (
              <div className="p-8 rounded-2xl bg-white/5 border border-dashed border-cyan-400/30 text-center space-y-3 backdrop-blur-md my-4">
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
            ) : (
              <>
                {/* Campo de Busca/Link */}
                <div className="text-left space-y-1.5">
                  <label className="text-xs font-semibold text-blue-200">
                    Cole o link da música (Spotify ou YouTube) ou digite o nome
                  </label>
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Pesquise por música, artista ou cole o link..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200/50 text-xs focus:outline-none focus:border-yellow-400 transition"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold transition flex items-center justify-center shadow-glow-yellow"
                    >
                      {isSearching ? <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" /> : <Search className="w-4 h-4" />}
                    </button>
                  </form>
                </div>

                {/* Search Results Dropdown Preview if multiple */}
                {searchResults.length > 1 && (
                  <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-950/80 p-2 rounded-xl border border-white/10 backdrop-blur-md overflow-hidden">
                    {searchResults.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => {
                          setSelectedTrack(track);
                          setSearchResults([]);
                        }}
                        className={`p-2 rounded-lg cursor-pointer text-xs flex items-center justify-between hover:bg-white/10 ${
                          selectedTrack?.id === track.id ? 'bg-yellow-400/20 text-yellow-300 font-bold' : 'text-white'
                        }`}
                      >
                        <span className="truncate">{track.title} — {track.artist}</span>
                        <span className="text-[10px] text-cyan-300">Selecionar</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Card da Música Selecionada */}
                {selectedTrack ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-600/40 via-pink-600/40 to-rose-600/40 border border-pink-400/40 flex items-center gap-4 shadow-xl overflow-hidden backdrop-blur-md">
                    {/* Music Artwork / Banner */}
                    {selectedTrack.albumArt ? (
                      <img
                        src={selectedTrack.albumArt}
                        alt={selectedTrack.title}
                        className="w-14 h-14 rounded-2xl object-cover shadow-lg border border-pink-300/40 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-lg border border-pink-300/40 flex-shrink-0">
                        <Music className="w-7 h-7 text-white" />
                      </div>
                    )}

                    {/* Info & Player */}
                    <div className="flex-1 min-w-0 text-left space-y-2">
                      <div>
                        <h3 className="font-extrabold text-white text-base truncate">
                          {selectedTrack.title}
                        </h3>
                        <p className="text-xs text-blue-200/90 font-medium truncate">
                          {selectedTrack.artist}
                        </p>
                      </div>

                      {/* Player Interativo */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePlayTrack}
                          className="w-8 h-8 rounded-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 flex items-center justify-center transition shadow-glow-yellow flex-shrink-0"
                        >
                          {isPlayingPreview ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        {/* Barra de Progresso Amarela */}
                        <div className="flex-1 flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-white/20 overflow-hidden relative">
                            <div
                              className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                              style={{ width: isPlayingPreview ? '65%' : '0%' }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-blue-200/90">
                            {isPlayingPreview ? 'Tocando' : '0:30 prévia'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-white/5 border border-dashed border-white/20 text-center space-y-2 overflow-hidden backdrop-blur-md">
                    <Music className="w-8 h-8 text-cyan-300/60 mx-auto" />
                    <p className="text-xs font-bold text-white">Nenhuma música selecionada</p>
                    <p className="text-[11px] text-blue-200/70">
                      Pesquise por nome, artista ou cole o link acima para escolher sua música secreta!
                    </p>
                  </div>
                )}

                {/* Seção de Aposta com CustomSelect */}
                <div className="text-left space-y-1.5 relative z-30">
                  <CustomSelect<SecondaryPredictionKind>
                    label="Categoria de Aposta"
                    options={PREDICTION_OPTIONS}
                    value={selectedCategory}
                    onChange={(val) => setSelectedCategory(val)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Ação Principal: Botão verde em largura total quando liberado */}
          {room.phase !== 'LOBBY' && (
            <div className="pt-3 text-center space-y-1.5 relative z-10">
              <button
                onClick={handleConfirmChoice}
                disabled={!selectedTrack}
                className={`w-full py-3.5 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2 shadow-xl border-2 overflow-hidden ${
                  !selectedTrack
                    ? 'bg-slate-800/80 border-slate-700 text-slate-400 cursor-not-allowed'
                    : confirmedChoice
                    ? 'bg-emerald-600 border-emerald-300 text-white shadow-glow-cyan'
                    : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-300 text-slate-950 shadow-glow-green hover:scale-[1.01] cursor-pointer'
                }`}
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>{confirmedChoice ? 'Escolha Confirmada!' : 'Confirmar Escolha'}</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. PAINEL DIREITO: Chat Real (col-span-3) */}
        <div className="lg:col-span-3 glass-card p-4 rounded-3xl border border-white/15 flex flex-col justify-between backdrop-blur-md overflow-hidden bg-slate-900/40">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-300" />
                <span>Chat</span>
              </h2>
            </div>

            {/* List of Real Live Messages */}
            <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
              {room.chatMessages && room.chatMessages.length > 0 ? (
                room.chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-2.5 rounded-2xl bg-white/10 border border-white/10 text-left space-y-0.5 overflow-hidden backdrop-blur-md"
                  >
                    <div className="text-[11px] font-extrabold text-cyan-300">{msg.senderName}</div>
                    <div className="text-xs text-white/90 font-medium leading-tight">{msg.text}</div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-blue-200/60 font-medium">
                  Nenhuma mensagem ainda. Envie uma provocação abaixo!
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 space-y-2 border-t border-white/10">
            {/* Barra de Reações Rápida */}
            <div className="flex items-center justify-between px-1">
              {DEFAULT_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendEmoji(emoji)}
                  className="p-1 hover:scale-125 transition text-base"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Campo de Entrada de Chat Real */}
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                placeholder="Conte quem vai errar feio 🎤"
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
      <footer className="w-full glass-card p-3 rounded-3xl border border-white/15 flex items-center justify-between mt-3 bg-slate-900/60 overflow-hidden backdrop-blur-md">
        {/* Controles Principais */}
        <div className="flex items-center gap-3">
          {/* Botão verde: ✓ Pronto! (Retirado para o Líder) */}
          {!isHost && (
            <button
              onClick={() => setIsReady(!isReady)}
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

          {/* Botão azul: 🎲 Randomizar Música */}
          <button
            onClick={handleRandomizeTrack}
            className="px-4 py-2.5 rounded-2xl bg-cyan-500/30 hover:bg-cyan-500/50 border border-cyan-400/40 text-cyan-200 font-bold text-xs transition flex items-center gap-2 overflow-hidden"
          >
            <Shuffle className="w-4 h-4" />
            <span>Randomizar Música</span>
          </button>

          {/* Botão magenta: 🚀 Iniciar Partida (Host / Líder) */}
          {isHost && (
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
            {readyCount}/{room.players.length} jogadores prontos
          </div>
          <div className="text-[10px] font-semibold text-blue-200/70">
            {readyCount >= room.players.length && room.players.length > 1
              ? 'Todos prontos! Host pode iniciar.'
              : 'Aguardando escolhas...'}
          </div>
        </div>
      </footer>
    </div>
  );
};
