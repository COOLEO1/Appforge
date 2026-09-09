import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FileTree({ files, onPushGithub, onDownloadZip, onFilesChange, onDeploy, deploying, deployResult }) {
  const [activePath, setActivePath] = useState(files[0]?.path || null);
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);

  const activeFile = files.find((f) => f.path === activePath);

  useEffect(() => {
    setDraft(activeFile?.content || "");
    setDirty(false);
  }, [activePath, files.length]);

  if (!files.length) return null;

  function handleSave() {
    const updated = files.map((f) =>
      f.path === activePath ? { ...f, content: draft } : f
    );
    onFilesChange(updated);
    setDirty(false);
  }

  return (
    <motion.aside
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
      className="w-80 shrink-0 border-l border-line bg-panel/60 flex flex-col h-full"
    >
      <div className="p-4 border-b border-line flex items-center justify-between flex-wrap gap-2">
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
            className="text-xs text-ink bg-panel border border-blood/40 hover:bg-blood/15 rounded px-2 py-1 transition-colors"
          >
            Push
          </button>
          <button
            onClick={onDeploy}
            disabled={deploying}
            className="text-xs text-ink bg-blood hover:bg-blood-dim disabled:opacity-50 disabled:cursor-not-allowed rounded px-2 py-1 transition-colors"
          >
            {deploying ? "Deploying…" : "Deploy"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {(deploying || deployResult) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-line px-4 py-3 text-xs space-y-1.5 overflow-hidden"
          >
            {deploying && (
              <p className="text-smoke">Deploying — this can take a few minutes…</p>
            )}
            {deployResult?.backend_url && (
              <p className="text-ink">
                Backend:{" "}
                <a href={deployResult.backend_url} target="_blank" rel="noopener noreferrer" className="text-blood underline break-all">
                  {deployResult.backend_url}
                </a>
              </p>
            )}
            {deployResult?.frontend_url && (
              <p className="text-ink">
                Frontend:{" "}
                <a href={deployResult.frontend_url} target="_blank" rel="noopener noreferrer" className="text-blood underline break-all">
                  {deployResult.frontend_url}
                </a>
              </p>
            )}
            {deployResult?.errors && Object.entries(deployResult.errors).map(([key, msg]) => (
              <p key={key} className="text-red-400">
                {key}: {msg}
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

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
          <motion.div
            key={activeFile.path}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setDirty(true);
              }}
              spellCheck={false}
              className="flex-1 w-full resize-none bg-void/40 p-4 text-xs font-mono text-ink outline-none"
            />
            <div className="p-2 border-t border-line">
              <button
                onClick={handleSave}
                disabled={!dirty}
                className="w-full text-xs bg-blood hover:bg-blood-dim disabled:opacity-30 disabled:cursor-not-allowed text-ink rounded py-1.5 transition-colors"
              >
                {dirty ? "Save changes" : "Saved"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
