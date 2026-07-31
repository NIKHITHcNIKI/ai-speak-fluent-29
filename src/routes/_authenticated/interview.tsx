import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder, type VoiceRecorderStatus } from "@/lib/voice-recorder";
import ReactMarkdown from "react-markdown";
import { VoiceWave } from "@/components/voice-wave";

import {
  Bot,
  Send,
  Mic,
  Loader2,
  User,
  Headphones,
  Upload,
  FileText,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/interview")({
  head: () => ({
    meta: [
      { title: "Resume Interview — Fluenta" },
      {
        name: "description",
        content:
          "Upload your resume and practice a live AI interview with voice or text. The AI asks resume-based questions, evaluates your answers, and gives instant feedback.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InterviewChat,
});

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function InterviewChat() {
  const [resumeText, setResumeText] = useState<string>("");
  const [resumeName, setResumeName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceRecorderStatus>("idle");
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const recorderRef = useRef<VoiceRecorder | null>(null);
  const voiceModeRef = useRef(false);
  const streamingRef = useRef(false);
  const aiSpeakingRef = useRef(false);
  const transcribingRef = useRef(false);
  const resumeRef = useRef("");

  useEffect(() => {
    resumeRef.current = resumeText;
  }, [resumeText]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    return () => {
      voiceModeRef.current = false;
      void recorderRef.current?.stop();
      recorderRef.current = null;
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onDone?.();
      return;
    }
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_`#>~]/g, "").replace(/\[(.*?)\]\((.*?)\)/g, "$1");
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "en-US";
    u.rate = 1;
    aiSpeakingRef.current = true;
    setAiSpeaking(true);
    // Mute the mic entirely while AI is speaking so its own voice can't be
    // captured and re-transcribed as a user utterance.
    recorderRef.current?.pause();
    const finish = () => {
      aiSpeakingRef.current = false;
      setAiSpeaking(false);
      // Small delay so the tail of TTS audio doesn't bleed into the mic.
      window.setTimeout(() => {
        if (voiceModeRef.current) recorderRef.current?.resume();
      }, 350);
      onDone?.();
    };
    u.onend = finish;
    u.onerror = finish;
    window.speechSynthesis.speak(u);
  }, []);

  const uploadResume = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        toast.error(t || "Failed to parse resume");
        return;
      }
      const data = (await res.json()) as { text: string };
      setResumeText(data.text);
      setResumeName(file.name);
      toast.success("Resume ready — starting interview…");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const send = useCallback(
    async (textOverride?: string, opts?: { speakReply?: boolean }) => {
      const text = (textOverride ?? input).trim();
      const resume = resumeRef.current;
      if (!resume || streamingRef.current) return;
      const isStart = !text && messages.length === 0;
      if (!text && !isStart) return;

      setInput("");
      setStreaming(true);
      streamingRef.current = true;
      const speakReply = opts?.speakReply ?? voiceModeRef.current;
      recorderRef.current?.pause();

      const historyPayload = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        ...(text ? [{ role: "user" as const, content: text }] : []),
      ];

      const userMsgId = crypto.randomUUID();
      const assistantId = crypto.randomUUID();
      setMessages((m) => [
        ...m,
        ...(text ? [{ id: userMsgId, role: "user" as const, content: text }] : []),
        { id: assistantId, role: "assistant" as const, content: "" },
      ]);

      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        const res = await fetch("/api/interview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            resume,
            messages: historyPayload.length
              ? historyPayload
              : [{ role: "user", content: "Please begin the interview." }],
          }),
        });
        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "");
          if (res.status === 429) toast.error("Rate limit — please slow down.");
          else if (res.status === 402) toast.error("AI credits exhausted.");
          else toast.error(errText || "AI request failed");
          setMessages((m) => m.filter((x) => x.id !== assistantId && x.id !== userMsgId));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                acc += delta;
                setMessages((m) =>
                  m.map((x) => (x.id === assistantId ? { ...x, content: acc } : x)),
                );
              }
            } catch {
              /* ignore */
            }
          }
        }
        if (speakReply && acc) {
          speak(acc, () => {
            if (voiceModeRef.current) recorderRef.current?.resume();
          });
        } else if (voiceModeRef.current) {
          recorderRef.current?.resume();
        }
      } catch (err) {
        console.error(err);
        toast.error("Something went wrong");
        if (voiceModeRef.current) recorderRef.current?.resume();
      } finally {
        setStreaming(false);
        streamingRef.current = false;
      }
    },
    [input, messages, speak],
  );

  // auto-start once resume is loaded
  useEffect(() => {
    if (resumeText && messages.length === 0 && !streamingRef.current) {
      void send("", { speakReply: voiceModeRef.current });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeText]);

  const transcribeBlob = useCallback(async (wav: Blob): Promise<string> => {
    if (transcribingRef.current) return "";
    transcribingRef.current = true;
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
    } finally {
      transcribingRef.current = false;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (recorderRef.current) return;
    const rec = new VoiceRecorder({
      silenceMs: 6500,
      voiceThreshold: 0.011,
      minUtteranceMs: 400,
      maxUtteranceMs: 300000,
      onStatus: (s) => setVoiceStatus(s),
      onLevel: (l) => setMicLevel(l),
      onError: (e) => toast.error(e.message),
      onBargeIn: () => {
        // User started talking while the AI was speaking → stop the AI and listen.
        if (typeof window !== "undefined") window.speechSynthesis?.cancel();
        if (aiSpeakingRef.current) {
          aiSpeakingRef.current = false;
          setAiSpeaking(false);
          recorderRef.current?.resume();
        }
      },
      onUtterance: async (wav) => {
        if (aiSpeakingRef.current || streamingRef.current) {
          setVoiceStatus("listening");
          return;
        }
        const text = await transcribeBlob(wav);
        if (!text) {
          setVoiceStatus("listening");
          return;
        }
        const junk = /^(you|thanks for watching|thank you\.?|\.)$/i;
        if (junk.test(text)) {
          setVoiceStatus("listening");
          return;
        }
        if (voiceModeRef.current) {
          void send(text, { speakReply: true });
        } else {
          setInput((prev) => (prev ? prev + " " + text : text));
          setVoiceStatus("listening");
        }
      },
    });
    recorderRef.current = rec;
    setListening(true);
    await rec.start();
  }, [send, transcribeBlob]);

  const stopListening = useCallback(async () => {
    const rec = recorderRef.current;
    recorderRef.current = null;
    setListening(false);
    setVoiceStatus("idle");
    if (rec) await rec.stop();
  }, []);

  const toggleMic = useCallback(() => {
    if (listening) void stopListening();
    else void startListening();
  }, [listening, startListening, stopListening]);

  const toggleVoiceMode = useCallback(() => {
    const next = !voiceMode;
    voiceModeRef.current = next;
    setVoiceMode(next);
    if (next) {
      void startListening();
      toast.success("Voice interview on — speak your answers.");
    } else {
      void stopListening();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      aiSpeakingRef.current = false;
      setAiSpeaking(false);
    }
  }, [voiceMode, startListening, stopListening]);

  const resetInterview = useCallback(() => {
    setMessages([]);
    setResumeText("");
    setResumeName("");
    setInput("");
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  const statusLabel = aiSpeaking
    ? "AI asking…"
    : streaming
    ? "Thinking…"
    : voiceStatus === "speaking"
    ? "Listening…"
    : voiceStatus === "processing"
    ? "Transcribing…"
    : listening
    ? "Ready to speak"
    : "";

  if (!resumeText) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-10 lg:min-h-screen">
        <div className="w-full max-w-xl rounded-3xl glass p-8 text-center shadow-soft">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-white shadow-glow">
            <FileText className="h-8 w-8" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Resume Interview</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload your resume (PDF, DOC, or TXT). The AI will ask questions based on your skills
            and experience, evaluate each answer, and give feedback before the next question. Talk
            with voice or type — your call.
          </p>
          <label
            className={`mt-6 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 ${
              uploading ? "pointer-events-none opacity-70" : ""
            }`}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? "Analyzing resume…" : "Upload resume"}
            <input
              type="file"
              accept=".pdf,.txt,.md,.doc,.docx,application/pdf,text/plain"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadResume(f);
              }}
            />
          </label>
          <p className="mt-3 text-xs text-muted-foreground">Max 10 MB. Nothing is stored.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col lg:h-screen">
      <header className="flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl sm:px-6">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-primary text-white shadow-glow">
          <Bot className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">Resume Interview</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">📄 {resumeName}</span>
            {statusLabel && (
              <span className="inline-flex items-center gap-1.5 text-primary">
                <VoiceWave level={micLevel} active={listening && !aiSpeaking} />
                {statusLabel}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={toggleVoiceMode}
          className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition ${
            voiceMode ? "bg-gradient-primary text-white shadow-glow" : "bg-muted hover:bg-accent"
          }`}
          aria-pressed={voiceMode}
          title="Voice interview: mic stays on and AI speaks"
        >
          <Headphones className="h-4 w-4" />
          <span className="hidden sm:inline">{voiceMode ? "Voice on" : "Voice"}</span>
        </button>
        <button
          onClick={resetInterview}
          className="grid h-10 w-10 place-items-center rounded-xl bg-muted transition hover:bg-accent"
          aria-label="New interview"
          title="Start over with a new resume"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((m) => (
            <MessageBubble key={m.id} msg={m} onSpeak={() => speak(m.content)} />
          ))}
          {streaming && messages[messages.length - 1]?.content === "" && (
            <div className="flex items-center gap-2 pl-12 text-sm text-muted-foreground">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
              Preparing question…
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border/60 bg-background/80 px-4 py-4 backdrop-blur-xl sm:px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl glass p-2 shadow-glass"
        >
          <button
            type="button"
            onClick={toggleMic}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition ${
              listening
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "bg-muted hover:bg-accent"
            }`}
            aria-label="Toggle mic"
          >
            <Mic className="h-5 w-5" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="Type your answer or press mic to speak…"
            className="min-h-11 max-h-40 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-white shadow-glow transition hover:brightness-110 disabled:opacity-50"
            aria-label="Send"
          >
            {streaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ msg, onSpeak }: { msg: Message; onSpeak: () => void }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""} animate-fade-up`}>
      <div
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${
          isUser
            ? "bg-secondary text-secondary-foreground"
            : "bg-gradient-primary text-white shadow-glow"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`min-w-0 max-w-[85%] ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block rounded-3xl px-4 py-3 text-sm ${
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "glass rounded-tl-md text-foreground"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
              <ReactMarkdown>{msg.content || "…"}</ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && msg.content && (
          <div className="mt-1">
            <button
              onClick={onSpeak}
              className="rounded-full px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted"
            >
              🔊 Listen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
