'use client';

import React, { useState, useEffect } from 'react';
import { Search, Music, Play, Pause, CheckCircle2, Sparkles, VolumeX, Volume2 } from 'lucide-react';
import { getSocket } from '@/lib/socket';

interface TrackItem {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  audioUrl: string;
  genre?: string;
}

interface TrackSelectorProps {
  roomCode: string;
  onSubmitTrack: (track: TrackItem) => void;
  alreadySubmitted: boolean;
}

export const TrackSelector: React.FC<TrackSelectorProps> = ({
  roomCode,
  onSubmitTrack,
  alreadySubmitted,
}) => {
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<TrackItem | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    fetchTracks('');
  }, []);

  const fetchTracks = (searchQuery: string) => {
    setLoading(true);
    const socket = getSocket();
    socket.emit('search_tracks', { query: searchQuery }, (res: any) => {
      setLoading(false);
      if (res && res.success) {
        setTracks(res.results);
      }
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracks(query);
  };

  const togglePreview = (track: TrackItem) => {
    if (playingId === track.id) {
      if (isMuted) {
        // Toggle mute off if clicking already playing track
        if (audioElement) audioElement.muted = false;
        setIsMuted(false);
      } else {
        audioElement?.pause();
        setPlayingId(null);
      }
    } else {
      audioElement?.pause();
      const audio = new Audio(track.audioUrl);
      audio.muted = true; // Starts with muted volume icon state as requested
      setIsMuted(true);
      audio.play().catch(() => {});
      setAudioElement(audio);
      setPlayingId(track.id);
      audio.onended = () => setPlayingId(null);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioElement) {
      const nextMuted = !isMuted;
      audioElement.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleConfirmTrack = () => {
    if (selectedTrack) {
      audioElement?.pause();
      onSubmitTrack(selectedTrack);
    }
  };

  if (alreadySubmitted) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="glass-card p-8 border-2 border-emerald-400/40 shadow-glow-cyan flex flex-col items-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4 animate-bounce-subtle" />
          <h2 className="text-3xl font-black text-white mb-2">Música Enviada com Sucesso!</h2>
          <p className="text-blue-200 text-sm mb-6">
            Sua música secreta foi registrada. Aguardando os demais jogadores escolherem...
          </p>
          <div className="w-12 h-12 rounded-full border-4 border-cyan-300 border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto h-full max-h-[85vh] flex flex-col justify-between overflow-hidden py-4 px-4">
      <div>
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-400/20 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" /> Fase 1: Escolha Sua Música Secreta
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-1">Qual é a sua música hoje?</h2>
          <p className="text-blue-200 text-xs md:text-sm">
            Busque e selecione uma música. Ninguém na sala saberá que ela é sua!
          </p>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleSearchSubmit} className="mb-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200/60" />
            <input
              type="text"
              placeholder="Pesquise por música, artista ou gênero..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-blue-200/50 focus:outline-none focus:border-cyan-400 transition"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition flex items-center gap-2"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {/* Track Results List */}
        <div className="space-y-3 max-h-[38vh] overflow-y-auto pr-2">
          {tracks.map((track) => {
            const isSelected = selectedTrack?.id === track.id;
            const isPlaying = playingId === track.id;

            return (
              <div
                key={track.id}
                onClick={() => setSelectedTrack(track)}
                className={`glass-card p-3.5 flex items-center justify-between cursor-pointer transition border-2 ${
                  isSelected
                    ? 'border-yellow-400 bg-yellow-400/15 shadow-glow-yellow'
                    : 'border-white/10 hover:bg-white/15'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={track.albumArt || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=150&q=80'}
                    alt={track.title}
                    className="w-12 h-12 rounded-xl object-cover shadow"
                  />
                  <div className="min-w-0 text-left">
                    <h4 className="font-bold text-white text-sm truncate">{track.title}</h4>
                    <p className="text-xs text-blue-200/80 truncate">{track.artist}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePreview(track);
                    }}
                    className={`p-2.5 rounded-full transition flex items-center justify-center ${
                      isPlaying
                        ? isMuted
                          ? 'bg-amber-500 text-slate-950 shadow-glow-yellow'
                          : 'bg-yellow-400 text-slate-950 shadow-glow-yellow'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title={isPlaying ? (isMuted ? 'Áudio Sem Volume (Clique para ativar)' : 'Pausar') : 'Ouvir prévia (inicia sem som)'}
                  >
                    {isPlaying ? (
                      isMuted ? <VolumeX className="w-5 h-5 text-slate-950" /> : <Volume2 className="w-5 h-5" />
                    ) : (
                      <VolumeX className="w-5 h-5 opacity-80" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm Selection Panel */}
      {selectedTrack && (
        <div className="glass-card p-4 border-2 border-yellow-400 flex items-center justify-between shadow-2xl animate-fadeIn mt-2">
          <div className="flex items-center gap-3">
            <Music className="w-6 h-6 text-yellow-300 animate-bounce-subtle" />
            <div className="text-left min-w-0">
              <span className="text-xs text-yellow-300 font-bold block">Música Selecionada:</span>
              <span className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs block">
                {selectedTrack.title} — {selectedTrack.artist}
              </span>
            </div>
          </div>

          <button
            onClick={handleConfirmTrack}
            className="px-6 py-3 rounded-xl bg-gradient-button-yellow font-black text-slate-950 text-base shadow-glow-yellow hover:scale-[1.03] transition"
          >
            CONFIRMAR MÚSICA 🚀
          </button>
        </div>
      )}
    </div>
  );
};
