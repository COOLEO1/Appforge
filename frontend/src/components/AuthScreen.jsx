import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-void px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <h1 className="font-display text-3xl text-ink mb-2 tracking-tight">
          APPFORGE
        </h1>
        <p className="text-smoke text-sm mb-8">
          Describe it. Watch it get built.
        </p>

        {sent ? (
          <div className="border border-line rounded-lg p-4 bg-panel">
            <p className="text-ink text-sm">
              Check <span className="text-blood">{email}</span> for a sign-in link.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-panel border border-line rounded-lg px-4 py-3 text-ink placeholder:text-smoke/60 focus:border-blood outline-none transition-colors"
            />
            <button
              type="submit"
              className="w-full bg-blood hover:bg-blood-dim transition-colors rounded-lg py-3 text-ink font-medium"
            >
              Send sign-in link
            </button>
            {error && <p className="text-blood text-sm">{error}</p>}
          </form>
        )}
      </motion.div>
    </div>
  );
}
