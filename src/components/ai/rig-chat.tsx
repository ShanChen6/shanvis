"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Loader2, RotateCcw, Search, Sparkles, Square, XCircle } from "lucide-react";

import type { RigProposal } from "@/lib/ai/rig";
import type { RigAgentUIMessage } from "@/lib/ai/rig-agent";
import { usePrefersReducedMotion } from "@/lib/motion/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { MessageText } from "./message-text";
import { RigCard } from "./rig-card";

const SUGGESTIONS = [
  "Cần combo chụp đường phố nhỏ gọn và quay vlog dưới 40 triệu",
  "Máy full-frame chụp chân dung xóa phông đẹp, ngân sách 70 triệu",
  "I'm a beginner and want a light travel kit under 50 million VND",
  "Ống kính tốt nhất cho Canon RF dưới 10 triệu?",
];

type RigProposalOutput = RigProposal & { problemsForAssistant: string[] };

function ToolStatus({ icon: Icon, children, spin }: { icon: typeof Search; children: React.ReactNode; spin?: boolean }) {
  return (
    <p className="spec-figure flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className={cn("size-3.5", spin && "animate-spin")} />
      {children}
    </p>
  );
}

function AssistantParts({ message }: { message: RigAgentUIMessage }) {
  return (
    <div className="space-y-4">
      {message.parts.map((part, i) => {
        const key = `${message.id}-${i}`;
        switch (part.type) {
          case "text":
            return part.text.trim() ? <MessageText key={key} text={part.text} /> : null;

          case "tool-searchCatalog":
            if (part.state === "output-available") {
              return (
                <ToolStatus key={key} icon={Search}>
                  Checked {part.output.products.length} in-stock product{part.output.products.length === 1 ? "" : "s"}
                </ToolStatus>
              );
            }
            if (part.state === "output-error") {
              return <ToolStatus key={key} icon={XCircle}>Catalog search failed</ToolStatus>;
            }
            return (
              <ToolStatus key={key} icon={Loader2} spin>
                Searching the catalog…
              </ToolStatus>
            );

          case "tool-proposeRig": {
            if (part.state === "output-available") {
              const rig = part.output as RigProposalOutput;
              return rig.valid ? (
                <RigCard key={key} rig={rig} />
              ) : (
                <ToolStatus key={key} icon={XCircle}>
                  Discarded a combination: {rig.problemsForAssistant[0] ?? "did not pass checks"}
                </ToolStatus>
              );
            }
            if (part.state === "output-error") {
              return <ToolStatus key={key} icon={XCircle}>Could not validate a kit</ToolStatus>;
            }
            return (
              <ToolStatus key={key} icon={Loader2} spin>
                Checking mount, stock and budget…
              </ToolStatus>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}

export function RigChat({ configured }: { configured: boolean }) {
  const [input, setInput] = React.useState("");
  const { messages, sendMessage, status, error, stop, regenerate, clearError } = useChat<RigAgentUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/rig-builder" }),
  });
  const busy = status === "submitted" || status === "streaming";
  const endRef = React.useRef<HTMLDivElement>(null);

  const reducedMotion = usePrefersReducedMotion();

  React.useEffect(() => {
    // JS smooth scrolling ignores the CSS reduced-motion override, so check here.
    endRef.current?.scrollIntoView({ block: "end", behavior: reducedMotion ? "auto" : "smooth" });
  }, [messages, status, reducedMotion]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    if (error) clearError();
    sendMessage({ text: trimmed });
    setInput("");
  };

  if (!configured) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong p-8 text-center">
        <Sparkles className="mx-auto size-8 text-primary" />
        <p className="mt-4 font-medium">The AI Rig Builder isn&apos;t switched on yet.</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Add <code className="spec-figure text-foreground">GOOGLE_GENERATIVE_AI_API_KEY</code> to the server environment
          to enable it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {messages.length === 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-2xl border border-border bg-card p-4 text-left text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <ol className="space-y-6" aria-live="polite">
        {messages.map((message) => (
          <li key={message.id} className={cn("flex", message.role === "user" && "justify-end")}>
            {message.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-3 text-sm">
                {message.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
              </div>
            ) : (
              <div className="w-full max-w-2xl text-sm text-muted-foreground">
                <AssistantParts message={message} />
              </div>
            )}
          </li>
        ))}
        {status === "submitted" && (
          <li>
            <ToolStatus icon={Loader2} spin>
              Thinking…
            </ToolStatus>
          </li>
        )}
      </ol>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>Something went wrong. {error.message.length < 160 ? error.message : ""}</span>
          <Button size="sm" variant="outline" onClick={() => regenerate()}>
            <RotateCcw /> Retry
          </Button>
        </div>
      )}

      <div ref={endRef} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-4 flex items-end gap-2 rounded-3xl border border-border-strong bg-card/95 p-2 shadow-2xl backdrop-blur"
      >
        <label htmlFor="rig-input" className="sr-only">
          Describe what you shoot and your budget
        </label>
        <textarea
          id="rig-input"
          rows={1}
          value={input}
          maxLength={2000}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Bạn chụp gì, ngân sách bao nhiêu?"
          className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground [field-sizing:content]"
        />
        {busy ? (
          <Button type="button" size="icon" variant="secondary" onClick={() => stop()} aria-label="Stop">
            <Square className="size-3.5" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
            <ArrowUp />
          </Button>
        )}
      </form>
    </div>
  );
}
