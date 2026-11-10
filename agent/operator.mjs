#!/usr/bin/env node
// Operator agent (Paperclip `process` adapter). One heartbeat = one task.
// Reads the task brief, builds the DRY-RUN handoff payload for the target channel,
// leaves it in the task history as a comment, writes a local copy, and marks the task done.
// If the task has an execution policy, the runtime intercepts "done" and routes it to review.
import { mkdir, writeFile } from "node:fs/promises";
import { api, claimNextTask, parseBrief, log } from "./lib.mjs";
import { BUILDERS } from "../handoff/builders.mjs";

const task = await claimNextTask(["todo", "in_progress", "in_review"]);
if (!task) { log("operator: inbox empty"); process.exit(0); }

const brief = parseBrief(task.description);
const channel = (brief.channel ?? "").toLowerCase();
const build = BUILDERS[channel];
if (!build) {
  await api("PATCH", `/issues/${task.id}`, {
    status: "blocked",
    comment: `Operator: unknown or missing \`Channel:\` in the brief (got "${channel}"). Expected one of ${Object.keys(BUILDERS).join(", ")}.`,
  });
  process.exit(0);
}

// Rework loop: if a reviewer asked for changes, count the revision and re-sanitize.
const state = task.executionState ?? {};
const revision = state.status === "changes_requested" ? 1 : 0;
const payload = build(brief, { revision });

// Local copy is a convenience (used by the web dashboard export); the task comment is the source of truth.
try {
  await mkdir(new URL("../handoff/out/", import.meta.url), { recursive: true });
  const file = new URL(`../handoff/out/${task.identifier ?? task.id}.json`, import.meta.url);
  await writeFile(file, JSON.stringify({ task: task.identifier, title: task.title, payload }, null, 2));
} catch (e) {
  log(`operator: could not write local copy (${e.code ?? e.message}); continuing`);
}

const note = revision
  ? "Revision after reviewer feedback: flagged claims were removed."
  : "First draft.";
await api("PATCH", `/issues/${task.id}`, {
  status: "done",
  comment:
    `**Operator handoff (DRY RUN, nothing was sent)** — channel: \`${channel}\`. ${note}\n\n` +
    "```json\n" + JSON.stringify(payload, null, 2) + "\n```\n\n" +
    "Next: reviewer checks compliance; a human approves before this is marked done.",
});
log(`operator: ${task.identifier} handoff ready (${channel}, revision ${revision})`);
