import test from "node:test";
import assert from "node:assert/strict";
import { BANNED, buildGrokBot, buildInstagram, buildWhatsApp, sanitize } from "../handoff/builders.mjs";

const brief = {
  product: "Tensiómetro digital de brazo",
  angle: "Medí, anotá y llevá tus resultados a la consulta.",
  format: "carousel 1080x1350, 3 slides",
};

function hasBannedClaim(value) {
  const text = JSON.stringify(value);
  return BANNED.some((pattern) => pattern.test(text));
}

test("Instagram builder produces a safe dry-run draft and two-step publishing outline", () => {
  const payload = buildInstagram(brief);
  assert.equal(payload.channel, "instagram");
  assert.equal(payload.dry_run, true);
  assert.ok(payload.caption.length <= 2200);
  assert.match(payload.caption, /profesional de la salud/i);
  assert.equal(payload.api_calls.length, 2);
  assert.match(payload.api_calls[0].url, /graph\.facebook\.com\/v27\.0/);
  assert.equal(hasBannedClaim(payload), false);
});

test("WhatsApp builder requires opt-in and includes a clear opt-out line", () => {
  const payload = buildWhatsApp(brief);
  assert.equal(payload.channel, "whatsapp");
  assert.equal(payload.dry_run, true);
  assert.match(payload.audience_rule, /opt-in/i);
  assert.match(payload.template_body_for_approval, /BAJA/);
  assert.match(payload.api_calls[0].url, /graph\.facebook\.com\/v27\.0/);
  assert.equal(hasBannedClaim(payload), false);
});

test("Grok Bot handoff explicitly forbids publishing and waits for human approval", () => {
  const payload = buildGrokBot(brief);
  assert.equal(payload.channel, "grok-bot");
  assert.equal(payload.dry_run, true);
  assert.match(payload.handoff.instruction, /do not publish/i);
  assert.match(payload.handoff.instruction, /human approval/i);
});

test("sanitizer removes a prohibited health efficacy claim", () => {
  assert.equal(sanitize("Este equipo cura la hipertensión"), "Este equipo [claim removed] la hipertensión");
});
