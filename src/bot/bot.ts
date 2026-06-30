import { Telegraf } from "telegraf";
import { MyContext } from "./context";
import { prismaSession } from "./middleware/session";
import { authMiddleware } from "./middleware/auth";
import { i18nMiddleware } from "./middleware/i18n";
import { subscriptionMiddleware } from "./middleware/subscription";
import { registerStartHandlers } from "./handlers/start";
import { registerCatalogHandlers } from "./handlers/catalog";
import { registerProfileHandlers } from "./handlers/profile";
import { registerAdminHandlers } from "./handlers/admin";
import { registerOrderHandlers } from "./handlers/order";

if (!process.env.BOT_TOKEN) {
  throw new Error("BOT_TOKEN environment variable is not defined");
}

const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN);

// Register generic error handler
bot.catch((err, ctx) => {
  console.error(`Telegraf error occurred for update ${ctx.update.update_id}:`, err);
  ctx.reply("An unexpected error occurred. Please try again later.").catch((e) => {
    console.error("Failed to send error message to user:", e);
  });
});

// Bind Middlewares (order matters!)
bot.use(prismaSession());
bot.use(authMiddleware);
bot.use(i18nMiddleware);
bot.use(subscriptionMiddleware);

// Register Handlers
registerProfileHandlers(bot);
registerStartHandlers(bot);
registerCatalogHandlers(bot);
registerOrderHandlers(bot);
registerAdminHandlers(bot);

export default bot;
export { bot };
