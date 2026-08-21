import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FileTree({ files, onPushGithub, onDownloadZip }) {
  const [activePath, setActivePath] = useState(files[0]?.path || null);
  const activeFile = files.find((f) => f.path === activePath);

  if (!files.length) return null;

  return (
    <motion.aside
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
      className="w-80 shrink-0 border-l border-line bg-panel/60 flex flex-col h-full"
    >
      <div className="p-4 border-b border-line flex items-center justify-between">
        <h2 className="font-display text-sm text-ink tracking-tight">FILES</h2>
        <div className="flex gap-2">
          <button
            onClick={onDownloadZip}
            className="text-xs text-smoke hover:text-ink border border-line rounded px-2 py-1 transition-colors"
          >
            ZIP
          </button>
          <button
            onClick={onPushGithub}
            className="text-xs text-ink bg-blood hover:bg-blood-dim rounded px-2 py-1 transition-colors"
          >
            Push
          </button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-40 border-b border-line">
        {files.map((f) => (
          <button
            key={f.path}
            onClick={() => setActivePath(f.path)}
            className={`w-full text-left px-4 py-2 text-xs font-mono truncate transition-colors ${
              activePath === f.path
                ? "bg-blood/15 text-ink"
                : "text-smoke hover:text-ink"
            }`}
          >
            {f.path}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeFile && (
          <motion.pre
            key={activeFile.path}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-auto p-4 text-xs font-mono text-ink whitespace-pre-wrap"
          >
            {activeFile.content}
          </motion.pre>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
