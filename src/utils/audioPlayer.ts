import type { LanguageCode, VoiceGender } from '../types/namaz';

let sharedAudioCtx: AudioContext | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let pendingCancelTimer: number | null = null;
let chromeKeepAliveTimer: number | null = null;
let activeUtterances: SpeechSynthesisUtterance[] = [];

function refreshVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    const list = window.speechSynthesis.getVoices();
    if (list.length > 0) {
      cachedVoices = list;
    }
  } catch {
    // Ignore voice query errors
  }
  return cachedVoices;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  try {
    window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
  } catch {
    // Fallback for older browsers
  }
}

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) {
      sharedAudioCtx = new Ctor();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function unlockAudioPlayback(): void {
  getAudioContext();
  refreshVoices();
}

export function playGentleTransitionChime(volume = 0.5): void {
  try {
    const ctx = getAudioContext();
    if (!ctx || volume <= 0.01) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, now);
    osc.frequency.exponentialRampToValueAtTime(396, now + 0.35);

    const peak = Math.min(0.2, Math.max(0.03, volume * 0.2));
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  } catch {
    // AudioContext blocked or unavailable; silent fallback
  }
}

function clearSpeechTimers(): void {
  if (pendingCancelTimer !== null) {
    window.clearTimeout(pendingCancelTimer);
    pendingCancelTimer = null;
  }
  if (chromeKeepAliveTimer !== null) {
    window.clearInterval(chromeKeepAliveTimer);
    chromeKeepAliveTimer = null;
  }
}

export function stopSpeechPlayback(): void {
  clearSpeechTimers();
  activeUtterances = [];
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      if (synth.speaking || synth.pending) {
        synth.cancel();
      }
    }
  } catch {
    // Ignore speech synthesis cancellation errors
  }
}

export function isSpeechPlaybackActive(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  try {
    const synth = window.speechSynthesis;
    return synth.speaking || synth.pending || pendingCancelTimer !== null;
  } catch {
    return false;
  }
}

const FEMALE_VOICE_PATTERN =
  /female|woman|laila|layla|salma|mariam|maryam|fatima|hoda|zeina|amira|nour|rana|sara|zahra|aisha|hana|zira|samantha|victoria|karen|moira|tessa|aria|jenny|asha|swara|lekha|kalpana|heera|noor|yasmin|ar-xa-x-arc|ar-xa-wavenet-a|ar-xa-wavenet-d/i;

const MALE_VOICE_PATTERN =
  /male|man|tariq|majed|maged|naayf|hamed|zayd|omar|ali|yusuf|ahmed|ahmad|khalid|karim|bassem|hamza|daniel|david|alex|fred|mark|guy|ryan|madhur|prabhat|hemant|ravi|hassan|faisal|abdullah|ar-xa-wavenet-b|ar-xa-wavenet-c/i;

const ARABIC_VOICE_NAME_PATTERN =
  /arab|العربية|maged|majed|tariq|laila|layla|salma|mariam|hoda|zeina|naayf|hamed|zayd/i;

function normalizeLang(lang: string): string {
  return lang.toLowerCase().replace('_', '-');
}

function selectArabicVoice(
  voices: SpeechSynthesisVoice[],
  gender: VoiceGender = 'male',
): { voice: SpeechSynthesisVoice | undefined; pitch: number; matched: boolean } {
  const arVoices = voices.filter(
    (v) =>
      normalizeLang(v.lang).startsWith('ar') ||
      ARABIC_VOICE_NAME_PATTERN.test(v.name),
  );

  if (arVoices.length === 0) {
    return {
      voice: undefined,
      pitch: gender === 'female' ? 1.14 : 0.86,
      matched: false,
    };
  }

  // Prefer Hijazi/Saudi Arabic (ar-SA) first for authentic prayer recitation tone,
  // then Egyptian/Gulf/Standard Arabic.
  const ranked = [...arVoices].sort((a, b) => {
    const la = normalizeLang(a.lang);
    const lb = normalizeLang(b.lang);
    const score = (l: string, name: string) =>
      (l === 'ar-sa' ? 4 : l.startsWith('ar-xa') || l === 'ar' ? 3 : l.startsWith('ar-eg') || l.startsWith('ar-ae') ? 2 : 1) +
      (/google|natural|neural|online/i.test(name) ? 1 : 0);
    return score(lb, b.name) - score(la, a.name);
  });

  const targetPattern =
    gender === 'female' ? FEMALE_VOICE_PATTERN : MALE_VOICE_PATTERN;
  const oppositePattern =
    gender === 'female' ? MALE_VOICE_PATTERN : FEMALE_VOICE_PATTERN;

  const exactMatch = ranked.find((v) => targetPattern.test(v.name));
  if (exactMatch) {
    return {
      voice: exactMatch,
      pitch: gender === 'female' ? 1.08 : 0.9,
      matched: true,
    };
  }

  const nonOpposite = ranked.find((v) => !oppositePattern.test(v.name));
  return {
    voice: nonOpposite ?? ranked[0],
    pitch: gender === 'female' ? 1.18 : 0.85,
    matched: true,
  };
}

function selectVoiceAndPitch(
  voices: SpeechSynthesisVoice[],
  langPrefixes: string[],
  gender: VoiceGender = 'male',
): { voice: SpeechSynthesisVoice | undefined; pitch: number; matchedLang: boolean } {
  let pool: SpeechSynthesisVoice[] = [];
  for (const prefix of langPrefixes) {
    const found = voices.filter((v) =>
      normalizeLang(v.lang).startsWith(prefix.toLowerCase()),
    );
    if (found.length > 0) {
      pool = found;
      break;
    }
  }

  if (pool.length === 0) {
    return {
      voice: undefined,
      pitch: gender === 'female' ? 1.15 : 0.86,
      matchedLang: false,
    };
  }

  const targetPattern =
    gender === 'female' ? FEMALE_VOICE_PATTERN : MALE_VOICE_PATTERN;
  const oppositePattern =
    gender === 'female' ? MALE_VOICE_PATTERN : FEMALE_VOICE_PATTERN;

  const exactMatch = pool.find((v) => targetPattern.test(v.name));
  if (exactMatch) {
    return {
      voice: exactMatch,
      pitch: gender === 'female' ? 1.08 : 0.9,
      matchedLang: true,
    };
  }

  const nonOpposite = pool.find((v) => !oppositePattern.test(v.name));
  return {
    voice: nonOpposite ?? pool[0],
    pitch: gender === 'female' ? 1.18 : 0.85,
    matchedLang: true,
  };
}

/**
 * Shapes transliteration slightly toward calm Arabic vowel elongation and pauses
 * only when the OS TTS engine explicitly refuses Arabic (ar-SA) playback.
 */
function formatArabicPhoneticCadence(text: string): string {
  return text
    .replace(/\bAllahu Akbar\b/gi, 'Allaahu Akbar')
    .replace(/\bBismillahir/gi, 'Bismillaahir')
    .replace(/\bRahmanir/gi, 'Rahmaanir')
    .replace(/\bRahim\b/gi, 'Raheem')
    .replace(/\bAlhamdu/gi, 'Al-hamdu')
    .replace(/\bSubhana/gi, 'Subhaana')
    .replace(/\bAssalamu/gi, 'As-salaamu');
}

function splitSpeechChunks(text: string, maxLen = 140): string[] {
  const normalized = text
    .replace(/۝/g, '، ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return [];

  const rawParts = normalized
    .split(/(?<=[،,.!?؛;])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = '';
  for (const part of rawParts) {
    if (buffer && buffer.length + part.length + 1 > maxLen) {
      chunks.push(buffer);
      buffer = part;
    } else {
      buffer = buffer ? `${buffer} ${part}` : part;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks.length > 0 ? chunks : [normalized];
}

function scheduleSpeechQueue(buildQueue: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  const needsCancelDelay = synth.speaking || synth.pending;

  clearSpeechTimers();
  activeUtterances = [];

  if (needsCancelDelay) {
    try {
      synth.cancel();
    } catch {
      // Ignore cancel errors
    }
    pendingCancelTimer = window.setTimeout(() => {
      pendingCancelTimer = null;
      buildQueue();
    }, 60);
  } else {
    buildQueue();
  }
}

function startChromeSpeechKeepAlive(): void {
  if (chromeKeepAliveTimer !== null) {
    window.clearInterval(chromeKeepAliveTimer);
  }
  chromeKeepAliveTimer = window.setInterval(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    if (!synth.speaking && !synth.pending) {
      if (chromeKeepAliveTimer !== null) {
        window.clearInterval(chromeKeepAliveTimer);
        chromeKeepAliveTimer = null;
      }
      return;
    }
    if (synth.paused) {
      try {
        synth.resume();
      } catch {
        // Ignore resume errors
      }
    }
  }, 3500);
}

/**
 * Speaks strictly the prayer recitation in Arabic tone and pronunciation
 * (optionally preceded by the transition Takbir "Allahu Akbar"),
 * without spoken movement explanations or commentary.
 */
export function speakPrayerRecitation(options: {
  arabicText?: string;
  transliterationText?: string;
  transitionTakbir?: boolean;
  repeatCount?: number;
  rate: number;
  volume: number;
  voiceGender?: VoiceGender;
}): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (options.volume <= 0.01) {
    stopSpeechPlayback();
    return;
  }

  scheduleSpeechQueue(() => {
    try {
      const synth = window.speechSynthesis;
      if (synth.paused) synth.resume();

      const voices = refreshVoices();
      const gender = options.voiceGender ?? 'male';
      const arSelection = selectArabicVoice(voices, gender);

      const canFallbackToTranslit = Boolean(
        options.transliterationText || options.transitionTakbir,
      );

      let fallbackTriggered = false;

      const speakPhoneticFallback = () => {
        if (fallbackTriggered) return;
        fallbackTriggered = true;
        const wasBusy = synth.speaking || synth.pending;
        if (wasBusy) {
          try {
            synth.cancel();
          } catch {
            // Ignore
          }
        }
        activeUtterances = [];

        const runFallbackQueue = () => {
          const latestVoices = refreshVoices();
          // Prefer Urdu / Hindi / Malay / Indian-English over Western voices so
          // Arabic consonants and elongated cadence stay natural.
          const latestFallback = selectVoiceAndPitch(
            latestVoices,
            ['ur', 'hi', 'id', 'ms', 'en-in', 'en-gb', 'en'],
            gender,
          );

          const speakPhoneticChunk = (text: string, rateFactor: number) => {
            const utt = new SpeechSynthesisUtterance(
              formatArabicPhoneticCadence(text),
            );
            if (latestFallback.voice) {
              utt.voice = latestFallback.voice;
              utt.lang = latestFallback.voice.lang;
            } else {
              utt.lang = 'ur-PK';
            }
            utt.pitch = latestFallback.pitch;
            utt.rate = Math.max(0.25, Math.min(2, options.rate * rateFactor));
            utt.volume = options.volume;
            utt.onend = () => {
              activeUtterances = activeUtterances.filter((u) => u !== utt);
            };
            activeUtterances.push(utt);
            synth.speak(utt);
          };

          if (options.transitionTakbir) {
            speakPhoneticChunk('Allaahu Akbar', 0.84);
          }
          if (options.transliterationText) {
            const count = Math.max(1, options.repeatCount ?? 1);
            const chunks = splitSpeechChunks(options.transliterationText, 130);
            for (let i = 0; i < count; i++) {
              chunks.forEach((chunk) => speakPhoneticChunk(chunk, 0.78));
            }
          }
          startChromeSpeechKeepAlive();
        };

        if (wasBusy) {
          pendingCancelTimer = window.setTimeout(() => {
            pendingCancelTimer = null;
            runFallbackQueue();
          }, 50);
        } else {
          runFallbackQueue();
        }
      };

      const enqueueArabic = (text: string, rateFactor = 0.8) => {
        const chunks = splitSpeechChunks(text, 120);
        chunks.forEach((chunk) => {
          const utt = new SpeechSynthesisUtterance(chunk);
          // Always target Arabic (ar-SA) so tone & pronunciation remain strictly Arabic
          utt.lang = arSelection.voice?.lang || 'ar-SA';
          if (arSelection.voice) utt.voice = arSelection.voice;
          utt.pitch = arSelection.pitch;
          utt.rate = Math.max(0.25, Math.min(2, options.rate * rateFactor));
          utt.volume = options.volume;
          utt.onend = () => {
            activeUtterances = activeUtterances.filter((u) => u !== utt);
          };
          utt.onerror = (ev) => {
            activeUtterances = activeUtterances.filter((u) => u !== utt);
            const err = (ev as SpeechSynthesisErrorEvent).error;
            if (
              (err === 'language-unavailable' ||
                err === 'voice-unavailable' ||
                err === 'synthesis-failed') &&
              canFallbackToTranslit
            ) {
              speakPhoneticFallback();
            }
          };
          activeUtterances.push(utt);
          synth.speak(utt);
        });
      };

      if (options.transitionTakbir) {
        enqueueArabic('اللَّهُ أَكْبَرُ', 0.86);
      }

      if (options.arabicText) {
        const count = Math.max(1, options.repeatCount ?? 1);
        for (let i = 0; i < count; i++) {
          enqueueArabic(options.arabicText, 0.8);
        }
      }

      startChromeSpeechKeepAlive();
    } catch {
      // Graceful fallback if speech synthesis fails
    }
  });
}

export function speakGuidanceAndRecitation(options: {
  spokenInstruction?: string;
  arabicText?: string;
  transliterationText?: string;
  language: LanguageCode;
  rate: number;
  volume: number;
  spokenEnabled: boolean;
  voiceGender?: VoiceGender;
}): void {
  const gender = options.voiceGender ?? 'male';

  if (!options.spokenEnabled) {
    speakPrayerRecitation({
      arabicText: options.arabicText,
      transliterationText: options.transliterationText,
      rate: options.rate,
      volume: options.volume,
      voiceGender: gender,
    });
    return;
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (options.volume <= 0.01) {
    stopSpeechPlayback();
    return;
  }

  scheduleSpeechQueue(() => {
    try {
      const synth = window.speechSynthesis;
      if (synth.paused) synth.resume();
      const voices = refreshVoices();

      if (options.spokenInstruction) {
        const langCode =
          options.language === 'hi' ? 'hi-IN' : options.language === 'ur' ? 'ur-PK' : 'en-US';
        const sel = selectVoiceAndPitch(
          voices,
          [langCode.slice(0, 2), 'en'],
          gender,
        );
        splitSpeechChunks(options.spokenInstruction, 150).forEach((chunk) => {
          const guideUtt = new SpeechSynthesisUtterance(chunk);
          guideUtt.lang = sel.voice?.lang || langCode;
          if (sel.voice) guideUtt.voice = sel.voice;
          guideUtt.pitch = sel.pitch;
          guideUtt.rate = Math.max(0.25, Math.min(2, options.rate));
          guideUtt.volume = options.volume;
          guideUtt.onend = () => {
            activeUtterances = activeUtterances.filter((u) => u !== guideUtt);
          };
          activeUtterances.push(guideUtt);
          synth.speak(guideUtt);
        });
      }

      if (options.arabicText) {
        const arSel = selectArabicVoice(voices, gender);
        splitSpeechChunks(options.arabicText, 120).forEach((chunk) => {
          const arUtt = new SpeechSynthesisUtterance(chunk);
          arUtt.lang = arSel.voice?.lang || 'ar-SA';
          if (arSel.voice) arUtt.voice = arSel.voice;
          arUtt.pitch = arSel.pitch;
          arUtt.rate = Math.max(0.25, Math.min(2, options.rate * 0.8));
          arUtt.volume = options.volume;
          arUtt.onend = () => {
            activeUtterances = activeUtterances.filter((u) => u !== arUtt);
          };
          activeUtterances.push(arUtt);
          synth.speak(arUtt);
        });
      }

      startChromeSpeechKeepAlive();
    } catch {
      // Graceful fallback
    }
  });
}
