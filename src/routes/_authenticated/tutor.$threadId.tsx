import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getScenario } from "@/lib/scenarios";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Bot,
  Send,
  Mic,
  Sparkles,
  Loader2,
  Copy,
  User,
  Headphones,
} from "lucide-react";

import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tutor/$threadId")({
  head: () => ({
    meta: [{ title: "AI Tutor — Fluenta" }, { name: "robots", content: "noindex" }],
  }),
  component: TutorChat,
});

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
}

function TutorChat() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const voiceModeRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);


  const { data: thread } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_threads")
        .select("id,title,scenario")
        .eq("id", threadId)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id,role,content,created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (!cancelled) setMessages((data ?? []) as Message[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  const stopListening = () => {
    shouldListenRef.current = false;
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  };

  const speak = (text: string, onDone?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onDone?.();
      return;
    }
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_`#>~]/g, "").replace(/\[(.*?)\]\((.*?)\)/g, "$1");
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "en-US";
    u.rate = 1;
    u.onend = () => onDone?.();
    u.onerror = () => onDone?.();
    window.speechSynthesis.speak(u);
  };

  const send = async (textOverride?: string, opts?: { speakReply?: boolean }) => {
    const text = (textOverride ?? input).trim();
    if (!text || streaming) return;
    setInput("");
    setStreaming(true);
    const speakReply = opts?.speakReply ?? voiceModeRef.current;

    const scenario = getScenario(thread?.scenario ?? "free_chat");
    const historyPayload = [...messages, { role: "user" as const, content: text }].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userMsgId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      { id: userMsgId, role: "user", content: text },
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          threadId,
          scenario: scenario.id,
          messages: historyPayload,
        }),
      });
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        if (res.status === 429) toast.error("Rate limit — please slow down.");
        else if (res.status === 402) toast.error("AI credits exhausted. Please top up in workspace settings.");
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
            /* ignore parse errors on keepalive */
          }
        }
      }

      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await supabase.from("chat_messages").insert([
          { thread_id: threadId, user_id: user.user.id, role: "user", content: text },
          { thread_id: threadId, user_id: user.user.id, role: "assistant", content: acc },
        ]);
        if (messages.length === 0) {
          const shortTitle = text.slice(0, 60);
          await supabase.from("chat_threads").update({ title: shortTitle, updated_at: new Date().toISOString() }).eq("id", threadId);
        } else {
          await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
        }
        qc.invalidateQueries({ queryKey: ["threads"] });
        qc.invalidateQueries({ queryKey: ["recent_threads"] });
      }

      if (speakReply && acc) {
        speak(acc, () => {
          if (voiceModeRef.current) startListening();
        });
      }
    } catch (err) {
      toast.error("Something went wrong");
      console.error(err);
    } finally {
      setStreaming(false);
    }
  };

  const startListening = () => {
    const SR =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
    if (!SR) {
      toast.error("Voice input not supported in this browser");
      return;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* noop */
      }
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    let finalText = "";

    const scheduleAutoSend = () => {
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = window.setTimeout(() => {
        const toSend = finalText.trim();
        if (!toSend) return;
        finalText = "";
        setInput("");
        try {
          rec.stop();
        } catch {
          /* noop */
        }
        send(toSend, { speakReply: voiceModeRef.current });
      }, 1400);
    };

    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interim += t;
      }
      setInput((finalText + interim).trim());
      if (voiceModeRef.current) scheduleAutoSend();
    };
    rec.onend = () => {
      if (shouldListenRef.current && !streaming) {
        try {
          rec.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };
    rec.onerror = (e: any) => {
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        toast.error("Microphone blocked. Enable it in your browser settings.");
        shouldListenRef.current = false;
        setListening(false);
      }
    };
    shouldListenRef.current = true;
    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch {
      /* already started */
    }
  };

  const toggleMic = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleVoiceMode = () => {
    const next = !voiceMode;
    voiceModeRef.current = next;
    setVoiceMode(next);
    if (next) {
      startListening();
      toast.success("Voice conversation on — speak and I'll reply out loud.");
    } else {
      stopListening();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    }
  };


  const scenario = getScenario(thread?.scenario ?? "free_chat");

  return (
    <div className="flex h-[100dvh] flex-col lg:h-screen">
      <header className="flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl sm:px-6">
        <button
          onClick={() => navigate({ to: "/tutor" })}
          className="grid h-10 w-10 place-items-center rounded-xl bg-muted transition hover:bg-accent"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-primary text-white shadow-glow">
          <Bot className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{thread?.title ?? "AI Tutor"}</div>
          <div className="text-xs text-muted-foreground">
            {scenario.emoji} {scenario.title}
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 && (
            <div className="rounded-3xl glass p-8 text-center shadow-soft">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-white shadow-glow">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="mt-4 font-display text-xl font-bold">{scenario.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{scenario.description}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {["Hi! Let's start.", "Can we practice speaking?", "Correct my grammar please."].map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} msg={m} onSpeak={() => speak(m.content)} />
          ))}

          {streaming && messages[messages.length - 1]?.content === "" && (
            <div className="flex items-center gap-2 pl-12 text-sm text-muted-foreground">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
              Thinking...
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border/60 bg-background/80 px-4 py-4 backdrop-blur-xl sm:px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
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
            aria-label="Toggle voice input"
          >
            <Mic className="h-5 w-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Type in English or press mic to speak…"
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
          isUser ? "bg-secondary text-secondary-foreground" : "bg-gradient-primary text-white shadow-glow"
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
            <div className="prose prose-sm max-w-none [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_ul]:my-2 [&_ol]:my-2">
              <ReactMarkdown>{msg.content || "…"}</ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && msg.content && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <button
              onClick={onSpeak}
              className="rounded-full px-2 py-1 transition hover:bg-muted"
              aria-label="Listen"
            >
              🔊 Listen
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(msg.content);
                toast.success("Copied");
              }}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-muted"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
