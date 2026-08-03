import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LiveSpeech, isLiveSpeechSupported, type LiveSpeechStatus } from "@/lib/live-speech";
import { VoiceRecorder } from "@/lib/voice-recorder";

export type VoiceSessionStatus = LiveSpeechStatus;

interface Engine {
  stop: () => Promise<void>;
  pause: () => void;
  resume: (delayMs?: number) => void;
  finalize?: () => void;
}

/**
 * One voice pipeline for every mode:
 * - live subtitles + ~instant finalization via the browser speech engine
 * - Whisper (server) fallback when the browser has no live engine
 * - hard mute while the AI speaks so its own voice is never captured
 */
export function useVoiceSession(opts: {
  silenceMs?: number;
  onFinal: (text: string) => void;
}) {
  const { silenceMs = 2000 } = opts;
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<VoiceSessionStatus>("idle");
  const [level, setLevel] = useState(0);
  const [interim, setInterim] = useState("");

  const engineRef = useRef<Engine | null>(null);
  const onFinalRef = useRef(opts.onFinal);
  onFinalRef.current = opts.onFinal;

  const transcribeBlob = useCallback(async (wav: Blob): Promise<string> => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const fd = new FormData();
      fd.append("file", wav, "recording.wav");
      fd.append("language", "en");
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) return "";
      const data = (await res.json()) as { text?: string };
      return (data.text ?? "").trim();
    } catch {
      return "";
    }
  }, []);

  const emitFinal = useCallback((text: string) => {
    const clean = text.trim();
    // Filter engine noise artefacts / STT silence hallucinations.
    if (!clean || /^(you|thanks for watching|thank you\.?|\.|uh|um)$/i.test(clean)) {
      setStatus("listening");
      setInterim("");
      return;
    }
    setInterim("");
    onFinalRef.current(clean);
  }, []);

  const startRecorder = useCallback(async () => {
    // Fallback: buffer audio locally and transcribe on the server (works everywhere,
    // including Android Chrome / iOS where the Google speech engine refuses to record).
    const rec = new VoiceRecorder({
      silenceMs,
      voiceThreshold: 0.012,
      minUtteranceMs: 350,
      maxUtteranceMs: 120000,
      onStatus: (s) => setStatus(s),
      onLevel: setLevel,
      onError: (e) => console.error(e),
      onUtterance: async (wav) => {
        setStatus("processing");
        const text = await transcribeBlob(wav);
        emitFinal(text);
      },
    });
    engineRef.current = rec;
    await rec.start();
  }, [emitFinal, silenceMs, transcribeBlob]);

  const start = useCallback(async () => {
    if (engineRef.current) return;
    setListening(true);
    if (isLiveSpeechSupported()) {
      const live = new LiveSpeech({
        silenceMs,
        onStatus: setStatus,
        onLevel: setLevel,
        onInterim: setInterim,
        onFinal: emitFinal,
        onError: (e) => console.error(e),
        onFatal: async () => {
          // Native engine unusable → transparently switch to server transcription.
          const dying = engineRef.current;
          engineRef.current = null;
          try {
            await dying?.stop();
          } catch {
            /* noop */
          }
          setInterim("");
          await startRecorder();
        },
      });
      engineRef.current = live;
      await live.start();
      return;
    }
    await startRecorder();
  }, [emitFinal, silenceMs, startRecorder]);


  const stop = useCallback(async () => {
    const engine = engineRef.current;
    engineRef.current = null;
    setListening(false);
    setStatus("idle");
    setInterim("");
    setLevel(0);
    if (engine) await engine.stop();
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
    setInterim("");
    setLevel(0);
  }, []);

  const resume = useCallback((delayMs = 0) => {
    engineRef.current?.resume(delayMs);
  }, []);

  const finalizeNow = useCallback(() => {
    engineRef.current?.finalize?.();
  }, []);

  useEffect(() => {
    return () => {
      void engineRef.current?.stop();
      engineRef.current = null;
    };
  }, []);

  return { listening, status, level, interim, start, stop, pause, resume, finalizeNow };
}
