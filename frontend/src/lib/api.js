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
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  listProjects: () => request("/projects"),
  createProject: (name, prompt) =>
    request("/projects", { method: "POST", body: JSON.stringify({ name, prompt }) }),
  getProject: (id) => request(`/projects/${id}`),
  deleteProject: (id) => request(`/projects/${id}`, { method: "DELETE" }),
  sendMessage: (project_id, content, current_files = null) =>
    request("/chat", { method: "POST", body: JSON.stringify({ project_id, content, current_files }) }),
  pushToGithub: (project_id, repo_name, files) =>
    request(`/github/push-files?project_id=${project_id}&repo_name=${repo_name}`, {
      method: "POST",
      body: JSON.stringify(files),
    }),
  getCredits: () => request("/credits"),
};
