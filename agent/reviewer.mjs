#!/usr/bin/env node
// Reviewer agent (Paperclip `process` adapter). Picks up tasks routed to it by the review stage,
// checks the Operator's payload against simple, explicit compliance rules, and decides.
// Per the execution-policy contract: "done" + comment = approve; any other status = changes requested,
// and the decision comment must travel in the same PATCH.
import { api, claimNextTask, extractPayload, log } from "./lib.mjs";
import { BANNED } from "../handoff/builders.mjs";

const task = await claimNextTask(["in_review"]);
if (!task) { log("reviewer: nothing to review"); process.exit(0); }

const comments = await api("GET", `/issues/${task.id}/comments`);
const payload = extractPayload(comments);
const problems = [];

if (!payload) {
  problems.push("No handoff payload found in the task thread.");
} else {
  if (payload.dry_run !== true) problems.push("Payload is not marked dry_run=true.");
  const text = JSON.stringify(payload);
  for (const re of BANNED) if (re.test(text)) problems.push(`Forbidden claim matches ${re}.`);
  if (payload.channel === "whatsapp") {
    if (!/BAJA/.test(payload.template_body_for_approval ?? "")) problems.push("WhatsApp template lacks an opt-out line (BAJA).");
    if (!payload.audience_rule) problems.push("WhatsApp payload lacks an opt-in audience rule.");
  }
  if (payload.channel === "instagram") {
    if ((payload.caption ?? "").length > 2200) problems.push("Instagram caption exceeds 2200 characters.");
    if (!/profesional de la salud/i.test(payload.caption ?? "")) problems.push("Caption lacks the 'consult your healthcare professional' line.");
  }
}

if (problems.length === 0) {
  await api("PATCH", `/issues/${task.id}`, {
    status: "done",
    comment: "**Reviewer: APPROVED.** Checks passed: dry_run flag, banned-claims scan, channel rules (opt-out / disclaimer / length).",
  });
  log(`reviewer: ${task.identifier} approved`);
} else {
  await api("PATCH", `/issues/${task.id}`, {
    status: "in_progress",
    comment: "**Reviewer: CHANGES REQUESTED.**\n" + problems.map((p) => `- ${p}`).join("\n"),
  });
  log(`reviewer: ${task.identifier} changes requested (${problems.length})`);
}
