import { useEffect, useState } from 'react';

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

export type KeepAwakeMode = 'wake_lock' | 'video_fallback' | 'none';

/**
 * Valid 2-second, 16x16, 1fps H.264 Baseline MP4 (faststart, no audio track)
 * generated via ffmpeg so iOS Safari, Android Chrome, and mobile WebViews keep
 * the display awake like active video playback even when navigator.wakeLock is
 * unsupported or blocked inside an iframe.
 */
const KEEP_AWAKE_MP4_BASE64 =
  'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAMrbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAB9AAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAlV0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAB9AAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAABAAAAAQAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAfQAAAAAAABAAAAAAHNbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAABAAAAAgABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABeG1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAThzdGJsAAAAuHN0c2QAAAAAAAAAAQAAAKhhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAABAAEABIAAAASAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGP//AAAALmF2Y0MBQsAe/+EAFmdCwB7ZHsBEAAADAAQAAAMACDxYuSABAAVoy4PLIAAAABBwYXNwAAAAAQAAAAEAAAAUYnRydAAAAAAAAApAAAAKQAAAABhzdHRzAAAAAAAAAAEAAAACAABAAAAAABRzdHNzAAAAAAAAAAEAAAABAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAACAAAAAQAAABxzdHN6AAAAAAAAAAAAAAACAAAChgAAAAoAAAAUc3RjbwAAAAAAAAABAAADWwAAAGJ1ZHRhAAAAWm1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALWlsc3QAAAAlqXRvbwAAAB1kYXRhAAAAAQAAAABMYXZmNTguNzYuMTAwAAAACGZyZWUAAAKYbWRhdAAAAnAGBf//bNxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjMgcjMwNjAgNWRiNmFhNiAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjEgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0wIHJlZj0zIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDE6MHgxMTEgbWU9aGV4IHN1Ym1lPTcgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MSBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTEgOHg4ZGN0PTAgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz0xIGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MCB3ZWlnaHRwPTAga2V5aW50PTI1MCBrZXlpbnRfbWluPTEgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD00MCByYz1jcmYgbWJ0cmVlPTEgY3JmPTIzLjAgcWNvbXA9MC42MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IGlwX3JhdGlvPTEuNDAgYXE9MToxLjAwAIAAAAAOZYiEBb///w9FAAFPf4AAAAAGQZo4CvqA';

let sharedVideoEl: HTMLVideoElement | null = null;
let sharedVideoBlobUrl: string | null = null;
let sharedCanvasStream: MediaStream | null = null;
let sharedSentinel: WakeLockSentinelLike | null = null;
let desiredActive = false;
const statusListeners = new Set<() => void>();

function notifyListeners() {
  for (const fn of statusListeners) {
    fn();
  }
}

function getKeepAwakeVideoUrl(): string | null {
  if (typeof window === 'undefined' || typeof URL === 'undefined') return null;
  if (sharedVideoBlobUrl) return sharedVideoBlobUrl;
  try {
    const binary = window.atob(KEEP_AWAKE_MP4_BASE64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'video/mp4' });
    sharedVideoBlobUrl = URL.createObjectURL(blob);
    return sharedVideoBlobUrl;
  } catch {
    return null;
  }
}

function attachCanvasStreamFallback(video: HTMLVideoElement): boolean {
  try {
    if (sharedCanvasStream) {
      video.srcObject = sharedCanvasStream;
      return true;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 16, 16);
    }
    const capture = (
      canvas as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }
    ).captureStream;
    if (typeof capture !== 'function') return false;
    sharedCanvasStream = capture.call(canvas, 1);
    video.removeAttribute('src');
    video.srcObject = sharedCanvasStream;
    return true;
  } catch {
    return false;
  }
}

function ensureKeepAwakeVideo(): HTMLVideoElement | null {
  if (typeof document === 'undefined') return null;
  if (sharedVideoEl && document.body.contains(sharedVideoEl)) {
    return sharedVideoEl;
  }

  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('disablePictureInPicture', '');
  video.setAttribute('aria-hidden', 'true');
  video.tabIndex = -1;
  // Must stay >= 1x1 and opacity > 0 (not display:none / visibility:hidden) so mobile browsers keep the video pipeline active
  video.style.position = 'fixed';
  video.style.bottom = '0';
  video.style.left = '0';
  video.style.width = '1px';
  video.style.height = '1px';
  video.style.opacity = '0.001';
  video.style.pointerEvents = 'none';
  video.style.zIndex = '-1';

  const url = getKeepAwakeVideoUrl();
  if (url) {
    video.src = url;
  } else {
    attachCanvasStreamFallback(video);
  }

  video.addEventListener('playing', notifyListeners);
  video.addEventListener('pause', notifyListeners);
  document.body.appendChild(video);
  sharedVideoEl = video;
  return video;
}

async function startKeepAwakeVideo(): Promise<boolean> {
  const video = ensureKeepAwakeVideo();
  if (!video) return false;

  if (!video.paused && !video.ended) {
    return true;
  }

  try {
    await video.play();
    notifyListeners();
    return true;
  } catch {
    // Fallback to live canvas stream if MP4 codec was rejected in this runtime
    if (attachCanvasStreamFallback(video)) {
      try {
        await video.play();
        notifyListeners();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

function stopKeepAwakeVideo() {
  if (sharedVideoEl) {
    try {
      sharedVideoEl.pause();
    } catch {
      // Ignore pause errors
    }
  }
}

async function requestNativeWakeLock(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as unknown as NavigatorWithWakeLock;
  if (!nav.wakeLock) return false;
  if (sharedSentinel && !sharedSentinel.released) return true;

  try {
    const nextSentinel = await nav.wakeLock.request('screen');
    if (!desiredActive) {
      await nextSentinel.release().catch(() => {});
      return false;
    }
    sharedSentinel = nextSentinel;
    nextSentinel.addEventListener?.('release', () => {
      if (sharedSentinel === nextSentinel) {
        sharedSentinel = null;
      }
      notifyListeners();
    });
    notifyListeners();
    return true;
  } catch {
    return false;
  }
}

function updateMediaSessionState(playing: boolean) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = playing ? 'playing' : 'none';
  } catch {
    // Ignore unsupported mediaSession updates
  }
}

function getCurrentStatus(): {
  supported: boolean;
  locked: boolean;
  mode: KeepAwakeMode;
} {
  const wakeSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const hasNative = Boolean(sharedSentinel && !sharedSentinel.released);
  const hasVideo = Boolean(sharedVideoEl && !sharedVideoEl.paused && !sharedVideoEl.ended);

  if (hasNative) {
    return { supported: true, locked: true, mode: 'wake_lock' };
  }
  if (hasVideo) {
    return { supported: wakeSupported || true, locked: true, mode: 'video_fallback' };
  }
  return { supported: wakeSupported, locked: false, mode: 'none' };
}

/**
 * Call synchronously inside user tap/click handlers (Begin Prayer, Play, Resume)
 * so iOS Safari and Android Chrome unlock both the looping keep-awake <video>
 * pipeline and the Screen Wake Lock API immediately within the user gesture.
 */
export function primeScreenKeepAwake(): void {
  desiredActive = true;
  void startKeepAwakeVideo();
  void requestNativeWakeLock();
  updateMediaSessionState(true);
}

/**
 * Keeps the device screen awake while a Namaz session is active using:
 * 1) Screen Wake Lock API (with re-acquisition on visibilitychange / focus / tap)
 * 2) Invisible looping muted <video> playback (same OS lock YouTube uses)
 */
export function useScreenWakeLock(active: boolean): {
  supported: boolean;
  locked: boolean;
  mode: KeepAwakeMode;
} {
  const [status, setStatus] = useState(getCurrentStatus);

  useEffect(() => {
    const sync = () => setStatus(getCurrentStatus());
    statusListeners.add(sync);

    desiredActive = active;

    if (!active) {
      stopKeepAwakeVideo();
      updateMediaSessionState(false);
      if (sharedSentinel && !sharedSentinel.released) {
        void sharedSentinel.release().catch(() => {});
      }
      sharedSentinel = null;
      sync();
      return () => {
        statusListeners.delete(sync);
      };
    }

    const acquireBoth = () => {
      if (!desiredActive) return;
      void requestNativeWakeLock();
      void startKeepAwakeVideo();
      updateMediaSessionState(true);
    };

    acquireBoth();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        acquireBoth();
      }
    };

    const handleGestureRetry = () => {
      const current = getCurrentStatus();
      if (!current.locked || current.mode !== 'wake_lock') {
        acquireBoth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('pageshow', acquireBoth);
    window.addEventListener('focus', acquireBoth);
    window.addEventListener('pointerdown', handleGestureRetry, { passive: true });

    // Periodic safety check in case OS silently pauses video or drops lock during long rakats
    const intervalId = window.setInterval(() => {
      if (!desiredActive || document.visibilityState !== 'visible') return;
      if (!sharedVideoEl || sharedVideoEl.paused) {
        void startKeepAwakeVideo();
      }
      if (!sharedSentinel || sharedSentinel.released) {
        void requestNativeWakeLock();
      }
    }, 15000);

    return () => {
      statusListeners.delete(sync);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('pageshow', acquireBoth);
      window.removeEventListener('focus', acquireBoth);
      window.removeEventListener('pointerdown', handleGestureRetry);
      window.clearInterval(intervalId);

      desiredActive = false;
      stopKeepAwakeVideo();
      updateMediaSessionState(false);
      if (sharedSentinel && !sharedSentinel.released) {
        void sharedSentinel.release().catch(() => {});
      }
      sharedSentinel = null;
    };
  }, [active]);

  return status;
}
