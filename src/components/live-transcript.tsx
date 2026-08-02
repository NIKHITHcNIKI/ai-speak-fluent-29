import { Mic, Send, Trash2 } from "lucide-react";
import { VoiceWave } from "@/components/voice-wave";

/** Live subtitles while the user speaks + editable transcript before sending. */
export function LiveTranscript({
  interim,
  draft,
  level,
  active,
  onChange,
  onSend,
  onClear,
  onSpeakAgain,
}: {
  interim: string;
  draft: string;
  level: number;
  active: boolean;
  onChange: (v: string) => void;
  onSend: () => void;
  onClear: () => void;
  onSpeakAgain: () => void;
}) {
  if (!interim && !draft) return null;
  const isLive = Boolean(interim);
  return (
    <div className="mx-auto mt-2 max-w-3xl rounded-3xl glass p-3 shadow-glass animate-fade-up">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
        <VoiceWave level={level} active={active} />
        {isLive ? "✍️ Live transcribing…" : "📝 Transcript ready — edit or send"}
      </div>
      {isLive ? (
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {interim}
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-primary align-middle" />
        </p>
      ) : (
        <>
          <textarea
            value={draft}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            rows={2}
            className="mt-2 w-full resize-none rounded-2xl bg-muted/50 px-3 py-2 text-sm outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={onSend}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-white shadow-glow transition hover:brightness-110"
            >
              <Send className="h-3.5 w-3.5" /> Send
            </button>
            <button
              onClick={onSpeakAgain}
              className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5 text-xs font-semibold transition hover:bg-accent"
            >
              <Mic className="h-3.5 w-3.5" /> Speak again
            </button>
            <button
              onClick={onClear}
              className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5 text-xs font-semibold transition hover:bg-accent"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
