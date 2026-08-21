import { motion } from "framer-motion";

export default function Sidebar({ projects, activeId, onSelect, onNew }) {
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
          <motion.button
            key={p.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            onClick={() => onSelect(p.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
              activeId === p.id
                ? "bg-blood/15 text-ink border border-blood/40"
                : "text-smoke hover:text-ink hover:bg-panel"
            }`}
          >
            {p.name}
          </motion.button>
        ))}
        {projects.length === 0 && (
          <p className="text-smoke text-sm px-3 py-2">No projects yet.</p>
        )}
      </nav>
    </aside>
  );
}
