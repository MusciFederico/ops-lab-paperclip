// Builds the exact payload each downstream "hand" would execute. DRY RUN: nothing is sent.
// Shapes follow the public request formats of Meta's WhatsApp Cloud API and Instagram Graph API
// (placeholders for ids/tokens), plus a plain-text brief for Grok Bot.

// Wording that must never ship in medical-device marketing without regulatory sign-off.
export const BANNED = [
  /\bcura\b/i, /\bcuran\b/i, /garantiza/i, /milagro/i, /100\s?%\s?efectiv/i,
  /sin efectos secundarios/i, /reemplaza (al|a su) m[eé]dico/i, /previene (el|la)\s/i,
];

export function sanitize(text) {
  let out = text;
  for (const re of BANNED) out = out.replace(new RegExp(re.source, "gi"), "[claim removed]");
  return out;
}

const OPT_OUT = "Respondé BAJA para dejar de recibir mensajes.";

export function buildInstagram(brief, { revision = 0 } = {}) {
  const product = brief.product ?? "Producto";
  const raw = [
    `${product}: tu control en casa, simple y claro. 🩺`,
    brief.angle ?? "Medí, anotá y llevá tus resultados a la consulta.",
    "Consultá siempre con tu profesional de la salud.",
    "#salud #bienestar #dispositivosmedicos",
  ].join("\n\n");
  const caption = revision ? sanitize(raw) : raw;
  return {
    channel: "instagram",
    dry_run: true,
    revision,
    format_hint: brief.format ?? "carousel 1080x1350, 3 slides: producto, uso, CTA",
    caption,
    // Instagram Graph API publish flow: create a media container, then publish it.
    api_calls: [
      { method: "POST", url: "https://graph.facebook.com/v27.0/{IG_USER_ID}/media",
        body: { image_url: "{PUBLIC_IMAGE_URL}", caption, access_token: "{TOKEN}" } },
      { method: "POST", url: "https://graph.facebook.com/v27.0/{IG_USER_ID}/media_publish",
        body: { creation_id: "{CONTAINER_ID_FROM_STEP_1}", access_token: "{TOKEN}" } },
    ],
  };
}

export function buildWhatsApp(brief, { revision = 0 } = {}) {
  const product = brief.product ?? "Producto";
  const raw = `Hola {{1}}, te escribimos de la tienda. Tenemos novedades de ${product} que pediste conocer. ${brief.angle ?? ""} ${OPT_OUT}`.replace(/\s+/g, " ").trim();
  const body = revision ? sanitize(raw) : raw;
  return {
    channel: "whatsapp",
    dry_run: true,
    revision,
    audience_rule: "Only contacts with recorded opt-in. Template must be pre-approved in Meta Business Manager.",
    // WhatsApp Cloud API template message.
    api_calls: [
      { method: "POST", url: "https://graph.facebook.com/v27.0/{PHONE_NUMBER_ID}/messages",
        body: {
          messaging_product: "whatsapp",
          to: "{E164_OPTED_IN_NUMBER}",
          type: "template",
          template: {
            name: brief.template_name ?? "novedades_producto",
            language: { code: "es_AR" },
            components: [{ type: "body", parameters: [{ type: "text", text: "{FIRST_NAME}" }] }],
          },
        } },
    ],
    template_body_for_approval: body,
  };
}

export function buildGrokBot(brief, { revision = 0 } = {}) {
  const product = brief.product ?? "Producto";
  const instruction = [
    `Task for Grok Bot (dry run, do not publish): prepare a social post draft for "${product}".`,
    `Goal: ${brief.goal ?? "awareness"}. Audience: ${brief.audience ?? "adults 35-65 who monitor health at home"}.`,
    "Constraints: Spanish (es_AR), no health or efficacy claims, include a 'consult your healthcare professional' line.",
    "Use the connected social-media plugin only to LIST scheduling options. Return the draft and wait for human approval before any publish call.",
  ].join("\n");
  return {
    channel: "grok-bot",
    dry_run: true,
    revision,
    handoff: {
      how_it_connects: "Grok Bot custom MCP server / plugin (Settings -> Plugins). Paperclip side: external agent or HTTP adapter.",
      instruction: revision ? sanitize(instruction) : instruction,
      expected_return: "draft text + suggested schedule; no publish tool call",
    },
  };
}

export const BUILDERS = { instagram: buildInstagram, whatsapp: buildWhatsApp, "grok-bot": buildGrokBot };
