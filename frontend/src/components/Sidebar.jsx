import { motion } from "framer-motion";

export default function Sidebar({ projects, activeId, onSelect, onNew, onDelete, credits }) {
  return (
    <aside className="w-64 shrink-0 border-r border-line bg-panel/60 flex flex-col h-full">
      <div className="p-4 border-b border-line">
        <h1 className="font-display text-lg text-ink tracking-tight">APPFORGE</h1>
      </div>

      <button
        onClick={onNew}
        className="mx-4 mt-4 border border-line hover:border-blood text-ink rounded-lg py-2 text-sm transition-colors"
      >
        + New project
      </button>

      <nav className="flex-1 overflow-y-auto mt-4 px-2 space-y-1">
        {projects.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            className={`flex items-center gap-1 rounded-lg transition-colors ${
              activeId === p.id
                ? "bg-blood/15 border border-blood/40"
                : "hover:bg-panel"
            }`}
          >
            <button
              onClick={() => onSelect(p.id)}
              className={`flex-1 text-left px-3 py-2 text-sm truncate ${
                activeId === p.id ? "text-ink" : "text-smoke hover:text-ink"
              }`}
            >
              {p.name}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete "${p.name}"? This can't be undone.`)) {
                  onDelete(p.id);
                }
              }}
              className="px-2 text-smoke hover:text-blood transition-colors text-xs"
              title="Delete project"
            >
              ✕
            </button>
          </motion.div>
        ))}
        {projects.length === 0 && (
          <p className="text-smoke text-sm px-3 py-2">No projects yet.</p>
        )}
      </nav>

      {credits !== null && (
        <div className="p-4 border-t border-line">
          <div className="flex items-center justify-between bg-void/40 border border-line rounded-lg px-3 py-2">
            <span className="text-xs text-smoke tracking-wide">CREDITS</span>
            <span className="text-sm font-mono text-blood font-medium">{credits}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
