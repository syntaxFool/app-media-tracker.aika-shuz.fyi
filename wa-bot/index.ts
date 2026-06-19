// ── Shanuzz WhatsApp Bot ───────────────────────────────
// Connects to Baileys, listens on Redis queue for outgoing messages.
// Implements random jitter delays for anti-ban protection.
//
// Configuration via environment variables:
//   REDIS_URL      — Redis connection (default: redis://localhost:6379)
//   WA_BOT_PHONE   — Bot phone number (for display)
//   WA_GROUP_JID   — WhatsApp Group JID for team updates
//   WA_ADMIN_JID   — Admin's WhatsApp JID for ping-admin notifications

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  makeInMemoryStore,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import Redis from "ioredis";
import * as readline from "readline";

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

// ── Question prompt for phone number ──────────────────
function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

// ── Baileys Store (optional, keeps messages in memory) ─
const store = makeInMemoryStore({});
store.readFromFile("./wa-bot/store.json");
setInterval(() => {
  store.writeToFile("./wa-bot/store.json");
}, 10_000);

// ── Connect to WhatsApp ────────────────────────────────
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("wa-bot/auth");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  store.bind(sock.ev);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;

      console.log(
        "Connection closed due to",
        lastDisconnect?.error,
        ", reconnecting:",
        shouldReconnect
      );

      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 5000);
      }
    } else if (connection === "open") {
      console.log("✅ WhatsApp connected! Bot is ready.");
    }
  });

  // ── Listen for incoming messages (optional debugging) ──
  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.key.fromMe && m.type === "notify") {
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
      console.log(`📩 Incoming from ${msg.key.remoteJid}: ${text}`);
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

  await randomDelay(400, 1800); // Human-like delay before typing

  await sock.presenceSubscribe(jid);
  await sock.sendPresenceUpdate("composing", jid);
  await randomDelay(800, 3000); // "Typing" delay

  await sock.sendMessage(jid, { text });
  console.log(`  📤 Sent to ${jid}: ${text.substring(0, 80)}...`);
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

    // 1. Send to team group
    console.log(`📤 Sending status update for ${taskId} to group...`);
    await sendMessage(sock, GROUP_JID, teamMsg);

    // 2. DM the next responsible person
    const nextJid = STAFF_CONTACTS[nextResponsible];
    if (nextJid) {
      await randomDelay(500, 2000);
      const dmMsg = [
        `📋 *Action Required: ${taskId}*`,
        `👤 ${customerName}`,
        `📌 Status is now: *${newStatus}*`,
        `You are responsible for the next step.`,
      ].join("\n");
      console.log(`📤 DM-ing ${nextResponsible} (${nextJid})...`);
      await sendMessage(sock, nextJid, dmMsg);
    }
  }

  if (type === "ping_admin") {
    const adminMsg = [
      `⚠️ *Correction Request: ${taskId}*`,
      `👤 Customer: ${customerName}`,
      `🙋 Requested by: ${requestedBy || "Unknown"}`,
      `📌 Current status: ${oldStatus}`,
      `💬 A staff member has flagged an incorrect status update and needs admin correction.`,
    ].join("\n");

    console.log(`📤 Sending ping-admin for ${taskId}...`);
    await sendMessage(sock, ADMIN_JID, adminMsg);
  }
}

// ── Main ───────────────────────────────────────────────
async function main() {
  console.log("🤖 Shanuzz WhatsApp Bot starting...");
  console.log(`   Redis: ${REDIS_URL}`);

  // Check if GROUP_JID and ADMIN_JID are set; prompt if not
  if (!GROUP_JID) {
    console.log("\n⚠️  WA_GROUP_JID not set in environment.");
    const jid = await askQuestion("Enter WhatsApp Group JID (e.g. 123456789@g.us): ");
    process.env.WA_GROUP_JID = jid;
  }

  if (!ADMIN_JID) {
    console.log("\n⚠️  WA_ADMIN_JID not set in environment.");
    const jid = await askQuestion("Enter Admin WhatsApp JID (e.g. 911234567890@s.whatsapp.net): ");
    process.env.WA_ADMIN_JID = jid;
  }

  const sock = await connectToWhatsApp();

  // ── Redis Subscriber ─────────────────────────────────
  console.log(`📡 Listening on Redis channel: ${CHANNEL}`);

  while (true) {
    try {
      // Blocking pop from the list
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
      console.error("Redis error:", err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

main().catch(console.error);
