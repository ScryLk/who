'use client';

import React, { useState, useRef } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';

interface BackgroundMusicProps {
  youtubeId?: string;
}

export const BackgroundMusic: React.FC<BackgroundMusicProps> = ({
  youtubeId = 'XCno3tliySo',
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);

    // Send postMessage to YouTube IFrame API
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const command = newMuteState ? 'mute' : 'unMute';
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: command, args: [] }),
        '*'
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
        '*'
      );
    }
  };

  return (
    <div className="flex items-center">
      {/* Hidden YouTube Audio Iframe */}
      <iframe
        ref={iframeRef}
        src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&autoplay=1&loop=1&playlist=${youtubeId}&controls=0&mute=1`}
        allow="autoplay"
        className="hidden w-0 h-0 pointer-events-none opacity-0 border-0"
        title="Background Music"
      />

      {/* Interactive Sound Track Icon-Only Control Button */}
      <button
        onClick={toggleMute}
        className={`p-2.5 rounded-xl transition flex items-center justify-center border glass-card backdrop-blur-md shadow-lg ${
          !isMuted
            ? 'bg-purple-600/50 border-purple-300 text-purple-200 shadow-glow-purple scale-105'
            : 'bg-white/10 border-white/20 text-blue-200/70 hover:bg-white/20 hover:text-white'
        }`}
        title={!isMuted ? 'Mutar Trilha Sonora' : 'Ativar Trilha Sonora'}
      >
        {!isMuted ? (
          <div className="flex items-center gap-1.5">
            <Music className="w-4 h-4 text-yellow-400 animate-bounce" />
            <Volume2 className="w-4 h-4 text-emerald-400" />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 opacity-60">
            <Music className="w-4 h-4 text-slate-400" />
            <VolumeX className="w-4 h-4 text-slate-400" />
          </div>
        )}
      </button>
    </div>
  );
};
