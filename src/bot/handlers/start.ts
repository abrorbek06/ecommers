import { Telegraf, Markup } from "telegraf";
import { MyContext } from "../context";
import { prisma } from "../../config/db";
import { getLanguageKeyboard, getMainMenuKeyboard, getContactKeyboard, getSubscriptionKeyboard } from "../keyboards";
import { getUnsubscribedChannels } from "../middleware/subscription";

export function registerStartHandlers(bot: Telegraf<MyContext>) {
  // 1. Start command
  bot.start(async (ctx) => {
    const isRegistered = ctx.dbUser?.customer;

    if (isRegistered) {
      return ctx.reply(ctx.t("menu_title"), getMainMenuKeyboard(ctx));
    }

    // Initialize onboarding
    ctx.session = { step: "SELECT_LANGUAGE" };
    return ctx.reply(ctx.t("welcome"), getLanguageKeyboard());
  });

  // 2. Language selection callback handlers
  bot.action(/^lang_(uz|ru)$/, async (ctx, next) => {
    const isRegistered = ctx.dbUser?.customer;
    if (isRegistered) {
      return next();
    }

    const selectedLang = ctx.match[1];
    
    if (!ctx.session) ctx.session = {};
    ctx.session.tempLanguage = selectedLang;
    ctx.session.step = "ENTER_NAME";

    await ctx.answerCbQuery();
    await ctx.editMessageText(ctx.t("choose_language"));
    await ctx.reply(ctx.t("request_name"), Markup.keyboard([[ctx.t("btn_back")]]).resize());
  });

  // 3. Subscription verification callback
  bot.action("verify_subscription", async (ctx) => {
    try {
      const unsubscribed = await getUnsubscribedChannels(ctx);
      await ctx.answerCbQuery();

      if (unsubscribed.length === 0) {
        await ctx.reply(ctx.t("registration_success"));
        return ctx.reply(ctx.t("menu_title"), getMainMenuKeyboard(ctx));
      } else {
        await ctx.reply(ctx.t("subscription_failed"));
        
        // UX improvement: Resend mandatory channels links + check button so user has them handy
        const keyboard = getSubscriptionKeyboard(ctx, unsubscribed);
        await ctx.reply(ctx.t("subscription_required"), {
          reply_markup: keyboard.reply_markup,
        });
      }
    } catch (error: any) {
      console.error("[START_HANDLERS_ERROR] Error in verify_subscription callback:", error);
      const errorMsg = error.description || error.message || "";
      if (errorMsg.includes("bot was blocked by the user")) {
        console.warn(`[DIAGNOSTIC] User ${ctx.from?.id} has blocked the bot. Cannot deliver subscription status update.`);
      }
    }
  });

  // 4. Handle contacts shared via button
  bot.on("contact", async (ctx) => {
    if (ctx.session?.step !== "ENTER_PHONE") {
      return;
    }

    const contact = ctx.message.contact;
    const phoneNumber = contact.phone_number.startsWith("+") 
      ? contact.phone_number 
      : `+${contact.phone_number}`;

    await completeRegistration(ctx, phoneNumber);
  });

  // 5. Text message handler for registration flow and back navigation
  bot.on("text", async (ctx, next) => {
    const text = ctx.message.text.trim();
    const isBack = text === "⬅️ Orqaga" || text === "⬅️ Назад";

    if (!ctx.session || !ctx.session.step) {
      return next();
    }

    // Handle back buttons during registration
    if (isBack) {
      if (ctx.session.step === "ENTER_PHONE") {
        ctx.session.step = "ENTER_NAME";
        return ctx.reply(
          ctx.t("request_name"),
          Markup.keyboard([[ctx.t("btn_back")]]).resize()
        );
      } else if (ctx.session.step === "ENTER_NAME") {
        ctx.session.step = "SELECT_LANGUAGE";
        return ctx.reply(ctx.t("welcome"), getLanguageKeyboard());
      }
    }

    // Handle normal steps
    if (ctx.session.step === "ENTER_NAME") {
      ctx.session.tempName = text;
      ctx.session.step = "ENTER_PHONE";
      return ctx.reply(ctx.t("request_phone"), getContactKeyboard(ctx));
    }

    if (ctx.session.step === "ENTER_PHONE") {
      // Validate Uzbek phone format
      // Matches +998XXXXXXXXX, 998XXXXXXXXX, or 9XXXXXXXXX
      const uzPhoneRegex = /^(\+?998)?[0-9]{9}$/;
      if (!uzPhoneRegex.test(text)) {
        return ctx.reply(ctx.t("invalid_phone"));
      }

      let formattedPhone = text;
      if (!text.startsWith("+")) {
        if (text.startsWith("998")) {
          formattedPhone = `+${text}`;
        } else {
          formattedPhone = `+998${text}`;
        }
      }

      await completeRegistration(ctx, formattedPhone);
      return;
    }

    return next();
  });
}

async function completeRegistration(ctx: MyContext, phoneNumber: string) {
  const userId = BigInt(ctx.from!.id);
  const fullName = ctx.session?.tempName || ctx.from!.first_name;
  const language = ctx.session?.tempLanguage || "uz";

  // Create customer
  await prisma.customer.upsert({
    where: { userId },
    update: {
      fullName,
      phoneNumber,
    },
    create: {
      userId,
      fullName,
      phoneNumber,
    },
  });

  // Update language on TelUser
  await prisma.telUser.update({
    where: { id: userId },
    data: { language },
  });

  // Reload dbUser values in context manually to bypass refresh lags
  if (ctx.dbUser) {
    ctx.dbUser.language = language;
    ctx.dbUser.customer = { fullName, phoneNumber };
  }

  // Clear onboarding state
  ctx.session = { step: "MAIN_MENU" };

  await ctx.reply(ctx.t("registration_success"), Markup.removeKeyboard());
  await ctx.reply(ctx.t("menu_title"), getMainMenuKeyboard(ctx));
}
