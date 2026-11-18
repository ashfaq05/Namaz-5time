import { useEffect, useState } from 'react';
import { getAudioContext } from './audioPlayer';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

interface NavigatorWithWakeLock {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
}

/**
 * Keeps the device screen awake using the Screen Wake Lock API (with automatic
 * re-acquisition on visibilitychange). Only falls back to a silent shared
 * AudioContext keep-alive if Wake Lock API is unavailable or blocked.
 */
export function useScreenWakeLock(active: boolean): {
  supported: boolean;
  locked: boolean;
} {
  const supported =
    typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!active) {
      setLocked(false);
      return;
    }

    let cancelled = false;
    let sentinel: WakeLockSentinelLike | null = null;
    let keepAliveOsc: OscillatorNode | null = null;
    let keepAliveGain: GainNode | null = null;

    const startSilentKeepAliveFallback = () => {
      try {
        if (keepAliveOsc) return;
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        // Zero audible gain; keeps media session active only when Wake Lock API fails
        gain.gain.setValueAtTime(0.00001, ctx.currentTime);
        osc.frequency.setValueAtTime(20, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        keepAliveOsc = osc;
        keepAliveGain = gain;
      } catch {
        // Ignore if AudioContext is unavailable
      }
    };

    const requestLock = async () => {
      if (cancelled) return;
      const nav = navigator as unknown as NavigatorWithWakeLock;
      if (!nav.wakeLock) {
        startSilentKeepAliveFallback();
        return;
      }
      try {
        const nextSentinel = await nav.wakeLock.request('screen');
        if (cancelled) {
          await nextSentinel.release().catch(() => {});
          return;
        }
        sentinel = nextSentinel;
        setLocked(true);
        nextSentinel.addEventListener?.('release', () => {
          if (!cancelled) {
            setLocked(false);
          }
        });
      } catch {
        if (!cancelled) {
          setLocked(false);
          startSilentKeepAliveFallback();
        }
      }
    };

    const handleVisibilityChange = () => {
      if (
        !cancelled &&
        document.visibilityState === 'visible' &&
        (!sentinel || sentinel.released)
      ) {
        void requestLock();
      }
    };

    void requestLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sentinel && !sentinel.released) {
        sentinel.release().catch(() => {});
      }
      sentinel = null;
      if (keepAliveOsc) {
        try {
          keepAliveOsc.stop();
          keepAliveOsc.disconnect();
        } catch {
          // Ignore stop errors
        }
        keepAliveOsc = null;
      }
      if (keepAliveGain) {
        try {
          keepAliveGain.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        keepAliveGain = null;
      }
      setLocked(false);
    };
  }, [active]);

  return { supported, locked };
}
