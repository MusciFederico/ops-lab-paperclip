// Shared helpers for the process-adapter agents.
// Paperclip injects these env vars into every `process` agent run.
export const env = {
  // Paperclip may inject the bare origin; make sure we always talk to the /api prefix.
  api: (() => {
    const raw = (process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3100").replace(/\/+$/, "");
    return raw.endsWith("/api") ? raw : `${raw}/api`;
  })(),
  key: process.env.PAPERCLIP_API_KEY,
  agentId: process.env.PAPERCLIP_AGENT_ID,
  companyId: process.env.PAPERCLIP_COMPANY_ID,
  runId: process.env.PAPERCLIP_RUN_ID,
  taskId: process.env.PAPERCLIP_TASK_ID,
};

export async function api(method, path, body) {
  const headers = { "content-type": "application/json" };
  if (env.key) headers.authorization = `Bearer ${env.key}`;
  if (env.runId) headers["x-paperclip-run-id"] = env.runId;
  const res = await fetch(`${env.api}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status} ${typeof data === "string" ? data : JSON.stringify(data)}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Heartbeat steps 3-5: pick the task that woke us (or the top of the inbox) and check it out.
export async function claimNextTask(statuses) {
  const query = new URLSearchParams({ assigneeAgentId: env.agentId, status: statuses.join(",") });
  const inbox = await api("GET", `/companies/${env.companyId}/issues?${query}`);
  const rows = Array.isArray(inbox) ? inbox : inbox?.issues ?? inbox?.items ?? [];
  let pick = env.taskId ? rows.find((r) => r.id === env.taskId) : undefined;
  pick ??= rows[0];
  if (!pick) return null;
  await api("POST", `/issues/${pick.id}/checkout`, {
    agentId: env.agentId,
    expectedStatuses: ["todo", "backlog", "blocked", "in_review", "in_progress"],
  });
  return api("GET", `/issues/${pick.id}`);
}

// Parse "Key: value" lines out of an issue description (our tiny task-brief convention).
export function parseBrief(description = "") {
  const brief = {};
  for (const line of description.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_ ]+):\s*(.+)$/);
    if (m) brief[m[1].trim().toLowerCase().replace(/\s+/g, "_")] = m[2].trim();
  }
  return brief;
}

// The payload travels between roles inside a comment, as a fenced json block.
export function extractPayload(comments = []) {
  const list = Array.isArray(comments) ? comments : comments?.comments ?? [];
  for (const c of [...list].reverse()) {
    const m = (c.body ?? "").match(/```json\n([\s\S]*?)```/);
    if (m) {
      try { return JSON.parse(m[1]); } catch { /* keep looking */ }
    }
  }
  return null;
}

export const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a);
