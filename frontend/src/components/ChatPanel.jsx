import { useState, useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import MessageBubble from "./MessageBubble";
import PulseLoader from "./PulseLoader";
import { api } from "../lib/api";

export default function ChatPanel({ project, messages, setMessages, files, onFilesReady, onCreditsChange }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || busy) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setBusy(true);

    try {
      const result = await api.sendMessage(
        project.id,
        userMsg.content,
        files && files.length ? files : null
      );
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      if (result.files?.length) onFilesReady(result.files);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Something broke: ${err.message}` },
      ]);
    } finally {
      setBusy(false);
      onCreditsChange?.();
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      <div className="p-4 border-b border-line flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-base text-ink tracking-tight truncate">
          {project.name}
        </h2>
        <div className="flex gap-2 text-xs">
          {project.github_repo_url && (
            <a
              href={project.github_repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-smoke hover:text-ink border border-line rounded px-2 py-1 transition-colors"
            >
              Source
            </a>
          )}
          {project.deployed_frontend_url && (
            <a
              href={project.deployed_frontend_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink bg-blood hover:bg-blood-dim rounded px-2 py-1 transition-colors"
            >
              Live
            </a>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} />
          ))}
        </AnimatePresence>
        {busy && <PulseLoader label={messages.length < 2 ? "Thinking" : "Building"} />}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-line flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the app, or ask for a change…"
          className="flex-1 bg-panel border border-line rounded-lg px-4 py-3 text-ink placeholder:text-smoke/60 focus:border-blood outline-none transition-colors text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="bg-blood hover:bg-blood-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg px-5 text-ink text-sm font-medium"
        >
          Send
        </button>
      </form>
    </div>
  );
}
