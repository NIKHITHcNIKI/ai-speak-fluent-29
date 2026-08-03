/**
 * LiveSpeech — low-latency live transcription using the browser SpeechRecognition
 * engine (Chrome, Edge, Safari 16+, Android Chrome).
 *
 * Why: server round-trip STT can only produce text AFTER the user stops talking.
 * The native engine streams interim words while the user speaks, so subtitles are
 * live and the final transcript is ready the instant silence is detected — no
 * upload, no Whisper latency.
 *
 * Turn-taking: recognition is fully stopped while the AI speaks, so AI TTS,
 * speaker output, TV/music or other voices can never be transcribed as user input.
 */

export type LiveSpeechStatus =
  | "idle"
  | "requesting"
  | "listening" // mic open, no speech yet
  | "speaking" // user is talking, interim text flowing
  | "processing" // finalizing transcript
  | "error";

export interface LiveSpeechOptions {
  onStatus?: (s: LiveSpeechStatus) => void;
  onLevel?: (level: number) => void;
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (err: Error) => void;
  /** silence (ms) after speech before the transcript is finalized */
  silenceMs?: number;
  lang?: string;
}

type SR = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionResultLikeEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

interface SpeechRecognitionResultLikeEvent {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { isFinal: boolean; 0: { transcript: string; confidence: number } };
  };
}

/** Mobile browsers (Android Chrome / iOS) ship an unreliable SpeechRecognition
 * bridge — it commonly fails with "Speech Recognition and Synthesis from Google
 * cannot record now", and it fights with our own mic stream. On mobile we always
 * use the server (Whisper) pipeline instead. */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const touchMac =
    /Macintosh/.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
  return /Android|iPhone|iPad|iPod|Mobile|Silk|Opera Mini|IEMobile/i.test(ua) || touchMac;
}

export function isLiveSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (isMobileDevice()) return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w["SpeechRecognition"] || w["webkitSpeechRecognition"]);
}

export class LiveSpeech {
  private rec: SR | null = null;
  private running = false;
  private muted = false;
  private finalText = "";
  private interimText = "";
  private silenceTimer: number | null = null;
  private restartTimer: number | null = null;
  private resumeTimer: number | null = null;
  private ignoreUntil = 0;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private levelTimer: number | null = null;

  private readonly silenceMs: number;
  private readonly lang: string;

  constructor(private opts: LiveSpeechOptions) {
    this.silenceMs = opts.silenceMs ?? 2000;
    this.lang = opts.lang ?? "en-US";
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.opts.onStatus?.("requesting");
    try {
      // Own mic stream purely for the level meter, with echo/noise/gain handling on.
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      this.startMeter(this.stream);
    } catch (err) {
      const e = err as Error;
      this.opts.onStatus?.("error");
      this.opts.onError?.(
        e?.name === "NotAllowedError"
          ? new Error("Microphone permission denied. Enable it in browser settings.")
          : e?.name === "NotFoundError"
            ? new Error("No microphone found on this device.")
            : e,
      );
      return;
    }

    this.running = true;
    this.muted = false;
    this.spawnRecognition();
    this.opts.onStatus?.("listening");
  }

  private spawnRecognition() {
    if (!this.running || this.muted) return;
    const w = window as unknown as Record<string, unknown>;
    const Ctor = (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as
      | (new () => SR)
      | undefined;
    if (!Ctor) {
      this.opts.onError?.(new Error("Live speech recognition is not supported in this browser."));
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = this.lang;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      if (!this.running || this.muted) return;
      if (performance.now() < this.ignoreUntil) return;
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const chunk = r[0]?.transcript ?? "";
        if (r.isFinal) this.finalText = (this.finalText + " " + chunk).trim();
        else interim += chunk;
      }
      this.interimText = interim.trim();
      const live = (this.finalText + " " + this.interimText).trim();
      if (live) {
        this.opts.onStatus?.("speaking");
        this.opts.onInterim?.(live);
        this.armSilence();
      }
    };

    rec.onerror = (e) => {
      const code = e?.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        this.opts.onStatus?.("error");
        this.opts.onError?.(new Error("Microphone permission denied for speech recognition."));
        this.running = false;
        return;
      }
      // no-speech / aborted / network → silently restart below
    };

    rec.onend = () => {
      if (this.rec !== rec) return;
      this.rec = null;
      if (!this.running || this.muted) return;
      // Chrome ends the session periodically; restart to stay continuous.
      this.restartTimer = window.setTimeout(() => this.spawnRecognition(), 120);
    };

    this.rec = rec;
    try {
      rec.start();
    } catch {
      /* already started */
    }
  }

  private armSilence() {
    if (this.silenceTimer) window.clearTimeout(this.silenceTimer);
    this.silenceTimer = window.setTimeout(() => this.finalize(), this.silenceMs);
  }

  /** Finalize immediately (e.g. user pressed send). */
  finalize() {
    if (this.silenceTimer) {
      window.clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    const text = (this.finalText + " " + this.interimText).trim();
    this.finalText = "";
    this.interimText = "";
    if (!text || text.length < 2) {
      if (this.running && !this.muted) this.opts.onStatus?.("listening");
      return;
    }
    this.opts.onStatus?.("processing");
    this.opts.onFinal?.(text);
  }

  /** Hard-stop capture while the AI speaks — nothing is heard or transcribed. */
  pause() {
    this.muted = true;
    this.clearTimers();
    this.finalText = "";
    this.interimText = "";
    this.opts.onInterim?.("");
    const rec = this.rec;
    this.rec = null;
    try {
      rec?.abort();
    } catch {
      /* noop */
    }
  }

  /** Resume listening. `delayMs` lets the room's speaker audio decay first. */
  resume(delayMs = 0) {
    if (this.resumeTimer) window.clearTimeout(this.resumeTimer);
    const go = () => {
      this.resumeTimer = null;
      if (!this.running) return;
      this.muted = false;
      this.finalText = "";
      this.interimText = "";
      this.ignoreUntil = performance.now() + 200;
      this.spawnRecognition();
      this.opts.onStatus?.("listening");
    };
    if (delayMs > 0) this.resumeTimer = window.setTimeout(go, delayMs);
    else go();
  }

  get isMuted() {
    return this.muted;
  }

  async stop(): Promise<void> {
    this.running = false;
    this.clearTimers();
    if (this.resumeTimer) {
      window.clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
    const rec = this.rec;
    this.rec = null;
    try {
      rec?.abort();
    } catch {
      /* noop */
    }
    if (this.levelTimer) {
      window.clearInterval(this.levelTimer);
      this.levelTimer = null;
    }
    try {
      this.analyser?.disconnect();
    } catch {
      /* noop */
    }
    this.analyser = null;
    if (this.ctx && this.ctx.state !== "closed") {
      try {
        await this.ctx.close();
      } catch {
        /* noop */
      }
    }
    this.ctx = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.finalText = "";
    this.interimText = "";
    this.opts.onInterim?.("");
    this.opts.onLevel?.(0);
    this.opts.onStatus?.("idle");
  }

  private clearTimers() {
    if (this.silenceTimer) {
      window.clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.restartTimer) {
      window.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  private startMeter(stream: MediaStream) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    this.ctx = ctx;
    this.analyser = analyser;
    const data = new Uint8Array(analyser.fftSize);
    this.levelTimer = window.setInterval(() => {
      if (!this.analyser) return;
      if (this.muted) {
        this.opts.onLevel?.(0);
        return;
      }
      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      this.opts.onLevel?.(Math.min(1, Math.sqrt(sum / data.length) * 4));
    }, 70);
  }
}
