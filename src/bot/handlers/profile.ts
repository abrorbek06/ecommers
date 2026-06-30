import { Telegraf, Markup } from "telegraf";
import { MyContext } from "../context";
import { prisma } from "../../config/db";
import { getMainMenuKeyboard, getLanguageKeyboard } from "../keyboards";

export function registerProfileHandlers(bot: Telegraf<MyContext>) {
  // 1. View Profile
  bot.hears(
    ["👤 Mening profilim", "👤 Мой профиль"],
    async (ctx) => {
      if (!ctx.dbUser || !ctx.dbUser.customer) {
        return ctx.reply(ctx.t("welcome"), getLanguageKeyboard());
      }

      const role = ctx.dbUser.isAdmin ? "Admin" : "Customer";
      const profileText = ctx.t("profile_info", {
        name: ctx.dbUser.customer.fullName,
        phone: ctx.dbUser.customer.phoneNumber,
        role: role,
      });

      return ctx.replyWithMarkdown(profileText, getMainMenuKeyboard(ctx));
    }
  );

  // 2. Change Language Request
  bot.hears(
    ["🌐 Tilni o'zgartirish", "🌐 Изменить язык"],
    async (ctx) => {
      return ctx.reply(ctx.t("choose_language"), getLanguageKeyboard());
    }
  );

  // 3. Callback actions for changing language (when registered)
  bot.action(/^lang_(uz|ru)$/, async (ctx, next) => {
    // Check if user is registered. If they are, update language and show menu.
    // If not, let the handler in start.ts execute it (call next()).
    const isRegistered = ctx.dbUser?.customer;

    if (!isRegistered) {
      return next(); // Let start.ts handler run FSM onboarding
    }

    const selectedLang = ctx.match[1];
    const userId = BigInt(ctx.from!.id);

    try {
      await prisma.telUser.update({
        where: { id: userId },
        data: { language: selectedLang },
      });

      if (ctx.dbUser) {
        ctx.dbUser.language = selectedLang;
      }
      if (ctx.session) {
        ctx.session.tempLanguage = undefined;
      }

      await ctx.answerCbQuery();
      await ctx.editMessageText(selectedLang === "ru" ? "Язык изменен!" : "Til o'zgartirildi!");
      return ctx.reply(ctx.t("menu_title"), getMainMenuKeyboard(ctx));
    } catch (error) {
      console.error("Error updating language:", error);
      await ctx.answerCbQuery();
      return ctx.reply("Error changing language.");
    }
  });
}
