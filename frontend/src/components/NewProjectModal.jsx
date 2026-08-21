import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NewProjectModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), prompt.trim());
    setName("");
    setPrompt("");
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-void/80 z-40 flex items-center justify-center px-6"
        onClick={onClose}
      >
        <motion.form
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-panel border border-line rounded-xl p-5 space-y-4"
        >
          <h2 className="font-display text-lg text-ink tracking-tight">NEW PROJECT</h2>

          <div className="space-y-1">
            <label className="text-xs text-smoke">Project name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Todo List App"
              className="w-full bg-void border border-line rounded-lg px-3 py-2 text-ink text-sm placeholder:text-smoke/60 focus:border-blood outline-none transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-smoke">Describe it in one line</label>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A todo list app with user login"
              className="w-full bg-void border border-line rounded-lg px-3 py-2 text-ink text-sm placeholder:text-smoke/60 focus:border-blood outline-none transition-colors"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-line text-smoke hover:text-ink rounded-lg py-2 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 bg-blood hover:bg-blood-dim disabled:opacity-40 disabled:cursor-not-allowed text-ink rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Create
            </button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
}
