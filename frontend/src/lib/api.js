import { supabase } from "./supabase";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...(options.headers || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`${res.status}: ${text || "No response from server — it may still be starting up. Try again in a moment."}`);
  }

  if (!text) {
    throw new Error("Empty response from server — it may still be starting up. Try again in a moment.");
  }

  return JSON.parse(text);
}

export const api = {
  listProjects: () => request("/projects"),
  createProject: (name, prompt) =>
    request("/projects", { method: "POST", body: JSON.stringify({ name, prompt }) }),
  getProject: (id) => request(`/projects/${id}`),
  getProjectMessages: (id) => request(`/projects/${id}/messages`),
  deleteProject: (id) => request(`/projects/${id}`, { method: "DELETE" }),
  sendMessage: (project_id, content, current_files = null) =>
    request("/chat", { method: "POST", body: JSON.stringify({ project_id, content, current_files }) }),
  pushToGithub: (project_id, repo_name, files) =>
    request(`/github/push-files?project_id=${project_id}&repo_name=${repo_name}`, {
      method: "POST",
      body: JSON.stringify(files),
    }),
  getCredits: () => request("/credits"),
  deployProject: (project_id, repo_url, backend_type, frontend_type) =>
    request("/deploy", {
      method: "POST",
      body: JSON.stringify({ project_id, repo_url, backend_type, frontend_type }),
    }),
  deleteGithubRepo: (repo_url) =>
    request(`/github/repo?repo_url=${encodeURIComponent(repo_url)}`, { method: "DELETE" }),
  deleteRenderService: (service_url) =>
    request(`/deploy/service?service_url=${encodeURIComponent(service_url)}`, { method: "DELETE" }),
};
