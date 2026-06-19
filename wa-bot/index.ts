// ── Shanuzz WhatsApp Bot ───────────────────────────────
// Connects to Baileys, listens on Redis queue for outgoing messages.
// Implements random jitter delays for anti-ban protection.

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import Redis from "ioredis";

// ── Config ─────────────────────────────────────────────
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const CHANNEL = "whatsapp:send";
const GROUP_JID = process.env.WA_GROUP_JID || "";
const ADMIN_JID = process.env.WA_ADMIN_JID || "";

// Staff contacts mapped to roles (configure per your team)
const STAFF_CONTACTS: Record<string, string> = {
  Admin: process.env.WA_ADMIN_JID || "",
  Videographer: process.env.WA_VIDEOGRAPHER_JID || "",
  Editor: process.env.WA_EDITOR_JID || "",
  Reviewer: process.env.WA_REVIEWER_JID || "",
  Uploader: process.env.WA_UPLOADER_JID || "",
};

// ── Redis Client ────────────────────────────────────────
const redis = new Redis(REDIS_URL);

// ── Jitter helper ──────────────────────────────────────
function randomDelay(minMs = 300, maxMs = 2500): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Connect to WhatsApp ────────────────────────────────
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: ["Shanuzz Media Tracker", "Chrome", "1.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log("Connection closed.", shouldReconnect ? "Reconnecting..." : "Logged out.");
      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 5000);
      }
    } else if (connection === "open") {
      console.log("✅ WhatsApp connected! Bot is ready.");
    }
  });

  return sock;
}

// ── Send message with jitter ────────────────────────────
async function sendMessage(
  sock: ReturnType<typeof makeWASocket>,
  jid: string,
  text: string
) {
  if (!jid) {
    console.log("  ⚠️ No JID configured, skipping send");
    return;
  }

  await randomDelay(400, 1800);
  await sock.presenceSubscribe(jid);
  await sock.sendPresenceUpdate("composing", jid);
  await randomDelay(800, 3000);

  await sock.sendMessage(jid, { text });
  console.log(`  📤 Sent to ${jid}`);
}

// ── Process WhatsApp queue messages ─────────────────────
async function processMessage(
  sock: ReturnType<typeof makeWASocket>,
  data: any
) {
  const {
    taskId,
    customerName,
    oldStatus,
    newStatus,
    updatedBy,
    nextResponsible,
    type,
    requestedBy,
  } = data;

  if (type === "status_update") {
    const teamMsg = [
      `📋 *Task Update: ${taskId}*`,
      `👤 Customer: ${customerName}`,
      `🔄 Status: *${oldStatus}* → *${newStatus}*`,
      `👤 Updated by: ${updatedBy}`,
      `👉 Next: ${nextResponsible}`,
    ].join("\n");

    console.log(`📤 Sending status update for ${taskId}`);
    await sendMessage(sock, GROUP_JID, teamMsg);

    const nextJid = STAFF_CONTACTS[nextResponsible];
    if (nextJid) {
      await randomDelay(500, 2000);
      const dmMsg = [
        `📋 *Action Required: ${taskId}*`,
        `👤 ${customerName}`,
        `📌 Status is now: *${newStatus}*`,
        `You are responsible for the next step.`,
      ].join("\n");
      await sendMessage(sock, nextJid, dmMsg);
    }
  }

  if (type === "ping_admin") {
    const adminMsg = [
      `⚠️ *Correction Request: ${taskId}*`,
      `👤 Customer: ${customerName}`,
      `🙋 Requested by: ${requestedBy || "Unknown"}`,
      `📌 Current status: ${oldStatus}`,
      `💬 Staff flagged an incorrect status update. Please correct.`,
    ].join("\n");

    console.log(`📤 Sending ping-admin for ${taskId}`);
    await sendMessage(sock, ADMIN_JID, adminMsg);
  }
}

// ── Main ───────────────────────────────────────────────
async function main() {
  console.log("🤖 Shanuzz WhatsApp Bot starting...");

  if (!GROUP_JID) console.log("⚠️  WA_GROUP_JID not set — group messages will be skipped");
  if (!ADMIN_JID) console.log("⚠️  WA_ADMIN_JID not set — admin pings will be skipped");

  const sock = await connectToWhatsApp();

  console.log(`📡 Listening on Redis: ${CHANNEL}`);

  while (true) {
    try {
      const result = await redis.brpop(CHANNEL, 0);
      if (result) {
        const [, msg] = result;
        try {
          const data = JSON.parse(msg);
          console.log(`📨 Processing: ${data.type} for ${data.taskId}`);
          await processMessage(sock, data);
        } catch (err) {
          console.error("Failed to process message:", err);
        }
      }
    } catch (err) {
      console.error("Redis error, retrying in 5s:", err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

main().catch(console.error);
