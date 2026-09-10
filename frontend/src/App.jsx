import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "./lib/supabase";
import { api } from "./lib/api";
import AuthScreen from "./components/AuthScreen";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import FileTree from "./components/FileTree";
import NewProjectModal from "./components/NewProjectModal";
import EnvVarsModal from "./components/EnvVarsModal";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [credits, setCredits] = useState(null);
  const [repoUrl, setRepoUrl] = useState(null);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState(null);
  const [showEnvVarsModal, setShowEnvVarsModal] = useState(false);

  const refreshCredits = useCallback(() => {
    api.getCredits().then((r) => setCredits(r.remaining)).catch(console.error);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      api.listProjects().then(setProjects).catch(console.error);
      refreshCredits();
    }
  }, [session, refreshCredits]);

  const activeProject = projects.find((p) => p.id === activeId);

  const handleNewProject = useCallback(async (name, prompt) => {
    try {
      const project = await api.createProject(name, prompt);
      setProjects((prev) => [project, ...prev]);
      setActiveId(project.id);
      setMessages(prompt ? [{ role: "user", content: prompt }] : []);
      setFiles([]);
      setRepoUrl(null);
      setDeployResult(null);
      setShowNewProject(false);
    } catch (err) {
      window.alert(`Couldn't create project: ${err.message}`);
    }
  }, []);

  const handleSelect = useCallback(async (id) => {
    setActiveId(id);
    setMessages([]);
    setFiles([]);
    setRepoUrl(null);
    setDeployResult(null);

    try {
      const data = await api.getProjectMessages(id);
      setMessages(
        (data.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
        }))
      );
      setFiles(data.files || []);
    } catch (err) {
      console.error("Couldn't load project history:", err);
    }
  }, []);

  const handleDeleteProject = useCallback(
    async (id, fullCleanup) => {
      const project = projects.find((p) => p.id === id);

      if (fullCleanup && project) {
        if (project.github_repo_url) {
          try {
            await api.deleteGithubRepo(project.github_repo_url);
          } catch (err) {
            console.error("GitHub delete failed:", err);
          }
        }

        if (project.deployed_backend_url) {
          try {
            await api.deleteRenderService(project.deployed_backend_url);
          } catch (err) {
            console.error("Render backend delete failed:", err);
          }
        }

        if (project.deployed_frontend_url) {
          try {
            await api.deleteRenderService(project.deployed_frontend_url);
          } catch (err) {
            console.error("Render frontend delete failed:", err);
          }
        }
      }

      try {
        await api.deleteProject(id);
        setProjects((prev) => prev.filter((p) => p.id !== id));

        if (activeId === id) {
          setActiveId(null);
          setMessages([]);
          setFiles([]);
          setRepoUrl(null);
          setDeployResult(null);
        }
      } catch (err) {
        window.alert(`Couldn't delete project: ${err.message}`);
      }
    },
    [activeId, projects]
  );

  async function handlePushGithub() {
    const repoName = activeProject?.name.replace(/\s+/g, "-").toLowerCase();

    try {
      const res = await api.pushToGithub(
        activeProject.id,
        repoName,
        files
      );

      setRepoUrl(res.repo_url);

      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProject.id
            ? { ...p, github_repo_url: res.repo_url }
            : p
        )
      );

      window.alert(`Pushed: ${res.repo_url}`);
    } catch (err) {
      window.alert(`Push failed: ${err.message}`);
    }
  }

  function detectStack(files) {
    const hasBackendFiles = files.some(
      (f) =>
        f.path.startsWith("backend/") ||
        f.path === "requirements.txt"
    );

    const hasReactFrontend = files.some(
      (f) =>
        f.path.includes("package.json") &&
        (f.path.startsWith("frontend/") || !hasBackendFiles)
    );

    const hasVanillaFrontend = files.some(
      (f) =>
        f.path === "index.html" ||
        f.path === "frontend/index.html"
    );

    let backend_type = "none";
    if (hasBackendFiles) backend_type = "python";

    let frontend_type = "none";
    if (hasReactFrontend) frontend_type = "react";
    else if (hasVanillaFrontend) frontend_type = "static";

    return { backend_type, frontend_type };
  }

  async function runDeploy(customEnvVars = {}) {
    const { backend_type, frontend_type } = detectStack(files);

    setDeploying(true);
    setDeployResult(null);

    try {
      const res = await api.deployProject(
        activeProject.id,
        repoUrl,
        backend_type,
        frontend_type,
        customEnvVars
      );

      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProject.id
            ? {
                ...p,
                deployed_backend_url: res.backend_url,
                deployed_frontend_url: res.frontend_url,
              }
            : p
        )
      );

      setDeployResult(res);
    } catch (err) {
      setDeployResult({
        errors: { general: err.message },
      });
    } finally {
      setDeploying(false);
    }
  }

  function handleDeploy() {
    if (!repoUrl) {
      window.alert("Push to GitHub first, then deploy.");
      return;
    }

    const { backend_type, frontend_type } = detectStack(files);

    if (backend_type === "none" && frontend_type === "none") {
      window.alert("Couldn't detect a deployable stack in these files.");
      return;
    }

    if (activeProject?.required_env_vars?.length > 0) {
      setShowEnvVarsModal(true);
      return;
    }

    runDeploy();
  }

  function handleEnvVarsSubmit(values) {
    setShowEnvVarsModal(false);
    runDeploy(values);
  }

  function handleDownloadZip() {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_API_BASE || "http://localhost:8000"}/export/zip`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            project_name: activeProject.name,
            files,
          }),
        }
      );

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
    return <div className="min-h-screen bg-void" />;
  }

  return (
    <>
      <div className="grain animate-grain" />

      <AnimatePresence mode="wait">
        {!session ? (
          <motion.div
            key="auth"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
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
              onNew={() => setShowNewProject(true)}
              onDelete={handleDeleteProject}
              credits={credits}
            />

            {activeProject ? (
              <ChatPanel
                project={activeProject}
                messages={messages}
                setMessages={setMessages}
                files={files}
                onFilesReady={setFiles}
                onCreditsChange={refreshCredits}
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
                  onFilesChange={setFiles}
                  onDeploy={handleDeploy}
                  deploying={deploying}
                  deployResult={deployResult}
                />
              )}
            </AnimatePresence>

            <NewProjectModal
              open={showNewProject}
              onClose={() => setShowNewProject(false)}
              onCreate={handleNewProject}
            />

            <EnvVarsModal
              open={showEnvVarsModal}
              requiredVars={activeProject?.required_env_vars || []}
              onClose={() => setShowEnvVarsModal(false)}
              onSubmit={handleEnvVarsSubmit}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
