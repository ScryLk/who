'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function useSoundEffects() {
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playChipSound = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  }, [isMuted, getAudioContext]);

  const playTickSound = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {}
  }, [isMuted, getAudioContext]);

  const playPayoutSound = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);

        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.15);
      });
    } catch (e) {}
  }, [isMuted, getAudioContext]);

  const playVictorySound = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.25);
      });
    } catch (e) {}
  }, [isMuted, getAudioContext]);

  const playRevealSound = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const freqs = [329.63, 392.0, 493.88, 659.25]; // E4, G4, B4, E5
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
      });
    } catch (e) {}
  }, [isMuted, getAudioContext]);

  // Metallic thud/latch for BET_LOCKED
  const playBetLockSound = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      // First metallic strike
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(180, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.12);
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);

      // Second authoritative latch
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(120, ctx.currentTime + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.25);
      gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }, [isMuted, getAudioContext]);

  // Game show card reveal sound per stepper step
  const playRevealStepSound = useCallback(
    (isHighRisk = false) => {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      try {
        if (isHighRisk) {
          // Low deep sub-bass resonance + intense reveal chime
          const sub = ctx.createOscillator();
          const subGain = ctx.createGain();
          sub.type = 'sine';
          sub.frequency.setValueAtTime(65, ctx.currentTime);
          sub.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.4);
          subGain.gain.setValueAtTime(0.3, ctx.currentTime);
          subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
          sub.connect(subGain);
          subGain.connect(ctx.destination);
          sub.start(ctx.currentTime);
          sub.stop(ctx.currentTime + 0.45);

          const notes = [293.66, 369.99, 440.0, 587.33]; // D4, F#4, A4, D5
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);
            gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.04 + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.04);
            osc.stop(ctx.currentTime + idx * 0.04 + 0.35);
          });
        } else {
          // Standard clean reveal chime
          const notes = [392.0, 523.25, 659.25]; // G4, C5, E5
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);
            gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.04 + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.04);
            osc.stop(ctx.currentTime + idx * 0.04 + 0.2);
          });
        }
      } catch (e) {}
    },
    [isMuted, getAudioContext]
  );

  // Grand mystery resolution chord for OWNER_REVEAL
  const playOwnerRevealSound = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const chord = [220.0, 277.18, 329.63, 440.0, 554.37, 659.25]; // A major rich chord
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.2);
      });
    } catch (e) {}
  }, [isMuted, getAudioContext]);

  // Short polite reject boop/thud for insufficient balance / blocked actions
  const playBlockedSound = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  }, [isMuted, getAudioContext]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  return {
    isMuted,
    toggleMute,
    playChipSound,
    playTickSound,
    playPayoutSound,
    playVictorySound,
    playRevealSound,
    playBetLockSound,
    playRevealStepSound,
    playOwnerRevealSound,
    playBlockedSound,
  };
}
