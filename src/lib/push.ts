// ── Push Notification Sender ────────────────────────────
import prisma from "./db";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";

export async function sendPushNotifications(taskId: string, message: string) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  try {
    // Dynamic require for web-push (avoids webpack ESM bundling issues)
    const webpush = require("web-push");
    webpush.setVapidDetails(
      "mailto:noc.aika.shanuzz@gmail.com",
      VAPID_PUBLIC,
      VAPID_PRIVATE
    );

    const subs = await prisma.pushSubscription.findMany();
    if (subs.length === 0) return;

    const payload = JSON.stringify({
      title: "Shanuzz Media Tracker",
      body: message,
      icon: "/icons/icon-192.svg",
      data: { taskId, url: `/tasks/${taskId}` },
    });

    await Promise.allSettled(
      subs.map((sub: any) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        ).catch(async (err: any) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
          }
        })
      )
    );
  } catch (err) {
    console.error("Push send error:", err);
  }
}
