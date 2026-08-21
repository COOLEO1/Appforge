import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "./lib/supabase";
import { api } from "./lib/api";
import AuthScreen from "./components/AuthScreen";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import FileTree from "./components/FileTree";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) api.listProjects().then(setProjects).catch(console.error);
  }, [session]);

  const activeProject = projects.find((p) => p.id === activeId);

  const handleNewProject = useCallback(async () => {
    const name = window.prompt("Name this project:");
    if (!name) return;
    const prompt = window.prompt("Describe the app in one line:") || "";
    const project = await api.createProject(name, prompt);
    setProjects((prev) => [project, ...prev]);
    setActiveId(project.id);
    setMessages(prompt ? [{ role: "user", content: prompt }] : []);
    setFiles([]);
  }, []);

  const handleSelect = useCallback((id) => {
    setActiveId(id);
    setMessages([]);
    setFiles([]);
    // In a fuller build, fetch persisted messages/files for this project here.
  }, []);

  async function handlePushGithub() {
    const repoName = window.prompt("Repo name:", activeProject?.name.replace(/\s+/g, "-").toLowerCase());
    if (!repoName) return;
    try {
      const res = await api.pushToGithub(activeProject.id, repoName, files);
      window.alert(`Pushed: ${res.repo_url}`);
    } catch (err) {
      window.alert(`Push failed: ${err.message}`);
    }
  }

  function handleDownloadZip() {
    // Simplest path: POST to /export/zip and trigger a browser download.
    // Left as a direct fetch here since it returns a binary stream, not JSON.
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_API_BASE || "http://localhost:8000"}/export/zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ project_name: activeProject.name, files }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeProject.name}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    })();
  }

  if (session === undefined) {
    return <div className="min-h-screen bg-void" />; // avoid flash before we know auth state
  }

  return (
    <>
      <div className="grain animate-grain" />
      <AnimatePresence mode="wait">
        {!session ? (
          <motion.div key="auth" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <AuthScreen />
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex h-screen bg-void overflow-hidden"
          >
            <Sidebar
              projects={projects}
              activeId={activeId}
              onSelect={handleSelect}
              onNew={handleNewProject}
            />

            {activeProject ? (
              <ChatPanel
                project={activeProject}
                messages={messages}
                setMessages={setMessages}
                onFilesReady={setFiles}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-smoke text-sm">
                Select a project, or start a new one.
              </div>
            )}

            <AnimatePresence>
              {files.length > 0 && (
                <FileTree
                  files={files}
                  onPushGithub={handlePushGithub}
                  onDownloadZip={handleDownloadZip}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
