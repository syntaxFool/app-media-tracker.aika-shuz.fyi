// ── WhatsApp Queue Publisher ───────────────────────────
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(REDIS_URL);

export interface WhatsAppMessage {
  taskId: string;
  customerName: string;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
  nextResponsible: string;
  type: "status_update" | "ping_admin";
  requestedBy?: string;
}

const CHANNEL = "whatsapp:send";

export async function enqueueWhatsAppMessage(msg: WhatsAppMessage): Promise<void> {
  await redis.lpush(CHANNEL, JSON.stringify(msg));
}

export default redis;
