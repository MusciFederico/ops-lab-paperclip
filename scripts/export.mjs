#!/usr/bin/env node
// Exports the Ops Lab task history (statuses + comment threads + handoff payloads) to
// web/data/handoffs.json so the static dashboard in /web can render it on Vercel.
import { writeFile, mkdir } from "node:fs/promises";

const API = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3100/api";
const get = async (p) => {
  const r = await fetch(`${API}${p}`);
  if (!r.ok) throw new Error(`GET ${p} -> ${r.status}`);
  return r.json();
};
const list = (x) => (Array.isArray(x) ? x : x?.items ?? x?.issues ?? x?.comments ?? []);

const company = (await get("/companies")).find((c) => c.name === "Ops Lab");
if (!company) throw new Error('Company "Ops Lab" not found. Run scripts/seed.mjs first.');
const agents = Object.fromEntries(list(await get(`/companies/${company.id}/agents`)).map((a) => [a.id, a.name]));

const issues = list(await get(`/companies/${company.id}/issues`)).sort((a, b) => (a.identifier > b.identifier ? 1 : -1));
const out = [];
for (const i of issues) {
  const detail = await get(`/issues/${i.id}`);
  const comments = list(await get(`/issues/${i.id}/comments`)).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  const thread = comments.map((c) => ({
    at: c.createdAt,
    author: c.authorAgentId ? agents[c.authorAgentId] ?? "agent" : c.authorUserId ?? "system",
    body: c.body,
  }));
  const payloadComment = [...thread].reverse().find((c) => /```json/.test(c.body));
  const m = payloadComment?.body.match(/```json\n([\s\S]*?)```/);
  out.push({
    identifier: i.identifier,
    title: i.title,
    status: i.status,
    awaitingHuman: i.assigneeUserId ?? null,
    reviewStages: (detail.executionPolicy?.stages ?? i.executionPolicy?.stages ?? []).map((s) => s.type),
    payload: m ? JSON.parse(m[1]) : null,
    thread,
  });
}

await mkdir(new URL("../web/data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../web/data/handoffs.json", import.meta.url),
  JSON.stringify({ company: company.name, exportedAt: new Date().toISOString(), tasks: out }, null, 2),
);
console.log(`exported ${out.length} tasks -> web/data/handoffs.json`);
