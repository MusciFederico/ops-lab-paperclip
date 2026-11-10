#!/usr/bin/env node
// Idempotent seed: creates the "Ops Lab" company, 2 agent roles, 3 tasks (one with human approval).
// Usage: node scripts/seed.mjs            (API defaults to http://127.0.0.1:3100/api)
import { fileURLToPath } from "node:url";
import path from "node:path";

const API = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3100/api";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HUMAN = process.env.PAPERCLIP_HUMAN_USER_ID ?? "local-board"; // local_trusted mode board user

async function call(method, p, body) {
  const res = await fetch(`${API}${p}`, {
    method, headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status} ${text}`);
  return data;
}
const list = (x) => (Array.isArray(x) ? x : x?.items ?? x?.issues ?? x?.agents ?? []);

// 1. Company
const COMPANY = process.env.COMPANY_NAME ?? "Ops Lab";
let company = (await call("GET", "/companies")).find((c) => c.name === COMPANY);
company ??= await call("POST", "/companies", {
  name: COMPANY,
  description: "Growth-experiments ops company for a medical devices retailer. Agents draft; humans approve.",
});
console.log("company:", company.id, company.issuePrefix);

// 2. Roles (two agents, both `process` adapter: a script wakes on heartbeat and does the job)
const agents = list(await call("GET", `/companies/${company.id}/agents`));
async function ensureAgent(name, role, title, capabilities, script, reportsTo) {
  let a = agents.find((x) => x.name === name);
  if (a) return a;
  a = await call("POST", `/companies/${company.id}/agents`, {
    name, role, title, capabilities, reportsTo,
    adapterType: "process",
    adapterConfig: { command: process.execPath, args: [path.join(ROOT, "agent", script)], cwd: ROOT, timeoutSec: 120 },
    runtimeConfig: { heartbeat: { enabled: true, intervalSec: 15, maxConcurrentRuns: 1 } },
  });
  return a;
}
const operator = await ensureAgent("Operator", "general", "Growth Operator",
  "Drafts channel handoffs (Instagram, WhatsApp, Grok Bot) as dry-run payloads", "operator.mjs");
const reviewer = await ensureAgent("Reviewer", "general", "Compliance Reviewer",
  "Checks handoffs for forbidden medical claims, opt-out lines and channel rules", "reviewer.mjs", operator.id);
console.log("agents:", operator.id, reviewer.id);

// 3. Tasks
const existing = list(await call("GET", `/companies/${company.id}/issues`));
async function ensureTask(title, description, executionPolicy) {
  if (existing.find((i) => i.title === title)) return;
  const issue = await call("POST", `/companies/${company.id}/issues`, {
    title, description, status: "todo", priority: "medium",
    assigneeAgentId: operator.id,
  });
  // NOTE: POST /issues ignores executionPolicy; it only sticks when set with PATCH.
  await call("PATCH", `/issues/${issue.id}`, { executionPolicy });
  console.log("task:", issue.identifier, title);
}
const agentReview = { type: "review", participants: [{ type: "agent", agentId: reviewer.id }] };
const humanApproval = { type: "approval", participants: [{ type: "user", userId: HUMAN }] };

await ensureTask(
  "Instagram draft: tensiómetro digital",
  "Channel: instagram\nProduct: Tensiómetro digital de brazo\nAngle: Medí, anotá y llevá tus resultados a la consulta.\nFormat: carousel 1080x1350, 3 slides",
  { mode: "normal", commentRequired: true, stages: [agentReview] },
);
await ensureTask(
  "WhatsApp template: novedades de producto (needs human approval)",
  "Channel: whatsapp\nProduct: Tensiómetro digital de brazo\nTemplate name: novedades_producto\nAngle: Ya está disponible con envío a todo el país.",
  { mode: "normal", commentRequired: true, stages: [agentReview, humanApproval] },
);
await ensureTask(
  "Grok Bot handoff brief: awareness post",
  "Channel: grok-bot\nProduct: Tensiómetro digital de brazo\nGoal: awareness\nAudience: adultos 35-65 que controlan su salud en casa",
  { mode: "normal", commentRequired: true, stages: [agentReview] },
);

console.log("\nDone. Open http://127.0.0.1:3100 and select the Ops Lab company.");
