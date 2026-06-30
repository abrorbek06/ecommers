import { Middleware, Markup } from "telegraf";
import { MyContext } from "../context";
import { prisma } from "../../config/db";

function getSubscriptionKeyboard(ctx: MyContext, channels: any[]) {
  const buttons = [
    ...channels.map((channel) => {
      let url = channel.inviteLink;
      if (!url) {
        if (channel.channelId.startsWith("@")) {
          url = `https://t.me/${channel.channelId.replace("@", "")}`;
        } else {
          // Fallback for numeric channel IDs (private channels)
          url = `https://t.me/c/${channel.channelId.replace("-100", "")}`;
        }
      }
      return [Markup.button.url(channel.title, url)];
    }),
    [Markup.button.callback(ctx.t("btn_verify_sub"), "verify_subscription")]
  ];

  return Markup.inlineKeyboard(buttons);
}

/**
 * Checks if the user is subscribed to all mandatory channels.
 * Returns a list of channels they are NOT subscribed to.
 */
export async function getUnsubscribedChannels(ctx: MyContext): Promise<any[]> {
  if (!ctx.dbUser) return [];

  // Admins bypass subscription checks
  if (ctx.dbUser.isAdmin) {
    console.log(`[SUBSCRIPTION] User ${ctx.dbUser.id} is an administrator. Bypassing subscription check.`);
    return [];
  }

  const requiredChannels = await prisma.confirmChannel.findMany();
  if (requiredChannels.length === 0) {
    console.log(`[SUBSCRIPTION] No mandatory subscription channels registered in database.`);
    return [];
  }

  const unsubscribed: any[] = [];
  const userId = Number(ctx.dbUser.id);

  console.log(`[SUBSCRIPTION] Starting subscription check for User ID: ${userId} across ${requiredChannels.length} channels.`);

  for (const channel of requiredChannels) {
    // Check link integrity for private channels
    if (channel.channelId.startsWith("-") && !channel.inviteLink) {
      console.warn(
        `[SUBSCRIPTION_WARNING] Private channel "${channel.title}" (ID: ${channel.channelId}) does not have an invite link registered. Users may get stuck if they are not already joined.`
      );
    }

    try {
      // Calling getChatMember
      const member = await ctx.telegram.getChatMember(channel.channelId, userId);
      
      // Explicitly check allowed statuses: creator, administrator, member
      const isSubscribed = ["creator", "administrator", "member"].includes(member.status);
      
      console.log(`[SUBSCRIPTION_LOG] Checked channel: ${channel.channelId} (${channel.title}) for User: ${userId}. Status: ${member.status}. Subscribed: ${isSubscribed}`);
      
      if (!isSubscribed) {
        unsubscribed.push(channel);
      }
    } catch (error: any) {
      console.error(`[SUBSCRIPTION_ERROR] Failed to check status for user ${userId} in channel ${channel.channelId}:`, error);

      const errorMsg = error.description || error.message || "";
      const errorCode = error.code || 0;

      // Identify specific Telegram API errors
      if (errorMsg.includes("chat not found")) {
        console.error(
          `[SUBSCRIPTION_DIAGNOSTIC] Channel "${channel.title}" (${channel.channelId}) not found. Root Cause: Either the channel username/ID is invalid, or the bot has not been added to this channel.`
        );
      } else if (errorMsg.includes("bot is not a member")) {
        console.error(
          `[SUBSCRIPTION_DIAGNOSTIC] Bot is not a member of channel "${channel.title}" (${channel.channelId}). Root Cause: Bot needs to be joined to the channel.`
        );
      } else if (errorMsg.includes("member list is inaccessible")) {
        console.error(
          `[SUBSCRIPTION_DIAGNOSTIC] Member list is inaccessible in channel "${channel.title}" (${channel.channelId}). Root Cause: Bot is not an administrator in the channel.`
        );
      } else if (errorMsg.includes("chat_id_invalid") || errorMsg.includes("invalid chat")) {
        console.error(
          `[SUBSCRIPTION_DIAGNOSTIC] Invalid channel identifier format for channel "${channel.title}" (${channel.channelId}).`
        );
      } else if (errorCode === 403 || errorMsg.includes("forbidden") || errorMsg.includes("bot was blocked")) {
        console.error(
          `[SUBSCRIPTION_DIAGNOSTIC] Bot is blocked or forbidden from interacting with user ${userId} or channel ${channel.channelId}.`
        );
      } else {
        console.error(`[SUBSCRIPTION_DIAGNOSTIC] Unclassified Telegram Error: Code: ${errorCode}, Description: ${errorMsg}`);
      }

      // Safe production-ready fallback:
      // If the error indicates a bot configuration/permission issue (the channel is missing, bot is not inside, or bot is not admin),
      // we log it prominently so the developer can fix it, but we do NOT block the user.
      // Blocking the user due to bot configuration bugs would render the bot completely broken for all users.
      const isBotConfigError = 
        errorMsg.includes("chat not found") || 
        errorMsg.includes("bot is not a member") || 
        errorMsg.includes("member list is inaccessible") ||
        errorMsg.includes("chat_id_invalid") ||
        errorMsg.includes("invalid chat");

      if (isBotConfigError) {
        console.warn(`[SUBSCRIPTION_SAFE_FALLBACK] Allowing user ${userId} to bypass check for channel ${channel.channelId} due to bot configuration error.`);
      } else {
        // For standard errors where we assume unsubscribed (e.g., API timeouts), add to unsubscribed list
        unsubscribed.push(channel);
      }
    }
  }

  return unsubscribed;
}

export const subscriptionMiddleware: Middleware<MyContext> = async (ctx, next) => {
  if (!ctx.dbUser || !ctx.chat) {
    return next();
  }

  // Allow start command, language settings, and registration onboarding without subscription checks
  const isStartCmd = ctx.message && "text" in ctx.message && ctx.message.text.startsWith("/start");
  const isOnboarding = ctx.session?.step && ["SELECT_LANGUAGE", "ENTER_NAME", "ENTER_PHONE"].includes(ctx.session.step);
  const isCallbackQuery = ctx.callbackQuery && "data" in ctx.callbackQuery && (
    ctx.callbackQuery.data.startsWith("lang_") || 
    ctx.callbackQuery.data === "verify_subscription"
  );

  if (isStartCmd || isOnboarding || isCallbackQuery) {
    return next();
  }

  // If user hasn't completed registration, let them do it (don't block with subscription check yet)
  if (!ctx.dbUser.customer) {
    return next();
  }

  try {
    const unsubscribed = await getUnsubscribedChannels(ctx);
    if (unsubscribed.length > 0) {
      const keyboard = getSubscriptionKeyboard(ctx, unsubscribed);
      await ctx.reply(ctx.t("subscription_required"), {
        reply_markup: keyboard.reply_markup,
      });
      return; // Block execution
    }
  } catch (error: any) {
    console.error(`[SUBSCRIPTION_MIDDLEWARE_ERROR] Error running subscription checks:`, error);
    
    // Safely check if user blocked the bot
    const errorMsg = error.description || error.message || "";
    if (errorMsg.includes("bot was blocked by the user")) {
      console.warn(`[SUBSCRIPTION_DIAGNOSTIC] User ${ctx.dbUser.id} has blocked the bot. Skipping message send.`);
      return;
    }
  }

  await next();
};
