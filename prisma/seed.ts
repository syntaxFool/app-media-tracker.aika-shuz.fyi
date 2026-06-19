// ── Database Seed Script ───────────────────────────────
// Run: npx tsx prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create superuser (locked, cannot be modified from frontend)
  const suPassword = await bcrypt.hash("nox18", 12);
  await prisma.user.upsert({
    where: { username: "su" },
    update: {},
    create: {
      username: "su",
      password: suPassword,
      role: "admin",
      isSuperuser: true,
    },
  });
  console.log("  ✅ Superuser: su / nox18 (locked)");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: adminPassword,
      role: "admin",
    },
  });
  console.log("  ✅ Admin user: admin / admin123");

  // Create staff user
  const staffPassword = await bcrypt.hash("staff123", 12);
  await prisma.user.upsert({
    where: { username: "staff" },
    update: {},
    create: {
      username: "staff",
      password: staffPassword,
      role: "staff",
    },
  });
  console.log("  ✅ Staff user: staff / staff123");

  // Create sample tasks
  const tasks = [
    {
      customerName: "Rahul & Priya",
      shootDate: new Date("2025-07-15"),
      service: "Wedding",
      gender: "Female",
      isInfluencer: true,
      status: "New",
      note: "Destination wedding in Udaipur",
    },
    {
      customerName: "Amit Sharma",
      shootDate: new Date("2025-07-10"),
      service: "Portfolio",
      gender: "Male",
      isInfluencer: false,
      status: "Video Shot",
      note: "",
    },
    {
      customerName: "Neha Singh",
      shootDate: new Date("2025-06-28"),
      service: "Pre-Wedding",
      gender: "Female",
      isInfluencer: true,
      status: "Video Edited",
      note: "Beach location shoot",
    },
    {
      customerName: "The Gupta Family",
      shootDate: new Date("2025-06-20"),
      service: "Event",
      gender: "Other",
      isInfluencer: false,
      status: "Task Completed",
      note: "Birthday party coverage",
    },
    {
      customerName: "Vikram Das",
      shootDate: new Date("2025-07-05"),
      service: "Commercial",
      gender: "Male",
      isInfluencer: false,
      status: "Reviewed",
      note: "Product shots for brand campaign",
    },
  ];

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const id = `SHANUZZ-${String(i + 1).padStart(4, "0")}`;
    await prisma.task.upsert({
      where: { id },
      update: {},
      create: {
        id,
        ...t,
        createdBy: "admin",
        updatedAt: t.status === "Task Completed" ? new Date(Date.now() - 48 * 60 * 60 * 1000) : null,
        updatedBy: t.status !== "New" ? "staff" : null,
      },
    });
    console.log(`  ✅ Task ${id}: ${t.customerName} [${t.status}]`);
  }

  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
