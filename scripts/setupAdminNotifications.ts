import { prisma } from "../src/config/db";
import { notificationService } from "../src/services/notificationService";

async function setupAdminNotifications() {
  console.log("Setting up admin notification configuration...\n");

  // Example configuration - replace with your actual admin Telegram IDs
  const configs = [
    {
      key: "ADMIN_TELEGRAM_GROUP",
      value: process.env.ADMIN_TELEGRAM_GROUP || "",
      description: "Telegram group ID for admin notifications (e.g., -1001234567890)",
    },
    {
      key: "ADMIN_TELEGRAM_CHANNEL",
      value: process.env.ADMIN_TELEGRAM_CHANNEL || "",
      description: "Telegram channel ID for admin notifications (e.g., @yourchannel or -1001234567890)",
    },
    {
      key: "ADMIN_TELEGRAM_USERS",
      value: process.env.ADMIN_TELEGRAM_USERS || "",
      description: "Comma-separated list of admin Telegram user IDs (e.g., 123456789,987654321)",
    },
  ];

  for (const config of configs) {
    if (config.value) {
      await notificationService.setAdminConfig(config.key, config.value, config.description);
      console.log(`✓ Set ${config.key} = ${config.value}`);
    } else {
      console.log(`⊘ Skipped ${config.key} (no value provided)`);
    }
  }

  console.log("\nAdmin notification configuration completed!");
  console.log("\nTo configure admin notifications, set these environment variables:");
  console.log("  - ADMIN_TELEGRAM_GROUP: Your Telegram group ID");
  console.log("  - ADMIN_TELEGRAM_CHANNEL: Your Telegram channel ID");
  console.log("  - ADMIN_TELEGRAM_USERS: Comma-separated admin user IDs");
  console.log("\nOr use the admin API endpoints to update configuration dynamically.");
}

setupAdminNotifications()
  .then(() => {
    console.log("\n✓ Setup completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Setup failed:", error);
    process.exit(1);
  });
