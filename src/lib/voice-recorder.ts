/**
 * Voice recorder: Web Audio PCM capture + RMS voice-activity detection + WAV encoding.
 * Emits self-contained WAV blobs on each utterance boundary (silence-after-speech).
 * Works reliably on Chrome, Edge, Firefox, Android Chrome, iOS Safari.
 */

export type VoiceRecorderStatus =
  | "idle"
  | "requesting"
  | "listening"
  | "speaking"
  | "processing"
  | "error";

export interface VoiceRecorderOptions {
  onStatus?: (status: VoiceRecorderStatus) => void;
  onLevel?: (level: number) => void; // 0..1 RMS meter
  onUtterance?: (wav: Blob, durationSec: number) => void;
  onError?: (err: Error) => void;
  /** ms of silence after speech before an utterance is emitted */
  silenceMs?: number;
  /** RMS threshold to consider "voice present" (0..1). Lower = more sensitive. */
  voiceThreshold?: number;
  /** min utterance length in ms — shorter clips are discarded as noise */
  minUtteranceMs?: number;
  /** max utterance length in ms — force-flush to avoid runaway recordings */
  maxUtteranceMs?: number;
}

const TARGET_SAMPLE_RATE = 16000;

export class VoiceRecorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;

  private buffer: Float32Array[] = [];
  private bufferSamples = 0;
  private inputSampleRate = 48000;

  private speaking = false;
  private lastVoiceAt = 0;
  private utteranceStartAt = 0;
  private levelTimer: number | null = null;
  private running = false;

  private readonly silenceMs: number;
  private readonly voiceThreshold: number;
  private readonly minUtteranceMs: number;
  private readonly maxUtteranceMs: number;

  constructor(private opts: VoiceRecorderOptions) {
    this.silenceMs = opts.silenceMs ?? 1200;
    this.voiceThreshold = opts.voiceThreshold ?? 0.012;
    this.minUtteranceMs = opts.minUtteranceMs ?? 350;
    this.maxUtteranceMs = opts.maxUtteranceMs ?? 15000;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.opts.onStatus?.("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      this.stream = stream;
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      if (ctx.state === "suspended") await ctx.resume();
      this.ctx = ctx;
      this.inputSampleRate = ctx.sampleRate;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      source.connect(analyser);
      analyser.connect(processor);
      // Route to a muted gain to keep the graph alive without playback.
      const mute = ctx.createGain();
      mute.gain.value = 0;
      processor.connect(mute);
      mute.connect(ctx.destination);

      processor.onaudioprocess = (e) => this.handleAudio(e.inputBuffer.getChannelData(0));

      this.source = source;
      this.analyser = analyser;
      this.processor = processor;
      this.running = true;
      this.resetUtterance();

      this.opts.onStatus?.("listening");
      this.startLevelLoop();
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
      await this.stop();
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.levelTimer) {
      window.clearInterval(this.levelTimer);
      this.levelTimer = null;
    }
    try {
      this.processor?.disconnect();
      this.analyser?.disconnect();
      this.source?.disconnect();
    } catch {
      /* noop */
    }
    this.processor = null;
    this.analyser = null;
    this.source = null;
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
    this.buffer = [];
    this.bufferSamples = 0;
    this.speaking = false;
    this.opts.onStatus?.("idle");
    this.opts.onLevel?.(0);
  }

  /** Temporarily pause capture (e.g. while AI is speaking) without releasing the mic. */
  pause() {
    if (this.stream) this.stream.getAudioTracks().forEach((t) => (t.enabled = false));
    this.resetUtterance();
  }

  resume() {
    if (this.stream) this.stream.getAudioTracks().forEach((t) => (t.enabled = true));
    this.resetUtterance();
    if (this.running) this.opts.onStatus?.("listening");
  }

  private resetUtterance() {
    this.buffer = [];
    this.bufferSamples = 0;
    this.speaking = false;
    this.utteranceStartAt = 0;
    this.lastVoiceAt = 0;
  }

  private startLevelLoop() {
    const analyser = this.analyser;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    this.levelTimer = window.setInterval(() => {
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      this.opts.onLevel?.(Math.min(1, rms * 4));
    }, 80);
  }

  private handleAudio(chunk: Float32Array) {
    if (!this.running) return;
    // Compute frame RMS for VAD
    let sum = 0;
    for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
    const rms = Math.sqrt(sum / chunk.length);
    const now = performance.now();
    const isVoice = rms > this.voiceThreshold;

    // Always keep a small pre-roll so we don't clip the first phoneme
    this.buffer.push(new Float32Array(chunk));
    this.bufferSamples += chunk.length;

    // Trim pre-roll to ~300ms while not speaking
    if (!this.speaking) {
      const maxPreroll = Math.floor(this.inputSampleRate * 0.3);
      while (this.bufferSamples > maxPreroll && this.buffer.length > 1) {
        const first = this.buffer[0];
        this.bufferSamples -= first.length;
        this.buffer.shift();
      }
    }

    if (isVoice) {
      if (!this.speaking) {
        this.speaking = true;
        this.utteranceStartAt = now;
        this.opts.onStatus?.("speaking");
      }
      this.lastVoiceAt = now;
    } else if (this.speaking) {
      const sinceVoice = now - this.lastVoiceAt;
      const utteranceDur = now - this.utteranceStartAt;
      if (sinceVoice >= this.silenceMs || utteranceDur >= this.maxUtteranceMs) {
        this.flushUtterance();
      }
    }
  }

  private flushUtterance() {
    const durMs = performance.now() - this.utteranceStartAt;
    const samples = this.mergeBuffer();
    this.resetUtterance();
    if (durMs < this.minUtteranceMs) {
      this.opts.onStatus?.("listening");
      return;
    }
    const downsampled = downsampleTo(samples, this.inputSampleRate, TARGET_SAMPLE_RATE);
    const wav = encodeWav(downsampled, TARGET_SAMPLE_RATE);
    this.opts.onStatus?.("processing");
    try {
      this.opts.onUtterance?.(wav, durMs / 1000);
    } finally {
      // Caller will set status back to listening when done processing.
    }
  }

  private mergeBuffer(): Float32Array {
    const out = new Float32Array(this.bufferSamples);
    let offset = 0;
    for (const b of this.buffer) {
      out.set(b, offset);
      offset += b.length;
    }
    return out;
  }
}

function downsampleTo(input: Float32Array, inRate: number, outRate: number): Float32Array {
  if (outRate >= inRate) return input;
  const ratio = inRate / outRate;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  let outIdx = 0;
  let inIdx = 0;
  while (outIdx < outLen) {
    const nextIdx = Math.floor((outIdx + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let i = inIdx; i < nextIdx && i < input.length; i++) {
      sum += input[i];
      count++;
    }
    out[outIdx] = count > 0 ? sum / count : 0;
    outIdx++;
    inIdx = nextIdx;
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([view], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
}
