import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function EnvVarsModal({ open, requiredVars, onClose, onSubmit }) {
  const [values, setValues] = useState({});

  if (!open) return null;

  function handleChange(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-void/80 z-50 flex items-center justify-center px-6"
      >
        <motion.form
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-panel border border-line rounded-xl p-5 space-y-4 max-h-[80vh] overflow-y-auto"
        >
          <h2 className="font-display text-lg text-ink tracking-tight">API KEYS NEEDED</h2>
          <p className="text-xs text-smoke">
            This app needs the following keys to work once deployed. They're set securely as environment variables — never stored in the code itself.
          </p>

          {requiredVars.map((v) => (
            <div key={v.key} className="space-y-1">
              <label className="text-xs text-smoke font-mono">{v.key}</label>
              <p className="text-xs text-smoke/70">{v.description}</p>
              <input
                type="password"
                value={values[v.key] || ""}
                onChange={(e) => handleChange(v.key, e.target.value)}
                placeholder="Paste your key here"
                className="w-full bg-void border border-line rounded-lg px-3 py-2 text-ink text-sm placeholder:text-smoke/60 focus:border-blood outline-none transition-colors"
              />
            </div>
          ))}

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
              className="flex-1 bg-blood hover:bg-blood-dim text-ink rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Deploy
            </button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
}
